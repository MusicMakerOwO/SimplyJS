import { Guild } from "../Structures/Guild.js";
import { GlobalCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordGuild } from "../Types/DiscordAPITypes.js";

export class GuildCache extends GlobalCache<string, Guild, DiscordGuild> {
	constructor(client: Client) {
		super(client);
	}

	upsert(data: DiscordGuild): Guild {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Guild(this.client, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Guild> {
		const fetched = await this.client.rest.get<DiscordGuild>(`/guilds/${id}`);
		return this.upsert(fetched);
	}
}