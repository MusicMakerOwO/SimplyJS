import { DiscordChannel, DiscordOverwrite } from "../Types/DiscordAPITypes.js";
import { GuildVoiceChannel } from "./GuildVoiceChannel.js";

/**
 * Stage channels share all voice channel properties but have a topic
 * (the live stage subject) and no video quality mode
 */
export class GuildStageChannel extends GuildVoiceChannel {
	topic?: string | null

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.topic !== undefined) this.topic = data.topic;
	}

	// narrower than GuildVoiceChannel.modify() - no video_quality_mode or user_limit
	async modify(options: {
		name?: string
		position?: number
		bitrate?: number
		rtc_region?: string | null
		permission_overwrites?: DiscordOverwrite[]
		parent_id?: string | null
		topic?: string | null
	}): Promise<void> {
		await super.modify(options);
	}
}