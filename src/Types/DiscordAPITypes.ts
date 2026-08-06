import { ObjectValues } from "./HelperTypes.js";
import { DiscordOAuth2Scopes } from "./DiscordOAuth.js";
import { JSONObject } from "./Internal.js";
import { ApplicationCommand } from "./ApplicationCommand.js";

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

export type DiscordInvite = {
	/** the type of invite */
	type: ObjectValues<typeof DiscordInviteTypes>;
	/** the invite code (unique ID) */
	code: string;
	/** the guild this invite is for */
	guild?: DiscordGuild;
	/** the channel this invite is for */
	channel: DiscordChannel | null;
	/** the user who created the invite */
	inviter?: DiscordUser;
	/** the type of target for this voice channel invite */
	target_type?: ObjectValues<typeof DiscordInviteTargetTypes>;
	/** the user whose stream to display for this voice channel stream invite */
	target_user?: DiscordUser;
	/** the embedded application to open for this voice channel embedded application invite */
	target_application?: DiscordApplication;
	/** approximate count of online members, returned from the GET /invites/<code> endpoint when with_counts is true */
	approximate_presence_count?: number;
	/** approximate count of total members, returned from the GET /invites/<code> endpoint when with_counts is true */
	approximate_member_count?: number;
	/** the expiration date of this invite */
	expires_at: string | null;
	/** guild scheduled event data, only included if guild_scheduled_event_id contains a valid guild scheduled event id */
	// TODO Guild events
	guild_scheduled_event?: JSONObject;
	/** guild invite flags for guild invites */
	flags?: number;
	/** the roles assigned to the user upon accepting the invite */
	roles?: Pick<DiscordRole, 'id' | 'name' | 'position' | 'color' | 'colors' | 'icon' | 'unicode_emoji'>[];
}

export const DiscordInviteTypes = {
	GUILD: 0,
	GROUP_DM: 1,
	FRIEND: 2
} as const;

export const DiscordInviteTargetTypes = {
	STREAM: 1,
	EMBEDDED_APPLICATION: 2
} as const;

export const DiscordGuildInviteFlags = {
	/** this invite is a guest invite for a voice channel */
	IS_GUEST_INVITE: 1 << 0
} as const;


export type DiscordAuditLog = {
	/** List of application commands referenced in the audit log */
	application_commands: ApplicationCommand[];
	/** List of audit log entries, sorted from most to least recent */
	audit_log_entries: DiscordAuditLogEntry[];
	/** List of auto moderation rules referenced in the audit log */
	auto_moderation_rules: DiscordAutoModerationRule[];
	/** List of guild scheduled events referenced in the audit log */
	// TODO Guild events
	guild_scheduled_events: JSONObject[];
	/** List of partial integration objects */
	// TODO Integrations
	integrations: JSONObject[];
	/** List of threads referenced in the audit log* */
	threads: DiscordChannel[];
	/** List of users referenced in the audit log */
	users: DiscordUser[];
	/** List of webhooks referenced in the audit log */
	webhooks: DiscordWebhook[];
}

export type DiscordAuditLogEntry = {
	/** ID of the affected entity (webhook, user, role, etc.) */
	target_id: string | null;
	/** Changes made to the target_id */
	changes?: DiscordAuditLogChange[];
	/** User or app that made the changes */
	user_id: string | null;
	/** ID of the entry */
	id: string;
	/** Type of action that occurred */
	action_type: ObjectValues<typeof DiscordAuditLogEvent>;
	/** Additional info for certain event types */
	options?: DiscordAuditEntryInfo;
	/** Reason for the change (1-512 characters) */
	reason?: string;
}

