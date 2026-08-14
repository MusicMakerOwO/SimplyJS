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
	declare lastMessageId?: string | null
	/** Slowmode duration in seconds that members must wait between sending messages, `0` for no slowmode */
	declare rateLimitPerUser?: number
	declare parentId?: string | null
	/** ISO timestamp of the last pinned message, or `null` if none are pinned; not guaranteed to be accurate */
	declare lastPinTimestamp?: string | null
	/** Default auto-archive duration, in minutes, applied to newly created threads in this channel */
	declare defaultAutoArchiveDuration?: number

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.topic !== undefined) this.topic = data.topic;
		if (data.nsfw !== undefined) this.nsfw = data.nsfw;
		if (data.last_message_id !== undefined) this.lastMessageId = data.last_message_id;
		if (data.rate_limit_per_user !== undefined) this.rateLimitPerUser = data.rate_limit_per_user;
		if (data.parent_id !== undefined) this.parentId = data.parent_id;
		if (data.last_pin_timestamp !== undefined) this.lastPinTimestamp = data.last_pin_timestamp;
		if (data.default_auto_archive_duration !== undefined) this.defaultAutoArchiveDuration = data.default_auto_archive_duration;
	}

	async modify(options: {
		name?: string
		position?: number
		topic?: string | null
		nsfw?: boolean
		rateLimitPerUser?: number
		permissionOverwrites?: DiscordOverwrite[]
		parentId?: string | null
		defaultAutoArchiveDuration?: number
		flags?: number
	}): Promise<void> {
		const { rateLimitPerUser, permissionOverwrites, parentId, defaultAutoArchiveDuration, ...rest } = options;
		const payload: Partial<DiscordChannel> = { ...rest };
		if (rateLimitPerUser !== undefined) payload.rate_limit_per_user = rateLimitPerUser;
		if (permissionOverwrites !== undefined) payload.permission_overwrites = permissionOverwrites;
		if (parentId !== undefined) payload.parent_id = parentId;
		if (defaultAutoArchiveDuration !== undefined) payload.default_auto_archive_duration = defaultAutoArchiveDuration;
		await super.modify(payload);
	}
}