import { DiscordChannel, DiscordOverwrite, DiscordVideoQualityModes, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { ObjectValues } from "../../Types/HelperTypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Messageable } from "../../Mixins/Channels/Messageable.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

export class GuildVoiceChannel extends PermissionOverwrites(Moveable(Messageable(BaseChannel))) {
	declare type: typeof DiscordChannelTypes.GUILD_VOICE | typeof DiscordChannelTypes.GUILD_STAGE_VOICE

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	declare bitrate?: number
	declare user_limit?: number
	declare rtc_region?: string | null
	declare video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>
	declare parent_id?: string | null

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.bitrate !== undefined) this.bitrate = data.bitrate;
		if (data.user_limit !== undefined) this.user_limit = data.user_limit;
		if (data.rtc_region !== undefined) this.rtc_region = data.rtc_region;
		if (data.video_quality_mode !== undefined) this.video_quality_mode = data.video_quality_mode;
		if (data.parent_id !== undefined) this.parent_id = data.parent_id;
	}

	async modify(options: {
		name?: string
		position?: number
		bitrate?: number
		user_limit?: number
		rtc_region?: string | null
		video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>
		permission_overwrites?: DiscordOverwrite[]
		parent_id?: string | null
	}): Promise<void> {
		await super.modify(options);
	}
}