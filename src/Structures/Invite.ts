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

export class Invite extends APIClientStructure<AnyInviteData> {

	/** the invite code (unique ID) */
	code!: string;
	/** the type of invite, inferred as `GUILD` when Discord omits it (the gateway always does) */
	type!: ObjectValues<typeof DiscordInviteTypes>;
	/** the id of the channel this invite is for */
	channel_id!: string | null;
	/** the id of the guild this invite is for */
	guild_id?: string;
	/** the ids of the roles assigned to the user upon accepting the invite */
	role_ids?: string[];
	/** the expiration date of this invite */
	expires_at!: string | null;
	/** the user who created the invite */
	inviter?: User;
	/** the type of target for this voice channel invite */
	target_type?: ObjectValues<typeof DiscordInviteTargetTypes>;
	/** the user whose stream to display for this voice channel stream invite */
	target_user?: User;
	/** the embedded application to open for this voice channel embedded application invite */
	target_application?: DiscordApplication;
	/** guild invite flags for guild invites */
	flags?: number;
	/** guild scheduled event data, only included if guild_scheduled_event_id contains a valid guild scheduled event id */
	// TODO Guild events
	guild_scheduled_event?: JSONObject;

	/** approximate count of online members, returned from `GET /invites/<code>` when `with_counts` is true */
	approximate_presence_count?: number;
	/** approximate count of total members, returned from `GET /invites/<code>` when `with_counts` is true */
	approximate_member_count?: number;

	/**
	 * Invite metadata, present on `INVITE_CREATE` and on invites fetched from
	 * `GET /guilds/<id>/invites` or `GET /channels/<id>/invites`, absent otherwise.
	 */
	/** how many times the invite has been used */
	uses?: number;
	/** maximum number of times the invite can be used, `0` for unlimited */
	max_uses?: number;
	/** how long the invite is valid for in seconds, `0` for never */
	max_age?: number;
	/** whether the invite grants temporary membership */
	temporary?: boolean;
	/** when the invite was created */
	created_at?: string;

	/**
	 * The partial guild sent by the API, kept so invites for uncached guilds are still usable.
	 * Prefer {@link Invite.guild}, which reads the full cached guild when there is one.
	 */
	partial_guild?: DiscordGuild;
	/**
	 * The partial channel sent by the API, kept so invites for uncached channels are still usable.
	 * Prefer {@link Invite.channel}, which reads the full cached channel when there is one.
	 */
	partial_channel?: DiscordChannel;
	/**
	 * The partial roles sent by the API, kept so invites for uncached guilds are still usable.
	 * Prefer {@link Invite.roles}, which reads the full cached roles when there are any.
	 */
	partial_roles?: PartialInviteRole[];

	constructor(client: Client, data: AnyInviteData) {
		super(client);
		this.patch(data);
	}

	patch(data: AnyInviteData): void {
		this.code = data.code;
		this.expires_at = data.expires_at ?? null;

		// The gateway never sends `type`. INVITE_CREATE only fires for guild channels under the
		// GuildInvites intent, so GUILD is the correct inference rather than leaving it undefined.
		this.type = 'type' in data ? data.type : DiscordInviteTypes.GUILD;

		// `channel` (API, partial object) vs `channel_id` (gateway)
		if ('channel' in data) {
			this.channel_id = data.channel?.id ?? null;
			if (data.channel) this.partial_channel = data.channel;
		} else {
			this.channel_id = data.channel_id;
		}

		// `guild` (API, partial object) vs `guild_id` (gateway)
		if ('guild' in data && data.guild !== undefined) {
			this.guild_id = data.guild.id;
			this.partial_guild = data.guild;
		} else if ('guild_id' in data && data.guild_id !== undefined) {
			this.guild_id = data.guild_id;
		}

		// `roles` (API, partial objects) vs `role_ids` (gateway)
		if ('roles' in data && data.roles !== undefined) {
			this.role_ids = data.roles.map(role => role.id);
			this.partial_roles = data.roles;
		} else if ('role_ids' in data && data.role_ids !== undefined) {
			this.role_ids = data.role_ids;
		}

		if ('inviter' in data && data.inviter !== undefined) this.inviter = this.client.users.upsert(data.inviter);
		if ('target_user' in data && data.target_user !== undefined) this.target_user = this.client.users.upsert(data.target_user);
		if ('target_type' in data && data.target_type !== undefined) this.target_type = data.target_type as ObjectValues<typeof DiscordInviteTargetTypes>;
		if ('target_application' in data && data.target_application !== undefined) this.target_application = data.target_application;
		if ('flags' in data && data.flags !== undefined) this.flags = data.flags;
		if ('guild_scheduled_event' in data && data.guild_scheduled_event !== undefined) this.guild_scheduled_event = data.guild_scheduled_event;

		if ('approximate_presence_count' in data && data.approximate_presence_count !== undefined) this.approximate_presence_count = data.approximate_presence_count;
		if ('approximate_member_count' in data && data.approximate_member_count !== undefined) this.approximate_member_count = data.approximate_member_count;

		if ('uses' in data && data.uses !== undefined) this.uses = data.uses;
		if ('max_uses' in data && data.max_uses !== undefined) this.max_uses = data.max_uses;
		if ('max_age' in data && data.max_age !== undefined) this.max_age = data.max_age;
		if ('temporary' in data && data.temporary !== undefined) this.temporary = data.temporary;
		if ('created_at' in data && data.created_at !== undefined) this.created_at = data.created_at;
	}

	/**
	 * A smart getter that reads the guild from cache on first read and overwrites itself on consecutive reads
	 */
	get guild(): Guild | null {
		const value = (this.guild_id ? this.client.guilds.get(this.guild_id) : undefined) ?? null;
		Object.defineProperty(this, 'guild', {
			value: value
		});
		return value;
	}

	/**
	 * A smart getter that reads the channel (and guild) from cache on first read and overwrites itself on consecutive reads
	 */
	get channel(): Channel | null {
		const value = (this.channel_id ? this.guild?.channels.get(this.channel_id) : undefined) ?? null;
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
			for (const id of this.role_ids ?? []) {
				const role = guild.roles.get(id);
				if (role) value.push(role);
			}
		}

		Object.defineProperty(this, 'roles', {
			value: value
		});
		return value;
	}

	/** Whether this invite carries usage metadata (`uses`, `max_uses`, `max_age`, `temporary`) */
	get has_metadata(): boolean {
		return this.uses !== undefined;
	}

	async delete(reason?: string): Promise<void> {
		return await this.client.rest.delete(`/invites/${this.code}`, reason ? { 'X-Audit-Log-Reason': reason } : {} );
	}

	toString(): string {
		return `https://discord.gg/${this.code}`
	}
}