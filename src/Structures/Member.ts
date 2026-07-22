import { DiscordAvatarDecoration, DiscordMember, DiscordNameplate } from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Client } from "../Client.js";
import { User } from "./User.js";
import { Guild } from "./Guild.js";

export class Member extends APIGuildStructure<DiscordMember> {
	/** Backing user for this guild member */
	user!: User
	/** Guild nickname, or `null` when cleared */
	nick?: string | null
	/** Guild-specific avatar hash, or `null` when unset */
	avatar?: string | null
	/** Guild-specific banner hash, or `null` when unset */
	banner?: string | null
	/** Role ids assigned to this member in the guild */
	roles!: string[]
	/** ISO timestamp when the member joined the guild */
	joined_at!: string
	/** ISO timestamp for Nitro boost start, or `null` when not boosting */
	premium_since?: string | null
	/** Voice state server deaf flag */
	deaf!: boolean
	/** Voice state server mute flag */
	mute!: boolean
	/** Member flags bitfield */
	flags!: number
	/** Whether the member still has membership screening pending */
	pending?: boolean
	/** Guild permission bitfield string, when included by the API */
	permissions?: string
	/** ISO timestamp when timeout expires, or `null` when not timed out */
	communication_disabled_until?: string | null
	/** Avatar decoration metadata for this member profile */
	avatar_decoration_data?: DiscordAvatarDecoration | null
	/** Collectible profile metadata such as active nameplate */
	collectibles?: Record<string, DiscordNameplate> | null

	constructor(client: Client, guild: Guild, data: DiscordMember) {
		super(client, guild);
		this.patch(data)
	}

	patch(data: DiscordMember): void {
		this.deaf = data.deaf;
		this.mute = data.mute;
		this.flags = data.flags;
		this.roles = data.roles;
		this.joined_at = data.joined_at;
		this.user = this.client.users.upsert(data.user);

		if ('nick' in data) {
			this.nick = data.nick;
		}

		if ('avatar' in data) {
			this.avatar = data.avatar;
		}

		if ('banner' in data) {
			this.banner = data.banner;
		}

		if ('premium_since' in data) {
			this.premium_since = data.premium_since;
		}

		if ('pending' in data) {
			this.pending = data.pending;
		}

		if ('permissions' in data) {
			this.permissions = data.permissions;
		}

		if ('communication_disabled_until' in data) {
			this.communication_disabled_until = data.communication_disabled_until;
		}

		if ('avatar_decoration_data' in data) {
			this.avatar_decoration_data = data.avatar_decoration_data;
		}

		if ('collectibles' in data) {
			this.collectibles = data.collectibles;
		}
	}

	get id(): string {
		return this.user.id;
	}

	/**
	 * Adds a role to this member.
	 * @param id The role id to assign.
	 */
	async addRole(id: string): Promise<void> {
		await this.client.rest.put(`/guilds/${this.guild.id}/members/${this.user.id}/roles/${id}`, null);
	}

	/**
	 * Removes a role from this member.
	 * @param id The role id to remove.
	 */
	async removeRole(id: string): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/members/${this.user.id}/roles/${id}`);
	}

	/**
	 * Replaces this member's role set.
	 * @param ids The full list of role ids the member should have after the update.
	 */
	async setRoles(ids: string[]): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.guild.id}/members/${this.user.id}`, {
			roles: ids,
		});
	}

	/**
	 * Applies or clears a timeout for this member.
	 * @param expires When the timeout should end, or `null` to clear it.
	 * @param reason Optional audit log reason.
	 * @throws {Error} When the timeout is more than 28 days in the future.
	 */
	async timeoutUntil(expires: Date | null, reason?: string): Promise<void> {
		if (expires && expires.getTime() - Date.now() > 28 * 24 * 60 * 60 * 1000) {
			throw new Error("Timeout duration cannot be longer than 28 days from now");
		}

		await this.client.rest.patch(`/guilds/${this.guild.id}/members/${this.user.id}`, {
			communications_disabled_until: expires
				? expires.toISOString()
				: new Date().toISOString(),
		}, reason
			? { "X-Audit-Log-Reason": reason }
			: {}
		);
	}

	/**
	 * Kicks this member from the guild.
	 * @param reason Optional audit log reason.
	 */
	async kick(reason?: string): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/members/${this.user.id}`,
			reason
			? { "X-Audit-Log-Reason": reason }
			: {}
		);
	}

	/**
	 * Bans this member from the guild.
	 *
	 * `deleteMessageSeconds` defaults to `0`, which keeps existing message history.
	 * @param options Ban options including delete window and optional audit log reason.
	 */
	async ban(options: { deleteMessageSeconds?: number, reason?: string } = {}): Promise<void> {
		await this.client.rest.put(`/guilds/${this.guild.id}/bans/${this.user.id}`, {
			delete_message_seconds: options.deleteMessageSeconds ?? 0,
		}, options.reason
			? { "X-Audit-Log-Reason": options.reason }
			: {}
		);
	}

	/**
	 * Sets this member's guild nickname.
	 * @param name The nickname to set, or `null` to clear it.
	 */
	async setNickname(name: string | null): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.guild.id}/members/${this.user.id}`, {
			nickname: name,
		});
	}
}