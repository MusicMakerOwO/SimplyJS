import { ObjectValues } from "./HelperTypes.js";
import { DiscordOAuth2Scopes } from "./DiscordOAuth.js";
import { JSONObject } from "./Internal.js";

export type DiscordUser = {
	/** the user's id */
	id: string;
	/** the user's username, not unique across the platform */
	username: string;
	/** the user's Discord-tag */
	discriminator: string;
	/** the user's display name, if it is set */
	global_name: string | null;
	/** the user's avatar hash */
	avatar: string | null;
	/** whether the user belongs to an OAuth2 application */
	bot?: boolean;
	/** whether the user is an Official Discord System user (part of the urgent message system) */
	system?: boolean;
	/** whether the user has two factor enabled on their account */
	mfa_enabled?: boolean;
	/** the user's banner hash */
	banner?: string | null;
	/** the user's banner color encoded as an integer representation of hexadecimal color code */
	accent_color?: number | null;
	/** the user's chosen language option */
	locale?: string;
	/** whether the email on this account has been verified */
	verified?: boolean;
	/** the user's email */
	email?: string | null;
	/** the flags on a user's account */
	flags?: number;
	/** the type of Nitro subscription on a user's account */
	premium_type?: number;
	/** the public flags on a user's account */
	public_flags?: number;
	/** data for the user's avatar decoration */
	avatar_decoration_data?: Record<string, DiscordAvatarDecoration> | null;
	/** data for the user's collectibles */
	collectibles?: Record<string, DiscordNameplate> | null;
	/** the user's primary guild */
	primary_guild?: Record<string, DiscordUserPrimaryGuild> | null;
}

export type DiscordRole = {
	/** role id */
	id: string;
	/** role name */
	name: string;
	/**
	 * Integer representation of hexadecimal color code
	 * @Deprecated Discord has marked this as deprecated, use `colors` instead
	 */
	color: number;
	/** the role’s colors */
	colors: {
		"primary_color": number;
		"secondary_color": number | null;
		"tertiary_color": number | null;
	}
	/** if this role is pinned in the user listing */
	hoist: boolean;
	/** role icon hash */
	icon?: string | null;
	/** role Unicode emoji */
	unicode_emoji?: string | null;
	/** position of this role (roles with the same position are sorted by id) */
	position: number;
	/** permission bit set */
	permissions: string;
	/** whether this role is managed by an integration */
	managed: boolean;
	/** whether users are allowed to ping the role */
	mentionable: boolean;
	/** the tags this role has */

	tags?: {
		/** the id of the bot this role belongs to */
		bot_id?: string;
		integration_id?: string;
		/** whether this is the guild’s Booster role */
		premium_subscriber?: null;
		/** the id of this role’s subscription sku and listing */
		subscription_listing_id?: string;
		/** whether this role is available for purchase */
		available_for_purchase?: null;
		/** whether this role is a guild’s linked role */
		guild_connections?: null;
	}
	/** role flags combined as a bitfield */
	flags: number;
}

export type DiscordEmoji = {
	/** emoji id */
	id: string;
	/** emoji name */
	name: string;
	/** roles allowed to use this emoji */
	roles?: string[];
	/** user that created this emoji */
	user?: DiscordUser;
	/** whether this emoji must be wrapped in colons */
	require_colons?: boolean;
	/** whether this emoji is managed */
	managed?: boolean;
	/** whether this emoji is animated */
	animated: boolean;
	/** whether this emoji can be used, may be false due to loss of Server Boosts */
	available: boolean;
}

