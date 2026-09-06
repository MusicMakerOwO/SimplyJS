import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordPresence, Status } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/**
 * Fires when a user's status or activities change; ignored if the guild isn't cached. Requires the
 * privileged `GuildPresences` intent.
 *
 * The cached presence is patched in place, so the previous presence is cloned before the update to
 * give listeners a real before/after pair rather than the same mutated object twice. Presences that
 * go `offline` are emitted and then dropped from the cache, keeping it proportional to online users.
 */
export const PresenceUpdate = defineEvent({
	name: GatewayEvents.PresenceUpdate,
	handler: (client, data: DiscordPresence & { guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const oldPresence = guild.presences.get(data.user.id)?.clone();
		const newPresence = guild.presences.upsert(data);
		client.emit(ClientEvents.PresenceUpdate, oldPresence, newPresence);

		if (data.status === Status.OFFLINE) guild.presences.delete(data.user.id);
	}
});