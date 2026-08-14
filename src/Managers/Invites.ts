import { Guild, Invite } from "../Structures/index.js";
import { Client } from "../Client.js";
import { DiscordInvite, JSONObject } from "../Types/index.js";

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
	 * @param channelId The id of the channel (must belong to this guild) to create the invite for.
	 * @param options Invite creation options.
	 * @returns The created invite.
	 * @throws {Error} When `channelId` does not refer to a channel cached on this guild.
	 */
	async create(channelId: string, options: {
		/** duration of invite in seconds before expiry, or 0 for never. between 0 and 604800 (7 days) */
		maxAge: number;
		/** max number of uses or 0 for unlimited. between 0 and 100 */
		maxUses?: number;
		/** whether this invite only grants temporary membership */
		temporary?: boolean;
		/** if true, don’t try to reuse a similar invite (useful for creating many unique one time use invites) */
		unique?: boolean;
		/** the type of target for this voice channel invite */
		targetType?: number;
		/** the id of the user whose stream to display for this invite, required if targetType is 1, the user must be streaming in the channel */
		targetUserId?: string;
		/** the id of the embedded application to open for this invite, required if targetType is 2, the application must have the EMBEDDED flag */
		targetApplicationId?: string;
		/** the role Id(s) for roles in the guild given to the users that accept this invite (requires MANAGE_SERVER permission) */
		roleIds?: string[];
	}): Promise<Invite> {
		if (!this.guild.channels.has(channelId)) throw new Error("Unknown channel, does that channel exist in this guild?");
		const payload: Record<string, unknown> = {
			max_age: options.maxAge,
			max_uses: options.maxUses,
			temporary: options.temporary,
			unique: options.unique,
			target_type: options.targetType,
			target_user_id: options.targetUserId,
			target_application_id: options.targetApplicationId,
			role_ids: options.roleIds,
		};
		for (const key of Object.keys(payload)) {
			if (payload[key] === undefined) delete payload[key];
		}
		const response = await this.client.rest.post<DiscordInvite>(`/channels/${channelId}/invites`, payload as unknown as JSONObject);
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