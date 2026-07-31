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
	declare parent_id?: string | null
	/** Slowmode duration in seconds that members must wait between posting new threads, `0` for no slowmode */
	declare rate_limit_per_user?: number
	/** Set of tags that can be applied to threads in this forum */
	declare available_tags?: DiscordForumTag[]
	/** Emoji shown as the default "add reaction" button on each thread's first message */
	declare default_reaction_emoji?: DiscordDefaultReaction | null
	/** Slowmode duration in seconds applied by default to newly created threads in this forum */
	declare default_thread_rate_limit_per_user?: number
	/** Default order in which threads are shown, or `null` to use Discord's default (latest activity) */
	declare default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
	/** Default layout (list vs. gallery) used to display threads in this forum */
	declare default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.topic !== undefined) this.topic = data.topic;
		if (data.nsfw !== undefined) this.nsfw = data.nsfw;
		if (data.parent_id !== undefined) this.parent_id = data.parent_id;
		if (data.rate_limit_per_user !== undefined) this.rate_limit_per_user = data.rate_limit_per_user;
		if (data.available_tags !== undefined) this.available_tags = data.available_tags;
		if (data.default_reaction_emoji !== undefined) this.default_reaction_emoji = data.default_reaction_emoji;
		if (data.default_thread_rate_limit_per_user !== undefined) this.default_thread_rate_limit_per_user = data.default_thread_rate_limit_per_user;
		if (data.default_sort_order !== undefined) this.default_sort_order = data.default_sort_order;
		if (data.default_forum_layout !== undefined) this.default_forum_layout = data.default_forum_layout;
	}

	async modify(options: {
		name?: string
		position?: number
		topic?: string | null
		nsfw?: boolean
		rate_limit_per_user?: number
		permission_overwrites?: DiscordOverwrite[]
		parent_id?: string | null
		available_tags?: DiscordForumTag[]
		default_reaction_emoji?: DiscordDefaultReaction | null
		default_thread_rate_limit_per_user?: number
		default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
		default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>
		flags?: number
	}): Promise<void> {
		await super.modify(options);
	}
}