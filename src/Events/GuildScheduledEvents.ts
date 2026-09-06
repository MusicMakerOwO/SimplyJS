import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordGuildScheduledEvent } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

export const GuildScheduledEventCreate = defineEvent({
	name: GatewayEvents.GuildScheduledEventCreate,
	handler: (client, data: DiscordGuildScheduledEvent): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const scheduledEvent = guild.scheduledEvents.upsert(data);
		client.emit(ClientEvents.GuildScheduledEventCreate, scheduledEvent);
	}
});

/** Also fires when an event starts, ends, or is cancelled, as those are `status` changes */
export const GuildScheduledEventUpdate = defineEvent({
	name: GatewayEvents.GuildScheduledEventUpdate,
	handler: (client, data: DiscordGuildScheduledEvent): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldEvent = guild.scheduledEvents.get(data.id);
		const newEvent = guild.scheduledEvents.upsert(data);
		client.emit(ClientEvents.GuildScheduledEventUpdate, oldEvent, newEvent);
	}
});

export const GuildScheduledEventDelete = defineEvent({
	name: GatewayEvents.GuildScheduledEventDelete,
	handler: (client, data: DiscordGuildScheduledEvent): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		// The event may never have been cached if it was created while disconnected - fall back to the raw payload
		const saved = guild.scheduledEvents.get(data.id);
		client.emit(ClientEvents.GuildScheduledEventDelete, saved ?? data);
		guild.scheduledEvents.delete(data.id);
	}
});
