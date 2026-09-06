import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordAutoModerationRule } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

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
		const oldRule = guild.autoModerationRules.get(data.id);
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
