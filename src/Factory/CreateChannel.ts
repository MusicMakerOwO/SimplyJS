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

/**
 * Constructs the correct concrete channel subclass for a raw Discord channel payload, based on
 * its `type`.
 *
 * DM channels, group DMs, and server directory channels are not yet handled; for any type this
 * factory doesn't recognize (including those), it logs a warning via `console.warn` and falls
 * back to a bare {@link BaseChannel}, which only exposes the shared base properties/methods
 * rather than the type-specific ones.
 * @param client The client instance.
 * @param guild The guild the channel belongs to.
 * @param data The raw channel payload.
 * @returns The constructed channel instance.
 */
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