export type DiscordAutoModerationRule = {
	/** the id of this rule */
	id: string;
	/** the id of the guild which this rule belongs to */
	guild_id: string;
	/** the rule name */
	name: string;
	/** the user which first created this rule */
	creator_id: string;
	/** the rule event type */
	event_type: ObjectValues<typeof DiscordAutoModerationRuleEventType>;
	/** the rule trigger type */
	trigger_type: ObjectValues<typeof DiscordAutoModerationRuleTriggerType>;
	/** the rule trigger metadata */
	trigger_metadata: DiscordAutoModerationRuleTriggerMetadata;
	/** the actions which will execute when the rule is triggered */
	actions: DiscordAutoModerationAction[];
	/** whether the rule is enabled */
	enabled: boolean;
	/** the role ids that should not be affected by the rule (Maximum of 20) */
	exempt_roles: string[];
	/** the channel ids that should not be affected by the rule (Maximum of 50) */
	exempt_channels: string[];
}

export type DiscordWebhook = {
	/** the id of the webhook */
	id: string;
	/** the type of the webhook */
	type: ObjectValues<typeof DiscordWebhookType>;
	/** the guild id this webhook is for, if any */
	guild_id?: string | null;
	/** the channel id this webhook is for, if any */
	channel_id: string | null;
	/** the user this webhook was created by (not returned when getting a webhook with its token) */
	user?: DiscordUser;
	/** the default name of the webhook */
	name: string | null;
	/** the default user avatar hash of the webhook */
	avatar: string | null;
	/** the secure token of the webhook (returned for Incoming Webhooks) */
	token?: string;
	/** the bot/OAuth2 application that created this webhook */
	application_id: string | null;
	/** the guild of the channel that this webhook is following (returned for Channel Follower Webhooks) */
	source_guild?: Partial<DiscordGuild>;
	/** the channel that this webhook is following (returned for Channel Follower Webhooks) */
	source_channel?: Partial<DiscordChannel>;
	/** the url used for executing the webhook (returned by the webhooks OAuth2 flow) */
	url?: string;
}

export const DiscordWebhookType = {
	/** Incoming Webhooks can post messages to channels with a generated token */
	Incoming: 1,
	/** Channel Follower Webhooks are internal webhooks used with Channel Following to post new messages into channels */
	ChannelFollower: 2,
	/** Application webhooks are webhooks used with Interactions */
	Application: 3
} as const;

/**
 * Many audit log events include a `changes` array in their entry object. The structure for
 * the individual changes varies based on the event type and its changed objects, so apps
 * shouldn't depend on a single pattern of handling audit log events.
 *
 * If `new_value` is not present in the change object while `old_value` is, it indicates that
 * the property has been reset or set to null. If `old_value` isn't included, it indicated that
 * the property was previously null.
 *
 * Some events don't follow the same pattern as other audit log events (see
 * {@link DiscordAuditLogChange} for the general shape). The exceptions are:
 * - **Command Permission**: the `key` is a snowflake instead of a field name. It represents the
 *   entity whose command permissions were affected (a role, channel, or user ID). The change
 *   object's `old_value`/`new_value` are the previous and updated command permissions objects
 *   for that entity, rather than a single field's value.
 * - **Invite and Invite Metadata**: uses an additional `channel_id` key (instead of the invite
 *   object's nested `channel.id`).
 * - **Partial Role**: uses `$add` and `$remove` as keys instead of field names. When present,
 *   `new_value` is an array of partial role objects (each containing the role's `id` and `name`)
 *   describing which roles were added or removed.
 * - **Webhook**: uses an `avatar_hash` key (instead of `avatar`).
 */
export type DiscordAuditLogChange<T extends JSONObject = JSONObject> = {
	/** New value of the key. Mixed type, matches the changed object field's type. Absent (while `old_value` is present) if the property was reset or set to null */
	new_value?: T | null;
	/** Old value of the key. Mixed type, matches the changed object field's type. Absent (while `new_value` is present) if the property was previously null */
	old_value?: T | null;
	/** Name of the changed entity, with a few exceptions - see {@link DiscordAuditLogChange} */
	key: string;
}

