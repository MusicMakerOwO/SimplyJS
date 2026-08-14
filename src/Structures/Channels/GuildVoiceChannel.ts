import { DiscordChannel, DiscordOverwrite, DiscordVideoQualityModes, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { ObjectValues } from "../../Types/HelperTypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Messageable } from "../../Mixins/Channels/Messageable.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

/**
 * A standard guild voice channel.
 */
export class GuildVoiceChannel extends PermissionOverwrites(Moveable(Messageable(BaseChannel))) {
	declare type: typeof DiscordChannelTypes.GUILD_VOICE | typeof DiscordChannelTypes.GUILD_STAGE_VOICE

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	/** Bitrate (in bits) for the voice channel */
	declare bitrate?: number
	/** Maximum number of users allowed in the voice channel at once, `0` for unlimited */
	declare userLimit?: number
	/** Voice region id for the channel, or `null` to have Discord auto-select the region */
	declare rtcRegion?: string | null
	/** Camera video quality, see {@link DiscordVideoQualityModes} */
	declare videoQualityMode?: ObjectValues<typeof DiscordVideoQualityModes>
	declare parentId?: string | null

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.bitrate !== undefined) this.bitrate = data.bitrate;
		if (data.user_limit !== undefined) this.userLimit = data.user_limit;
		if (data.rtc_region !== undefined) this.rtcRegion = data.rtc_region;
		if (data.video_quality_mode !== undefined) this.videoQualityMode = data.video_quality_mode;
		if (data.parent_id !== undefined) this.parentId = data.parent_id;
	}

	async modify(options: {
		name?: string
		position?: number
		bitrate?: number
		userLimit?: number
		rtcRegion?: string | null
		videoQualityMode?: ObjectValues<typeof DiscordVideoQualityModes>
		permissionOverwrites?: DiscordOverwrite[]
		parentId?: string | null
	}): Promise<void> {
		const { userLimit, rtcRegion, videoQualityMode, permissionOverwrites, parentId, ...rest } = options;
		const payload: Partial<DiscordChannel> = { ...rest };
		if (userLimit !== undefined) payload.user_limit = userLimit;
		if (rtcRegion !== undefined) payload.rtc_region = rtcRegion;
		if (videoQualityMode !== undefined) payload.video_quality_mode = videoQualityMode;
		if (permissionOverwrites !== undefined) payload.permission_overwrites = permissionOverwrites;
		if (parentId !== undefined) payload.parent_id = parentId;
		await super.modify(payload);
	}
}