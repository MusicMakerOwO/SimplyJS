import { Client } from "../Client.js";
import {
	DiscordAuditLog,
	DiscordAuditLogEvent,
	DiscordDefaultMessageNotificationLevels,
	DiscordExplicitContentFilterLevels,
	DiscordGuild, DiscordGuildAgeRestrictionLevels,
	DiscordGuildCreate,
	DiscordGuildFeatures,
	DiscordIncidentsData,
	DiscordLocaleByLanguage,
	DiscordMFALevels,
	DiscordPremiumTiers,
	DiscordVerificationLevels,
	DiscordWelcomeScreen,
	Status
} from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { JSONObject } from "../Types/Internal.js";
import { APIClientStructure } from "../Contracts/DiscordStructure.js";
import { RoleCache } from "../Managers/Roles.js";
import { StickerCache } from "../Managers/Stickers.js";
import { EmojiCache } from "../Managers/Emojis.js";
import { ChannelCache } from "../Managers/Channels.js";
import { MemberCache } from "../Managers/Members.js";
import { GuildBanManager } from "../Managers/GuildBans.js";
import { GuildInviteManager } from "../Managers/Invites.js";
import { AutoModerationRuleCache } from "../Managers/AutoModeration.js";
import { GuildScheduledEventCache } from "../Managers/GuildScheduledEvents.js";
import { PresenceCache } from "../Managers/Presences.js";
import { IntegrationCache } from "../Managers/Integrations.js";
import { WebhookCache } from "../Managers/Webhooks.js";
import { SoundboardSoundCache } from "../Managers/SoundboardSounds.js";

/**
 * A Discord guild (server), including its cached channels, roles, emojis, stickers, and members.
 *
 * A guild's sub-caches are deliberately *shared* with any snapshot taken by `clone()` - the
 * `GUILD_UPDATE` event only ever changes the guild's own fields, so `oldGuild.members` is the same
 * live cache as `newGuild.members` rather than a copy of every member in the guild.
 *
 * @see https://docs.discord.com/developers/resources/guild#guild-object
 */
export class Guild extends APIClientStructure<DiscordGuild> {
	id!: string;
	name!: string;
	/** Icon hash, or `null` when the guild has no icon */
	icon?: string | null;
	/** Icon hash as returned from the template object, distinct from `icon` which comes from the live guild */
	iconHash?: string | null;
	/** Invite splash background hash, or `null` when unset */
	splash?: string | null;
	/** Discovery splash background hash, only present for guilds with the `DISCOVERABLE` feature */
	discoverySplash?: string | null;
	/** Whether the current bot user owns this guild, only present on guild lists fetched via OAuth2 (`GET /users/@me/guilds`) */
	owner?: boolean;
	ownerId!: string;
	/** Total permission bitfield string for the bot user in this guild, excluding channel overwrites and implicit permissions; only present on some endpoints */
	permissions?: string;
	/** Legacy voice region id, `@deprecated` by Discord in favor of per-channel `rtc_region` */
	region?: string | null;
	afkChannelId?: string | null;
	/** How long, in seconds, a voice-inactive member waits before being moved to the AFK channel */
	afkTimeout!: number;
	/** Whether the server widget is enabled */
	widgetEnabled?: boolean;
	/** Channel the widget generates an invite to, or `null` when the widget has no invite channel set */
	widgetChannelId?: string | null;
	/** Required verification level for new members to send messages */
	verificationLevel!: ObjectValues<typeof DiscordVerificationLevels>;
	defaultMessageNotifications!: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
	explicitContentFilter!: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
	/** Enabled guild feature strings (e.g. `"COMMUNITY"`, `"DISCOVERABLE"`) */
	features!: ObjectValues<typeof DiscordGuildFeatures>[];
	/** Required multi-factor authentication level for moderation actions */
	mfaLevel!: ObjectValues<typeof DiscordMFALevels>;
	/** Application id of the bot that created this guild, if it was bot-created */
	applicationId?: string;
	systemChannelId?: string | null;
	/** Bitfield controlling which system messages (join messages, boost messages, etc.) are suppressed in the system channel */
	systemChannelFlags!: number;
	rulesChannelId?: string | null;
	/** Maximum presences allowed in the guild, `null` for all but the largest guilds */
	maxPresences?: number | null;
	maxMembers?: number;
	/** The guild's custom invite URL slug (`discord.gg/<code>`), or `null` when none is set */
	vanityUrlCode?: string | null;
	description?: string | null;
	banner?: string | null;
	/** Server Boost level, determines perks like boosted upload/bitrate limits */
	premiumTier!: ObjectValues<typeof DiscordPremiumTiers>;
	/** Number of Nitro boosts currently applied to the guild */
	premiumSubscriptionCount?: number;
	preferredLocale!: ObjectValues<typeof DiscordLocaleByLanguage>;
	/** Channel where Community guild admins/moderators receive notices from Discord */
	publicUpdatesChannelId?: string | null;
	maxVideoChannelUsers?: number;
	maxStageVideoChannelUsers?: number;
	/** Approximate member count, only present when fetched with `with_counts` set */
	approximateMemberCount?: number;
	/** Approximate count of non-offline members, only present when fetched with `with_counts` set */
	approximatePresenceCount?: number;
	/** Welcome screen shown to new members of a Community guild */
	welcomeScreen?: DiscordWelcomeScreen;
	/** Age-restriction level applied to the guild */
	nsfwLevel!: ObjectValues<typeof DiscordGuildAgeRestrictionLevels>;
	premiumProgressBarEnabled!: boolean;
	/** Channel where Community guild admins/moderators receive safety alerts from Discord */
	safetyAlertsChannelId?: string | null;
	/** Active incident/moderation lockdown state (e.g. invites-disabled/DMs-disabled windows) for this guild */
	incidentsData?: DiscordIncidentsData;

