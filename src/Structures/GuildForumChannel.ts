import {
	DiscordChannel, DiscordDefaultReaction, DiscordForumLayoutTypes,
	DiscordForumTag, DiscordOverwrite, DiscordSortOrderTypes
} from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { ChannelPermissionManager } from "../Managers/ChannelPermissionManager.js";

export class GuildForumChannel extends BaseChannel {
	position?: number
	permission_overwrites?: ChannelPermissionManager
	topic?: string | null
	nsfw?: boolean
	parent_id?: string | null
	rate_limit_per_user?: number
	available_tags?: DiscordForumTag[]
	default_reaction_emoji?: DiscordDefaultReaction | null
	default_thread_rate_limit_per_user?: number
	default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null
	default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.position !== undefined) this.position = data.position;
		if (data.permission_overwrites !== undefined) this.permission_overwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites);
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