/**
 * Extra context attached to a {@link DiscordAuditLogEntry}'s `options` field. Which fields are
 * present depends entirely on the entry's `action_type` (see the per-field docs below for the
 * relevant {@link DiscordAuditLogEvent} values) - none of these fields are guaranteed for any
 * given entry.
 */
export type DiscordAuditEntryInfo = {
	/** ID of the app whose permissions were targeted. Present for: `APPLICATION_COMMAND_PERMISSION_UPDATE` */
	application_id?: string;
	/** Name of the Auto Moderation rule that was triggered. Present for: `AUTO_MODERATION_BLOCK_MESSAGE`, `AUTO_MODERATION_FLAG_TO_CHANNEL`, `AUTO_MODERATION_USER_COMMUNICATION_DISABLED`, `AUTO_MODERATION_QUARANTINE_USER` */
	auto_moderation_rule_name?: string;
	/** Trigger type of the Auto Moderation rule that was triggered. Present for: `AUTO_MODERATION_BLOCK_MESSAGE`, `AUTO_MODERATION_FLAG_TO_CHANNEL`, `AUTO_MODERATION_USER_COMMUNICATION_DISABLED`, `AUTO_MODERATION_QUARANTINE_USER` */
	auto_moderation_rule_trigger_type?: string;
	/** Channel in which the entities were targeted. Present for: `MEMBER_MOVE`, `MESSAGE_PIN`, `MESSAGE_UNPIN`, `MESSAGE_DELETE`, `STAGE_INSTANCE_CREATE`, `STAGE_INSTANCE_UPDATE`, `STAGE_INSTANCE_DELETE`, `AUTO_MODERATION_BLOCK_MESSAGE`, `AUTO_MODERATION_FLAG_TO_CHANNEL`, `AUTO_MODERATION_USER_COMMUNICATION_DISABLED`, `AUTO_MODERATION_QUARANTINE_USER`, `VOICE_CHANNEL_STATUS_CREATE`, `VOICE_CHANNEL_STATUS_DELETE` */
	channel_id?: string;
	/** Number of entities that were targeted. Present for: `MESSAGE_DELETE`, `MESSAGE_BULK_DELETE`, `MEMBER_DISCONNECT`, `MEMBER_MOVE` */
	count?: string;
	/** Number of days after which inactive members were kicked. Present for: `MEMBER_PRUNE` */
	delete_member_days?: string;
	/** ID of the overwritten entity. Present for: `CHANNEL_OVERWRITE_CREATE`, `CHANNEL_OVERWRITE_UPDATE`, `CHANNEL_OVERWRITE_DELETE` */
	id?: string;
	/** Number of members removed by the prune. Present for: `MEMBER_PRUNE` */
	members_removed?: string;
	/** ID of the message that was targeted. Present for: `MESSAGE_PIN`, `MESSAGE_UNPIN` */
	message_id?: string;
	/** Name of the role if `type` is "0" (not present if `type` is "1"). Present for: `CHANNEL_OVERWRITE_CREATE`, `CHANNEL_OVERWRITE_UPDATE`, `CHANNEL_OVERWRITE_DELETE` */
	role_name?: string;
	/** Type of overwritten entity - role ("0") or member ("1"). Present for: `CHANNEL_OVERWRITE_CREATE`, `CHANNEL_OVERWRITE_UPDATE`, `CHANNEL_OVERWRITE_DELETE` */
	type?: string;
	/** The type of integration which performed the action. Present for: `MEMBER_KICK`, `MEMBER_ROLE_UPDATE` */
	integration_type?: string;
	/** The new voice channel status. Present for: `VOICE_CHANNEL_STATUS_CREATE` */
	status?: string;
}

