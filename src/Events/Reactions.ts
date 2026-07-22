import { ClientEvents, defineEvent, DiscordEmoji, DiscordMember, GatewayEvents } from "../Types/index.js";
import { Guild } from "../Structures/index.js";

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
		const channel = guild instanceof Guild ? guild.channels.get(data.guild_id!) ?? { id: data.channel_id } : { id: data.channel_id }

		const member = 'member' in data && guild instanceof Guild
			? guild.members.upsert(data.member)
			: null;

		client.emit(ClientEvents.ReactionAdd, {
			guild: guild,
			channel: channel,
			user: user,
			message_id: data.message_id,
			member: member,
			emoji: data.emoji,
			message_user_id: data.message_author_id ?? null,
			super_reaction: data.burst
		})

	}
})

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
					message_id: data.message_id,
					member: null,
					emoji: data.emoji,
					message_user_id: data.message_author_id ?? null,
					super_reaction: false
				})
			}
		})