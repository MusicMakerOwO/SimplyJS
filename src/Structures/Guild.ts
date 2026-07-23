import { Client } from "../Client.js";
import {
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

export class Guild extends APIClientStructure<DiscordGuild> {
	id!: string;
	name!: string;
	icon?: string | null;
	icon_hash?: string | null;
	splash?: string | null;
	discovery_splash?: string | null;
	owner?: boolean;
	owner_id!: string;
	permissions?: string;
	region?: string | null;
	afk_channel_id?: string | null;
	afk_timeout!: number;
	widget_enabled?: boolean;
	widget_channel_id?: string | null;
	verification_level!: ObjectValues<typeof DiscordVerificationLevels>;
	default_message_notifications!: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
	explicit_content_filter!: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
	features!: ObjectValues<typeof DiscordGuildFeatures>[];
	mfa_level!: ObjectValues<typeof DiscordMFALevels>;
	application_id?: string;
	system_channel_id?: string | null;
	system_channel_flags!: number;
	rules_channel_id?: string | null;
	max_presences?: number | null;
	max_members?: number;
	vanity_url_code?: string | null;
	description?: string | null;
	banner?: string | null;
	premium_tier!: ObjectValues<typeof DiscordPremiumTiers>;
	premium_subscription_count?: number;
	preferred_locale!: ObjectValues<typeof DiscordLocaleByLanguage>;
	public_updates_channel_id?: string | null;
	max_video_channel_users?: number;
	max_stage_video_channel_users?: number;
	approximate_member_count?: number;
	approximate_presence_count?: number;
	welcome_screen?: DiscordWelcomeScreen;
	nsfw_level!: ObjectValues<typeof DiscordGuildAgeRestrictionLevels>;
	premium_progress_bar_enabled!: boolean;
	safety_alerts_channel_id?: string | null;
	incidents_data?: DiscordIncidentsData;

	channels: ChannelCache;
	roles: RoleCache;
	emojis: EmojiCache;
	stickers: StickerCache;
	members: MemberCache;

	constructor(client: Client, data: DiscordGuild & { channels?: DiscordChannel[], members?: DiscordMember[] }) {
		super(client);
		this.channels = new ChannelCache(client, this);
		this.roles    = new RoleCache(client, this);
		this.emojis   = new EmojiCache(client, this);
		this.stickers = new StickerCache(client, this);
		this.members  = new MemberCache(client, this);

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
	 * Modifies general guild settings
	 * @param changes
	 */
	async modify(changes: {
		name?: string;
		region?: string;
		verification_level?: ObjectValues<typeof DiscordVerificationLevels>;
		default_message_notifications?: ObjectValues<typeof DiscordDefaultMessageNotificationLevels>;
		explicit_content_filter?: ObjectValues<typeof DiscordExplicitContentFilterLevels>;
		afk_channel_id?: string | null;
		afk_timeout?: number;
		icon?: string | null;
		splash?: string | null;
		discovery_splash?: string | null;
		banner?: string | null;
		system_channel_id?: string | null;
		system_channel_flags?: number;
		rules_channel_id?: string | null;
		public_updates_channel_id?: string | null;
		preferred_locale?: ObjectValues<typeof DiscordLocaleByLanguage>;
		description?: string | null;
		premium_progress_bar_enabled?: boolean;
		safety_alerts_channel_id?: string | null;
	}): Promise<void> {
		await this.client.rest.patch(`/guilds/${this.id}`, changes);
	}
}