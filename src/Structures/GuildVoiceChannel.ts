import { DiscordChannel, DiscordOverwrite, DiscordVideoQualityModes } from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { ChannelPermissionManager } from "../Managers/ChannelPermissionManager.js";

export class GuildVoiceChannel extends BaseChannel {
	position?: number
	permission_overwrites?: ChannelPermissionManager
	bitrate?: number
	user_limit?: number
	rtc_region?: string | null
	video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>
	parent_id?: string | null

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.position !== undefined) this.position = data.position;
		if (data.permission_overwrites !== undefined) this.permission_overwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites);
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