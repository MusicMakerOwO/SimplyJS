import { DiscordChannel, DiscordOverwrite, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { GuildVoiceChannel } from "./GuildVoiceChannel.js";

/**
 * Stage channels share all voice channel properties but have a topic
 * (the live stage subject) and no video quality mode
 */
export class GuildStageChannel extends GuildVoiceChannel {
	declare type: typeof DiscordChannelTypes.GUILD_STAGE_VOICE

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch()
	// just set during construction.
	declare topic: string | null

	patch(data: DiscordChannel): void {
		super.patch(data);
		if ('topic' in data) this.topic = data.topic ?? null;
	}

	// narrower than GuildVoiceChannel.modify() - no videoQualityMode or userLimit
	async modify(options: {
		name?: string
		position?: number
		bitrate?: number
		rtcRegion?: string | null
		permissionOverwrites?: DiscordOverwrite[]
		parentId?: string | null
		topic?: string | null
	}): Promise<void> {
		await super.modify(options);
	}
}