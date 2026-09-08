import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordAutoModerationActionExecution, DiscordAutoModerationRule } from "../Types/DiscordAPITypes.js";
import { AutoModerationActionExecutionPayload, ClientEvents } from "../Types/SimplyJSTypes.js";

export const AutoModerationRuleCreate = defineEvent({
	name: GatewayEvents.AutoModerationRuleCreate,
	handler: (client, data: DiscordAutoModerationRule): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const rule = guild.autoModerationRules.upsert(data);
		client.emit(ClientEvents.AutoModerationRuleCreate, rule);
	}
});

export const AutoModerationRuleUpdate = defineEvent({
	name: GatewayEvents.AutoModerationRuleUpdate,
	handler: (client, data: DiscordAutoModerationRule): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		const oldRule = guild.autoModerationRules.get(data.id)?.clone();
		const newRule = guild.autoModerationRules.upsert(data);
		client.emit(ClientEvents.AutoModerationRuleUpdate, oldRule, newRule);
	}
});

export const AutoModerationRuleDelete = defineEvent({
	name: GatewayEvents.AutoModerationRuleDelete,
	handler: (client, data: DiscordAutoModerationRule): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		// Rules are only cached lazily, so a miss here is expected - fall back to the raw payload
		const saved = guild.autoModerationRules.get(data.id);
		client.emit(ClientEvents.AutoModerationRuleDelete, saved ?? data);
		guild.autoModerationRules.delete(data.id);
	}
});

export const AutoModerationActionExecution = defineEvent({
	name: GatewayEvents.AutoModerationActionExecution,
	handler: (client, data: DiscordAutoModerationActionExecution): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;
		// Nothing to cache here - the payload describes an occurrence, not an entity
		const payload: AutoModerationActionExecutionPayload = {
			guildId: data.guild_id,
			action: data.action,
			ruleId: data.rule_id,
			ruleTriggerType: data.rule_trigger_type,
			userId: data.user_id,
			content: data.content,
			matchedKeyword: data.matched_keyword,
			matchedContent: data.matched_content,
			// Blocked messages arrive without a channel or message, and only SEND_ALERT_MESSAGE
			// actions carry an alert message id
			...(data.channel_id !== undefined ? { channelId: data.channel_id } : {}),
			...(data.message_id !== undefined ? { messageId: data.message_id } : {}),
			...(data.alert_system_message_id !== undefined ? { alertSystemMessageId: data.alert_system_message_id } : {})
		};
		client.emit(ClientEvents.AutoModerationActionExecution, payload);
	}
});
