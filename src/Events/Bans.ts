import { ClientEvents, defineEvent, DiscordUser, GatewayEvents } from "../Types/index.js";

export const GuildBanAdd = defineEvent({
	name: GatewayEvents.GuildBanAdd,
	handler: (client, data: { guild_id: string, user: DiscordUser }) => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const user = client.users.upsert(data.user);
		client.emit(ClientEvents.GuildBanAdd, guild, user);
	}
});

export const GuildBanRemove = defineEvent({
	name: GatewayEvents.GuildBanRemove,
	handler: (client, data: { guild_id: string, user: DiscordUser }) => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const user = client.users.upsert(data.user);
		client.emit(ClientEvents.GuildBanRemove, guild, user);
	}
});