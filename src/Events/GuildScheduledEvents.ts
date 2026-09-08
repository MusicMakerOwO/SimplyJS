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
		const oldEvent = guild.scheduledEvents.get(data.id)?.clone();
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

/**
 * Fires when a user subscribes to a scheduled event. The payload only carries ids, so `event`
 * falls back to a bare `{ id }` object when the event is not cached, and `user` does the same.
 */
export const GuildScheduledEventUserAdd = defineEvent({
	name: GatewayEvents.GuildScheduledEventUserAdd,
	handler: (client, data: { guild_scheduled_event_id: string, user_id: string, guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const scheduledEvent = guild.scheduledEvents.get(data.guild_scheduled_event_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		// Only present once the event has been fetched with user counts - leave it alone otherwise
		// rather than inventing a count that started from zero
		if (scheduledEvent?.userCount !== undefined) scheduledEvent.userCount++;

		client.emit(ClientEvents.GuildScheduledEventUserAdd, scheduledEvent ?? { id: data.guild_scheduled_event_id }, user, guild);
	}
});

/**
 * Fires when a user unsubscribes from a scheduled event. The payload only carries ids, so `event`
 * falls back to a bare `{ id }` object when the event is not cached, and `user` does the same.
 */
export const GuildScheduledEventUserRemove = defineEvent({
	name: GatewayEvents.GuildScheduledEventUserRemove,
	handler: (client, data: { guild_scheduled_event_id: string, user_id: string, guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const scheduledEvent = guild.scheduledEvents.get(data.guild_scheduled_event_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		if (scheduledEvent?.userCount !== undefined) scheduledEvent.userCount = Math.max(0, scheduledEvent.userCount - 1);

		client.emit(ClientEvents.GuildScheduledEventUserRemove, scheduledEvent ?? { id: data.guild_scheduled_event_id }, user, guild);
	}
});
