import { Channel } from "../Types/index.js";
import { Guild } from "../Structures/index.js";
import type { Client } from "../Client.js";

/**
 * Resolves the guild and channel a gateway event happened in. Both fall back to a bare
 * `{ id }` object when not present in the local cache, and `guild` is `null` for DMs.
 * @param client The client holding the caches.
 * @param channelId Channel the event happened in.
 * @param guildId Guild the channel belongs to, omitted for DMs.
 */
export function ResolveLocation(client: Client, channelId: string, guildId?: string): {
	guild: Guild | { id: string } | null,
	channel: Channel | { id: string }
} {
	const guild = guildId
		? client.guilds.get(guildId) ?? { id: guildId }
		: null;
	const channel = guild instanceof Guild
		? guild.channels.get(channelId) ?? { id: channelId }
		: { id: channelId };

	return { guild, channel };
}
