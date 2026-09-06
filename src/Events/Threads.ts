import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordChannel } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

export const ThreadCreate = defineEvent({
	name: GatewayEvents.ThreadCreate,
	handler: (client, data: DiscordChannel): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const thread = guild.channels.upsert(data);
		client.emit(ClientEvents.ThreadCreate, thread);
	}
});

export const ThreadUpdate = defineEvent({
	name: GatewayEvents.ThreadUpdate,
	handler: (client, data: DiscordChannel): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const oldThread = guild.channels.get(data.id);
		const newThread = guild.channels.upsert(data);
		client.emit(ClientEvents.ThreadUpdate, oldThread, newThread);
	}
});

export const ThreadDelete = defineEvent({
	name: GatewayEvents.ThreadDelete,
	handler: (client, data: DiscordChannel): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const saved = guild.channels.get(data.id);
		client.emit(ClientEvents.ThreadDelete, saved ?? data);
		guild.channels.delete(data.id);
	}
});
