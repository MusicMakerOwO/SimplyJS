import { Guild } from "../Structures/Guild.js";
import { GlobalCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordGuild, DiscordGuildCreate } from "../Types/DiscordAPITypes.js";

/**
 * Global cache of every {@link Guild} the client is a member of.
 *
 * `upsert` accepts a {@link DiscordGuildCreate} so the extra collections a `GUILD_CREATE` dispatch
 * carries - channels, members, scheduled events, presences - reach `Guild.patch` and seed the
 * per-guild caches. A plain REST guild is assignable to it, since every extra is optional.
 */
export class GuildCache extends GlobalCache<string, Guild, DiscordGuildCreate> {
	constructor(client: Client) {
		super(client);
	}

	upsert(data: DiscordGuildCreate): Guild {
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