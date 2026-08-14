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
import { Channel, JSONObject } from "../Types/index.js";
import { CreateChannel } from "../Factory/CreateChannel.js";

/** Cache of a single guild's {@link Channel}s, including threads. */
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
		userLimit?: number
		/** Optional slowmode duration in seconds */
		rateLimitPerUser?: number
		/** Optional position in the channel list */
		position?: number
		/** Optional permission overwrite set */
		permissionOverwrites?: DiscordOverwrite[]
		/** Optional parent category id */
		parentId?: string | null
		/** Whether the channel is marked NSFW */
		nsfw?: boolean
		/** Optional RTC region override for voice channels */
		rtcRegion?: string | null
		/** Optional video quality mode for voice channels */
		videoQualityMode?: ObjectValues<typeof DiscordVideoQualityModes>
		/** Optional default thread archive duration in minutes */
		defaultAutoArchiveDuration?: number
		/** Optional default reaction used in forum channels */
		defaultReactionEmoji?: DiscordDefaultReaction | null
		/** Optional available tags for forum channels */
		availableTags?: DiscordForumTag[]
		/** Optional default sort order for forum posts */
		defaultSortOrder?: ObjectValues<typeof DiscordSortOrderTypes> | null
		/** Optional default forum layout */
		defaultForumLayout?: ObjectValues<typeof DiscordForumLayoutTypes>
		/** Optional default slowmode for created threads */
		defaultThreadRateLimitPerUser?: number
	}): Promise<Channel> {
		const {
			userLimit, rateLimitPerUser, permissionOverwrites, parentId, rtcRegion, videoQualityMode,
			defaultAutoArchiveDuration, defaultReactionEmoji, availableTags, defaultSortOrder,
			defaultForumLayout, defaultThreadRateLimitPerUser, ...rest
		} = options;
		const payload = {
			...rest,
			user_limit: userLimit,
			rate_limit_per_user: rateLimitPerUser,
			permission_overwrites: permissionOverwrites,
			parent_id: parentId,
			rtc_region: rtcRegion,
			video_quality_mode: videoQualityMode,
			default_auto_archive_duration: defaultAutoArchiveDuration,
			default_reaction_emoji: defaultReactionEmoji,
			available_tags: availableTags,
			default_sort_order: defaultSortOrder,
			default_forum_layout: defaultForumLayout,
			default_thread_rate_limit_per_user: defaultThreadRateLimitPerUser,
		};
		const created = await this.client.rest.post<DiscordChannel>(`/guilds/${this.guild.id}/channels`, payload as unknown as JSONObject);
		return this.upsert(created);
	}
}