/**
 * Lists the audit log events and values (the `action_type` field on a {@link DiscordAuditLogEntry})
 * that an app may receive. Each value's comment notes which object's values may be included in the
 * entry's `changes` array. Though there are exceptions (see {@link DiscordAuditLogChange}), possible
 * keys in the `changes` array typically correspond to the noted object's own fields. If no object is
 * noted, there won't be a `changes` array in the entry, though other fields like `target_id` still
 * exist and many have fields in the `options` object (see {@link DiscordAuditEntryInfo}).
 *
 * You should assume that your app may run into any field for the changed object, though none are
 * guaranteed to be present. In most cases only a subset of the object's fields will be in the
 * `changes` array.
 *
 * Object Changed values marked with `*` have exception(s) to their available keys - see
 * {@link DiscordAuditLogChange} for details.
 */
export const DiscordAuditLogEvent = {
	/** Server settings were updated. Object Changed: Guild */
	GUILD_UPDATE: 1,
	/** Channel was created. Object Changed: Channel */
	CHANNEL_CREATE: 10,
	/** Channel settings were updated. Object Changed: Channel */
	CHANNEL_UPDATE: 11,
	/** Channel was deleted. Object Changed: Channel */
	CHANNEL_DELETE: 12,
	/** Permission overwrite was added to a channel. Object Changed: Channel Overwrite */
	CHANNEL_OVERWRITE_CREATE: 13,
	/** Permission overwrite was updated for a channel. Object Changed: Channel Overwrite */
	CHANNEL_OVERWRITE_UPDATE: 14,
	/** Permission overwrite was deleted from a channel. Object Changed: Channel Overwrite */
	CHANNEL_OVERWRITE_DELETE: 15,
	/** Member was removed from server */
	MEMBER_KICK: 20,
	/** Members were pruned from server */
	MEMBER_PRUNE: 21,
	/** Member was banned from server */
	MEMBER_BAN_ADD: 22,
	/** Server ban was lifted for a member */
	MEMBER_BAN_REMOVE: 23,
	/** Member was updated in server. Object Changed: Member */
	MEMBER_UPDATE: 24,
	/** Member was added or removed from a role. Object Changed: Partial Role* */
	MEMBER_ROLE_UPDATE: 25,
	/** Member was moved to a different voice channel */
	MEMBER_MOVE: 26,
	/** Member was disconnected from a voice channel */
	MEMBER_DISCONNECT: 27,
	/** Bot user was added to server */
	BOT_ADD: 28,
	/** Role was created. Object Changed: Role */
	ROLE_CREATE: 30,
	/** Role was edited. Object Changed: Role */
	ROLE_UPDATE: 31,
	/** Role was deleted. Object Changed: Role */
	ROLE_DELETE: 32,
	/** Server invite was created. Object Changed: Invite and Invite Metadata* */
	INVITE_CREATE: 40,
	/** Server invite was updated. Object Changed: Invite and Invite Metadata* */
	INVITE_UPDATE: 41,
	/** Server invite was deleted. Object Changed: Invite and Invite Metadata* */
	INVITE_DELETE: 42,
	/** Webhook was created. Object Changed: Webhook* */
	WEBHOOK_CREATE: 50,
	/** Webhook properties or channel were updated. Object Changed: Webhook* */
	WEBHOOK_UPDATE: 51,
	/** Webhook was deleted. Object Changed: Webhook* */
	WEBHOOK_DELETE: 52,
	/** Emoji was created. Object Changed: Emoji */
	EMOJI_CREATE: 60,
	/** Emoji name was updated. Object Changed: Emoji */
	EMOJI_UPDATE: 61,
	/** Emoji was deleted. Object Changed: Emoji */
	EMOJI_DELETE: 62,
	/** Single message was deleted */
	MESSAGE_DELETE: 72,
	/** Multiple messages were deleted */
	MESSAGE_BULK_DELETE: 73,
	/** Message was pinned to a channel */
	MESSAGE_PIN: 74,
	/** Message was unpinned from a channel */
	MESSAGE_UNPIN: 75,
	/** App was added to server. Object Changed: Integration */
	INTEGRATION_CREATE: 80,
	/** App was updated (as an example, its scopes were updated). Object Changed: Integration */
	INTEGRATION_UPDATE: 81,
	/** App was removed from server. Object Changed: Integration */
	INTEGRATION_DELETE: 82,
	/** Stage instance was created (stage channel becomes live). Object Changed: Stage Instance */
	STAGE_INSTANCE_CREATE: 83,
	/** Stage instance details were updated. Object Changed: Stage Instance */
	STAGE_INSTANCE_UPDATE: 84,
	/** Stage instance was deleted (stage channel no longer live). Object Changed: Stage Instance */
	STAGE_INSTANCE_DELETE: 85,
	/** Sticker was created. Object Changed: Sticker */
	STICKER_CREATE: 90,
	/** Sticker details were updated. Object Changed: Sticker */
	STICKER_UPDATE: 91,
	/** Sticker was deleted. Object Changed: Sticker */
	STICKER_DELETE: 92,
	/** Event was created. Object Changed: Guild Scheduled Event */
	GUILD_SCHEDULED_EVENT_CREATE: 100,
	/** Event was updated. Object Changed: Guild Scheduled Event */
	GUILD_SCHEDULED_EVENT_UPDATE: 101,
	/** Event was cancelled. Object Changed: Guild Scheduled Event */
	GUILD_SCHEDULED_EVENT_DELETE: 102,
	/** Thread was created in a channel. Object Changed: Thread */
	THREAD_CREATE: 110,
	/** Thread was updated. Object Changed: Thread */
	THREAD_UPDATE: 111,
	/** Thread was deleted. Object Changed: Thread */
	THREAD_DELETE: 112,
	/** Permissions were updated for a command. Object Changed: Command Permission* */
	APPLICATION_COMMAND_PERMISSION_UPDATE: 121,
	/** Soundboard sound was created. Object Changed: Soundboard Sound */
	SOUNDBOARD_SOUND_CREATE: 130,
	/** Soundboard sound was updated. Object Changed: Soundboard Sound */
	SOUNDBOARD_SOUND_UPDATE: 131,
	/** Soundboard sound was deleted. Object Changed: Soundboard Sound */
	SOUNDBOARD_SOUND_DELETE: 132,
	/** Auto Moderation rule was created. Object Changed: Auto Moderation Rule */
	AUTO_MODERATION_RULE_CREATE: 140,
	/** Auto Moderation rule was updated. Object Changed: Auto Moderation Rule */
	AUTO_MODERATION_RULE_UPDATE: 141,
	/** Auto Moderation rule was deleted. Object Changed: Auto Moderation Rule */
	AUTO_MODERATION_RULE_DELETE: 142,
	/** Message was blocked by Auto Moderation */
	AUTO_MODERATION_BLOCK_MESSAGE: 143,
	/** Message was flagged by Auto Moderation */
	AUTO_MODERATION_FLAG_TO_CHANNEL: 144,
	/** Member was timed out by Auto Moderation */
	AUTO_MODERATION_USER_COMMUNICATION_DISABLED: 145,
	/** Member was quarantined by Auto Moderation */
	AUTO_MODERATION_QUARANTINE_USER: 146,
	/** Creator monetization request was created */
	CREATOR_MONETIZATION_REQUEST_CREATED: 150,
	/** Creator monetization terms were accepted */
	CREATOR_MONETIZATION_TERMS_ACCEPTED: 151,
	/** Guild Onboarding Question was created. Object Changed: Onboarding Prompt Structure */
	ONBOARDING_PROMPT_CREATE: 163,
	/** Guild Onboarding Question was updated. Object Changed: Onboarding Prompt Structure */
	ONBOARDING_PROMPT_UPDATE: 164,
	/** Guild Onboarding Question was deleted. Object Changed: Onboarding Prompt Structure */
	ONBOARDING_PROMPT_DELETE: 165,
	/** Guild Onboarding was created. Object Changed: Guild Onboarding */
	ONBOARDING_CREATE: 166,
	/** Guild Onboarding was updated. Object Changed: Guild Onboarding */
	ONBOARDING_UPDATE: 167,
	/** Guild Server Guide was created */
	HOME_SETTINGS_CREATE: 190,
	/** Guild Server Guide was updated */
	HOME_SETTINGS_UPDATE: 191,
	/** A voice channel status was set by a user */
	VOICE_CHANNEL_STATUS_CREATE: 192,
	/** A voice channel status was deleted by a user */
	VOICE_CHANNEL_STATUS_DELETE: 193
} as const;

