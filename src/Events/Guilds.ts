import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordGuild } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

export const GuildCreate = defineEvent({
	name: GatewayEvents.GuildCreate,
	handler: (client, data: DiscordGuild): void => {
		const guild = client.guilds.upsert(data);
		client.emit(ClientEvents.GuildCreate, guild);
	}
});

export const GuildDelete = defineEvent({
	name: GatewayEvents.GuildDelete,
	handler: (client, data: DiscordGuild): void => {
		const saved = client.guilds.get(data.id);
		client.emit(ClientEvents.GuildDelete, saved ?? data);

		client.guilds.delete(data.id);
	}
});

export const GuildUpdate = defineEvent({
	name: GatewayEvents.GuildUpdate,
	handler: (client, data: DiscordGuild): void => {
		const oldGuild = client.guilds.get(data.id);
		const newGuild = client.guilds.upsert(data);
		client.emit(ClientEvents.GuildUpdate, oldGuild, newGuild);
	}
});