import { DiscordChannel, DiscordOverwrite, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Messageable } from "../../Mixins/Channels/Messageable.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

/**
 * A standard guild text channel.
 */
export class GuildTextChannel extends PermissionOverwrites(Moveable(Messageable(BaseChannel))) {
	declare type: typeof DiscordChannelTypes.GUILD_TEXT | typeof DiscordChannelTypes.GUILD_ANNOUNCEMENT

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	declare topic?: string | null
	declare nsfw?: boolean
	declare last_message_id?: string | null
	/** Slowmode duration in seconds that members must wait between sending messages, `0` for no slowmode */
	declare rate_limit_per_user?: number
	declare parent_id?: string | null
	/** ISO timestamp of the last pinned message, or `null` if none are pinned; not guaranteed to be accurate */
	declare last_pin_timestamp?: string | null
	/** Default auto-archive duration, in minutes, applied to newly created threads in this channel */
	declare default_auto_archive_duration?: number

	patch(data: DiscordChannel): void {
		super.patch(data);
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