export const DiscordGuildFeatures = {
	/** guild has access to set an animated guild banner image */
	ANIMATED_BANNER: 'ANIMATED_BANNER',
	/** guild has access to set an animated guild icon */
	ANIMATED_ICON: 'ANIMATED_ICON',
	/** guild is using the old permissions configuration behavior */
	APPLICATION_COMMAND_PERMISSIONS_V2: 'APPLICATION_COMMAND_PERMISSIONS_V2',
	/** guild has set up auto moderation rules */
	AUTO_MODERATION: 'AUTO_MODERATION',
	/** guild has access to set a guild banner image */
	BANNER: 'BANNER',
	/** guild can enable welcome screen, Membership Screening, stage channels and discovery, and receives community updates */
	COMMUNITY: 'COMMUNITY',
	/** guild has enabled monetization */
	CREATOR_MONETIZABLE_PROVISIONAL: 'CREATOR_MONETIZABLE_PROVISIONAL',
	/** guild has enabled the role subscription promo page */
	CREATOR_STORE_PAGE: 'CREATOR_STORE_PAGE',
	/** guild has been set as a support server on the App Directory */
	DEVELOPER_SUPPORT_SERVER: 'DEVELOPER_SUPPORT_SERVER',
	/** guild is able to be discovered in the directory */
	DISCOVERABLE: 'DISCOVERABLE',
	/** guild is able to be featured in the directory */
	FEATURABLE: 'FEATURABLE',
	/** guild has paused invites, preventing new users from joining */
	INVITES_DISABLED: 'INVITES_DISABLED',
	/** guild has access to set an invite splash background */
	INVITE_SPLASH: 'INVITE_SPLASH',
	/** guild has enabled Membership Screening */
	MEMBER_VERIFICATION_GATE_ENABLED: 'MEMBER_VERIFICATION_GATE_ENABLED',
	/** guild has increased custom soundboard sound slots */
	MORE_SOUNDBOARD: 'MORE_SOUNDBOARD',
	/** guild has increased custom sticker slots */
	MORE_STICKERS: 'MORE_STICKERS',
	/** guild has access to create announcement channels */
	NEWS: 'NEWS',
	/** guild is partnered */
	PARTNERED: 'PARTNERED',
	/** guild can be previewed before joining via Membership Screening or the directory */
	PREVIEW_ENABLED: 'PREVIEW_ENABLED',
	/** guild has disabled alerts for join raids in the configured safety alerts channel */
	RAID_ALERTS_DISABLED: 'RAID_ALERTS_DISABLED',
	/** guild is able to set role icons */
	ROLE_ICONS: 'ROLE_ICONS',
	/** guild has role subscriptions that can be purchased */
	ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE: 'ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE',
	/** guild has enabled role subscriptions */
	ROLE_SUBSCRIPTIONS_ENABLED: 'ROLE_SUBSCRIPTIONS_ENABLED',
	/** guild has created soundboard sounds */
	SOUNDBOARD: 'SOUNDBOARD',
	/** guild has enabled ticketed events */
	TICKETED_EVENTS_ENABLED: 'TICKETED_EVENTS_ENABLED',
	/** guild has access to set a vanity URL */
	VANITY_URL: 'VANITY_URL',
	/** guild is verified */
	VERIFIED: 'VERIFIED',
	/** guild has access to set 384kbps bitrate in voice (previously VIP voice servers) */
	VIP_REGIONS: 'VIP_REGIONS',
	/** guild has enabled the welcome screen */
	WELCOME_SCREEN_ENABLED: 'WELCOME_SCREEN_ENABLED',
	/** guild has access to guest invites */
	GUESTS_ENABLED: 'GUESTS_ENABLED',
	/** guild has access to set guild tags */
	GUILD_TAGS: 'GUILD_TAGS',
	/** guild is able to set gradient colors to roles */
	ENHANCED_ROLE_COLORS: 'ENHANCED_ROLE_COLORS'
} as const;

export type DiscordWelcomeScreenChannel = {
	/** the channel’s id */
	channel_id: string;
	/** the description shown for the channel */
	description: string;
	/** the emoji id, if the emoji is custom */
	emoji_id?: string | null;
	/** the emoji name if custom, the Unicode character if standard, or null if no emoji is set */
	emoji_name?: string | null;
}

export type DiscordWelcomeScreen = {
	/** the server description shown in the welcome screen */
	description?: string | null;
	/** the channels shown in the welcome screen, up to 5 */
	welcome_channels: DiscordWelcomeScreenChannel[];
}

export type DiscordSticker = {
	/** id of the sticker */
	id: string;
	/** for standard stickers, id of the pack the sticker is from */
	pack_id?: string;
	/** name of the sticker */
	name: string;
	/** description of the sticker */
	description?: string | null;
	/** autocomplete/suggestion tags for the sticker (max 200 characters) */
	tags: string;
	/** type of sticker */
	type: ObjectValues<typeof DiscordStickerTypes>;
	/** type of sticker format */
	format_type: ObjectValues<typeof DiscordStickerFormatTypes>;
	/** whether this guild sticker can be used, may be false due to loss of Server Boosts */
	available?: boolean;
	/** id of the guild that owns this sticker */
	guild_id?: string;
	/** the user that uploaded the guild sticker */
	user?: DiscordUser;
	/** the standard sticker’s sort order within its pack */
	sort_value?: number;
}

export const DiscordStickerTypes = {
	/** an official sticker in a pack */
	STANDARD: 1,
	/** a sticker uploaded to a guild for the guild’s members */
	GUILD: 2
} as const;

