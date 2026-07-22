import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordSticker } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

export const StickersUpdate = defineEvent({
	name: GatewayEvents.GuildStickersUpdate,
	handler: (client, data: { guild_id: string, stickers: DiscordSticker[] }) => {
		const { guild_id, stickers } = data;

		const guild = client.guilds.get(guild_id);
		if (!guild) return;

		const incomingStickerIds = new Set(stickers.map(sticker => sticker.id));

		for (const sticker of stickers) {
			const oldSticker = guild.stickers.get(sticker.id);
			if (!oldSticker) {
				client.emit(ClientEvents.StickerCreate, guild, guild.stickers.upsert(sticker));
				continue;
			}

			const newSticker = guild.stickers.upsert(sticker);
			client.emit(ClientEvents.StickerUpdate, guild, oldSticker, newSticker);
		}

		for (const savedSticker of guild.stickers.values()) {
			if (!incomingStickerIds.has(savedSticker.id)) {
				client.emit(ClientEvents.StickerDelete, guild, savedSticker);
				guild.stickers.delete(savedSticker.id);
			}
		}
	}
});