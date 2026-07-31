import { Client } from "../Client.js";
import {
	DiscordAuditLog,
	DiscordAuditLogEvent,
	DiscordChannel,
	DiscordDefaultMessageNotificationLevels,
	DiscordExplicitContentFilterLevels,
	DiscordGuild, DiscordGuildAgeRestrictionLevels,
	DiscordGuildFeatures,
	DiscordIncidentsData,
	DiscordLocaleByLanguage,
	DiscordMember,
	DiscordMFALevels,
	DiscordPremiumTiers,
	DiscordVerificationLevels,
	DiscordWelcomeScreen
} from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { APIClientStructure } from "../Contracts/DiscordStructure.js";
import { RoleCache } from "../Managers/Roles.js";
import { StickerCache } from "../Managers/Stickers.js";
import { EmojiCache } from "../Managers/Emojis.js";
import { ChannelCache } from "../Managers/Channels.js";
import { MemberCache } from "../Managers/Members.js";
import { GuildBanManager } from "../Managers/GuildBans.js";
import { GuildInviteManager } from "../Managers/Invites.js";

/**
 * A Discord guild (server), including its cached channels, roles, emojis, stickers, and members.
 *
 * @see https://docs.discord.com/developers/resources/guild#guild-object
 */
export class Guild extends APIClientStructure<DiscordGuild> {
	id!: string;
	name!: string;
	/** Icon hash, or `null` when the guild has no icon */
	icon?: string | null;
	/** Icon hash as returned from the template object, distinct from `icon` which comes from the live guild */
	icon_hash?: string | null;
	/** Invite splash background hash, or `null` when unset */
	splash?: string | null;
	/** Discovery splash background hash, only present for guilds with the `DISCOVERABLE` feature */
	discovery_splash?: string | null;
	/** Whether the current bot user owns this guild, only present on guild lists fetched via OAuth2 (`GET /users/@me/guilds`) */
	owner?: boolean;
	owner_id!: string;
	/** Total permission bitfield string for the bot user in this guild, excluding channel overwrites and implicit permissions; only present on some endpoints */
	permissions?: string;
	/** Legacy voice region id, `@deprecated` by Discord in favor of per-channel `rtc_region` */
	region?: string | null;
	afk_channel_id?: string | null;
	/** How long, in seconds, a voice-inactive member waits before being moved to the AFK channel */
	afk_timeout!: number;
	/** Whether the server widget is enabled */
	widget_enabled?: boolean;
	/** Channel the widget generates an invite to, or `null` when the widget has no invite channel set */
	widget_channel_id?: string | null;
	/** Required verification level for new members to send messages */
	verification_level!: ObjectValues<typeof DiscordVerificationLevels>;
	default_message_notifications!: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
	explicit_content_filter!: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
	/** Enabled guild feature strings (e.g. `"COMMUNITY"`, `"DISCOVERABLE"`) */
	features!: ObjectValues<typeof DiscordGuildFeatures>[];
	/** Required multi-factor authentication level for moderation actions */
	mfa_level!: ObjectValues<typeof DiscordMFALevels>;
	/** Application id of the bot that created this guild, if it was bot-created */
	application_id?: string;
	system_channel_id?: string | null;
	/** Bitfield controlling which system messages (join messages, boost messages, etc.) are suppressed in the system channel */
	system_channel_flags!: number;
	rules_channel_id?: string | null;
	/** Maximum presences allowed in the guild, `null` for all but the largest guilds */
	max_presences?: number | null;
	max_members?: number;
	/** The guild's custom invite URL slug (`discord.gg/<code>`), or `null` when none is set */
	vanity_url_code?: string | null;
	description?: string | null;
	banner?: string | null;
	/** Server Boost level, determines perks like boosted upload/bitrate limits */
	premium_tier!: ObjectValues<typeof DiscordPremiumTiers>;
	/** Number of Nitro boosts currently applied to the guild */
	premium_subscription_count?: number;
	preferred_locale!: ObjectValues<typeof DiscordLocaleByLanguage>;
	/** Channel where Community guild admins/moderators receive notices from Discord */
	public_updates_channel_id?: string | null;
	max_video_channel_users?: number;
	max_stage_video_channel_users?: number;
	/** Approximate member count, only present when fetched with `with_counts` set */
	approximate_member_count?: number;
	/** Approximate count of non-offline members, only present when fetched with `with_counts` set */
	approximate_presence_count?: number;
	/** Welcome screen shown to new members of a Community guild */
	welcome_screen?: DiscordWelcomeScreen;
	/** Age-restriction level applied to the guild */
	nsfw_level!: ObjectValues<typeof DiscordGuildAgeRestrictionLevels>;
	premium_progress_bar_enabled!: boolean;
	/** Channel where Community guild admins/moderators receive safety alerts from Discord */
	safety_alerts_channel_id?: string | null;
	/** Active incident/moderation lockdown state (e.g. invites-disabled/DMs-disabled windows) for this guild */
	incidents_data?: DiscordIncidentsData;

