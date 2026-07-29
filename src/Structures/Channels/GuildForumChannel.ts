import {
	DiscordChannel, DiscordDefaultReaction, DiscordForumLayoutTypes,
	DiscordForumTag, DiscordOverwrite, DiscordSortOrderTypes, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { ObjectValues } from "../../Types/HelperTypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

export class GuildForumChannel extends PermissionOverwrites(Moveable(BaseChannel)) {
	declare type: typeof DiscordChannelTypes.GUILD_FORUM | typeof DiscordChannelTypes.GUILD_MEDIA

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	declare topic?: string | null
	declare nsfw?: boolean
	declare parent_id?: string | null
	declare rate_limit_per_user?: number
	declare available_tags?: DiscordForumTag[]
	declare default_reaction_emoji?: DiscordDefaultReaction | null
	declare default_thread_rate_limit_per_user?: number
	declare default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
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