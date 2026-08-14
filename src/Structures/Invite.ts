import {
	DiscordApplication,
	DiscordChannel,
	DiscordGuild,
	DiscordInvite,
	DiscordInviteTargetTypes,
	DiscordInviteTypes,
	DiscordRole,
	GatewayInvite,
	JSONObject,
	ObjectValues,
	Channel
} from "../Types/index.js";
import { Client } from "../Client.js";
import { APIClientStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { Role } from "./Role.js";
import { User } from "./User.js";

/**
 * The partial role objects embedded in an invite payload fetched from the API.
 */
export type PartialInviteRole = Pick<DiscordRole, 'id' | 'name' | 'position' | 'color' | 'colors' | 'icon' | 'unicode_emoji'>;

/**
 * Either of the two shapes Discord uses for invites.
 *
 * The REST API embeds full-ish `guild`, `channel` and `roles` objects, while the gateway
 * only sends `guild_id`, `channel_id` and `role_ids`. {@link Invite} normalizes both down
 * to the id-based shape and resolves the objects from cache on demand.
 */
export type AnyInviteData = DiscordInvite | GatewayInvite;

/**
 * A guild invite. Normalizes the differing REST and gateway payload shapes (see
 * {@link AnyInviteData}) down to id-based fields, resolving `guild`, `channel` and
 * `roles` from cache lazily via the partial data kept for uncached targets.
 */
export class Invite extends APIClientStructure<AnyInviteData> {

	/** the invite code (unique ID) */
	code!: string;
	/** the type of invite, inferred as `GUILD` when Discord omits it (the gateway always does) */
	type!: ObjectValues<typeof DiscordInviteTypes>;
	/** the id of the channel this invite is for */
	channelId!: string | null;
	/** the id of the guild this invite is for */
	guildId?: string;
	/** the ids of the roles assigned to the user upon accepting the invite */
	roleIds?: string[];
	/** the expiration date of this invite */
	expiresAt!: string | null;
	/** the user who created the invite */
	inviter?: User;
	/** the type of target for this voice channel invite */
	targetType?: ObjectValues<typeof DiscordInviteTargetTypes>;
	/** the user whose stream to display for this voice channel stream invite */
	targetUser?: User;
	/** the embedded application to open for this voice channel embedded application invite */
	targetApplication?: DiscordApplication;
	/** guild invite flags for guild invites */
	flags?: number;
	/** guild scheduled event data, only included if guild_scheduled_event_id contains a valid guild scheduled event id */
	// TODO Guild events
	guildScheduledEvent?: JSONObject;

	/** approximate count of online members, returned from `GET /invites/<code>` when `with_counts` is true */
	approximatePresenceCount?: number;
	/** approximate count of total members, returned from `GET /invites/<code>` when `with_counts` is true */
	approximateMemberCount?: number;

	/**
	 * Invite metadata, present on `INVITE_CREATE` and on invites fetched from
	 * `GET /guilds/<id>/invites` or `GET /channels/<id>/invites`, absent otherwise.
	 */
	/** how many times the invite has been used */
	uses?: number;
	/** maximum number of times the invite can be used, `0` for unlimited */
	maxUses?: number;
	/** how long the invite is valid for in seconds, `0` for never */
	maxAge?: number;
	/** whether the invite grants temporary membership */
	temporary?: boolean;
	/** when the invite was created */
	createdAt?: string;

	/**
	 * The partial guild sent by the API, kept so invites for uncached guilds are still usable.
	 * Prefer {@link Invite.guild}, which reads the full cached guild when there is one.
	 */
	partialGuild?: DiscordGuild;
	/**
	 * The partial channel sent by the API, kept so invites for uncached channels are still usable.
	 * Prefer {@link Invite.channel}, which reads the full cached channel when there is one.
	 */
	partialChannel?: DiscordChannel;
	/**
	 * The partial roles sent by the API, kept so invites for uncached guilds are still usable.
	 * Prefer {@link Invite.roles}, which reads the full cached roles when there are any.
	 */
	partialRoles?: PartialInviteRole[];

	constructor(client: Client, data: AnyInviteData) {
		super(client);
		this.patch(data);
	}

	patch(data: AnyInviteData): void {
		this.code = data.code;
		this.expiresAt = data.expires_at ?? null;

		// The gateway never sends `type`. INVITE_CREATE only fires for guild channels under the
		// GuildInvites intent, so GUILD is the correct inference rather than leaving it undefined.
		this.type = 'type' in data ? data.type : DiscordInviteTypes.GUILD;

		// `channel` (API, partial object) vs `channel_id` (gateway)
		if ('channel' in data) {
			this.channelId = data.channel?.id ?? null;
			if (data.channel) this.partialChannel = data.channel;
		} else {
			this.channelId = data.channel_id;
		}

		// `guild` (API, partial object) vs `guild_id` (gateway)
		if ('guild' in data && data.guild !== undefined) {
			this.guildId = data.guild.id;
			this.partialGuild = data.guild;
		} else if ('guild_id' in data && data.guild_id !== undefined) {
			this.guildId = data.guild_id;
		}

		// `roles` (API, partial objects) vs `role_ids` (gateway)
		if ('roles' in data && data.roles !== undefined) {
			this.roleIds = data.roles.map(role => role.id);
			this.partialRoles = data.roles;
		} else if ('role_ids' in data && data.role_ids !== undefined) {
			this.roleIds = data.role_ids;
		}

		if ('inviter' in data && data.inviter !== undefined) this.inviter = this.client.users.upsert(data.inviter);
		if ('target_user' in data && data.target_user !== undefined) this.targetUser = this.client.users.upsert(data.target_user);
		if ('target_type' in data && data.target_type !== undefined) this.targetType = data.target_type as ObjectValues<typeof DiscordInviteTargetTypes>;
		if ('target_application' in data && data.target_application !== undefined) this.targetApplication = data.target_application;
		if ('flags' in data && data.flags !== undefined) this.flags = data.flags;
		if ('guild_scheduled_event' in data && data.guild_scheduled_event !== undefined) this.guildScheduledEvent = data.guild_scheduled_event;

		if ('approximate_presence_count' in data && data.approximate_presence_count !== undefined) this.approximatePresenceCount = data.approximate_presence_count;
		if ('approximate_member_count' in data && data.approximate_member_count !== undefined) this.approximateMemberCount = data.approximate_member_count;

		if ('uses' in data && data.uses !== undefined) this.uses = data.uses;
		if ('max_uses' in data && data.max_uses !== undefined) this.maxUses = data.max_uses;
		if ('max_age' in data && data.max_age !== undefined) this.maxAge = data.max_age;
		if ('temporary' in data && data.temporary !== undefined) this.temporary = data.temporary;
		if ('created_at' in data && data.created_at !== undefined) this.createdAt = data.created_at;
	}

	/**
	 * A smart getter that reads the guild from cache on first read and overwrites itself on consecutive reads
	 */
	get guild(): Guild | null {
		const value = (this.guildId ? this.client.guilds.get(this.guildId) : undefined) ?? null;
		Object.defineProperty(this, 'guild', {
			value: value
		});
		return value;
	}

	/**
	 * A smart getter that reads the channel (and guild) from cache on first read and overwrites itself on consecutive reads
	 */
	get channel(): Channel | null {
		const value = (this.channelId ? this.guild?.channels.get(this.channelId) : undefined) ?? null;
		Object.defineProperty(this, 'channel', {
			value: value
		});
		return value;
	}

	/**
	 * A smart getter that reads the granted roles from the guild's cache on first read and
	 * overwrites itself on consecutive reads. Roles missing from cache are skipped.
	 */
	get roles(): Role[] {
		const guild = this.guild;
		const value: Role[] = [];

		if (guild) {
			for (const id of this.roleIds ?? []) {
				const role = guild.roles.get(id);
				if (role) value.push(role);
			}
		}

		Object.defineProperty(this, 'roles', {
			value: value
		});
		return value;
	}

	/** Whether this invite carries usage metadata (`uses`, `maxUses`, `maxAge`, `temporary`) */
	get hasMetadata(): boolean {
		return this.uses !== undefined;
	}

	/**
	 * Revokes this invite. Requires the `MANAGE_GUILD` permission, or `MANAGE_CHANNELS` for the
	 * invite's channel, and will error otherwise.
	 * @param reason Optional audit log reason.
	 */
	async delete(reason?: string): Promise<void> {
		return await this.client.rest.delete(`/invites/${this.code}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	/** Generate the shareable invite URL: `Join here: ${invite.toString()}` -> `Join here: https://discord.gg/abc123` */
	toString(): string {
		return `https://discord.gg/${this.code}`
	}
}