export const DiscordStickerFormatTypes = {
	/** PNG format */
	PNG: 1,
	/** APNG format */
	APNG: 2,
	/** LOTTIE format */
	LOTTIE: 3,
	/** GIF format */
	GIF: 4
} as const;

export type DiscordIncidentsData = {
	/** ISO8601 - when invites get enabled again */
	invites_disabled_until?: string | null;
	/** ISO8601 - when direct messages get enabled again */
	dms_disabled_until?: string | null;
	/** ISO8601 - when the dm spam was detected */
	dm_spam_detected_at?: string | null;
	/** ISO8601 - when the raid was detected */
	raid_detected_at?: string | null;
}

export const DiscordDefaultMessageNotificationLevels = {
	/** members will receive notifications for all messages by default */
	ALL_MESSAGES: 0,
	/** members will receive notifications only for messages that @mention them by default */
	ONLY_MENTIONS: 1
} as const;

export const DiscordExplicitContentFilterLevels = {
	/** media content will not be scanned */
	DISABLED: 0,
	/** media content sent by members without roles will be scanned */
	MEMBERS_WITHOUT_ROLES: 1,
	/** media content sent by all members will be scanned */
	ALL_MEMBERS: 2
} as const;

export const DiscordMFALevels = {
	/** guild has no MFA/2FA requirement for moderation actions */
	NONE: 0,
	/** guild has a 2FA requirement for moderation actions */
	ELEVATED: 1
} as const;

export const DiscordVerificationLevels = {
	/** unrestricted */
	NONE: 0,
	/** must have verified email on account */
	LOW: 1,
	/** must be registered on Discord for longer than 5 minutes */
	MEDIUM: 2,
	/** must be a member of the server for longer than 10 minutes */
	HIGH: 3,
	/** must have a verified phone number */
	VERY_HIGH: 4
} as const;

export const DiscordGuildAgeRestrictionLevels = {
	DEFAULT       : 0,
	EXPLICIT      : 1,
	SAFE          : 2,
	AGE_RESTRICTED: 3
} as const;

export const DiscordPremiumTiers = {
	/** guild has not unlocked any Server Boost perks */
	NONE: 0,
	/** guild has unlocked Server Boost level 1 perks */
	TIER_1: 1,
	/** guild has unlocked Server Boost level 2 perks */
	TIER_2: 2,
	/** guild has unlocked Server Boost level 3 perks */
	TIER_3: 3
} as const;

export const DiscordSystemChannelFlags = {
	/** Suppress member join notifications */
	SUPPRESS_JOIN_NOTIFICATIONS: 1 << 0,
	/** Suppress server boost notifications */
	SUPPRESS_PREMIUM_SUBSCRIPTIONS: 1 << 1,
	/** Suppress server setup tips */
	SUPPRESS_GUILD_REMINDER_NOTIFICATIONS: 1 << 2,
	/** Hide member join sticker reply buttons */
	SUPPRESS_JOIN_NOTIFICATION_REPLIES: 1 << 3,
	/** Suppress role subscription purchase and renewal notifications */
	SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS: 1 << 4,
	/** Hide role subscription sticker reply buttons */
	SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES: 1 << 5
} as const;

export const DiscordLocaleByLanguage = {
	Indonesian            : "id",
	Danish                : "da",
	German                : "de",
	"English_UK"          : "en-GB", // 'English, UK' -> 'English_UK' for object key
	"English_US"          : "en-US", // 'English, US' -> 'English_US' for object key
	Spanish               : "es-ES",
	"Spanish_LATAM"       : "es-419", // 'Spanish, LATAM' -> 'Spanish_LATAM' for object key
	French                : "fr",
	Croatian              : "hr",
	Italian               : "it",
	Lithuanian            : "lt",
	Hungarian             : "hu",
	Dutch                 : "nl",
	Norwegian             : "no",
	Polish                : "pl",
	"Portuguese_Brazilian": "pt-BR", // 'Portuguese, Brazilian' -> 'Portuguese_Brazilian' for object key
	"Romanian_Romania"    : "ro", // 'Romanian, Romania' -> 'Romanian_Romania' for object key
	Finnish               : "fi",
	Swedish               : "sv-SE",
	Vietnamese            : "vi",
	Turkish               : "tr",
	Czech                 : "cs",
	Greek                 : "el",
	Bulgarian             : "bg",
	Russian               : "ru",
	Ukrainian             : "uk",
	Hindi                 : "hi",
	Thai                  : "th",
	"Chinese_China"       : "zh-CN", // 'Chinese, China' -> 'Chinese_China' for object key
	Japanese              : "ja",
	"Chinese_Taiwan"      : "zh-TW", // 'Chinese, Taiwan' -> 'Chinese_Taiwan' for object key
	Korean                : "ko"
};

