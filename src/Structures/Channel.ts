import { Client } from "../Client.js";
import {
	DiscordChannel,
	DiscordChannelTypes, DiscordDefaultReaction, DiscordForumLayoutTypes, DiscordForumTag,
	DiscordOverwrite, DiscordSortOrderTypes, DiscordThreadMember, DiscordThreadMetadata,
	DiscordVideoQualityModes
} from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { User } from "./User.js";
import { CreateMessagePayload, Message } from "./Message.js";
import { Guild } from "./Guild.js";
import { MessagePayload } from "../Types/Internal.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import { ChannelPermissionManager } from "../Managers/ChannelPermissionManager.js";

export class Channel extends APIGuildStructure<DiscordChannel> {
	id!: string
	type!: ObjectValues<typeof DiscordChannelTypes>
	guild_id?: string
	position?: number
	permission_overwrites?: ChannelPermissionManager
	name?: string | null
	topic?: string | null
	nsfw?: boolean
	last_message_id?: string | null
	bitrate?: number
	user_limit?: number
	rate_limit_per_user?: number
	recipients?: User[]
	icon?: string | null
	owner_id?: string
	application_id?: string
	managed?: boolean
	parent_id?: string | null
	last_pin_timestamp?: string | null
	rtc_region?: string | null
	video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>
	message_count?: number
	member_count?: number
	thread_metadata?: DiscordThreadMetadata
	member?: DiscordThreadMember
	default_auto_archive_duration?: number
	permissions?: string
	flags?: number
	total_message_sent?: number
	available_tags?: DiscordForumTag[]
	applied_tags?: string[]
	default_reaction_emoji?: DiscordDefaultReaction | null
	default_thread_rate_limit_per_user?: number
	default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
	default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>

	constructor(client: Client, guild: Guild, data: DiscordChannel) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordChannel): void {
		this.id = data.id;
		this.type = data.type;

		if ('guild_id' in data && data.guild_id !== undefined) {
			this.guild_id = data.guild_id;
		}

		if ('position' in data && data.position !== undefined) {
			this.position = data.position;
		}

		if ('permission_overwrites' in data && data.permission_overwrites !== undefined) {
			this.permission_overwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites);
		}

		if ('name' in data && data.name !== undefined) {
			this.name = data.name;
		}

		if ('topic' in data && data.topic !== undefined) {
			this.topic = data.topic;
		}

		if ('nsfw' in data && data.nsfw !== undefined) {
			this.nsfw = data.nsfw;
		}

		if ('last_message_id' in data && data.last_message_id !== undefined) {
			this.last_message_id = data.last_message_id;
		}

		if ('bitrate' in data && data.bitrate !== undefined) {
			this.bitrate = data.bitrate;
		}

		if ('user_limit' in data && data.user_limit !== undefined) {
			this.user_limit = data.user_limit;
		}

		if ('rate_limit_per_user' in data && data.rate_limit_per_user !== undefined) {
			this.rate_limit_per_user = data.rate_limit_per_user;
		}

		if ('recipients' in data && data.recipients !== undefined) {
			const users = [];
			for (const recipient of data.recipients) {
				users.push( this.client.users.upsert(recipient) );
			}
			this.recipients = users;
		}

		if ('icon' in data && data.icon !== undefined) {
			this.icon = data.icon;
		}

		if ('owner_id' in data && data.owner_id !== undefined) {
			this.owner_id = data.owner_id;
		}

		if ('application_id' in data && data.application_id !== undefined) {
			this.application_id = data.application_id;
		}

		if ('managed' in data && data.managed !== undefined) {
			this.managed = data.managed;
		}

		if ('parent_id' in data && data.parent_id !== undefined) {
			this.parent_id = data.parent_id;
		}

		if ('last_pin_timestamp' in data && data.last_pin_timestamp !== undefined) {
			this.last_pin_timestamp = data.last_pin_timestamp;
		}

		if ('rtc_region' in data && data.rtc_region !== undefined) {
			this.rtc_region = data.rtc_region;
		}

		if ('video_quality_mode' in data && data.video_quality_mode !== undefined) {
			this.video_quality_mode = data.video_quality_mode;
		}

		if ('message_count' in data && data.message_count !== undefined) {
			this.message_count = data.message_count;
		}

		if ('member_count' in data && data.member_count !== undefined) {
			this.member_count = data.member_count;
		}

		if ('thread_metadata' in data && data.thread_metadata !== undefined) {
			this.thread_metadata = data.thread_metadata;
		}

		if ('member' in data && data.member !== undefined) {
			this.member = data.member;
		}

		if ('default_auto_archive_duration' in data && data.default_auto_archive_duration !== undefined) {
			this.default_auto_archive_duration = data.default_auto_archive_duration;
		}

		if ('permissions' in data && data.permissions !== undefined) {
			this.permissions = data.permissions;
		}

		if ('flags' in data && data.flags !== undefined) {
			this.flags = data.flags;
		}

		if ('total_message_sent' in data && data.total_message_sent !== undefined) {
			this.total_message_sent = data.total_message_sent;
		}

		if ('available_tags' in data && data.available_tags !== undefined) {
			this.available_tags = data.available_tags;
		}

		if ('applied_tags' in data && data.applied_tags !== undefined) {
			this.applied_tags = data.applied_tags;
		}

		if ('default_reaction_emoji' in data && data.default_reaction_emoji !== undefined) {
			this.default_reaction_emoji = data.default_reaction_emoji;
		}

		if ('default_thread_rate_limit_per_user' in data && data.default_thread_rate_limit_per_user !== undefined) {
			this.default_thread_rate_limit_per_user = data.default_thread_rate_limit_per_user;
		}

		if ('default_sort_order' in data && data.default_sort_order !== undefined) {
			this.default_sort_order = data.default_sort_order;
		}

		if ('default_forum_layout' in data && data.default_forum_layout !== undefined) {
			this.default_forum_layout = data.default_forum_layout;
		}
	}

	/**
	 * Sends a message to this channel.
	 * @param content Either plain text content or a full message payload.
	 * @returns The created message structure.
	 */
	async send(content: string | MessagePayload): Promise<Message> {
		const payload = CreateMessagePayload(content);
		const response = await this.client.rest.post<DiscordMessage>(`/channels/${this.id}/messages`, payload);
		return new Message(this.client, response);
	}

	/**
	 * Deletes this channel.
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/channels/${this.id}`);
	}

	/**
	 * Modifies this channel through the guild channels REST endpoint.
	 * @param options The set of channel fields to update.
	 */
	async modify(options: {
		name?: string
		type?: ObjectValues<typeof DiscordChannelTypes>
		position?: number
		topic?: string | null
		nsfw?: boolean
		rate_limit_per_user?: number
		bitrate?: number
		user_limit?: number
		permission_overwrites?: DiscordOverwrite[]
		parent_id?: string | null
		rtc_region?: string | null
		video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>
		default_auto_archive_duration?: number
		flags?: number
		available_tags?: DiscordForumTag[]
		default_reaction_emoji?: DiscordDefaultReaction | null
		default_thread_rate_limit_per_user?: number
		default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
		default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>
	}): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.guild.id}/channels/${this.id}`, options);
	}
}