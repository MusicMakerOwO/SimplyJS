import {
	Attachment,
	DiscordMessage,
	Embed, MessageActivity, MessageCall,
	MessageReference,
	MessageTypes, Poll,
	Reaction, ResolvedData, RoleSubscriptionData, SharedClientTheme, StickerItem
} from "../Types/MessageComponents.js";
import { APIClientStructure } from "../Contracts/DiscordStructure.js";
import { DiscordApplication, DiscordChannel, DiscordSticker } from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { Client } from "../Client.js";
import { User } from "./User.js";
import { MessagePayload } from "../Types/Internal.js";
import { Emoji } from "./Emoji.js";
import { Guild } from "./Guild.js";
import { Channel } from "../Types/index.js";
import { GuildCategoryChannel } from "./GuildCategoryChannel.js";

/**
 * Normalizes user input into a valid message payload.
 * @param input Either plain text content or a full message payload.
 * @returns A payload that can be sent to the Discord messages endpoint.
 * @throws {Error} When no message content, embeds, components, or stickers are provided.
 */
export function CreateMessagePayload(input: string | MessagePayload): MessagePayload {
	if (typeof input === "string") input = { content: input };

	const hasContent: boolean =
		(input.content?.length ?? 0) > 0 ||
		(input.embeds?.length ?? 0) > 0 ||
		(input.components?.length ?? 0) > 0 ||
		(input.sticker_ids?.length ?? 0) > 0

	if (!hasContent) throw new Error("Cannot send an empty message");

	return input;
}

export class Message extends APIClientStructure<DiscordMessage> {
	id!: string
	channel_id!: string
	/**
	 * Extra field not in types
	 * @see https://docs.discord.com/developers/events/gateway-events#message-create
	 */
	guild_id?: string | null
	/**
	 * Extra field not in types
	 * @see https://docs.discord.com/developers/events/gateway-events#message-create
	 */
	member: unknown | null
	user!: User
	content!: string
	timestamp!: string
	edited_timestamp!: string | null
	tts!: boolean
	mention_everyone!: boolean
	mentions!: User[]
	mention_roles!: string[]
	mention_channels?: unknown[]
	attachments!: Attachment[]
	embeds!: Embed[]
	reactions?: Reaction[]
	nonce?: number | string
	pinned!: boolean
	webhook_id?: string
	type!: ObjectValues<typeof MessageTypes>
	activity?: MessageActivity
	application?: Partial<DiscordApplication>
	application_id?: string
	flags?: number
	message_reference?: MessageReference
	message_snapshots?: { message: Partial<DiscordMessage> }[]
	referenced_message?: DiscordMessage | null
	interaction_metadata?: unknown
	interaction?: unknown
	thread?: DiscordChannel
	components?: unknown[]
	sticker_items?: StickerItem[]
	stickers?: DiscordSticker[]
	position?: number
	role_subscription_data?: RoleSubscriptionData
	resolved?: ResolvedData
	poll?: Poll
	call?: MessageCall
	shared_client_theme?: SharedClientTheme

	constructor(client: Client, data: DiscordMessage & { guild_id?: string | null; member?: unknown | null }) {
		super(client);
		this.patch(data);
	}

	patch(data: DiscordMessage & { guild_id?: string | null; member?: unknown | null }): void {
		this.id = data.id;
		this.channel_id = data.channel_id;
		this.user = this.client.users.upsert(data.author);
		this.content = data.content;
		this.timestamp = data.timestamp;
		this.edited_timestamp = data.edited_timestamp;
		this.tts = data.tts;
		this.mention_everyone = data.mention_everyone;
		this.mention_roles = data.mention_roles;
		this.attachments = data.attachments;
		this.embeds = data.embeds;
		this.pinned = data.pinned;
		this.type = data.type;

		const mentionUsers = [];
		for (const user of data.mentions) {
			mentionUsers.push( this.client.users.upsert(user) );
		}
		this.mentions = mentionUsers;

		if ("mention_channels" in data && data.mention_channels !== undefined) this.mention_channels = data.mention_channels;
		if ("reactions" in data && data.reactions !== undefined) this.reactions = data.reactions;
		if ("nonce" in data && data.nonce !== undefined) this.nonce = data.nonce;
		if ("webhook_id" in data && data.webhook_id !== undefined) this.webhook_id = data.webhook_id;
		if ("activity" in data && data.activity !== undefined) this.activity = data.activity;
		if ("application" in data && data.application !== undefined) this.application = data.application;
		if ("application_id" in data && data.application_id !== undefined) this.application_id = data.application_id;
		if ("flags" in data && data.flags !== undefined) this.flags = data.flags;
		if ("message_reference" in data && data.message_reference !== undefined) this.message_reference = data.message_reference;
		if ("message_snapshots" in data && data.message_snapshots !== undefined) this.message_snapshots = data.message_snapshots;
		if ("referenced_message" in data && data.referenced_message !== undefined) this.referenced_message = data.referenced_message;
		if ("interaction_metadata" in data && data.interaction_metadata !== undefined) this.interaction_metadata = data.interaction_metadata;
		if ("interaction" in data && data.interaction !== undefined) this.interaction = data.interaction;
		if ("thread" in data && data.thread !== undefined) this.thread = data.thread;
		if ("components" in data && data.components !== undefined) this.components = data.components;
		if ("sticker_items" in data && data.sticker_items !== undefined) this.sticker_items = data.sticker_items;
		if ("stickers" in data && data.stickers !== undefined) this.stickers = data.stickers;
		if ("position" in data && data.position !== undefined) this.position = data.position;
		if ("role_subscription_data" in data && data.role_subscription_data !== undefined) this.role_subscription_data = data.role_subscription_data;
		if ("resolved" in data && data.resolved !== undefined) this.resolved = data.resolved;
		if ("poll" in data && data.poll !== undefined) this.poll = data.poll;
		if ("call" in data && data.call !== undefined) this.call = data.call;
		if ("shared_client_theme" in data && data.shared_client_theme !== undefined) this.shared_client_theme = data.shared_client_theme;

		if ("guild_id" in data) this.guild_id ??= data.guild_id;
		if ("member" in data) this.member ??= data.member;
	}