export type DiscordAvatarDecoration = {
	/** the avatar decoration hash */
	asset: string;
	/** id of the avatar decoration’s SKU */
	sku_id: string;
};

export type DiscordNameplate = {
	/** id of the nameplate SKU */
	sku_id: string;
	/** path to the nameplate asset */
	asset: string;
	/** the label of this nameplate. Currently unused */
	label: string;
	/** background color of the nameplate, one of: crimson, berry, sky, teal, forest, bubble_gum, violet, cobalt, clover, lemon, white */
	palette: string;
};

export type DiscordUserPrimaryGuild = {
	/** the id of the user’s primary guild */
	identity_guild_id: string | null;
	/** whether the user is displaying the primary guild’s server tag. This can be null if the system clears the identity, e.g. the server no longer supports tags. This will be false if the user manually removes their tag. */
	identity_enabled: boolean | null;
	/** the text of the user’s server tag. Limited to 4 characters */
	tag: string | null;
	/** the server tag badge hash */
	badge: string | null;
};

export type DiscordGuild = {
	/** guild id */
	id: string;
	/** guild name (2-100 characters, excluding trailing and leading whitespace) */
	name: string;
	/** icon hash */
	icon?: string | null;
	/** icon hash, returned when in the template object */
	icon_hash?: string | null;
	/** splash hash */
	splash?: string | null;
	/** discovery splash hash; only present for guilds with the “DISCOVERABLE” feature */
	discovery_splash?: string | null;
	/** true if the client is the owner of the guild */
	owner?: boolean;
	/** id of owner */
	owner_id: string;
	/** total permissions for the user in the guild (excludes overwrites and implicit permissions) */
	permissions?: string;
	/** voice region id for the guild (deprecated) */
	region?: string | null;
	/** id of afk channel */
	afk_channel_id?: string | null;
	/** afk timeout in seconds */
	afk_timeout: number;
	/** true if the server widget is enabled */
	widget_enabled?: boolean;
	/** the channel id that the widget will generate an invite to, or null if set to no invite */
	widget_channel_id?: string | null;
	/** verification level required for the guild */
	verification_level: ObjectValues<typeof DiscordVerificationLevels>;
	/** default message notifications level */
	default_message_notifications: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
	/** explicit content filter level */
	explicit_content_filter: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
	/** roles in the guild */
	roles: DiscordRole[];
	/** custom guild emojis */
	emojis: DiscordEmoji[];
	/** enabled guild features */
	features: ObjectValues<typeof DiscordGuildFeatures>[];
	/**
	 * required MFA level for the guild
	 */
	mfa_level: ObjectValues<typeof DiscordMFALevels>;
	/** application id of the guild creator if it is bot-created */
	application_id?: string;
	/** the id of the channel where guild notices such as welcome messages and boost events are posted */
	system_channel_id?: string | null;
	/**
	 * bitfield of system channel flags
	 * @see {DiscordSystemChannelFlags}
	 */
	system_channel_flags: number;
	/** the id of the channel where Community guilds can display rules and/or guidelines */
	rules_channel_id?: string | null;
	/** the maximum number of presences for the guild (null is always returned, apart from the largest of guilds) */
	max_presences?: number | null;
	/** the maximum number of members for the guild */
	max_members?: number;
	/** the vanity url code for the guild */
	vanity_url_code?: string | null;
	/** the description of a guild */
	description?: string | null;
	/** banner hash */
	banner?: string | null;
	/** premium tier (Server Boost level) */
	premium_tier: ObjectValues<typeof DiscordPremiumTiers>;
	/** the number of boosts this guild currently has */
	premium_subscription_count?: number;
	/** the preferred locale of a Community guild; used in server discovery and notices from Discord, and sent in interactions; defaults to “en-US” */
	preferred_locale: ObjectValues<typeof DiscordLocaleByLanguage>;
	/** the id of the channel where admins and moderators of Community guilds receive notices from Discord */
	public_updates_channel_id?: string | null;
	/** the maximum amount of users in a video channel */
	max_video_channel_users?: number;
	/** the maximum amount of users in a stage video channel */
	max_stage_video_channel_users?: number;
	/** approximate number of members in this guild, returned from the GET /guilds/<id> and /users/@me/guilds endpoints when with_counts is true */
	approximate_member_count?: number;
	/** approximate number of non-offline members in this guild, returned from the GET /guilds/<id> and /users/@me/guilds endpoints when with_counts is true */
	approximate_presence_count?: number;
	/** the welcome screen of a Community guild, shown to new members, returned in an Invite’s guild object */
	welcome_screen?: DiscordWelcomeScreen;
	/** guild age-restriction level */
	nsfw_level: ObjectValues<typeof DiscordGuildAgeRestrictionLevels>;
	/** custom guild stickers */
	stickers?: DiscordSticker[];
	/** whether the guild has the boost progress bar enabled */
	premium_progress_bar_enabled: boolean;
	/** the id of the channel where admins and moderators of Community guilds receive safety alerts from Discord */
	safety_alerts_channel_id?: string | null;
	/** the incidents data for this guild */
	incidents_data?: DiscordIncidentsData;
};

