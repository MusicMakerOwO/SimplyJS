import { GatewayEvents, GatewayIntents } from "./Types/DiscordGateway.js";
import { ObjectValues } from "./Types/HelperTypes.js";

/**
 * Maps each gateway event to the intent(s) required to receive it from Discord.
 *
 * This table is designed to help catch configuration mistakes, i.e. if you subscribe to an event but forget to enable the necessary intent(s).
 *
 * The value is the bitfield value(s) from {@link GatewayIntents} - either a single number or an array of numbers if multiple intents can enable the event.
 *
 * @example
 *   EventRequiredIntent.GuildCreate // GatewayIntents.Guilds
 *   EventRequiredIntent.ThreadMembersUpdate // [GatewayIntents.Guilds, GatewayIntents.GuildMembers]
 *
 * @see GatewayIntents
 * @see GatewayEvents
 */
export const EventRequiredIntent = {
	[GatewayEvents.Ready]: 0, // no intents, global
	[GatewayEvents.GuildCreate]: GatewayIntents.Guilds,
	[GatewayEvents.GuildUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.GuildDelete]: GatewayIntents.Guilds,
	[GatewayEvents.GuildRoleCreate]: GatewayIntents.Guilds,
	[GatewayEvents.GuildRoleUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.GuildRoleDelete]: GatewayIntents.Guilds,
	[GatewayEvents.ChannelCreate]: GatewayIntents.Guilds,
	[GatewayEvents.ChannelUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.ChannelDelete]: GatewayIntents.Guilds,
	[GatewayEvents.ChannelPinsUpdate]: [GatewayIntents.Guilds, GatewayIntents.DirectMessages],
	[GatewayEvents.ThreadCreate]: GatewayIntents.Guilds,
	[GatewayEvents.ThreadUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.ThreadDelete]: GatewayIntents.Guilds,
	[GatewayEvents.ThreadListSync]: GatewayIntents.Guilds,
	[GatewayEvents.ThreadMemberUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.ThreadMembersUpdate]: [GatewayIntents.Guilds, GatewayIntents.GuildMembers],
	[GatewayEvents.StageInstanceCreate]: GatewayIntents.Guilds,
	[GatewayEvents.StageInstanceUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.StageInstanceDelete]: GatewayIntents.Guilds,
	[GatewayEvents.VoiceChannelStatusUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.VoiceChannelStartTimeUpdate]: GatewayIntents.Guilds,
	[GatewayEvents.GuildMemberAdd]: GatewayIntents.GuildMembers,
	[GatewayEvents.GuildMemberUpdate]: GatewayIntents.GuildMembers,
	[GatewayEvents.GuildMemberRemove]: GatewayIntents.GuildMembers,
	[GatewayEvents.GuildAuditLogEntryCreate]: GatewayIntents.GuildModeration,
	[GatewayEvents.GuildBanAdd]: GatewayIntents.GuildModeration,
	[GatewayEvents.GuildBanRemove]: GatewayIntents.GuildModeration,
	[GatewayEvents.GuildEmojisUpdate]: GatewayIntents.GuildExpressions,
	[GatewayEvents.GuildStickersUpdate]: GatewayIntents.GuildExpressions,
	[GatewayEvents.GuildSoundboardSoundCreate]: GatewayIntents.GuildExpressions,
	[GatewayEvents.GuildSoundboardSoundUpdate]: GatewayIntents.GuildExpressions,
	[GatewayEvents.GuildSoundboardSoundDelete]: GatewayIntents.GuildExpressions,
	[GatewayEvents.GuildSoundboardSoundsUpdate]: GatewayIntents.GuildExpressions,
	[GatewayEvents.GuildIntegrationsUpdate]: GatewayIntents.GuildIntegrations,
	[GatewayEvents.IntegrationCreate]: GatewayIntents.GuildIntegrations,
	[GatewayEvents.IntegrationUpdate]: GatewayIntents.GuildIntegrations,
	[GatewayEvents.IntegrationDelete]: GatewayIntents.GuildIntegrations,
	[GatewayEvents.WebhooksUpdate]: GatewayIntents.GuildWebhooks,
	[GatewayEvents.InviteCreate]: GatewayIntents.GuildInvites,
	[GatewayEvents.InviteDelete]: GatewayIntents.GuildInvites,
	[GatewayEvents.VoiceChannelEffectSend]: GatewayIntents.GuildVoiceStates,
	[GatewayEvents.VoiceStateUpdate]: GatewayIntents.GuildVoiceStates,
	[GatewayEvents.PresenceUpdate]: GatewayIntents.GuildPresences,
	[GatewayEvents.MessageCreate]: [GatewayIntents.GuildMessages, GatewayIntents.DirectMessages],
	[GatewayEvents.MessageUpdate]: [GatewayIntents.GuildMessages, GatewayIntents.DirectMessages],
	[GatewayEvents.MessageDelete]: [GatewayIntents.GuildMessages, GatewayIntents.DirectMessages],
	[GatewayEvents.MessageDeleteBulk]: GatewayIntents.GuildMessages,
	[GatewayEvents.MessageReactionAdd]: [GatewayIntents.GuildMessageReactions, GatewayIntents.DirectMessageReactions],
	[GatewayEvents.MessageReactionRemove]: [GatewayIntents.GuildMessageReactions, GatewayIntents.DirectMessageReactions],
	[GatewayEvents.MessageReactionRemoveAll]: [GatewayIntents.GuildMessageReactions, GatewayIntents.DirectMessageReactions],
	[GatewayEvents.MessageReactionRemoveEmoji]: [GatewayIntents.GuildMessageReactions, GatewayIntents.DirectMessageReactions],
	[GatewayEvents.TypingStart]: [GatewayIntents.GuildMessageTyping, GatewayIntents.DirectMessageTyping],
	[GatewayEvents.GuildScheduledEventCreate]: GatewayIntents.GuildScheduledEvents,
	[GatewayEvents.GuildScheduledEventUpdate]: GatewayIntents.GuildScheduledEvents,
	[GatewayEvents.GuildScheduledEventDelete]: GatewayIntents.GuildScheduledEvents,
	[GatewayEvents.GuildScheduledEventUserAdd]: GatewayIntents.GuildScheduledEvents,
	[GatewayEvents.GuildScheduledEventUserRemove]: GatewayIntents.GuildScheduledEvents,
	[GatewayEvents.AutoModerationRuleCreate]: GatewayIntents.AutoModerationConfiguration,
	[GatewayEvents.AutoModerationRuleUpdate]: GatewayIntents.AutoModerationConfiguration,
	[GatewayEvents.AutoModerationRuleDelete]: GatewayIntents.AutoModerationConfiguration,
	[GatewayEvents.AutoModerationActionExecution]: GatewayIntents.AutoModerationExecution,
	[GatewayEvents.MessagePollVoteAdd]: [GatewayIntents.GuildMessagePolls, GatewayIntents.DirectMessagePolls],
	[GatewayEvents.MessagePollVoteRemove]: [GatewayIntents.GuildMessagePolls, GatewayIntents.DirectMessagePolls],
} as const;

/** Convert `ClientOptions.intents` to a bitfield of intents */
export function ResolveIntents(
	input:
		| number
		| ObjectValues<typeof GatewayIntents>[]
		| (keyof typeof GatewayIntents)[]
): number {
	if (typeof input === "number") return input;

	if (input.every(x => typeof x === "number")) {
		return input.reduce((a, b) => a | b, 0);
	}

	let intents = 0;
	for (const intent of input) {
		if (!(intent in GatewayIntents)) throw new Error(`Unknown intent: "${intent}"`);
		intents |= GatewayIntents[intent];
	}
	return intents;
}

export function HasIntent(bitfield: number, targetIntent: ObjectValues<typeof GatewayIntents>): boolean {
	return !!(bitfield & targetIntent);
}