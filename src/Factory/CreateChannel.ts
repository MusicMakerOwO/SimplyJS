import { Client } from "../Client.js";
import { DiscordChannel, DiscordChannelTypes } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { Channel } from "../Types/index.js";
import {
	BaseChannel,
	GuildAnnouncementChannel, GuildCategoryChannel, GuildForumChannel,
	GuildStageChannel,
	GuildTextChannel, GuildThreadChannel,
	GuildVoiceChannel
} from "../Structures/index.js";

export function CreateChannel(client: Client, guild: Guild, data: DiscordChannel): Channel {
	switch (data.type) {
		case DiscordChannelTypes.GUILD_TEXT:
			return new GuildTextChannel(client, guild, data);
		case DiscordChannelTypes.GUILD_ANNOUNCEMENT:
			return new GuildAnnouncementChannel(client, guild, data);
		case DiscordChannelTypes.GUILD_VOICE:
			return new GuildVoiceChannel(client, guild, data);
		case DiscordChannelTypes.GUILD_STAGE_VOICE:
			return new GuildStageChannel(client, guild, data);
		case DiscordChannelTypes.GUILD_CATEGORY:
			return new GuildCategoryChannel(client, guild, data);
		case DiscordChannelTypes.ANNOUNCEMENT_THREAD:
		case DiscordChannelTypes.PUBLIC_THREAD:
		case DiscordChannelTypes.PRIVATE_THREAD:
			return new GuildThreadChannel(client, guild, data);
		case DiscordChannelTypes.GUILD_FORUM:
		case DiscordChannelTypes.GUILD_MEDIA:
			return new GuildForumChannel(client, guild, data);
		default:
			// TODO DMs, Group DMs, Server Directory
			console.warn('Unknown channel type:', data.type);
			return new BaseChannel(client, guild, data);
	}
}