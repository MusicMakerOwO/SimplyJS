import { Client } from "../../Client.js";
import { DiscordAPIError } from "../../Rest.js";
import { APIClientStructure } from "../../Contracts/DiscordStructure.js";
import { DiscordInteraction, InteractionType, InteractionTypes } from "../../Types/Interactions.js";
import { InteractionContextType } from "../../Types/ApplicationCommand.js";
import { DiscordChannel, DiscordGuild } from "../../Types/DiscordAPITypes.js";
import { JSONObject } from "../../Types/Internal.js";
import { Member } from "../Member.js";
import { User } from "../User.js";

/** Discord's code for an interaction that has already had its one initial response */
const ALREADY_ACKNOWLEDGED = 40060;

/**
 * Base class for every interaction type (commands, components, modal submits, autocomplete,
 * and the `PING` handshake). Holds the properties common to all of them; concrete subclasses
 * add type-specific `data` fields and mix in whichever response capabilities apply.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object
 */
export class BaseInteraction extends APIClientStructure<DiscordInteraction> {
	id!: string
	applicationId!: string
	type!: InteractionType
	token!: string
	version!: 1
	guildId?: string
	guild?: Partial<DiscordGuild>
	channelId?: string
	channel?: Partial<DiscordChannel>
	/**
	 * The invoking guild member, present when the interaction came from a guild that's
	 * currently in the client's {@link Client.guilds} cache. Absent for DM interactions, and
	 * also absent (even in a guild) if that guild hasn't been cached yet - `user` is always
	 * populated regardless, so prefer that when membership isn't specifically needed.
	 */
	member?: Member
	/**
	 * The invoking user, present regardless of whether the interaction came from a guild
	 * (where it's derived from `member.user`) or a DM (where it's sent directly as `user`).
	 */
	user!: User
	appPermissions!: string
	locale?: string
	guildLocale?: string
	authorizingIntegrationOwners!: Record<string, string>
	context?: InteractionContextType
	attachmentSizeLimit!: number
	// TODO Monetization support
	entitlements!: JSONObject[]

	/**
	 * Whether a {@link Collector} took ownership of this interaction before it was emitted.
	 *
	 * Discord allows exactly one initial response per interaction, so a registered handler and a
	 * waiting collector cannot both answer the same click - whichever replies second gets a
	 * `40060 Interaction has already been acknowledged` back. Collectors are offered the
	 * interaction first, and this flag is how a handler finds out that the answer is already
	 * somebody else's to give:
	 *
	 * @example
	 * ```ts
	 * client.on(ClientEvents.ButtonUsed, async (interaction) => {
	 * 	if (interaction.claimed) return; // a collector is handling this one
	 *
	 * 	const button = client.buttons.get(interaction.customId);
	 * 	if (!button) return interaction.reply(`Unknown button "${interaction.customId}"`);
	 * 	await button.execute(client, interaction);
	 * });
	 * ```
	 */
	claimed = false;

	/**
	 * Whether this interaction has had its one initial response yet, via any of `reply`,
	 * `deferReply`, `update`, `deferUpdate`, `showModal` or `respond`.
	 *
	 * Set synchronously when the response is *sent*, not when it resolves, so two overlapping
	 * responders can't both see `false` and both fire - and rolled back if that request never
	 * reaches Discord, so a transient failure doesn't leave the interaction unanswerable.
	 */
	acknowledged = false;

	/** Which method acknowledged this interaction, used to make the double-response error specific */
	#acknowledgedBy: string | null = null;

	/**
	 * Whether the acknowledgement left behind an original response message to edit or delete.
	 *
	 * Not the same question as `acknowledged`: `showModal()` and `respond()` answer the
	 * interaction without creating a message, so `@original` does not exist for them and
	 * `editReply`/`deleteReply` come back `10008 Unknown Message`.
	 */
	#editable = false;

	constructor(client: Client, data: DiscordInteraction) {
		super(client);
		this.patch(data);
	}

