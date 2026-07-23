import { GuildCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordDefaultReaction,
	DiscordForumLayoutTypes,
	DiscordForumTag,
	DiscordOverwrite,
	DiscordSortOrderTypes,
	DiscordVideoQualityModes,
} from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { Channel } from "../Types/index.js";
import { CreateChannel } from "../Factory/CreateChannel.js";

export class ChannelCache extends GuildCache<string, Channel, DiscordChannel> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordChannel): Channel {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, CreateChannel(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Channel> {
		const fetched = await this.client.rest.get<DiscordChannel>(`/channels/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Creates a new channel in this guild
	 * @param options The channel creation payload
	 */
	async create(options: {
		/** The channel name */
		name: string
		/** The channel type */
		type: ObjectValues<typeof DiscordChannelTypes>
		/** Optional channel topic */
		topic?: string | null
		/** Optional bitrate for voice channels */
		bitrate?: number
		/** Optional user limit for voice channels */
		user_limit?: number
		/** Optional slowmode duration in seconds */
		rate_limit_per_user?: number
		/** Optional position in the channel list */
		position?: number
		/** Optional permission overwrite set */
		permission_overwrites?: DiscordOverwrite[]
		/** Optional parent category id */
		parent_id?: string | null
		/** Whether the channel is marked NSFW */
		nsfw?: boolean
		/** Optional RTC region override for voice channels */
		rtc_region?: string | null
		/** Optional video quality mode for voice channels */
		video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>
		/** Optional default thread archive duration in minutes */
		default_auto_archive_duration?: number
		/** Optional default reaction used in forum channels */
		default_reaction_emoji?: DiscordDefaultReaction | null
		/** Optional available tags for forum channels */
		available_tags?: DiscordForumTag[]
		/** Optional default sort order for forum posts */
		default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
		/** Optional default forum layout */
		default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>
		/** Optional default slowmode for created threads */
		default_thread_rate_limit_per_user?: number
	}): Promise<Channel> {
		const created = await this.client.rest.post<DiscordChannel>(`/guilds/${this.guild.id}/channels`, options);
		return this.upsert(created);
	}
}