import { Client } from "../Client.js";
import {
	DiscordAutoModerationAction,
	DiscordAutoModerationRule,
	DiscordAutoModerationRuleEventType,
	DiscordAutoModerationRuleTriggerMetadata,
	DiscordAutoModerationRuleTriggerType
} from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { JSONObject } from "../Types/index.js";

/**
 * An auto moderation rule, describing the content Discord should check for in a guild and the
 * actions to take when a match is found.
 */
export class AutoModerationRule extends APIGuildStructure<DiscordAutoModerationRule> {
	id!: string
	/** Id of the guild this rule belongs to */
	guildId!: string
	/** The rule name */
	name!: string
	/** Id of the user who first created this rule */
	creatorId!: string
	/** The context in which this rule is checked */
	eventType!: ObjectValues<typeof DiscordAutoModerationRuleEventType>
	/** The type of content that triggers this rule */
	triggerType!: ObjectValues<typeof DiscordAutoModerationRuleTriggerType>
	/** Additional data used to determine whether the rule should trigger, keyed to `triggerType` */
	triggerMetadata!: DiscordAutoModerationRuleTriggerMetadata
	/** The actions executed when the rule is triggered */
	actions!: DiscordAutoModerationAction[]
	/** Whether the rule is currently enabled */
	enabled!: boolean
	/** Role ids exempt from this rule (maximum of 20) */
	exemptRoles!: string[]
	/** Channel ids exempt from this rule (maximum of 50) */
	exemptChannels!: string[]

	constructor(client: Client, guild: Guild, data: DiscordAutoModerationRule) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordAutoModerationRule): void {
		this.id = data.id;
		this.guildId = data.guild_id;
		this.name = data.name;
		this.creatorId = data.creator_id;
		this.eventType = data.event_type;
		this.triggerType = data.trigger_type;
		this.triggerMetadata = data.trigger_metadata;
		this.actions = data.actions;
		this.enabled = data.enabled;
		this.exemptRoles = data.exempt_roles;
		this.exemptChannels = data.exempt_channels;
	}

	/**
	 * Modifies this rule. Requires the `MANAGE_GUILD` permission and will error otherwise.
	 *
	 * The rule's `triggerType` cannot be changed after creation, so it is not accepted here.
	 * @param changes The fields to update; any omitted field is left untouched.
	 * @see https://docs.discord.com/developers/resources/auto-moderation#modify-auto-moderation-rule
	 */
	async modify(changes: {
		/** New name for the rule */
		name?: string
		/** The context in which the rule should be checked */
		eventType?: ObjectValues<typeof DiscordAutoModerationRuleEventType>
		/** Trigger metadata appropriate for this rule's existing `triggerType` */
		triggerMetadata?: DiscordAutoModerationRuleTriggerMetadata
		/** The actions to execute when the rule is triggered */
		actions?: DiscordAutoModerationAction[]
		/** Whether the rule should be enabled */
		enabled?: boolean
		/** Role ids that should not be affected by the rule (maximum of 20) */
		exemptRoles?: string[]
		/** Channel ids that should not be affected by the rule (maximum of 50) */
		exemptChannels?: string[]
	}): Promise<void> {
		const { eventType, triggerMetadata, exemptRoles, exemptChannels, ...rest } = changes;
		const payload = {
			...rest,
			event_type: eventType,
			trigger_metadata: triggerMetadata,
			exempt_roles: exemptRoles,
			exempt_channels: exemptChannels
		};
		await this.client.rest.patch(`/guilds/${this.guildId}/auto-moderation/rules/${this.id}`, payload as unknown as JSONObject);
	}

	/**
	 * Deletes this rule. Requires the `MANAGE_GUILD` permission and will error otherwise.
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guildId}/auto-moderation/rules/${this.id}`);
	}
}