	/**
	 * A smart getter that reads the guild from cache on first read and overwrites itself on consecutive reads
	 */
	get guild(): Guild | null {
		const value = this.client.guilds.get(this.guild_id!) ?? null;
		Object.defineProperty(this, 'guild', {
			value: value
		});
		return value;
	}

	/**
	 * A smart getter that reads the channel (and guild) from cache on first read and overwrites itself on consecutive reads
	 */
	// physically impossible for a message to be sent in a category lmao
	get channel(): Exclude<Channel, GuildCategoryChannel> | null {
		const value = this.guild?.channels.get(this.channel_id) ?? null;
		Object.defineProperty(this, 'channel', {
			value: value
		});
		return value as Exclude<Channel, GuildCategoryChannel>;
	}

	/**
	 * Sends a reply to this message.
	 * @param content Either plain text content or a full message payload.
	 * @param options Reply behavior options.
	 * @returns The created reply message.
	 */
	async reply(content: string | MessagePayload, options: { ping?: boolean } = {}): Promise<Message> {
		const payload = CreateMessagePayload(content);
		payload.message_reference = {
			message_id: this.id
		}
		if (!options.ping) {
			payload.allowed_mentions ??= {};
			payload.allowed_mentions.replied_user ??= false
		}
		const response = await this.client.rest.post<DiscordMessage>(`/channels/${this.channel_id}/messages`, payload);
		return new Message(this.client, response);
	}

	/**
	 * Deletes a message. Requires the `MANAGE_MESSAGES` permission and will error otherwise.
	 */
	async delete(): Promise<void> {
		return await this.client.rest.delete(`/channels/${this.channel_id}/messages/${this.id}`);
	}

	/**
	 * Edits this message.
	 *
	 * Only messages authored by the current bot user can be updated.
	 * @param content Updated message content or payload.
	 * @returns The updated message.
	 * @throws {Error} When attempting to edit a message not authored by the bot.
	 */
	async update(content: string | Omit<MessagePayload, 'sticker_ids' | 'message_reference'>): Promise<Message> {
		if (this.user.id !== this.client.user!.id) throw new Error("Can only edit messages sent by the bot");
		const payload = CreateMessagePayload(content);
		const response = await this.client.rest.patch<DiscordMessage>(`/channels/${this.channel_id}/messages/${this.id}`, payload);
		return new Message(this.client, response);
	}

	/**
	 * Pins this message in its channel.
	 */
	async pin(): Promise<void> {
		await this.client.rest.put(`/channels/${this.channel_id}/messages/pins/${this.id}`, null);
	}

	/**
	 * Removes this message from channel pins.
	 */
	async unpin(): Promise<void> {
		await this.client.rest.delete(`/channels/${this.channel_id}/messages/pins/${this.id}`);
	}

	/**
	 * Add a reaction to the message as the bot
	 * @example
	 * ```ts
	 * await message.react('😀');
	 * await message.react(guild.emojis.get('1234567890'));
	 * await message.react({ id: "1234567890", name: "RainbowFrogDance" });
	 * ```
	 */
	async react(input: string | Emoji | {id: string, name: string}): Promise<void> {
		let encodedEmoji: string;
		if (typeof input === 'string') {
			encodedEmoji = encodeURI(input);
		} else {
			encodedEmoji = encodeURI(input.name + ':' + input.id);
		}
		await this.client.rest.put(`/channels/${this.channel_id}/messages/${this.id}/reactions/${encodedEmoji}/@me`, null)
	}
}