	channels: ChannelCache;
	roles: RoleCache;
	emojis: EmojiCache;
	stickers: StickerCache;
	/**
	 * Manager for this guild's soundboard sounds, keyed by sound id. Seeded from the `GUILD_CREATE`
	 * payload and kept current by the `SoundboardSound*` gateway events, which need the
	 * `GuildExpressions` intent.
	 */
	soundboardSounds: SoundboardSoundCache;
	members: MemberCache;
	/**
	 * Manager for this guild's auto moderation rules. Discord never sends rules in `GUILD_CREATE`,
	 * so this cache starts empty and fills from gateway events or an explicit fetch.
	 */
	autoModerationRules: AutoModerationRuleCache;
	/**
	 * Manager for this guild's scheduled events. Seeded from the `GUILD_CREATE` payload and kept
	 * current by the `GuildScheduledEvent*` gateway events.
	 */
	scheduledEvents: GuildScheduledEventCache;
	/**
	 * Manager for this guild's member presences, keyed by user id. Requires the privileged
	 * `GuildPresences` intent - without it this cache stays empty. Seeded from `GUILD_CREATE` and
	 * kept current by the `PresenceUpdate` gateway event. Offline users are not stored.
	 */
	presences: PresenceCache;
	/**
	 * Manager for this guild's integrations. Discord never sends integrations in `GUILD_CREATE`,
	 * so this cache starts empty and fills from gateway events or an explicit fetch.
	 */
	integrations: IntegrationCache;
	/**
	 * Manager for this guild's webhooks. Discord never sends webhooks in `GUILD_CREATE` and the
	 * `WebhooksUpdate` event says only which channel changed, so this cache starts empty and fills
	 * from an explicit fetch.
	 */
	webhooks: WebhookCache;
	/** Manager for this guild's bans, backed by REST calls rather than a local cache */
	bans: GuildBanManager;
	/** Manager for this guild's invites, backed by REST calls rather than a local cache */
	invites: GuildInviteManager;

	constructor(client: Client, data: DiscordGuildCreate) {
		super(client);
		this.channels = new ChannelCache(client, this);
		this.roles    = new RoleCache(client, this);
		this.emojis   = new EmojiCache(client, this);
		this.stickers = new StickerCache(client, this);
		this.soundboardSounds = new SoundboardSoundCache(client, this);
		this.members  = new MemberCache(client, this);
		this.autoModerationRules = new AutoModerationRuleCache(client, this);
		this.scheduledEvents = new GuildScheduledEventCache(client, this);
		this.presences = new PresenceCache(client, this);
		this.integrations = new IntegrationCache(client, this);
		this.webhooks = new WebhookCache(client, this);
		this.bans     = new GuildBanManager(client, this);
		this.invites  = new GuildInviteManager(client, this);

		this.patch(data);
	}