	channels: ChannelCache;
	roles: RoleCache;
	emojis: EmojiCache;
	stickers: StickerCache;
	members: MemberCache;
	/** Manager for this guild's bans, backed by REST calls rather than a local cache */
	bans: GuildBanManager;
	/** Manager for this guild's invites, backed by REST calls rather than a local cache */
	invites: GuildInviteManager;

	constructor(client: Client, data: DiscordGuild & { channels?: DiscordChannel[], members?: DiscordMember[] }) {
		super(client);
		this.channels = new ChannelCache(client, this);
		this.roles    = new RoleCache(client, this);
		this.emojis   = new EmojiCache(client, this);
		this.stickers = new StickerCache(client, this);
		this.members  = new MemberCache(client, this);
		this.bans     = new GuildBanManager(client, this);
		this.invites  = new GuildInviteManager(client, this);

		this.patch(data);
	}

	patch(data: DiscordGuild & { channels?: DiscordChannel[], members?: DiscordMember[] }): void {
		this.id = data.id;
		this.name = data.name;
		this.owner_id = data.owner_id;
		this.afk_timeout = data.afk_timeout;
		this.verification_level = data.verification_level;
		this.default_message_notifications = data.default_message_notifications;
		this.explicit_content_filter = data.explicit_content_filter;
		this.features = data.features;
		this.mfa_level = data.mfa_level;
		this.premium_tier = data.premium_tier;
		this.preferred_locale = data.preferred_locale;
		this.nsfw_level = data.nsfw_level;
		this.premium_progress_bar_enabled = data.premium_progress_bar_enabled;

		if ("icon" in data && data.icon !== undefined) this.icon = data.icon;
		if ("icon_hash" in data && data.icon_hash !== undefined) this.icon_hash = data.icon_hash;
		if ("splash" in data && data.splash !== undefined) this.splash = data.splash;
		if ("discovery_splash" in data && data.discovery_splash !== undefined) this.discovery_splash = data.discovery_splash;
		if ("owner" in data && data.owner !== undefined) this.owner = data.owner;

		if ("permissions" in data && data.permissions !== undefined) this.permissions = data.permissions;
		if ("region" in data && data.region !== undefined) this.region = data.region;
		if ("afk_channel_id" in data && data.afk_channel_id !== undefined) this.afk_channel_id = data.afk_channel_id;

		if ("widget_enabled" in data && data.widget_enabled !== undefined) this.widget_enabled = data.widget_enabled;
		if ("widget_channel_id" in data && data.widget_channel_id !== undefined) this.widget_channel_id = data.widget_channel_id;

		if ("application_id" in data && data.application_id !== undefined) this.application_id = data.application_id;
		if ("system_channel_id" in data && data.system_channel_id !== undefined) this.system_channel_id = data.system_channel_id;
		if ("system_channel_flags" in data) this.system_channel_flags = data.system_channel_flags;
		if ("rules_channel_id" in data && data.rules_channel_id !== undefined) this.rules_channel_id = data.rules_channel_id;
		if ("max_presences" in data && data.max_presences !== undefined) this.max_presences = data.max_presences;
		if ("max_members" in data && data.max_members !== undefined) this.max_members = data.max_members;

		if ("vanity_url_code" in data && data.vanity_url_code !== undefined) this.vanity_url_code = data.vanity_url_code;
		if ("description" in data && data.description !== undefined) this.description = data.description;
		if ("banner" in data && data.banner !== undefined) this.banner = data.banner;
		if ("premium_subscription_count" in data && data.premium_subscription_count !== undefined) this.premium_subscription_count = data.premium_subscription_count;

		if ("public_updates_channel_id" in data && data.public_updates_channel_id !== undefined) this.public_updates_channel_id = data.public_updates_channel_id;
		if ("max_video_channel_users" in data && data.max_video_channel_users !== undefined) this.max_video_channel_users = data.max_video_channel_users;
		if ("max_stage_video_channel_users" in data && data.max_stage_video_channel_users !== undefined) this.max_stage_video_channel_users = data.max_stage_video_channel_users;
		if ("approximate_member_count" in data && data.approximate_member_count !== undefined) this.approximate_member_count = data.approximate_member_count;
		if ("approximate_presence_count" in data && data.approximate_presence_count !== undefined) this.approximate_presence_count = data.approximate_presence_count;

		if ("welcome_screen" in data && data.welcome_screen !== undefined) this.welcome_screen = data.welcome_screen;
		if ("safety_alerts_channel_id" in data && data.safety_alerts_channel_id !== undefined) this.safety_alerts_channel_id = data.safety_alerts_channel_id;
		if ("incidents_data" in data && data.incidents_data !== undefined) this.incidents_data = data.incidents_data;

		if ("channels" in data && data.channels !== undefined) {
			for (const apiChannel of data.channels) {
				this.channels.upsert(apiChannel);
			}
		}

		if ("members" in data && data.members) {
			for (const apiMember of data.members) {
				this.members.upsert(apiMember);
			}
		}

		for (const apiRole of data.roles) {
			this.roles.upsert(apiRole);
		}

		if ("stickers" in data && data.stickers !== undefined) {
			for (const apiSticker of data.stickers) {
				this.stickers.upsert(apiSticker);
			}
		}

		if ("emojis" in data && data.emojis !== undefined) {
			for (const apiEmoji of data.emojis) {
				this.emojis.upsert(apiEmoji);
			}
		}
	}

