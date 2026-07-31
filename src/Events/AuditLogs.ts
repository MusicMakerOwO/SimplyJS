import { ClientEvents, defineEvent, DiscordAuditLogEntry, GatewayEvents } from "../Types/index.js";

export const AuditLogEntryCreate = defineEvent({
	name: GatewayEvents.GuildAuditLogEntryCreate,
	handler: (client, data: DiscordAuditLogEntry & { guild_id: string }) => {
		const { guild_id, ...entry } = data;
		const guild = client.guilds.get(guild_id);
		if (!guild) return;
		client.emit(ClientEvents.AuditLogEntryCreate, guild, entry);
	}
});