export type DiscordApplication = {
	/** ID of the app */
	id: string;
	/** Name of the app */
	name: string;
	/** Icon hash of the app */
	icon?: string | null;
	/** Description of the app */
	description: string;
	/** List of RPC origin URLs, if RPC is enabled */
	rpc_origins?: string[];
	/** When false, only the app owner can add the app to guilds */
	bot_public: boolean;
	/** When true, the app’s bot will only join upon completion of the full OAuth2 code grant flow */
	bot_require_code_grant: boolean;
	/** Partial user object for the bot user associated with the app */
	bot?: Partial<DiscordUser>;
	/** URL of the app’s Terms of Service */
	terms_of_service_url?: string;
	/** URL of the app’s Privacy Policy */
	privacy_policy_url?: string;
	/** Partial user object for the owner of the app */
	owner?: Partial<DiscordUser>;
	/** Hex encoded key for verification in interactions and the GameSDK’s GetTicket */
	verify_key: string;
	/** If the app belongs to a team, this will be a list of the members of that team */
	// TODO Set up team types
	team?: Record<string, JSONObject>[];
	/** Guild associated with the app. For example, a developer support server. */
	guild_id?: string;
	/** Partial object of the associated guild */
	guild?: Partial<DiscordGuild>;
	/** If this app is a game sold on Discord, this field will be the id of the “Game SKU” that is created, if exists */
	primary_sku_id?: string;
	/** If this app is a game sold on Discord, this field will be the URL slug that links to the store page */
	slug?: string;
	/** App’s default rich presence invite cover image hash */
	cover_image?: string;
	/**
	 * Bitfield of app’s public flags
	 * @see {DiscordApplicationFlags}
	 */
	flags?: number;
	/** Approximate count of guilds the app has been added to */
	approximate_guild_count?: number;
	/** Approximate count of users that have installed the app (authorized with application.commands as a scope) */
	approximate_user_install_count?: number;
	/** Approximate count of users that have OAuth2 authorizations for the app */
	approximate_user_authorization_count?: number;
	/** Array of redirect URIs for the app */
	redirect_uris?: string[];
	/** Interactions endpoint URL for the app */
	interactions_endpoint_url?: string | null;
	/** Role connection verification URL for the app */
	role_connections_verification_url?: string | null;
	/** Event webhooks URL for the app to receive webhook events */
	event_webhooks_url?: string | null;
	/** If webhook events are enabled for the app. 1 (default) means disabled, 2 means enabled, and 3 means disabled by Discord */
	event_webhooks_status?: ObjectValues<typeof DiscordApplicationEventWebhookStatuses>;
	/** List of Webhook event types the app subscribes to */
	event_webhooks_types?: string[];
	/** List of tags describing the content and functionality of the app. Max of 5 tags. */
	tags?: string[];
	/** Settings for the app’s default in-app authorization link, if enabled */
	install_params?: DiscordInstallParams;
	/** Default scopes and permissions for each supported installation context. Value for each key is an integration type configuration object */
	integration_types_config?: Partial<Record<ObjectValues<typeof DiscordApplicationIntegrationTypes>, DiscordApplicationIntegrationTypeConfig>>;
	/** Default custom authorization URL for the app, if enabled */
	custom_install_url?: string;
};

export type DiscordInstallParams = {
	/** Scopes to add the application to the server with */
	scopes: ObjectValues<typeof DiscordOAuth2Scopes>[];
	/** Permissions to request for the bot role */
	permissions: string;
}

export const DiscordApplicationIntegrationTypes = {
	/** App is installable to servers */
	GUILD_INSTALL: 0,
	/** App is installable to users */
	USER_INSTALL: 1
} as const;

export type DiscordApplicationIntegrationTypeConfig = {
	/** Install params for each installation context’s default in-app authorization link */
	oauth2_install_params?: DiscordInstallParams;
};

