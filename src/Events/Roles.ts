import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordRole } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

export const RoleCreate = defineEvent({
	name: GatewayEvents.GuildRoleCreate,
	handler: (client, data: { guild_id: string, role: DiscordRole }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const role = guild.roles.upsert(data.role);
		client.emit(ClientEvents.RoleCreate, guild, role);
	}
});

/**
 * Fires when a role is deleted. Emits the cached role when there is one and a bare
 * `{ id, guildId }` otherwise, since the payload carries ids only.
 */
export const RoleDelete = defineEvent({
	name: GatewayEvents.GuildRoleDelete,
	handler: (client, data: { guild_id: string, role_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return; // cache miss :(
		const saved = guild.roles.get(data.role_id);
		client.emit(ClientEvents.RoleDelete, guild, saved ?? { id: data.role_id, guildId: guild.id });
		guild.roles.delete(data.role_id);
	}
});

export const RoleUpdate = defineEvent({
	name: GatewayEvents.GuildRoleUpdate,
	handler: (client, data: { guild_id: string, role: DiscordRole }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldRole = guild.roles.get(data.role.id)?.clone();
		const newRole = guild.roles.upsert(data.role);
		client.emit(ClientEvents.RoleUpdate, guild, oldRole, newRole);
	}
});