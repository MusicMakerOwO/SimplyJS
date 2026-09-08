import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordChannel } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";
import { ResolveLocation } from "./ResolveLocation.js";

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
		const oldChannel = guild.channels.get(data.id)?.clone();
		const newChannel = guild.channels.upsert(data);
		client.emit(ClientEvents.ChannelUpdate, oldChannel, newChannel);
	}
});
/**
 * Fires when a message is pinned or unpinned in a channel. Discord sends no information about
 * which message changed, only the channel and the new most recent pin timestamp, so the payload
 * is emitted as-is with the location resolved. `guild` and `channel` fall back to a bare `{ id }`
 * object when not present in the local cache, and `guild` is `null` for DMs.
 */
export const ChannelPinsUpdate = defineEvent({
	name: GatewayEvents.ChannelPinsUpdate,
	handler: (client, data: {
		guild_id?: string,
		channel_id: string,
		last_pin_timestamp?: string | null
	}): void => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);

		client.emit(ClientEvents.ChannelPinsUpdate, {
			guild: guild,
			channel: channel,
			lastPinTimestamp: data.last_pin_timestamp ?? null
		});
	}
});