/**
 * Indicates in what event context a rule should be checked.
 */
export const DiscordAutoModerationRuleEventType = {
	/** when a member sends or edits a message in the guild */
	MESSAGE_SEND: 1,
	/** when a member edits their profile */
	MEMBER_UPDATE: 2
} as const;

/**
 * Characterizes the type of content which can trigger the rule. The comment on each value notes
 * the maximum number of rules of that trigger type allowed per guild.
 */
export const DiscordAutoModerationRuleTriggerType = {
	/** check if content contains words from a user defined list of keywords. Max per guild: 6 */
	KEYWORD: 1,
	/** check if content represents generic spam. Max per guild: 1 */
	SPAM: 3,
	/** check if content contains words from internal pre-defined wordsets. Max per guild: 1 */
	KEYWORD_PRESET: 4,
	/** check if content contains more unique mentions than allowed. Max per guild: 1 */
	MENTION_SPAM: 5,
	/** check if member profile contains words from a user defined list of keywords. Max per guild: 1 */
	MEMBER_PROFILE: 6
} as const;

/**
 * Additional data used to determine whether a rule should be triggered. Different fields are
 * relevant based on the value of `trigger_type`.
 *
 * Field limits:
 * - `keyword_filter`: max array length 1000, max 60 characters per string. Associated trigger types: `KEYWORD`, `MEMBER_PROFILE`
 * - `regex_patterns`: max array length 10, max 260 characters per string. Associated trigger types: `KEYWORD`, `MEMBER_PROFILE`
 * - `allow_list`: max array length 100 (or 1000 for `KEYWORD_PRESET`), max 60 characters per string. Associated trigger types: `KEYWORD`, `MEMBER_PROFILE` (100), `KEYWORD_PRESET` (1000)
 */
