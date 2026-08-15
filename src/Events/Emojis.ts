import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordEmoji } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/**
 * Fires on a guild emoji sync; diffs the incoming emoji list against the cache to derive and
 * emit individual `EmojiCreate`/`EmojiUpdate`/`EmojiDelete` events.
 *
 * `GUILD_EMOJIS_UPDATE` always carries the guild's *full* emoji list, not a delta. If the guild's
 * emoji cache was never populated (e.g. a fresh connect where `GUILD_CREATE` carried no emojis),
 * the first sync will emit `EmojiCreate` for every existing emoji rather than nothing - this is
 * intentional, not a bug.
 */
export const EmojisUpdate = defineEvent({
	name: GatewayEvents.GuildEmojisUpdate,
	handler: (client, data: { guild_id: string, emojis: DiscordEmoji[] }) => {
		const { guild_id, emojis } = data;

		const guild = client.guilds.get(guild_id);
		if (!guild) return;

		const incomingEmojiIds = new Set(emojis.map(emoji => emoji.id));

		for (const emoji of emojis) {
			const oldEmoji = guild.emojis.get(emoji.id);
			if (!oldEmoji) {
				client.emit(ClientEvents.EmojiCreate, guild, guild.emojis.upsert(emoji));
				continue;
			}

			const newEmoji = guild.emojis.upsert(emoji);
			client.emit(ClientEvents.EmojiUpdate, guild, oldEmoji, newEmoji);
		}

		for (const savedEmoji of guild.emojis.values()) {
			if (!incomingEmojiIds.has(savedEmoji.id)) {
				client.emit(ClientEvents.EmojiDelete, guild, savedEmoji);
				guild.emojis.delete(savedEmoji.id);
			}
		}
	}
});