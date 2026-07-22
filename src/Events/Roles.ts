import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordRole } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

export const RoleCreate = defineEvent({
	name: GatewayEvents.GuildRoleCreate,
	handler: (client, data: { guild_id: string, role: DiscordRole }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const channel = guild.roles.upsert(data.role);
		client.emit(ClientEvents.RoleCreate, channel);
	}
});

export const RoleDelete = defineEvent({
	name: GatewayEvents.GuildRoleDelete,
	handler: (client, data: { guild_id: string, role_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return; // cache miss :(
		const saved = guild.roles.get(data.role_id);
		if (!saved) return; // cache miss :(
		client.emit(ClientEvents.RoleDelete, saved);
		guild.roles.delete(data.role_id);
	}
});

export const RoleUpdate = defineEvent({
	name: GatewayEvents.GuildRoleUpdate,
	handler: (client, data: { guild_id: string, role: DiscordRole }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldRole = guild.roles.get(data.role.id);
		const newRole = guild.roles.upsert(data.role);
		client.emit(ClientEvents.RoleUpdate, oldRole, newRole);
	}
});