	patch(data: DiscordGuildCreate): void {
		// Discord types these as always present, but partial guild objects exist (an invite's
		// `guild`, an unavailable guild). Assigning them unconditionally would blank an
		// already-cached guild, so they are guarded like every optional field below. The `!` markers
		// still hold: a guild is only ever constructed from a full payload, and a partial one can
		// then only leave those fields untouched.
		if ("id" in data && data.id !== undefined) this.id = data.id;
		if ("name" in data && data.name !== undefined) this.name = data.name;
		if ("owner_id" in data && data.owner_id !== undefined) this.ownerId = data.owner_id;
		if ("afk_timeout" in data && data.afk_timeout !== undefined) this.afkTimeout = data.afk_timeout;
		if ("verification_level" in data && data.verification_level !== undefined) this.verificationLevel = data.verification_level;
		if ("default_message_notifications" in data && data.default_message_notifications !== undefined) this.defaultMessageNotifications = data.default_message_notifications;
		if ("explicit_content_filter" in data && data.explicit_content_filter !== undefined) this.explicitContentFilter = data.explicit_content_filter;
		if ("features" in data && data.features !== undefined) this.features = data.features;
		if ("mfa_level" in data && data.mfa_level !== undefined) this.mfaLevel = data.mfa_level;
		if ("premium_tier" in data && data.premium_tier !== undefined) this.premiumTier = data.premium_tier;
		if ("preferred_locale" in data && data.preferred_locale !== undefined) this.preferredLocale = data.preferred_locale;
		if ("nsfw_level" in data && data.nsfw_level !== undefined) this.nsfwLevel = data.nsfw_level;
		if ("premium_progress_bar_enabled" in data && data.premium_progress_bar_enabled !== undefined) this.premiumProgressBarEnabled = data.premium_progress_bar_enabled;

		if ("icon" in data && data.icon !== undefined) this.icon = data.icon;
		if ("icon_hash" in data && data.icon_hash !== undefined) this.iconHash = data.icon_hash;
		if ("splash" in data && data.splash !== undefined) this.splash = data.splash;
		if ("discovery_splash" in data && data.discovery_splash !== undefined) this.discoverySplash = data.discovery_splash;
		if ("owner" in data && data.owner !== undefined) this.owner = data.owner;

		if ("permissions" in data && data.permissions !== undefined) this.permissions = data.permissions;
		if ("region" in data && data.region !== undefined) this.region = data.region;
		if ("afk_channel_id" in data && data.afk_channel_id !== undefined) this.afkChannelId = data.afk_channel_id;

		if ("widget_enabled" in data && data.widget_enabled !== undefined) this.widgetEnabled = data.widget_enabled;
		if ("widget_channel_id" in data && data.widget_channel_id !== undefined) this.widgetChannelId = data.widget_channel_id;

		if ("application_id" in data && data.application_id !== undefined) this.applicationId = data.application_id;
		if ("system_channel_id" in data && data.system_channel_id !== undefined) this.systemChannelId = data.system_channel_id;
		if ("system_channel_flags" in data) this.systemChannelFlags = data.system_channel_flags;
		if ("rules_channel_id" in data && data.rules_channel_id !== undefined) this.rulesChannelId = data.rules_channel_id;
		if ("max_presences" in data && data.max_presences !== undefined) this.maxPresences = data.max_presences;
		if ("max_members" in data && data.max_members !== undefined) this.maxMembers = data.max_members;

		if ("vanity_url_code" in data && data.vanity_url_code !== undefined) this.vanityUrlCode = data.vanity_url_code;
		if ("description" in data && data.description !== undefined) this.description = data.description;
		if ("banner" in data && data.banner !== undefined) this.banner = data.banner;
		if ("premium_subscription_count" in data && data.premium_subscription_count !== undefined) this.premiumSubscriptionCount = data.premium_subscription_count;

		if ("public_updates_channel_id" in data && data.public_updates_channel_id !== undefined) this.publicUpdatesChannelId = data.public_updates_channel_id;
		if ("max_video_channel_users" in data && data.max_video_channel_users !== undefined) this.maxVideoChannelUsers = data.max_video_channel_users;
		if ("max_stage_video_channel_users" in data && data.max_stage_video_channel_users !== undefined) this.maxStageVideoChannelUsers = data.max_stage_video_channel_users;
		if ("approximate_member_count" in data && data.approximate_member_count !== undefined) this.approximateMemberCount = data.approximate_member_count;
		if ("approximate_presence_count" in data && data.approximate_presence_count !== undefined) this.approximatePresenceCount = data.approximate_presence_count;

		if ("welcome_screen" in data && data.welcome_screen !== undefined) this.welcomeScreen = data.welcome_screen;
		if ("safety_alerts_channel_id" in data && data.safety_alerts_channel_id !== undefined) this.safetyAlertsChannelId = data.safety_alerts_channel_id;
		if ("incidents_data" in data && data.incidents_data !== undefined) this.incidentsData = data.incidents_data;

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

		if ("roles" in data && data.roles !== undefined) {
			for (const apiRole of data.roles) {
				this.roles.upsert(apiRole);
			}
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

		if ("soundboard_sounds" in data && data.soundboard_sounds !== undefined) {
			for (const apiSound of data.soundboard_sounds) {
				this.soundboardSounds.upsert(apiSound);
			}
		}

		if ("guild_scheduled_events" in data && data.guild_scheduled_events !== undefined) {
			for (const apiScheduledEvent of data.guild_scheduled_events) {
				this.scheduledEvents.upsert(apiScheduledEvent);
			}
		}

		if ("presences" in data && data.presences !== undefined) {
			for (const apiPresence of data.presences) {
				// Discord already omits offline members here; skip any that slip through so the
				// cache only ever holds online users, matching what PresenceUpdate maintains
				if (apiPresence.status === Status.OFFLINE) continue;
				this.presences.upsert(apiPresence);
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
		userId?: string;
		/** Entries for a specific audit log event */
		actionType?: ObjectValues<typeof DiscordAuditLogEvent>;
		/** Entries with ID less than a specific audit log entry ID */
		before?: string;
		/** Entries with ID greater than a specific audit log entry ID */
		after?: string;
		/** Maximum number of entries (between 1-100) to return, defaults to 50 */
		limit?: number;
	} = {}): Promise<DiscordAuditLog> {
		const params = new URLSearchParams();
		if (options.userId) params.append('user_id', options.userId);
		if (options.actionType !== undefined) params.append('action_type', options.actionType.toString());
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
		verificationLevel?: ObjectValues<typeof DiscordVerificationLevels>;
		defaultMessageNotifications?: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
		explicitContentFilter?: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
		/** Channel to move inactive voice members to, or `null` to disable the AFK channel */
		afkChannelId?: string | null;
		/** How long, in seconds, a voice-inactive member waits before being moved to the AFK channel */
		afkTimeout?: number;
		/** New icon image data, or `null` to remove the icon */
		icon?: string | null;
		/** New invite splash image data, or `null` to remove it */
		splash?: string | null;
		/** New discovery splash image data, or `null` to remove it */
		discoverySplash?: string | null;
		/** New banner image data, or `null` to remove it */
		banner?: string | null;
		/** Channel for system messages (joins, boosts, etc.), or `null` to disable them */
		systemChannelId?: string | null;
		/** Bitfield controlling which system messages are suppressed in the system channel */
		systemChannelFlags?: number;
		/** Channel for Community guild rules/guidelines, or `null` to unset */
		rulesChannelId?: string | null;
		/** Channel for Community guild admin/moderator notices, or `null` to unset */
		publicUpdatesChannelId?: string | null;
		preferredLocale?: ObjectValues<typeof DiscordLocaleByLanguage>;
		/** New guild description, or `null` to clear it */
		description?: string | null;
		premiumProgressBarEnabled?: boolean;
		/** Channel for Community guild safety alerts from Discord, or `null` to unset */
		safetyAlertsChannelId?: string | null;
	}): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.id}`, {
			name: changes.name,
			region: changes.region,
			verification_level: changes.verificationLevel,
			default_message_notifications: changes.defaultMessageNotifications,
			explicit_content_filter: changes.explicitContentFilter,
			afk_channel_id: changes.afkChannelId,
			afk_timeout: changes.afkTimeout,
			icon: changes.icon,
			splash: changes.splash,
			discovery_splash: changes.discoverySplash,
			banner: changes.banner,
			system_channel_id: changes.systemChannelId,
			system_channel_flags: changes.systemChannelFlags,
			rules_channel_id: changes.rulesChannelId,
			public_updates_channel_id: changes.publicUpdatesChannelId,
			preferred_locale: changes.preferredLocale,
			description: changes.description,
			premium_progress_bar_enabled: changes.premiumProgressBarEnabled,
			safety_alerts_channel_id: changes.safetyAlertsChannelId,
		} as unknown as JSONObject);
	}
}
