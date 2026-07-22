import { Emoji } from "../Structures/Emoji.js";
import { GuildCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordEmoji } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

export class EmojiCache extends GuildCache<string, Emoji, DiscordEmoji> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordEmoji): Emoji {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Emoji(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Emoji> {
		const fetched = await this.client.rest.get<DiscordEmoji>(`/guilds/${this.guild.id}/emojis/${id}`);
		return this.upsert(fetched);
	}
}