	/** The response methods that create an editable original response, for this interaction's type */
	get #initialResponseMethods(): string {
		return this.type === InteractionTypes.MESSAGE_COMPONENT
			? "`update()` or `deferUpdate()`"
			: "`reply()` or `deferReply()`";
	}

	/**
	 * Marks this interaction as answered, throwing if something already answered it.
	 *
	 * Called by the response methods before they send. Not intended for public use - it exists so
	 * a double response fails here, with a stack pointing at the second caller, rather than as an
	 * opaque `40060` from Discord several awaits later.
	 * @param method The response method acknowledging the interaction.
	 * @param editable Whether this response leaves an original message behind - false for
	 * `showModal` and `respond`, which acknowledge without producing anything to edit.
	 * @throws {Error} When the interaction has already been acknowledged.
	 */
	acknowledge(method: string, editable = true): void {
		if (this.acknowledged) {
			throw new Error(
				`This interaction was already acknowledged by \`${this.#acknowledgedBy}()\`, so \`${method}()\` ` +
				`cannot respond to it - Discord allows one initial response per interaction. Use \`followUp()\` ` +
				`to send another message, or \`editReply()\` to change the first one.` +
				(this.claimed
					? ` This interaction is also \`claimed\`, meaning a collector is handling it - check ` +
						`\`interaction.claimed\` and return early if this handler is not the one that should reply.`
					: "")
			);
		}

		this.acknowledged = true;
		this.#acknowledgedBy = method;
		this.#editable = editable;
	}

	/**
	 * Takes back an acknowledgement whose request never made it to Discord.
	 *
	 * Called by {@link acknowledgeWith} when the send fails. Not intended for public use - without
	 * it a single 503 would lock the interaction for the rest of its 15 minute token: no second
	 * `reply()` (this library refuses it) and no `editReply()` either (Discord refuses it, since
	 * there is no original response to edit).
	 */
	unacknowledge(): void {
		this.acknowledged = false;
		this.#acknowledgedBy = null;
		this.#editable = false;
	}

	/**
	 * Claims this interaction's one initial response, runs `send`, and releases the claim again if
	 * `send` fails.
	 *
	 * The claim is taken synchronously - an `async` body runs up to its first `await` before it
	 * returns - so an overlapping responder still cannot see `acknowledged === false` and fire too.
	 *
	 * The claim is released for anything that means Discord did not process the response: local
	 * validation, a dead connection, a `4xx` Discord refused outright. The one failure it is kept
	 * for is `40060 already acknowledged`, which is Discord saying the response *did* land - most
	 * likely a callback whose reply was lost and that `Rest` then retried. Rolling that one back
	 * would leave a real response on Discord's side that `editReply` refuses to touch locally.
	 *
	 * A `5xx` that outlives `Rest`'s retries is the ambiguous case, and is treated as not landing:
	 * a retry that fails again is a clearer error than an interaction that refuses to be answered.
	 *
	 * Called by the response methods; not intended for public use.
	 * @param method The response method acknowledging the interaction.
	 * @param send Sends the response to Discord.
	 * @param editable Whether the response leaves an original message behind - see {@link acknowledge}.
	 * @throws {Error} When the interaction has already been acknowledged, or whatever `send` throws.
	 */
	async acknowledgeWith(method: string, send: () => Promise<unknown>, editable = true): Promise<void> {
		this.acknowledge(method, editable);

		try {
			await send();
		} catch (error) {
			if (!(error instanceof DiscordAPIError && error.code === ALREADY_ACKNOWLEDGED)) {
				this.unacknowledge();
			}

			throw error;
		}
	}

	/**
	 * Throws unless this interaction has already been acknowledged.
	 *
	 * Called by the follow-up methods, which Discord only accepts once an initial response
	 * exists. Not intended for public use.
	 * @param method The method being called.
	 * @throws {Error} When the interaction has not been acknowledged yet.
	 */
	assertAcknowledged(method: string): void {
		if (this.acknowledged) return;

		throw new Error(
			`\`${method}()\` needs this interaction to have been responded to first - call ` +
			`${this.#initialResponseMethods} before it.`
		);
	}

	/**
	 * Throws unless this interaction has an original response message to act on.
	 *
	 * Stricter than {@link assertAcknowledged}: `showModal()` and `respond()` acknowledge the
	 * interaction but create no message, so the `@original` route these methods use has nothing to
	 * address. Not intended for public use.
	 * @param method The method being called.
	 * @throws {Error} When there is no original response to edit or delete.
	 */
	assertEditable(method: string): void {
		if (this.#editable) return;
		if (!this.acknowledged) return this.assertAcknowledged(method);

		const by = this.#acknowledgedBy !== null ? `\`${this.#acknowledgedBy}()\`` : "that response";
		throw new Error(
			`\`${method}()\` cannot be used after ${by} - it acknowledges the interaction without creating ` +
			`a message, so there is nothing to edit or delete.` +
			// only a modal has a follow-up interaction to point at; `respond()` (autocomplete) never
			// produces one, so the same advice there would send its author looking for an event that
			// is not coming
			(this.#acknowledgedBy === "showModal"
				? ` Respond to the interaction Discord sends when the modal is submitted instead.`
				: "")
		);
	}

	patch(data: DiscordInteraction): void {
		this.id = data.id;
		this.applicationId = data.application_id;
		this.type = data.type;
		this.token = data.token;
		this.version = data.version;
		this.appPermissions = data.app_permissions;
		this.authorizingIntegrationOwners = data.authorizing_integration_owners;
		this.attachmentSizeLimit = data.attachment_size_limit;
		this.entitlements = data.entitlements;

		if (data.guild_id !== undefined) this.guildId = data.guild_id;
		if (data.guild !== undefined) this.guild = data.guild;
		if (data.channel_id !== undefined) this.channelId = data.channel_id;
		if (data.channel !== undefined) this.channel = data.channel;
		if (data.locale !== undefined) this.locale = data.locale;
		if (data.guild_locale !== undefined) this.guildLocale = data.guild_locale;
		if (data.context !== undefined) this.context = data.context;

		if (data.member !== undefined) {
			const guild = this.guildId !== undefined ? this.client.guilds.get(this.guildId) : undefined;
			if (guild !== undefined) this.member = guild.members.upsert(data.member);
			this.user = this.client.users.upsert(data.member.user);
		} else if (data.user !== undefined) {
			this.user = this.client.users.upsert(data.user);
		}
	}
}