export type DiscordAutoModerationRuleTriggerMetadata = {
	/**
	 * Substrings which will be searched for in content (Maximum of 1000). Associated Trigger Types: `KEYWORD`, `MEMBER_PROFILE`
	 *
	 * A keyword can be a phrase which contains multiple words. Wildcard symbols can be used to
	 * customize how each keyword will be matched. Each keyword must be 60 characters or less.
	 */
	keyword_filter?: string[];
	/**
	 * Regular expression patterns which will be matched against content (Maximum of 10). Associated Trigger Types: `KEYWORD`, `MEMBER_PROFILE`
	 *
	 * Only Rust flavored regex is currently supported, which can be tested in online editors such
	 * as Rustexp. Each regex pattern must be 260 characters or less.
	 */
	regex_patterns?: string[];
	/** the internally pre-defined wordsets which will be searched for in content. Associated Trigger Types: `KEYWORD_PRESET` */
	presets?: ObjectValues<typeof DiscordAutoModerationKeywordPresetType>[];
	/**
	 * Substrings which should not trigger the rule (Maximum of 100 or 1000). Associated Trigger Types: `KEYWORD`, `KEYWORD_PRESET`, `MEMBER_PROFILE`
	 *
	 * Each allow_list keyword can be a phrase which contains multiple words. Wildcard symbols can
	 * be used to customize how each keyword will be matched. Rules with `KEYWORD` trigger_type
	 * accept a maximum of 100 keywords. Rules with `KEYWORD_PRESET` trigger_type accept a maximum
	 * of 1000 keywords.
	 */
	allow_list?: string[];
	/** total number of unique role and user mentions allowed per message (Maximum of 50). Associated Trigger Types: `MENTION_SPAM` */
	mention_total_limit?: number;
	/** whether to automatically detect mention raids. Associated Trigger Types: `MENTION_SPAM` */
	mention_raid_protection_enabled?: boolean;
}

