import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordMember } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";
import { Guild } from "../Structures/index.js";
import { ResolveLocation } from "./ResolveLocation.js";

/**
 * Fires when a user starts typing in a channel. `guild`, `channel`, and `user` fall back to a
 * bare `{ id }` object when not present in the local cache, and `guild` is `null` for DMs.
 * `member` is only sent by Discord in guilds, and is upserted into the guild's member cache.
 */
export const TypingStart = defineEvent({
	name: GatewayEvents.TypingStart,
	handler: (client, data: {
		channel_id: string,
		guild_id?: string,
		user_id: string,
		timestamp: number,
		member?: DiscordMember
	}): void => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		const member = data.member && guild instanceof Guild
			? guild.members.upsert(data.member)
			: null;

		client.emit(ClientEvents.TypingStart, {
			guild: guild,
			channel: channel,
			user: user,
			member: member,
			timestamp: new Date(data.timestamp * 1000)
		});
	}
});
