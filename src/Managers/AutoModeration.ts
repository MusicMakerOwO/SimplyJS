import { AutoModerationRule } from "../Structures/AutoModerationRule.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import {
	DiscordAutoModerationAction,
	DiscordAutoModerationRule,
	DiscordAutoModerationRuleEventType,
	DiscordAutoModerationRuleTriggerMetadata,
	DiscordAutoModerationRuleTriggerType
} from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { JSONObject } from "../Types/index.js";

/**
 * Cache of a single guild's {@link AutoModerationRule}s.
 *
 * Discord never includes auto moderation rules in the `GUILD_CREATE` payload, so this cache starts
 * empty and is filled by gateway events or by an explicit {@link AutoModerationRuleCache.fetch} /
 * {@link AutoModerationRuleCache.fetchAll} call.
 */
export class AutoModerationRuleCache extends GuildScopedCache<string, AutoModerationRule, DiscordAutoModerationRule> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordAutoModerationRule): AutoModerationRule {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new AutoModerationRule(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<AutoModerationRule> {
		const fetched = await this.client.rest.get<DiscordAutoModerationRule>(`/guilds/${this.guild.id}/auto-moderation/rules/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Fetches every auto moderation rule in this guild and caches them.
	 * Requires the `MANAGE_GUILD` permission and will error otherwise.
	 * @see https://docs.discord.com/developers/resources/auto-moderation#list-auto-moderation-rules-for-guild
	 */
	async fetchAll(): Promise<AutoModerationRule[]> {
		const fetched = await this.client.rest.get<DiscordAutoModerationRule[]>(`/guilds/${this.guild.id}/auto-moderation/rules`);
		return fetched.map(rule => this.upsert(rule));
	}

	/**
	 * Creates an auto moderation rule in this guild.
	 * Requires the `MANAGE_GUILD` permission and will error otherwise.
	 * @param data The rule data to send to Discord
	 * @see https://docs.discord.com/developers/resources/auto-moderation#create-auto-moderation-rule
	 */
	async create(data: {
		/** The rule name */
		name: string
		/** The context in which the rule is checked */
		eventType: ObjectValues<typeof DiscordAutoModerationRuleEventType>
		/** The type of content that triggers the rule; cannot be changed after creation */
		triggerType: ObjectValues<typeof DiscordAutoModerationRuleTriggerType>
		/** Additional data used to determine whether the rule should trigger, required for most trigger types */
		triggerMetadata?: DiscordAutoModerationRuleTriggerMetadata
		/** The actions to execute when the rule is triggered */
		actions: DiscordAutoModerationAction[]
		/** Whether the rule is enabled; rules are created disabled by default */
		enabled?: boolean
		/** Role ids that should not be affected by the rule (maximum of 20) */
		exemptRoles?: string[]
		/** Channel ids that should not be affected by the rule (maximum of 50) */
		exemptChannels?: string[]
	}): Promise<AutoModerationRule> {
		const { eventType, triggerType, triggerMetadata, exemptRoles, exemptChannels, ...rest } = data;
		const payload = {
			...rest,
			event_type: eventType,
			trigger_type: triggerType,
			trigger_metadata: triggerMetadata,
			exempt_roles: exemptRoles,
			exempt_channels: exemptChannels
		};

		const ruleData = await this.client.rest.post<DiscordAutoModerationRule>(`/guilds/${this.guild.id}/auto-moderation/rules`, payload as unknown as JSONObject);
		return this.upsert(ruleData);
	}
}
