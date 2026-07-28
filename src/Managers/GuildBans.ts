import { DiscordUser } from "../Types/index.js";
import { Guild, User } from "../Structures/index.js";
import { Client } from "../Client.js";

export class GuildBanManager {
	client: Client;
	guild: Guild;

	constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
	}

	async create(user: User | DiscordUser | string, reason?: string): Promise<void> {
		const userID = typeof user === 'object' ? user.id : user;
		await this.client.rest.post(`/guild/${this.guild.id}/bans/${userID}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	async delete(reason?: string): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/bans/${this.guild.id}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	async fetch(id: string): Promise<{ user: User, reason: string | null }>;
	async fetch(options?: {
		/** Number of users to return (up to 1000, default 1000) */
		limit?: number;
		/** Consider only users before given user ID - Useful in batching  */
		before?: string;
		/** Consider only users after given user ID - Useful in batching  */
		after?: string
	}): Promise<{ user: User, reason: string | null }[]>;
	async fetch(options?: string | { limit?: number; before?: string; after?: string }): Promise<{ user: User, reason: string | null } | { user: User, reason: string | null }[]> {
		if (typeof options === 'string') {
			const response = await this.client.rest.get<{
				user: DiscordUser,
				reason: string | null
			}>(`/guilds/${this.guild.id}/bans/${options}`);
			return {
				user: this.client.users.upsert(response.user),
				reason: response.reason
			}
		} else {
			const params = new URLSearchParams();
			if (options?.limit) params.append('limit', options.limit.toString());
			if (options?.before) params.append('before', options.before);
			if (options?.after) params.append('after', options.after);
			const query = params.toString()
				? `?${params.toString()}`
				: '';

			const response = await this.client.rest.get<{
				user: DiscordUser,
				reason: string | null
			}[]>(`/guilds/${this.guild.id}/bans${query}`);
			const list = new Array(response.length);
			for (let i = 0; i < response.length; i++) {
				const ban = response[i];
				list[i] = {
					user: this.client.users.upsert(ban.user),
					reason: ban.reason
				}
			}
			return list;
		}
	}
}