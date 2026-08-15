import { ClientEvents, defineEvent, DiscordEmoji, DiscordMember, GatewayEvents } from "../Types/index.js";
import { Guild } from "../Structures/index.js";

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
		const guild = data.guild_id
			? client.guilds.get(data.guild_id) ?? { id: data.guild_id }
			: null;
		const user = client.users.get(data.user_id) ?? { id: data.user_id };
		const channel = guild instanceof Guild ? guild.channels.get(data.channel_id) ?? { id: data.channel_id } : { id: data.channel_id }

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
				const guild = data.guild_id
					? client.guilds.get(data.guild_id) ?? { id: data.guild_id }
					: null;
				const user = client.users.get(data.user_id) ?? { id: data.user_id };
				const channel = guild instanceof Guild ? guild.channels.get(data.channel_id) ?? { id: data.channel_id } : { id: data.channel_id }

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