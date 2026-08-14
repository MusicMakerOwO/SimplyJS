import { DiscordUser } from "../Types/index.js";
import { Guild, User } from "../Structures/index.js";
import { Client } from "../Client.js";

/**
 * Manages a guild's bans. This manager has no local cache — every method calls the REST API
 * directly.
 */
export class GuildBanManager {
	client: Client;
	guild: Guild;

	constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
	}

	/**
	 * Bans a user from the guild. Requires the `BAN_MEMBERS` permission.
	 *
	 * `deleteMessageSeconds` defaults to `0`, which keeps existing message history.
	 * @param user The user to ban, or their id.
	 * @param options Ban options including delete window and optional audit log reason.
	 */
	async create(user: User | DiscordUser | string, options: { deleteMessageSeconds?: number, reason?: string } = {}): Promise<void> {
		const userId = typeof user === 'object' ? user.id : user;
		await this.client.rest.put(
			`/guilds/${this.guild.id}/bans/${userId}`,
			{
				delete_message_seconds: options.deleteMessageSeconds ?? 0
			},
			options.reason ? { 'X-Audit-Log-Reason': options.reason } : {}
		);
	}

	/**
	 * Removes a ban (unbans a user). Requires the `BAN_MEMBERS` permission.
	 * @param reason Optional audit log reason.
	 */
	async delete(reason?: string): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/bans/${this.guild.id}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	/**
	 * Fetches a single ban by user id.
	 * @param id The banned user's id.
	 * @returns The banned user and the ban reason, or `null` if no reason was given.
	 */
	async fetch(id: string): Promise<{ user: User, reason: string | null }>;
	/**
	 * Fetches a page of the guild's bans.
	 * @param options Pagination options.
	 * @returns A list of banned users with their ban reasons.
	 */
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