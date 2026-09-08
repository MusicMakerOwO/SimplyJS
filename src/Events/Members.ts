import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordMember, DiscordPresence, DiscordUser, Status } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";
import { Member } from "../Structures/Member.js";
import { Presence } from "../Structures/Presence.js";

/** Fires when a member joins a guild; ignored if the guild isn't cached */
export const MemberCreate = defineEvent({
	name: GatewayEvents.GuildMemberAdd,
	handler: (client, data: DiscordMember & { guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const member = guild.members.upsert(data);
		client.emit(ClientEvents.MemberCreate, member);
	}
});

/** Fires when a member leaves or is removed from a guild; ignored if the guild isn't cached */
export const MemberDelete = defineEvent({
	name: GatewayEvents.GuildMemberRemove,
	handler: (client, data: { user: DiscordUser, guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id!);
		if (!guild) return;
		const saved = guild.members.get(data.user.id);
		client.emit(ClientEvents.MemberDelete, saved ?? data.user);
		guild.members.delete(data.user.id);
	}
});

/** Fires when guild member data (nickname, roles, etc) changes; ignored if the guild isn't cached */
export const MemberUpdate = defineEvent({
	name: GatewayEvents.GuildMemberUpdate,
	handler: (client, data: DiscordMember & { guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldMember = guild.members.get(data.user.id)?.clone();
		const newMember = guild.members.upsert(data);
		client.emit(ClientEvents.MemberUpdate, oldMember, newMember);
	}
});

/**
 * Fires for each slice of members returned by a `RequestGuildMembers` (op 8) request; ignored if
 * the guild isn't cached.
 *
 * Discord answers a single request with `chunk_count` chunks, so the response is only complete once
 * a chunk with `chunk_index === chunk_count - 1` arrives. The `nonce` sent with the request is
 * echoed on every chunk, which is what lets concurrent requests be told apart -
 * `MemberCache.fetchGateway()` uses it to reassemble one request's members.
 *
 * Presences only appear when the request asked for them, and follow the same rule as
 * `PresenceUpdate`: `offline` users are not kept in the cache.
 */
export const MembersChunk = defineEvent({
	name: GatewayEvents.GuildMembersChunk,
	handler: (client, data: {
		guild_id: string,
		members: DiscordMember[],
		chunk_index: number,
		chunk_count: number,
		not_found?: string[],
		presences?: DiscordPresence[],
		nonce?: string
	}): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const members: Member[] = data.members.map((member) => guild.members.upsert(member));

		const presences: Presence[] = [];
		for (const apiPresence of data.presences ?? []) {
			presences.push(guild.presences.upsert(apiPresence));
			if (apiPresence.status === Status.OFFLINE) guild.presences.delete(apiPresence.user.id);
		}

		client.emit(ClientEvents.GuildMembersChunk, {
			guild,
			members,
			presences,
			chunkIndex: data.chunk_index,
			chunkCount: data.chunk_count,
			// `not_found` ids are raw strings, not snowflake-shaped members, so they pass through as-is
			notFound: data.not_found ?? [],
			...(data.nonce === undefined ? {} : { nonce: data.nonce })
		});
	}
});