	/**
	 * Removes the bot from the server
	 */
	async leave(): Promise<void> {
		await this.client.rest.delete(`/users/@me/guilds/${this.id}`);
	}

	/**
	 * Returns an audit log object for the guild. Requires the `VIEW_AUDIT_LOG` permission.
	 *
	 * The returned list of audit log entries is ordered based on whether you use `before` or
	 * `after`. When using `before`, the list is ordered by the audit log entry ID descending
	 * (newer entries first). If `after` is used, the list is reversed and appears in ascending
	 * order (older entries first). Omitting both `before` and `after` defaults to before the
	 * current timestamp and will show the most recent entries in descending order by ID, the
	 * opposite can be achieved using `after: "0"` (showing oldest entries).
	 */
	async fetchAuditLogs(options: {
		/** Entries from a specific user ID */
		user_id?: string;
		/** Entries for a specific audit log event */
		action_type?: ObjectValues<typeof DiscordAuditLogEvent>;
		/** Entries with ID less than a specific audit log entry ID */
		before?: string;
		/** Entries with ID greater than a specific audit log entry ID */
		after?: string;
		/** Maximum number of entries (between 1-100) to return, defaults to 50 */
		limit?: number;
	} = {}): Promise<DiscordAuditLog> {
		const params = new URLSearchParams();
		if (options.user_id) params.append('user_id', options.user_id);
		if (options.action_type !== undefined) params.append('action_type', options.action_type.toString());
		if (options.before) params.append('before', options.before);
		if (options.after) params.append('after', options.after);
		if (options.limit) params.append('limit', options.limit.toString());
		const query = params.toString()
			? `?${params.toString()}`
			: '';

		const auditLog = await this.client.rest.get<DiscordAuditLog>(`/guilds/${this.id}/audit-logs${query}`);

		for (const user of auditLog.users) {
			this.client.users.upsert(user);
		}

		for (const thread of auditLog.threads) {
			this.channels.upsert(thread);
		}

		return auditLog;
	}

	/**
	 * Modifies general guild settings. Requires the `MANAGE_GUILD` permission.
	 * @param changes The settings to change; omitted fields are left untouched.
	 */
	async modify(changes: {
		/** New guild name (2-100 characters) */
		name?: string;
		/** Legacy voice region id, `@deprecated` by Discord */
		region?: string;
		verification_level?: ObjectValues<typeof DiscordVerificationLevels>;
		default_message_notifications?: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
		explicit_content_filter?: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
		/** Channel to move inactive voice members to, or `null` to disable the AFK channel */
		afk_channel_id?: string | null;
		/** How long, in seconds, a voice-inactive member waits before being moved to the AFK channel */
		afk_timeout?: number;
		/** New icon image data, or `null` to remove the icon */
		icon?: string | null;
		/** New invite splash image data, or `null` to remove it */
		splash?: string | null;
		/** New discovery splash image data, or `null` to remove it */
		discovery_splash?: string | null;
		/** New banner image data, or `null` to remove it */
		banner?: string | null;
		/** Channel for system messages (joins, boosts, etc.), or `null` to disable them */
		system_channel_id?: string | null;
		/** Bitfield controlling which system messages are suppressed in the system channel */
		system_channel_flags?: number;
		/** Channel for Community guild rules/guidelines, or `null` to unset */
		rules_channel_id?: string | null;
		/** Channel for Community guild admin/moderator notices, or `null` to unset */
		public_updates_channel_id?: string | null;
		preferred_locale?: ObjectValues<typeof DiscordLocaleByLanguage>;
		/** New guild description, or `null` to clear it */
		description?: string | null;
		premium_progress_bar_enabled?: boolean;
		/** Channel for Community guild safety alerts from Discord, or `null` to unset */
		safety_alerts_channel_id?: string | null;
	}): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.id}`, changes);
	}
}