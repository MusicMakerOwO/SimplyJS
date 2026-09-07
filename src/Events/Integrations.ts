import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import {
	DiscordGuildIntegrationsUpdate,
	DiscordIntegrationCreate,
	DiscordIntegrationDelete,
	DiscordIntegrationUpdate
} from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

export const IntegrationCreate = defineEvent({
	name: GatewayEvents.IntegrationCreate,
	handler: (client, data: DiscordIntegrationCreate): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const integration = guild.integrations.upsert(data);
		client.emit(ClientEvents.IntegrationCreate, integration);
	}
});

export const IntegrationUpdate = defineEvent({
	name: GatewayEvents.IntegrationUpdate,
	handler: (client, data: DiscordIntegrationUpdate): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldIntegration = guild.integrations.get(data.id);
		const newIntegration = guild.integrations.upsert(data);
		client.emit(ClientEvents.IntegrationUpdate, oldIntegration, newIntegration);
	}
});

/**
 * Fires when an integration is removed from a guild. The payload only carries ids, so the
 * integration falls back to a bare `{ id }` object when it was not cached - which is the common
 * case, since integrations are never seeded from `GUILD_CREATE`.
 */
export const IntegrationDelete = defineEvent({
	name: GatewayEvents.IntegrationDelete,
	handler: (client, data: DiscordIntegrationDelete): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const saved = guild.integrations.get(data.id);
		client.emit(ClientEvents.IntegrationDelete, saved ?? { id: data.id }, guild, data.application_id);
		guild.integrations.delete(data.id);
	}
});

/**
 * Fires when a guild's integrations change without Discord saying how. The payload names the guild
 * and nothing else, so listeners that care about the detail should call `guild.integrations.fetchAll()`.
 */
export const GuildIntegrationsUpdate = defineEvent({
	name: GatewayEvents.GuildIntegrationsUpdate,
	handler: (client, data: DiscordGuildIntegrationsUpdate): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		client.emit(ClientEvents.GuildIntegrationsUpdate, guild);
	}
});