export const DiscordApplicationEventWebhookStatuses = {
	/** Webhook events are disabled by developer */
	DISABLED: 1,
	/** Webhook events are enabled by developer */
	ENABLED: 2,
	/** Webhook events are disabled by Discord, usually due to inactivity */
	DISABLED_BY_DISCORD: 3
} as const;

export const DiscordApplicationFlags = {
	/** Indicates if an app uses the Auto Moderation API */
	APPLICATION_AUTO_MODERATION_RULE_CREATE_BADGE: 1 << 6,
	/** Intent required for bots in 100 or more servers to receive presence_update events */
	GATEWAY_PRESENCE: 1 << 12,
	/** Intent required for bots in under 100 servers to receive presence_update events, found on the Bot page in your app’s settings */
	GATEWAY_PRESENCE_LIMITED: 1 << 13,
	/** Intent required for bots in 100 or more servers to receive member-related events like guild_member_add. See the list of member-related events under GUILD_MEMBERS */
	GATEWAY_GUILD_MEMBERS: 1 << 14,
	/** Intent required for bots in under 100 servers to receive member-related events like guild_member_add, found on the Bot page in your app’s settings. See the list of member-related events under GUILD_MEMBERS */
	GATEWAY_GUILD_MEMBERS_LIMITED: 1 << 15,
	/** Indicates unusual growth of an app that prevents verification */
	VERIFICATION_PENDING_GUILD_LIMIT: 1 << 16,
	/** Indicates if an app is embedded within the Discord client (currently unavailable publicly) */
	EMBEDDED: 1 << 17,
	/** Intent required for bots in 100 or more servers to receive message content */
	GATEWAY_MESSAGE_CONTENT: 1 << 18,
	/** Intent required for bots in under 100 servers to receive message content, found on the Bot page in your app’s settings */
	GATEWAY_MESSAGE_CONTENT_LIMITED: 1 << 19,
	APPLICATION_COMMAND_BADGE: 1 << 23
} as const;

export const DiscordMemberFlags = {
	/** Member has left and rejoined the guild */
	DID_REJOIN: 1 << 0,
	/** Member has completed onboarding */
	COMPLETED_ONBOARDING: 1 << 1,
	/** Member is exempt from guild verification requirements */
	BYPASSES_VERIFICATION: 1 << 2,
	/** Member has started onboarding */
	STARTED_ONBOARDING: 1 << 3,
	/** Member is a guest and can only access the voice channel they were invited to */
	IS_GUEST: 1 << 4,
	/** Member has started Server Guide new member actions */
	STARTED_HOME_ACTIONS: 1 << 5,
	/** Member has completed Server Guide new member actions */
	COMPLETED_HOME_ACTIONS: 1 << 6,
	/** Member’s username, display name, or nickname is blocked by AutoMod */
	AUTOMOD_QUARANTINED_USERNAME: 1 << 7,
	/** Member has dismissed the DM settings upsell */
	DM_SETTINGS_UPSELL_ACKNOWLEDGED: 1 << 9,
	/** Member’s guild tag is blocked by AutoMod */
	AUTOMOD_QUARANTINED_GUILD_TAG: 1 << 10
} as const;

export type DiscordMember = {
	/** the user this guild member represents */
	user: DiscordUser;
	/** this user’s guild nickname */
	nick?: string | null;
	/** the member’s guild avatar hash */
	avatar?: string | null;
	/** the member’s guild banner hash */
	banner?: string | null;
	/** array of role object ids */
	roles: string[];
	/** when the user joined the guild */
	joined_at: string;
	/** when the user started boosting the guild */
	premium_since?: string | null;
	/** whether the user is deafened in voice channels */
	deaf: boolean;
	/** whether the user is muted in voice channels */
	mute: boolean;
	/**
	 * guild member flags represented as a bit set, defaults to 0
	 * @see {DiscordMemberFlags}
	 */
	flags: number;
	/** whether the user has not yet passed the guild’s Membership Screening requirements */
	pending?: boolean;
	/** total permissions of the member in the channel, including overwrites, returned when in the interaction object */
	permissions?: string;
	/** when the user’s timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out */
	communication_disabled_until?: string | null;
	/** data for the member’s guild avatar decoration */
	avatar_decoration_data?: DiscordAvatarDecoration | null;
	/** data for the member’s collectibles */
	collectibles?: Record<string, DiscordNameplate> | null;
};

