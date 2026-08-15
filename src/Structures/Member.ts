import { DiscordAvatarDecoration, DiscordMember, DiscordNameplate } from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Client } from "../Client.js";
import { User } from "./User.js";
import { Guild } from "./Guild.js";
import { ResolvePermissions, type PermissionResolvable } from "../Permissions/Resolver.js";
import { BitField } from "../DataStructures/BitField.js";
import { DiscordPermissions } from "../Constants.js";
import type { Channel } from "../Types/index.js";

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
	joinedAt!: string
	/** ISO timestamp for Nitro boost start, or `null` when not boosting */
	premiumSince?: string | null
	/** Voice state server deaf flag */
	deaf!: boolean
	/** Voice state server mute flag */
	mute!: boolean
	/** Member flags bitfield */
	flags!: number
	/** Whether the member still has membership screening pending */
	pending?: boolean
	/** ISO timestamp when timeout expires, or `null` when not timed out */
	communicationDisabledUntil?: string | null
	/** Avatar decoration metadata for this member profile */
	avatarDecorationData?: DiscordAvatarDecoration | null
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
		this.joinedAt = data.joined_at;
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
			this.premiumSince = data.premium_since;
		}

		if ('pending' in data) {
			this.pending = data.pending;
		}

		if ('communication_disabled_until' in data) {
			this.communicationDisabledUntil = data.communication_disabled_until;
		}

		if ('avatar_decoration_data' in data) {
			this.avatarDecorationData = data.avatar_decoration_data;
		}

		if ('collectibles' in data) {
			this.collectibles = data.collectibles;
		}
	}

	/** The member's user id, proxied from {@link Member.user} for convenience */
	get id(): string {
		return this.user.id;
	}

	/**
	 * Guild-level permissions for this member, with no channel overwrites applied.
	 *
	 * Resolved on access from the member's current roles, so the value always reflects
	 * the live cache rather than a snapshot taken at patch time. Guild owners and members
	 * with `ADMINISTRATOR` resolve to every permission.
	 *
	 * @example
	 * ```ts
	 * member.permissions.has("KICK_MEMBERS");
	 * member.permissions.toString(); // "8"
	 * ```
	 */
	permissions(): BitField<typeof DiscordPermissions> {
		return ResolvePermissions(this.guild, this);
	}

	/**
	 * Resolves this member's effective permissions inside a specific channel, applying the
	 * channel's `@everyone`, role, and member permission overwrites on top of guild permissions.
	 *
	 * @param channel The channel to resolve permissions for.
	 *
	 * @example
	 * ```ts
	 * member.permissionsIn(channel).has("SEND_MESSAGES");
	 * ```
	 */
	permissionsIn(channel: Channel): BitField<typeof DiscordPermissions> {
		return ResolvePermissions(this.guild, this, channel);
	}

	/**
	 * Tests whether this member has every provided guild-level permission.
	 *
	 * Channel overwrites are not considered — use {@link Member.hasPermissionsIn} for that.
	 *
	 * @param permissions Permission names and/or raw bit values to test.
	 *
	 * @example
	 * ```ts
	 * member.hasPermission("BAN_MEMBERS");
	 * member.hasPermission("KICK_MEMBERS", DiscordPermissions.MANAGE_ROLES);
	 * ```
	 */
	hasPermission(...permissions: PermissionResolvable): boolean {
		return this.permissions().has(...permissions);
	}

	/**
	 * Tests whether this member has every provided permission inside a specific channel,
	 * with that channel's permission overwrites applied.
	 *
	 * @param channel The channel to resolve permissions for.
	 * @param permissions Permission names and/or raw bit values to test.
	 *
	 * @example
	 * ```ts
	 * member.hasPermissionsIn(channel, "VIEW_CHANNEL", "SEND_MESSAGES");
	 * ```
	 */
	hasPermissionsIn(channel: Channel, ...permissions: PermissionResolvable): boolean {
		return this.permissionsIn(channel).has(...permissions);
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
			communication_disabled_until: expires
				? expires.toISOString()
				: null,
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
		await this.guild.bans.create(this.user.id, options);
	}

	/**
	 * Sets this member's guild nickname.
	 * @param name The nickname to set, or `null` to clear it.
	 */
	async setNickname(name: string | null): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.guild.id}/members/${this.user.id}`, {
			nick: name,
		});
	}
}