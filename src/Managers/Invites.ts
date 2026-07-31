import { Guild, Invite } from "../Structures/index.js";
import { Client } from "../Client.js";
import { DiscordInvite } from "../Types/index.js";

/**
 * Manages a guild's invites. This manager has no local cache — every method calls the REST API
 * directly.
 */
export class GuildInviteManager {
	client: Client;
	guild: Guild;

	constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
	}

	/**
	 * Creates an invite for a channel in this guild. Requires the `CREATE_INSTANT_INVITE`
	 * permission.
	 * @param channel_id The id of the channel (must belong to this guild) to create the invite for.
	 * @param options Invite creation options.
	 * @returns The created invite.
	 * @throws {Error} When `channel_id` does not refer to a channel cached on this guild.
	 */
	async create(channel_id: string, options: {
		/** duration of invite in seconds before expiry, or 0 for never. between 0 and 604800 (7 days) */
		max_age: number;
		/** max number of uses or 0 for unlimited. between 0 and 100 */
		max_uses?: number;
		/** whether this invite only grants temporary membership */
		temporary?: boolean;
		/** if true, don’t try to reuse a similar invite (useful for creating many unique one time use invites) */
		unique?: boolean;
		/** the type of target for this voice channel invite */
		target_type?: number;
		/** the id of the user whose stream to display for this invite, required if target_type is 1, the user must be streaming in the channel */
		target_user_id?: string;
		/** the id of the embedded application to open for this invite, required if target_type is 2, the application must have the EMBEDDED flag */
		target_application_id?: string;
		/** the role ID(s) for roles in the guild given to the users that accept this invite (requires MANAGE_SERVER permission) */
		role_ids?: string[];
	}): Promise<Invite> {
		if (!this.guild.channels.has(channel_id)) throw new Error("Unknown channel, does that channel exist in this guild?");
		const response = await this.client.rest.post<DiscordInvite>(`/channels/${channel_id}/invites`, options);
		return new Invite(this.client, response);
	}

	/**
	 * Deletes (revokes) an invite. Requires the `MANAGE_GUILD` permission, or `MANAGE_CHANNELS`
	 * plus ownership of the invite.
	 * @param code The invite code to delete.
	 * @param reason Optional audit log reason.
	 */
	async delete(code: string, reason?: string): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/invites/${code}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	/**
	 * Fetches a single invite by code.
	 * @param code The invite code to fetch.
	 */
	async fetch(code: string): Promise<Invite>;
	/**
	 * Fetches every invite for this guild. Requires the `MANAGE_GUILD` permission.
	 */
	async fetch(): Promise<Invite[]>;
	async fetch(code?: string): Promise<Invite | Invite[]> {
		if (typeof code === 'string') {
			const response = await this.client.rest.get<DiscordInvite>(`/guilds/${this.guild.id}/invites/${code}`);
			return new Invite(this.client, response);
		} else {
			const response = await this.client.rest.get<DiscordInvite[]>(`/guilds/${this.guild.id}/invites`);
			return response.map(x => new Invite(this.client, x));
		}
	}
}