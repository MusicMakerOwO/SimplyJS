import {
	DiscordChannel, DiscordDefaultReaction, DiscordForumLayoutTypes,
	DiscordForumTag, DiscordOverwrite, DiscordSortOrderTypes, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { ObjectValues } from "../../Types/HelperTypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

/**
 * A forum (or media) channel, whose posts are represented as threads.
 */
export class GuildForumChannel extends PermissionOverwrites(Moveable(BaseChannel)) {
	declare type: typeof DiscordChannelTypes.GUILD_FORUM | typeof DiscordChannelTypes.GUILD_MEDIA

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	/** Guidelines shown at the top of the forum, distinct from a thread's own content */
	declare topic?: string | null
	declare nsfw?: boolean
	declare parentId?: string | null
	/** Slowmode duration in seconds that members must wait between posting new threads, `0` for no slowmode */
	declare rateLimitPerUser?: number
	/** Set of tags that can be applied to threads in this forum */
	declare availableTags?: DiscordForumTag[]
	/** Emoji shown as the default "add reaction" button on each thread's first message */
	declare defaultReactionEmoji?: DiscordDefaultReaction | null
	/** Slowmode duration in seconds applied by default to newly created threads in this forum */
	declare defaultThreadRateLimitPerUser?: number
	/** Default order in which threads are shown, or `null` to use Discord's default (latest activity) */
	declare defaultSortOrder?: ObjectValues<typeof DiscordSortOrderTypes> | null
	/** Default layout (list vs. gallery) used to display threads in this forum */
	declare defaultForumLayout?: ObjectValues<typeof DiscordForumLayoutTypes>

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.topic !== undefined) this.topic = data.topic;
		if (data.nsfw !== undefined) this.nsfw = data.nsfw;
		if (data.parent_id !== undefined) this.parentId = data.parent_id;
		if (data.rate_limit_per_user !== undefined) this.rateLimitPerUser = data.rate_limit_per_user;
		if (data.available_tags !== undefined) this.availableTags = data.available_tags;
		if (data.default_reaction_emoji !== undefined) this.defaultReactionEmoji = data.default_reaction_emoji;
		if (data.default_thread_rate_limit_per_user !== undefined) this.defaultThreadRateLimitPerUser = data.default_thread_rate_limit_per_user;
		if (data.default_sort_order !== undefined) this.defaultSortOrder = data.default_sort_order;
		if (data.default_forum_layout !== undefined) this.defaultForumLayout = data.default_forum_layout;
	}

	async modify(options: {
		name?: string
		position?: number
		topic?: string | null
		nsfw?: boolean
		rateLimitPerUser?: number
		permissionOverwrites?: DiscordOverwrite[]
		parentId?: string | null
		availableTags?: DiscordForumTag[]
		defaultReactionEmoji?: DiscordDefaultReaction | null
		defaultThreadRateLimitPerUser?: number
		defaultSortOrder?: ObjectValues<typeof DiscordSortOrderTypes> | null
		defaultForumLayout?: ObjectValues<typeof DiscordForumLayoutTypes>
		flags?: number
	}): Promise<void> {
		const { rateLimitPerUser, permissionOverwrites, parentId, availableTags, defaultReactionEmoji, defaultThreadRateLimitPerUser, defaultSortOrder, defaultForumLayout, ...rest } = options;
		await super.modify({
			...rest,
			rate_limit_per_user: rateLimitPerUser,
			permission_overwrites: permissionOverwrites,
			parent_id: parentId,
			available_tags: availableTags,
			default_reaction_emoji: defaultReactionEmoji,
			default_thread_rate_limit_per_user: defaultThreadRateLimitPerUser,
			default_sort_order: defaultSortOrder,
			default_forum_layout: defaultForumLayout,
		} as unknown as Partial<DiscordChannel>);
	}
}