export const DiscordChannelTypes = {
	/** a text channel within a server */
	GUILD_TEXT: 0,
	/** a direct message between users */
	DM: 1,
	/** a voice channel within a server */
	GUILD_VOICE: 2,
	/** a direct message between multiple users */
	GROUP_DM: 3,
	/** an organizational category that contains up to 50 channels */
	GUILD_CATEGORY: 4,
	/** a channel that users can follow and crosspost into their own server (formerly news channels) */
	GUILD_ANNOUNCEMENT: 5,
	/** a temporary sub-channel within a GUILD_ANNOUNCEMENT channel */
	ANNOUNCEMENT_THREAD: 10,
	/** a temporary sub-channel within a GUILD_TEXT or GUILD_FORUM channel */
	PUBLIC_THREAD: 11,
	/** a temporary sub-channel within a GUILD_TEXT channel that is only viewable by those invited and those with the MANAGE_THREADS permission */
	PRIVATE_THREAD: 12,
	/** a voice channel for hosting events with an audience */
	GUILD_STAGE_VOICE: 13,
	/** the channel in a hub containing the listed servers */
	GUILD_DIRECTORY: 14,
	/** Channel that can only contain threads */
	GUILD_FORUM: 15,
	/** Channel that can only contain threads, similar to GUILD_FORUM channels */
	GUILD_MEDIA: 16
} as const;

export const DiscordVideoQualityModes = {
	/** Discord chooses the quality for optimal performance */
	AUTO: 1,
	/** 720p */
	FULL: 2
} as const;

export const DiscordChannelFlags = {
	/** this thread is pinned to the top of its parent GUILD_FORUM or GUILD_MEDIA channel */
	PINNED: 1 << 1,
	/** whether a tag is required to be specified when creating a thread in a GUILD_FORUM or a GUILD_MEDIA channel. Tags are specified in the applied_tags field. */
	REQUIRE_TAG: 1 << 4,
	/** when set hides the embedded media download options. Available only for media channels */
	HIDE_MEDIA_DOWNLOAD_OPTIONS: 1 << 15
} as const;

export const DiscordSortOrderTypes = {
	/** Sort forum posts by activity */
	LATEST_ACTIVITY: 0,
	/** Sort forum posts by creation time (from most recent to oldest) */
	CREATION_DATE: 1
} as const;

export const DiscordForumLayoutTypes = {
	/** No default has been set for forum channel */
	NOT_SET: 0,
	/** Display posts as a list */
	LIST_VIEW: 1,
	/** Display posts as a collection of tiles */
	GALLERY_VIEW: 2
} as const;

export type DiscordOverwrite = {
	/** role or user id */
	id: string;
	/** either 0 (role) or 1 (member) */
	type: 0 | 1;
	/** permission bit set */
	allow: string;
	/** permission bit set */
	deny: string;
};

export type DiscordThreadMetadata = {
	/** whether the thread is archived */
	archived: boolean;
	/** the thread will stop showing in the channel list after auto_archive_duration minutes of inactivity, can be set to: 60, 1440, 4320, 10080 */
	auto_archive_duration: number;
	/** timestamp when the thread's archive status was last changed, used for calculating recent activity */
	archive_timestamp: string;
	/** whether the thread is locked; when a thread is locked, only users with MANAGE_THREADS can unarchive it */
	locked: boolean;
	/** whether non-moderators can add other non-moderators to a thread; only available on private threads */
	invitable?: boolean;
	/** timestamp when the thread was created; only populated for threads created after 2022-01-09 */
	create_timestamp?: string | null;
};

export type DiscordThreadMember = {
	/** ID of the thread */
	id?: string;
	/** ID of the user */
	user_id?: string;
	/** Time the user last joined the thread */
	join_timestamp: string;
	/** Any user-thread settings, currently only used for notifications */
	flags: number;
	/** Additional information about the user */
	member?: Partial<DiscordMember>;
};

export type DiscordDefaultReaction = {
	/** the id of a guild's custom emoji */
	emoji_id?: string | null;
	/** the Unicode character of the emoji */
	emoji_name?: string | null;
};

export type DiscordForumTag = {
	/** the id of the tag */
	id?: string;
	/** the name of the tag (0-20 characters) */
	name: string;
	/** whether this tag can only be added to or removed from threads by a member with the MANAGE_THREADS permission */
	moderated?: boolean;
	/** the id of a guild's custom emoji */
	emoji_id?: string | null;
	/** the Unicode character of the emoji */
	emoji_name?: string | null;
};

