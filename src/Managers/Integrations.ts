import { Integration } from "../Structures/Integration.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordIntegration } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

/**
 * Cache of a single guild's {@link Integration}s.
 *
 * Discord never includes integrations in the `GUILD_CREATE` payload, so this cache starts empty and
 * is filled by the `Integration*` gateway events or by an explicit
 * {@link IntegrationCache.fetchAll} call. A `GuildIntegrationsUpdate` event is Discord's hint that
 * something changed without saying what, so `fetchAll()` is the way to resync after one.
 */
export class IntegrationCache extends GuildScopedCache<string, Integration, DiscordIntegration> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordIntegration): Integration {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Integration(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	/**
	 * Fetches a single integration by id and caches it.
	 *
	 * Discord has no endpoint for one integration, so this fetches the whole list and picks the
	 * match out of it - prefer {@link IntegrationCache.fetchAll} when you want more than one.
	 * @param id Id of the integration to fetch
	 * @throws When the guild has no integration with that id
	 */
	async fetch(id: string): Promise<Integration> {
		await this.fetchAll();

		const integration = this.get(id);
		if (!integration) throw new Error(`No integration with id "${id}" in guild "${this.guild.id}"`);
		return integration;
	}

	/**
	 * Fetches every integration in this guild and caches them.
	 * Requires the `MANAGE_GUILD` permission and will error otherwise.
	 *
	 * Discord caps this list at 50 and omits the subscriber fields for bot integrations.
	 * @see https://docs.discord.com/developers/resources/guild#get-guild-integrations
	 */
	async fetchAll(): Promise<Integration[]> {
		const fetched = await this.client.rest.get<DiscordIntegration[]>(`/guilds/${this.guild.id}/integrations`);
		return fetched.map(integration => this.upsert(integration));
	}
}
