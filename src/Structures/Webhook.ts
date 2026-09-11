import {
	Channel,
	DiscordChannel,
	DiscordGuild,
	DiscordMessage,
	DiscordWebhook,
	DiscordWebhookType,
	ObjectValues
} from "../Types/index.js";
import { Client } from "../Client.js";
import { APIClientStructure } from "../Contracts/DiscordStructure.js";
import { ImageInput, MessagePayload } from "../Types/Internal.js";
import { EncodeImage } from "../Utils.js";
import { CreateMessagePayload, Message, SplitAttachments } from "./Message.js";
import { Guild } from "./Guild.js";
import { User } from "./User.js";

/** The fields accepted by {@link Webhook.edit} */
export type WebhookEditOptions = {
	/** the default name of the webhook */
	name?: string;
	/** image for the default webhook avatar, as file bytes or a data URI, or `null` to clear it */
	avatar?: ImageInput | null;
	/** the new channel id this webhook should be moved to, not available on token authenticated edits */
	channel_id?: string;
}

/**
 * Extra execution options layered on top of a {@link MessagePayload} when running a webhook.
 * @see https://docs.discord.com/developers/resources/webhook#execute-webhook
 */
export type WebhookExecuteOptions = {
	/** override the default username of the webhook */
	username?: string;
	/** override the default avatar of the webhook */
	avatar_url?: string;
	/** name of the thread to create, for forum and media channels */
	thread_name?: string;
	/** id of the thread in the webhook's channel to send the message in */
	thread_id?: string;
}

/**
 * A channel webhook, a low-effort way to post messages into a channel without a bot user.
 *
 * Webhooks returned with a {@link Webhook.token} can be executed and edited without the client's
 * own authorization, which is what {@link Webhook.send} relies on. Webhooks read back from the
 * audit log or from `GET /channels/<id>/webhooks` as an application carry no token, so
 * {@link Webhook.send} throws for them.
 *
 * @see https://docs.discord.com/developers/resources/webhook#webhook-object
 */
export class Webhook extends APIClientStructure<DiscordWebhook> {

	/** the id of the webhook */
	id!: string;
	/** the type of the webhook */
	type!: ObjectValues<typeof DiscordWebhookType>;
	/** the guild id this webhook is for, if any */
	guildId?: string | null;
	/** the channel id this webhook is for, if any */
	channelId!: string | null;
	/** the user this webhook was created by, not returned when getting a webhook with its token */
	owner?: User;
	/** the default name of the webhook */
	name!: string | null;
	/** the default user avatar hash of the webhook */
	avatar!: string | null;
	/** the secure token of the webhook, only returned for Incoming Webhooks */
	token?: string;
	/** the bot/OAuth2 application that created this webhook */
	applicationId!: string | null;
	/** the guild of the channel that this webhook is following, returned for Channel Follower Webhooks */
	sourceGuild?: Partial<DiscordGuild>;
	/** the channel that this webhook is following, returned for Channel Follower Webhooks */
	sourceChannel?: Partial<DiscordChannel>;
	/** the url used for executing the webhook, returned by the webhooks OAuth2 flow */
	url?: string;

	constructor(client: Client, data: DiscordWebhook) {
		super(client);
		this.patch(data);
	}

	patch(data: DiscordWebhook): void {
		this.id = data.id;
		this.type = data.type;
		this.channelId = data.channel_id;
		this.name = data.name;
		this.avatar = data.avatar;
		this.applicationId = data.application_id;

		if ('guild_id' in data && data.guild_id !== undefined) this.guildId = data.guild_id;
		if ('user' in data && data.user !== undefined) this.owner = this.client.users.upsert(data.user);
		if ('token' in data && data.token !== undefined) this.token = data.token;
		if ('source_guild' in data && data.source_guild !== undefined) this.sourceGuild = data.source_guild;
		if ('source_channel' in data && data.source_channel !== undefined) this.sourceChannel = data.source_channel;
		if ('url' in data && data.url !== undefined) this.url = data.url;
	}

