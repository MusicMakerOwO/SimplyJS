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
import { CreateMessagePayload, PreparePayload } from "./Message.js";
import { WebhookMessage, WebhookMessageContext, WebhookMessageRoute } from "./WebhookMessage.js";
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
	async send(content: string | MessagePayload, options: WebhookExecuteOptions = {}): Promise<WebhookMessage> {
		const token = this.#requireToken();

		const { body, files } = PreparePayload(CreateMessagePayload(content));
		const { thread_id, ...overrides } = options;

		// `wait` makes Discord return the created message instead of a 204
		const query = thread_id ? `?wait=true&thread_id=${thread_id}` : `?wait=true`;
		const response = await this.client.rest.post<DiscordMessage>(`/webhooks/${this.id}/${token}${query}`, {
			...body,
			...overrides
		}, undefined, files);

		// a `thread_name` send creates the thread as part of the request, so the thread to address
		// later is not known up front - it is the channel the returned message landed in
		const threadId = thread_id ?? (overrides.thread_name ? response.channel_id : undefined);
		return new WebhookMessage(this.client, response, this.#messageContext(threadId));
	}

	/**
	 * Fetches a message this webhook sent, as a {@link WebhookMessage} that can be edited and deleted
	 * through the webhook.
	 * @param messageId Id of the message to fetch
	 * @param threadId Id of the thread the message lives in, required when it was sent into one
	 * @throws {Error} When this webhook has no token
	 * @see https://docs.discord.com/developers/resources/webhook#get-webhook-message
	 */
	async fetchMessage(messageId: string, threadId?: string): Promise<WebhookMessage> {
		const context = this.#messageContext(threadId);
		const response = await this.client.rest.get<DiscordMessage>(WebhookMessageRoute(messageId, context));
		return new WebhookMessage(this.client, response, context);
	}

	/**
	 * Edits a message this webhook sent, without fetching it first.
	 *
	 * Unlike {@link WebhookMessage.update}, this cannot hold the edit to the Components V2 rules on the
	 * strength of what it is editing - the message is addressed by id rather than fetched, so its flags
	 * are never seen here. An edit that looks like v2 on its own is still checked; one that does not is
	 * left to Discord. Use {@link fetchMessage} first when that matters.
	 * @param messageId Id of the message to edit
	 * @param content Updated message content or payload
	 * @param threadId Id of the thread the message lives in, required when it was sent into one
	 * @throws {Error} When this webhook has no token, or the payload breaks a Components V2 rule
	 * @see https://docs.discord.com/developers/resources/webhook#edit-webhook-message
	 */
	async editMessage(
		messageId: string,
		content: string | Omit<MessagePayload, 'sticker_ids' | 'message_reference'>,
		threadId?: string
	): Promise<WebhookMessage> {
		const context = this.#messageContext(threadId);
		const { body, files } = PreparePayload(CreateMessagePayload(content));
		const response = await this.client.rest.patch<DiscordMessage>(
			WebhookMessageRoute(messageId, context),
			body,
			undefined,
			files
		);
		return new WebhookMessage(this.client, response, context);
	}

	/**
	 * Deletes a message this webhook sent, which needs no permissions.
	 * @param messageId Id of the message to delete
	 * @param threadId Id of the thread the message lives in, required when it was sent into one
	 * @throws {Error} When this webhook has no token
	 * @see https://docs.discord.com/developers/resources/webhook#delete-webhook-message
	 */
	async deleteMessage(messageId: string, threadId?: string): Promise<void> {
		return await this.client.rest.delete(WebhookMessageRoute(messageId, this.#messageContext(threadId)));
	}

	/**
	 * The webhook's token, or an error naming the webhook that has none.
	 *
	 * Every message route is token authenticated - there is no bot-authenticated equivalent the way
	 * there is for {@link edit} and {@link delete} - so a tokenless webhook cannot use any of them.
	 * @throws {Error} When this webhook has no token
	 */
	#requireToken(): string {
		if (!this.token) throw new Error(`Webhook "${this.id}" has no token and cannot be executed`);
		return this.token;
	}

	/** Pairs this webhook's id and token with a thread, for the {@link WebhookMessage} routes */
	#messageContext(threadId?: string): WebhookMessageContext {
		return {
			webhookId: this.id,
			webhookToken: this.#requireToken(),
			...(threadId !== undefined && { threadId })
		};
	}

	/** The webhook's execution URL: `${webhook}` -> `https://discord.com/api/webhooks/123/abc` */
	toString(): string {
		return this.url ?? `https://discord.com/api/webhooks/${this.id}${this.token ? `/${this.token}` : ""}`;
	}
}
