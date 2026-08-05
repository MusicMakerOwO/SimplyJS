import { Client } from "../../Client.js";
import { APIClientStructure } from "../../Contracts/DiscordStructure.js";
import { DiscordInteraction, InteractionType } from "../../Types/Interactions.js";
import { InteractionContextType } from "../../Types/ApplicationCommand.js";
import { DiscordChannel, DiscordGuild } from "../../Types/DiscordAPITypes.js";
import { JSONObject } from "../../Types/Internal.js";
import { Member } from "../Member.js";
import { User } from "../User.js";

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

	constructor(client: Client, data: DiscordInteraction) {
		super(client);
		this.patch(data);
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