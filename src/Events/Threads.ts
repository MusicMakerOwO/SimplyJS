import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordChannel, DiscordThreadMember } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import { ThreadMember } from "../Structures/ThreadMember.js";

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
		const oldThread = guild.channels.get(data.id)?.clone();
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

/**
 * Fires when the current user's own thread membership changes. Discord never sends this for other
 * users, so the thread's `member` blob is refreshed alongside the cached {@link ThreadMember}.
 * Ignored when the guild or the thread isn't cached.
 */
export const ThreadMemberUpdate = defineEvent({
	name: GatewayEvents.ThreadMemberUpdate,
	handler: (client, data: DiscordThreadMember & { guild_id: string }): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const thread = guild.channels.get(data.id!);
		if (!(thread instanceof GuildThreadChannel)) return;

		thread.member = data;
		client.emit(ClientEvents.ThreadMemberUpdate, thread.members.upsert(data));
	}
});

/**
 * Fires when users join or leave a thread. Without the privileged `GuildMembers` intent Discord
 * only reports the current user, and `added_members` is capped at 50 entries either way - use
 * `thread.members.fetchAll()` when the full list matters. Ignored when the guild or the thread
 * isn't cached.
 */
export const ThreadMembersUpdate = defineEvent({
	name: GatewayEvents.ThreadMembersUpdate,
	handler: (client, data: {
		id: string,
		guild_id: string,
		member_count: number,
		added_members?: DiscordThreadMember[],
		removed_member_ids?: string[]
	}): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const thread = guild.channels.get(data.id);
		if (!(thread instanceof GuildThreadChannel)) return;

		thread.memberCount = data.member_count;

		const added: ThreadMember[] = [];
		for (const member of data.added_members ?? []) {
			added.push(thread.members.upsert({ ...member, id: member.id ?? data.id }));
		}

		const removed = data.removed_member_ids ?? [];
		for (const userId of removed) thread.members.delete(userId);

		client.emit(ClientEvents.ThreadMembersUpdate, {
			guild: guild,
			thread: thread,
			memberCount: data.member_count,
			added: added,
			removed: removed
		});
	}
});

/**
 * Fires when the client gains access to threads it could not previously see. The payload is the
 * complete active thread list for the channels it covers, so cached threads under those channels
 * that are absent from it have been archived or deleted and are evicted. `channel_ids` is omitted
 * when the sync covers the whole guild.
 */
export const ThreadListSync = defineEvent({
	name: GatewayEvents.ThreadListSync,
	handler: (client, data: {
		guild_id: string,
		channel_ids?: string[],
		threads: DiscordChannel[],
		members: DiscordThreadMember[]
	}): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const synced: GuildThreadChannel[] = [];
		const syncedIds = new Set<string>();
		for (const apiThread of data.threads) {
			const thread = guild.channels.upsert({ ...apiThread, guild_id: apiThread.guild_id ?? data.guild_id });
			syncedIds.add(apiThread.id);
			if (thread instanceof GuildThreadChannel) synced.push(thread);
		}

		// Thread member payloads here key by thread id, not user id - `id` is the thread.
		for (const member of data.members) {
			const thread = member.id ? guild.channels.get(member.id) : undefined;
			if (thread instanceof GuildThreadChannel) thread.members.upsert(member);
		}

		const scope = data.channel_ids ? new Set(data.channel_ids) : null;
		const evicted: string[] = [];
		for (const channel of guild.channels.values()) {
			if (!(channel instanceof GuildThreadChannel)) continue;
			if (syncedIds.has(channel.id)) continue;
			// A `null`/absent parent can't be matched against the synced channels, so leave it be.
			if (scope && !(channel.parentId && scope.has(channel.parentId))) continue;
			evicted.push(channel.id);
		}
		for (const id of evicted) guild.channels.delete(id);

		client.emit(ClientEvents.ThreadListSync, {
			guild: guild,
			threads: synced,
			evicted: evicted
		});
	}
});