	/**
	 * A smart getter that reads the guild from cache on first read and overwrites itself on consecutive reads
	 */
	get guild(): Guild | null {
		const value = (this.guildId ? this.client.guilds.get(this.guildId) : undefined) ?? null;
		Object.defineProperty(this, 'guild', {
			value: value,
			configurable: true
		});
		return value;
	}

	/**
	 * A smart getter that reads the channel (and guild) from cache on first read and overwrites itself on consecutive reads
	 */
	get channel(): Channel | null {
		const value = (this.channelId ? this.guild?.channels.get(this.channelId) : undefined) ?? null;
		Object.defineProperty(this, 'channel', {
			value: value,
			configurable: true
		});
		return value;
	}

	/** The webhook's default avatar as a CDN url, or `null` when it has never had one set */
	avatarURL(animated?: boolean): string | null {
		if (!this.avatar) return null;
		const isAnimated = (animated ?? true) && this.avatar.startsWith("a_"); // nullish collation, only overrides `undefined`
		return isAnimated
			? `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.gif?size=1024`
			: `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png?size=1024`
	}

	/**
	 * Edits this webhook and patches the instance with the response.
	 *
	 * Uses the token authenticated route when this webhook carries a {@link Webhook.token}, which
	 * needs no permissions but cannot move the webhook to another channel. Otherwise the bot needs
	 * the `MANAGE_WEBHOOKS` permission in the webhook's channel.
	 * @param options Fields to change, see {@link WebhookEditOptions}
	 * @param reason Optional audit log reason.
	 * @throws {Error} When `channel_id` is passed on a token authenticated edit
	 * @see https://docs.discord.com/developers/resources/webhook#modify-webhook
	 */
	async edit(options: WebhookEditOptions, reason?: string): Promise<this> {
		if (this.token && options.channel_id !== undefined) {
			throw new Error("Cannot move a webhook to another channel when editing it with its token");
		}

		const path = this.token ? `/webhooks/${this.id}/${this.token}` : `/webhooks/${this.id}`;
		const { avatar, ...rest } = options;
		const response = await this.client.rest.patch<DiscordWebhook>(
			path,
			{ ...rest, ...(avatar !== undefined && { avatar: EncodeImage(avatar) }) },
			reason ? { 'X-Audit-Log-Reason': reason } : {}
		);

		this.patch(response);
		return this;
	}

	/**
	 * Deletes this webhook permanently. Uses the token authenticated route when this webhook carries
	 * a {@link Webhook.token}, otherwise the bot needs the `MANAGE_WEBHOOKS` permission.
	 * @param reason Optional audit log reason.
	 * @see https://docs.discord.com/developers/resources/webhook#delete-webhook
	 */
	async delete(reason?: string): Promise<void> {
		const path = this.token ? `/webhooks/${this.id}/${this.token}` : `/webhooks/${this.id}`;
		return await this.client.rest.delete(path, reason ? { 'X-Audit-Log-Reason': reason } : {});
	}

	/**
	 * Executes this webhook, posting a message into its channel.
	 * @param content Either plain text content or a full message payload
	 * @param options Per-execution overrides such as `username` or `thread_id`
	 * @throws {Error} When this webhook has no token, or when the message would be empty
	 * @example
	 * await webhook.send("hello", { username: "Announcer" });
	 * @see https://docs.discord.com/developers/resources/webhook#execute-webhook
	 */
	async send(content: string | MessagePayload, options: WebhookExecuteOptions = {}): Promise<Message> {
		if (!this.token) throw new Error(`Webhook "${this.id}" has no token and cannot be executed`);

		const { body, files } = SplitAttachments(CreateMessagePayload(content));
		const { thread_id, ...overrides } = options;

		// `wait` makes Discord return the created message instead of a 204
		const query = thread_id ? `?wait=true&thread_id=${thread_id}` : `?wait=true`;
		const response = await this.client.rest.post<DiscordMessage>(`/webhooks/${this.id}/${this.token}${query}`, {
			...body,
			...overrides
		}, undefined, files);

		return new Message(this.client, response);
	}

	/** The webhook's execution URL: `${webhook}` -> `https://discord.com/api/webhooks/123/abc` */
	toString(): string {
		return this.url ?? `https://discord.com/api/webhooks/${this.id}${this.token ? `/${this.token}` : ""}`;
	}
}
