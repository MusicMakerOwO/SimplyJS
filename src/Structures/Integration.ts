import { Client } from "../Client.js";
import {
	DiscordIntegration,
	DiscordIntegrationAccount,
	DiscordIntegrationApplication,
	DiscordIntegrationExpireBehaviors,
	DiscordIntegrationType,
	DiscordOAuth2Scopes,
	DiscordUser
} from "../Types/index.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { Role } from "./Role.js";
import { ObjectValues } from "../Types/HelperTypes.js";

/**
 * An integration attached to a guild, either a subscriber sync with an external service such as
 * Twitch or YouTube, or an installed bot.
 *
 * Only the streaming integration types carry the subscriber fields, so everything from
 * {@link Integration.syncing} onwards is `undefined` for bot and `guild_subscription` integrations.
 *
 * There is no `modify()` here on purpose - Discord deprecated `PATCH /guilds/{id}/integrations/{id}`
 * and it is no longer usable, leaving {@link Integration.delete} as the only supported mutation.
 *
 * @see https://docs.discord.com/developers/resources/guild#integration-object
 */
export class Integration extends APIGuildStructure<DiscordIntegration> {
	id!: string;
	/** Id of the guild this integration belongs to */
	guildId!: string;
	/** The integration name */
	name!: string;
	/** The service this integration syncs with */
	type!: DiscordIntegrationType;
	/** Whether the integration is enabled */
	enabled!: boolean;
	/** The account on the integrated service that this integration is tied to */
	account!: DiscordIntegrationAccount;
	/** Whether the integration is currently syncing, absent for bot integrations */
	syncing?: boolean;
	/** Id of the role this integration grants its subscribers, absent for bot integrations */
	roleId?: string;
	/** Whether emoticons should be synced, Twitch only, absent for bot integrations */
	enableEmoticons?: boolean;
	/** What happens to a subscriber whose subscription lapses, absent for bot integrations */
	expireBehavior?: ObjectValues<typeof DiscordIntegrationExpireBehaviors>;
	/** Grace period in days before a lapsed subscriber expires, absent for bot integrations */
	expireGracePeriod?: number;
	/** The user who added this integration, absent for bot integrations */
	user?: DiscordUser;
	/** When this integration last synced, absent for bot integrations */
	syncedAt?: string;
	/** How many subscribers this integration has, absent for bot integrations */
	subscriberCount?: number;
	/** Whether this integration has been revoked, absent for bot integrations */
	revoked?: boolean;
	/** The bot or OAuth2 application backing a `discord` integration */
	application?: DiscordIntegrationApplication;
	/** The OAuth2 scopes the application was authorized for */
	scopes?: ObjectValues<typeof DiscordOAuth2Scopes>[];

	constructor(client: Client, guild: Guild, data: DiscordIntegration) {
		super(client, guild);
		this.guildId = guild.id;
		this.patch(data);
	}

	patch(data: DiscordIntegration): void {
		this.id = data.id;
		this.name = data.name;
		this.type = data.type;
		this.enabled = data.enabled;
		this.account = data.account;

		if ("syncing" in data && data.syncing !== undefined) this.syncing = data.syncing;
		if ("role_id" in data && data.role_id !== undefined) this.roleId = data.role_id;
		if ("enable_emoticons" in data && data.enable_emoticons !== undefined) this.enableEmoticons = data.enable_emoticons;
		if ("expire_behavior" in data && data.expire_behavior !== undefined) this.expireBehavior = data.expire_behavior;
		if ("expire_grace_period" in data && data.expire_grace_period !== undefined) this.expireGracePeriod = data.expire_grace_period;
		if ("user" in data && data.user !== undefined) this.user = data.user;
		if ("synced_at" in data && data.synced_at !== undefined) this.syncedAt = data.synced_at;
		if ("subscriber_count" in data && data.subscriber_count !== undefined) this.subscriberCount = data.subscriber_count;
		if ("revoked" in data && data.revoked !== undefined) this.revoked = data.revoked;
		if ("application" in data && data.application !== undefined) this.application = data.application;
		if ("scopes" in data && data.scopes !== undefined) this.scopes = data.scopes;
	}

	/** The role this integration grants its subscribers, `undefined` when unset or uncached */
	get role(): Role | undefined {
		if (this.roleId === undefined) return undefined;
		return this.guild.roles.get(this.roleId);
	}

	/**
	 * Deletes this integration, removing any associated webhooks and kicking the bot if there is one.
	 * Requires the `MANAGE_GUILD` permission and will error otherwise.
	 *
	 * @see https://docs.discord.com/developers/resources/guild#delete-guild-integration
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guildId}/integrations/${this.id}`);
	}
}
