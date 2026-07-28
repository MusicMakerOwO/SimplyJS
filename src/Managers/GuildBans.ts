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

	async fetch(id: string): Promise<{ user: User, reason: string | null }> {
		const response = await this.client.rest.get<{ user: DiscordUser, reason: string | null }>(`/guilds/${this.guild.id}/bans/${id}`);
		return {
			user: this.client.users.upsert(response.user),
			reason: response.reason
		}
	}
}