export type DiscordAutoModerationAction = {
	/** the type of action */
	type: ObjectValues<typeof DiscordAutoModerationActionType>;
	/**
	 * Additional metadata needed during execution for this specific action type.
	 *
	 * Can be omitted based on `type`. See {@link DiscordAutoModerationActionMetadata} to
	 * understand which `type` values require metadata to be set.
	 */
	metadata?: DiscordAutoModerationActionMetadata;
}

export const DiscordAutoModerationActionType = {
	/** blocks a member's message and prevents it from being posted. A custom explanation can be specified and shown to members whenever their message is blocked */
	BLOCK_MESSAGE: 1,
	/** logs user content to a specified channel */
	SEND_ALERT_MESSAGE: 2,
	/**
	 * timeout user for a specified duration
	 *
	 * A TIMEOUT action can only be set up for `KEYWORD` and `MENTION_SPAM` rules. The
	 * MODERATE_MEMBERS permission is required to use the TIMEOUT action type.
	 */
	TIMEOUT: 3,
	/** prevents a member from using text, voice, or other interactions */
	BLOCK_MEMBER_INTERACTION: 4
} as const;

/**
 * Additional data used when an action is executed. Different fields are relevant based on the
 * value of `type` on the containing {@link DiscordAutoModerationAction}.
 */
export type DiscordAutoModerationActionMetadata = {
	/** channel to which user content should be logged (must be an existing channel). Associated Action Types: `SEND_ALERT_MESSAGE` */
	channel_id?: string;
	/** timeout duration in seconds (maximum of 2419200 seconds / 4 weeks). Associated Action Types: `TIMEOUT` */
	duration_seconds?: number;
	/** additional explanation that will be shown to members whenever their message is blocked (maximum of 150 characters). Associated Action Types: `BLOCK_MESSAGE` */
	custom_message?: string;
}

export const DiscordAutoModerationKeywordPresetType = {
	/** words that may be considered forms of swearing or cursing */
	PROFANITY: 1,
	/** words that refer to sexually explicit behavior or activity */
	SEXUAL_CONTENT: 2,
	/** personal insults or words that may be considered hate speech */
	SLURS: 3
} as const;

export const MessageFlags = {
	/** this message has been published to subscribed channels (via Channel Following) */
	CROSSPOSTED: 1 << 0,
	/** this message originated from a message in another channel (via Channel Following) */
	IS_CROSSPOST: 1 << 1,
	/** do not include any embeds when serializing this message */
	SUPPRESS_EMBEDS: 1 << 2,
	/** the source message for this crosspost has been deleted (via Channel Following) */
	SOURCE_MESSAGE_DELETED: 1 << 3,
	/** this message came from the urgent message system */
	URGENT: 1 << 4,
	/** this message has an associated thread, with the same id as the message */
	HAS_THREAD: 1 << 5,
	/** this message is only visible to the user who invoked the Interaction */
	EPHEMERAL: 1 << 6,
	/** this message is an Interaction Response and the bot is “thinking” */
	LOADING: 1 << 7,
	/** this message failed to mention some roles and add their members to the thread */
	FAILED_TO_MENTION_SOME_ROLES_IN_THREAD: 1 << 8,
	/** this message will not trigger push and desktop notifications */
	SUPPRESS_NOTIFICATIONS: 1 << 12,
	/** this message is a voice message */
	IS_VOICE_MESSAGE: 1 << 13,
	/** this message has a snapshot (via Message Forwarding) */
	HAS_SNAPSHOT: 1 << 14,
	/** allows you to create fully component-driven messages */
	IS_COMPONENTS_V2: 1 << 15,
} as const;