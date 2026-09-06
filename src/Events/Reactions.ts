import { Channel, ClientEvents, defineEvent, DiscordEmoji, DiscordMember, GatewayEvents } from "../Types/index.js";
import { Guild } from "../Structures/index.js";
import type { Client } from "../Client.js";

/**
 * Resolves the guild and channel a reaction event happened in. Both fall back to a bare
 * `{ id }` object when not present in the local cache, and `guild` is `null` for DMs.
 * @param client The client holding the caches.
 * @param channelId Channel the reaction event happened in.
 * @param guildId Guild the channel belongs to, omitted for DMs.
 */
function ResolveLocation(client: Client, channelId: string, guildId?: string): {
	guild: Guild | { id: string } | null,
	channel: Channel | { id: string }
} {
	const guild = guildId
		? client.guilds.get(guildId) ?? { id: guildId }
		: null;
	const channel = guild instanceof Guild
		? guild.channels.get(channelId) ?? { id: channelId }
		: { id: channelId };

	return { guild, channel };
}

/**
 * Fires when a reaction is added to a message. `guild`, `channel`, and `user` fall back to a
 * bare `{ id }` object when not present in the local cache.
 */
export const ReactionAdd = defineEvent({
	name   : GatewayEvents.MessageReactionAdd,
	handler: async (client, data: {
		user_id: string,
		channel_id: string,
		message_id: string,
		guild_id?: string,
		/* Only present if in a guild */
		member?: DiscordMember,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		message_author_id?: string,
		/** True if this is a super reaction */
		burst: boolean,
		burst_colors?: string[],
		/* 0: normal, 1: burst */
		type: number
	}) => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		const member = 'member' in data && guild instanceof Guild
			? guild.members.upsert(data.member)
			: null;

		client.emit(ClientEvents.ReactionAdd, {
			guild: guild,
			channel: channel,
			user: user,
			messageId: data.message_id,
			member: member,
			emoji: data.emoji,
			messageUserId: data.message_author_id ?? null,
			superReaction: data.burst
		})

	}
})

/**
 * Fires when a reaction is removed from a message. `guild`, `channel`, and `user` fall
 * back to a bare `{ id }` object when not present in the local cache. Discord does not
 * include member data on this event, so `member` is always `null`.
 */
export const ReactionRemove = defineEvent({
	name: GatewayEvents.MessageReactionRemove,
	handler: async (client, data: {
		user_id: string,
		channel_id: string,
		message_id: string,
		guild_id?: string,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		message_author_id?: string
	}) => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		client.emit(ClientEvents.ReactionRemove, {
			guild: guild,
			channel: channel,
			user: user,
			messageId: data.message_id,
			member: null,
			emoji: data.emoji,
			messageUserId: data.message_author_id ?? null,
			superReaction: false
		})
	}
})

/**
 * Fires when every reaction is cleared from a message, usually by a moderator. `guild` and
 * `channel` fall back to a bare `{ id }` object when not present in the local cache, and
 * `guild` is `null` for DMs. Discord sends no information about the reactions that were
 * removed, only where they were removed from.
 */
export const ReactionRemoveAll = defineEvent({
	name: GatewayEvents.MessageReactionRemoveAll,
	handler: async (client, data: {
		channel_id: string,
		message_id: string,
		guild_id?: string
	}) => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);

		client.emit(ClientEvents.ReactionRemoveAll, {
			guild: guild,
			channel: channel,
			messageId: data.message_id
		})
	}
})

/**
 * Fires when every reaction for a single emoji is cleared from a message. `guild` and
 * `channel` fall back to a bare `{ id }` object when not present in the local cache, and
 * `guild` is `null` for DMs.
 */
export const ReactionRemoveEmoji = defineEvent({
	name: GatewayEvents.MessageReactionRemoveEmoji,
	handler: async (client, data: {
		channel_id: string,
		message_id: string,
		guild_id?: string,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>
	}) => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);

		client.emit(ClientEvents.ReactionRemoveEmoji, {
			guild: guild,
			channel: channel,
			messageId: data.message_id,
			emoji: data.emoji
		})
	}
})