export type DiscordChannel = {
	/** the id of this channel */
	id: string;
	/** the type of channel */
	type: ObjectValues<typeof DiscordChannelTypes>;
	/** the id of the guild (may be missing for some channel objects received over gateway guild dispatches) */
	guild_id?: string;
	/** sorting position of the channel (channels with the same position are sorted by id) */
	position?: number;
	/** explicit permission overwrites for members and roles */
	permission_overwrites?: DiscordOverwrite[];
	/** the name of the channel (1-100 characters) */
	name?: string | null;
	/** the channel topic (0-4096 characters for GUILD_FORUM and GUILD_MEDIA channels, 0-1024 characters for all others) */
	topic?: string | null;
	/** whether the channel is age-restricted */
	nsfw?: boolean;
	/** the id of the last message sent in this channel (or thread for GUILD_FORUM or GUILD_MEDIA channels) (may not point to an existing or valid message or thread) */
	last_message_id?: string | null;
	/** the bitrate (in bits per second) of the voice channel */
	bitrate?: number;
	/** the user limit of the voice channel */
	user_limit?: number;
	/** amount of seconds a user has to wait before sending another message (0-21600); bots, as well as users with the permission BYPASS_SLOWMODE, are unaffected */
	rate_limit_per_user?: number;
	/** the recipients of the DM */
	recipients?: DiscordUser[];
	/** icon hash of the group DM */
	icon?: string | null;
	/** id of the creator of the group DM or thread */
	owner_id?: string;
	/** application id of the group DM creator if it is bot-created */
	application_id?: string;
	/** for group DM channels: whether the channel is managed by an application via the gdm.join OAuth2 scope */
	managed?: boolean;
	/** for guild channels: id of the parent category for a channel (each parent category can contain up to 50 channels), for threads: id of the text channel this thread was created */
	parent_id?: string | null;
	/** when the last pinned message was pinned. This may be null in events such as GUILD_CREATE when a message is not pinned. */
	last_pin_timestamp?: string | null;
	/** voice region id for the voice channel, automatic when set to null */
	rtc_region?: string | null;
	/** the camera video quality mode of the voice channel, 1 when not present */
	video_quality_mode?: ObjectValues<typeof DiscordVideoQualityModes>;
	/** number of messages (not including the initial message or deleted messages) in a thread */
	message_count?: number;
	/** an approximate count of users in a thread, stops counting at 50 */
	member_count?: number;
	/** thread-specific fields not needed by other channels */
	thread_metadata?: DiscordThreadMetadata;
	/** thread member object for the current user, if they have joined the thread, only included on certain API endpoints */
	member?: DiscordThreadMember;
	/** default duration, copied onto newly created threads, in minutes, threads will stop showing in the channel list after the specified period of inactivity, can be set to: 60, 1440, 4320, 10080 */
	default_auto_archive_duration?: number;
	/** computed permissions for the invoking user in the channel, including overwrites, only included when part of the resolved data received on an interaction. This does not include implicit permissions, which may need to be checked separately */
	permissions?: string;
	/**
	 * channel flags combined as a bitfield
	 * @see {DiscordChannelFlags}
	 */
	flags?: number;
	/** number of messages ever sent in a thread, it is similar to message_count on message creation, but will not decrement the number when a message is deleted */
	total_message_sent?: number;
	/** the set of tags that can be used in a GUILD_FORUM or a GUILD_MEDIA channel */
	available_tags?: DiscordForumTag[];
	/** the IDs of the set of tags that have been applied to a thread in a GUILD_FORUM or a GUILD_MEDIA channel */
	applied_tags?: string[];
	/** the emoji to show in the add reaction button on a thread in a GUILD_FORUM or a GUILD_MEDIA channel */
	default_reaction_emoji?: DiscordDefaultReaction | null;
	/** the initial rate_limit_per_user to set on newly created threads in a channel. this field is copied to the thread at creation time and does not live update */
	default_thread_rate_limit_per_user?: number;
	/** the default sort order type used to order posts in GUILD_FORUM and GUILD_MEDIA channels. Defaults to null, which indicates a preferred sort order has not been set by a channel admin */
	default_sort_order?: ObjectValues<typeof DiscordSortOrderTypes> | null;
	/** the default forum layout view used to display posts in GUILD_FORUM channels. Defaults to 0, which indicates a layout view has not been set by a channel admin */
	default_forum_layout?: ObjectValues<typeof DiscordForumLayoutTypes>;
};

export type ClientActivity = {
	name: string;
	type: ObjectValues<typeof ActivityType>;
	state?: string;
	url?: string;
}

export const ActivityType = {
	PLAYING: 0,
	STREAMING: 1,
	LISTENING: 2,
	WATCHING: 3,
	CUSTOM: 4,
	COMPETING: 5
} as const;

export const Status = {
	ONLINE: 'online',
	IDLE: 'idle',
	DND: 'dnd',
	OFFLINE: 'offline'
} as const;