import { DiscordChannel, DiscordOverwrite } from "../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Messageable } from "./Mixins/Channels/Messageable.js";
import { ChannelPermissionManager } from "../Managers/ChannelPermissionManager.js";

export class GuildTextChannel extends Messageable(BaseChannel) {
	position?: number
	permission_overwrites?: ChannelPermissionManager
	topic?: string | null
	nsfw?: boolean
	last_message_id?: string | null
	rate_limit_per_user?: number
	parent_id?: string | null
	last_pin_timestamp?: string | null
	default_auto_archive_duration?: number

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.position !== undefined) this.position = data.position;
		if (data.permission_overwrites !== undefined) this.permission_overwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites);
		if (data.topic !== undefined) this.topic = data.topic;
		if (data.nsfw !== undefined) this.nsfw = data.nsfw;
		if (data.last_message_id !== undefined) this.last_message_id = data.last_message_id;
		if (data.rate_limit_per_user !== undefined) this.rate_limit_per_user = data.rate_limit_per_user;
		if (data.parent_id !== undefined) this.parent_id = data.parent_id;
		if (data.last_pin_timestamp !== undefined) this.last_pin_timestamp = data.last_pin_timestamp;
		if (data.default_auto_archive_duration !== undefined) this.default_auto_archive_duration = data.default_auto_archive_duration;
	}

	async modify(options: {
		name?: string
		position?: number
		topic?: string | null
		nsfw?: boolean
		rate_limit_per_user?: number
		permission_overwrites?: DiscordOverwrite[]
		parent_id?: string | null
		default_auto_archive_duration?: number
		flags?: number
	}): Promise<void> {
		await super.modify(options);
	}
}