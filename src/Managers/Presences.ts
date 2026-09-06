import { Presence } from "../Structures/Presence.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordPresence } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

/**
 * Cache of a single guild's {@link Presence}s, keyed by user id.
 *
 * Only fills when the privileged `GuildPresences` intent is enabled. Seeded from the `GUILD_CREATE`
 * payload and kept current by the `PresenceUpdate` gateway event. Offline users are never stored -
 * Discord omits them from `GUILD_CREATE` and the handler deletes an entry once its status goes
 * `offline` - so residency stays proportional to online members rather than every member seen.
 */
export class PresenceCache extends GuildScopedCache<string, Presence, DiscordPresence> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordPresence): Presence {
		if (this.has(data.user.id)) {
			this.get(data.user.id)!.patch(data);
		} else {
			this.set(data.user.id, new Presence(this.client, this.guild, data));
		}
		return this.get(data.user.id)!;
	}

	/**
	 * Always throws. Discord exposes no REST route for presences - they exist only as gateway
	 * state - so there is nothing to fetch. Read from this cache instead, and enable the
	 * privileged `GuildPresences` intent if it is empty.
	 * @throws {Error} Always.
	 */
	async fetch(id: string): Promise<Presence> {
		throw new Error(`Presences are only delivered over the gateway and cannot be fetched (user ${id})`);
	}
}
