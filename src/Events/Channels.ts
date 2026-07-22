import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordChannel } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

export const ChannelCreate = defineEvent({
	name: GatewayEvents.ChannelCreate,
	handler: (client, data: DiscordChannel): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const channel = guild.channels.upsert(data);
		client.emit(ClientEvents.ChannelCreate, channel);
	}
});

export const ChannelDelete = defineEvent({
	name: GatewayEvents.ChannelDelete,
	handler: (client, data: DiscordChannel): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const saved = guild.channels.get(data.id);
		client.emit(ClientEvents.ChannelDelete, saved ?? data);
		guild.channels.delete(data.id);
	}
});

export const ChannelUpdate = defineEvent({
	name: GatewayEvents.ChannelUpdate,
	handler: (client, data: DiscordChannel): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const oldChannel = guild.channels.get(data.id);
		const newChannel = guild.channels.upsert(data);
		client.emit(ClientEvents.ChannelUpdate, oldChannel, newChannel);
	}
});