import { Sticker } from "../Structures/Sticker.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordSticker } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

/** Cache of a single guild's custom {@link Sticker}s. */
export class StickerCache extends GuildScopedCache<string, Sticker, DiscordSticker> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordSticker): Sticker {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Sticker(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Sticker> {
		const fetched = await this.client.rest.get<DiscordSticker>(`/guilds/${this.guild.id}/stickers/${id}`);
		return this.upsert(fetched);
	}
}