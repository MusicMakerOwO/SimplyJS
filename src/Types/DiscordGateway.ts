import { ObjectValues } from "./HelperTypes.js";

/**
 * Gateway operation codes (`op`) define the protocol-level action for a payload.
 *
 * Every gateway frame includes an opcode, and the opcode tells your client how to
 * interpret `d` (event data), whether the payload is part of lifecycle control
 * (Identify/Resume/Heartbeat), or whether it is a dispatch event envelope.
 *
 * In practice, runtime gateway clients branch on these values to drive:
 * - Initial connection setup (`Hello`, then `Identify`)
 * - Session continuity (`Resume`, `InvalidSession`, `Reconnect`)
 * - Keepalive handling (`Heartbeat`, `HeartbeatACK`)
 * - General event delivery (`Dispatch`)
 *
 * @see https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
 */
export const GatewayOpCodes = {
	/** An event was dispatched. */
	Dispatch: 0,
	/** Fired periodically by the client to keep the connection alive. */
	Heartbeat: 1,
	/** Starts a new session during the initial handshake. */
	Identify: 2,
	/** Update the client’s presence. */
	PresenceUpdate: 3,
	/** Used to join/leave or move between voice channels. */
	VoiceStateUpdate: 4,
	/** Resume a previous session that was disconnected. */
	Resume: 6,
	/** You should attempt to reconnect and resume immediately. */
	Reconnect: 7,
	/** Request information about offline guild members in a large guild. */
	RequestGuildMembers: 8,
	/** The session has been invalidated. You should reconnect and identify/resume accordingly. */
	InvalidSession: 9,
	/** Sent immediately after connecting, contains the heartbeat_interval to use. */
	Hello: 10,
	/** Sent in response to receiving a heartbeat to acknowledge that it has been received. */
	HeartbeatACK: 11,
	/** Request information about soundboard sounds in a set of guilds. */
	RequestSoundboardSounds: 31,
	/** Request ephemeral channel data for channels in a guild. */
	RequestChannelInfo: 43,
} as const;

/**
 * Generic shape used by Discord gateway payloads.
 *
 * This models the shared envelope all gateway packets use:
 * - `op`: protocol opcode that determines packet meaning
 * - `d`: payload body for that opcode/event
 * - `s`: sequence number used for heartbeats/resume (nullable for packets without one)
 * - `t`: dispatch event name (nullable for non-dispatch packets)
 *
 * @template T - The payload body type stored in `d`.
 * @see https://discord.com/developers/docs/topics/gateway-events#payloads-gateway-payload-structure
 */
export type GatewayPayload<T = unknown> = {
	/** Gateway opcode, which indicates the payload type */
	op: number;
	/** Event data */
	d: T;
	/** Sequence number of event used for resuming sessions and heartbeating */
	s?: number | null;
	/** Event name */
	t?: ObjectValues<typeof GatewayEvents> | null;
};

/**
 * Gateway intents are a bitfield that tells Discord which groups of events your bot wants to receive.
 *
 * Discord uses this to filter events before they are sent over the gateway connection:
 * - Enabling an intent allows related dispatch events to be delivered.
 * - Disabling an intent means those event groups are not sent to your client.
 *
 * This improves performance and limits data to only what your application needs.
 *
 * Some intents are privileged (`GuildMembers`, `GuildPresences`, `MessageContent`) and may require
 * explicit enablement in the Developer Portal before events/data are actually available.
 *
 * These values are powers of two and are combined with bitwise OR into a single numeric bitfield,
 * then sent in the Identify payload during gateway authentication.
 *
 * @example
 * ```ts
 * // Receive guild structure + guild messages
 * const intents = GatewayIntents.Guilds | GatewayIntents.GuildMessages;
 * ```
 *
 * @see https://discord.com/developers/docs/topics/gateway#gateway-intents
 */
export const GatewayIntents = {
	/**
	 * Enables events about guilds (servers), channels, roles, threads, and related updates.
	 * This intent is often required for the vast majority of projects.
	 *
	 * **Events:**
	 * - GUILD_CREATE
	 * - GUILD_UPDATE
	 * - GUILD_DELETE
	 * - GUILD_ROLE_CREATE
	 * - GUILD_ROLE_UPDATE
	 * - GUILD_ROLE_DELETE
	 * - CHANNEL_CREATE
	 * - CHANNEL_UPDATE
	 * - CHANNEL_DELETE
	 * - CHANNEL_PINS_UPDATE
	 * - THREAD_CREATE
	 * - THREAD_UPDATE
	 * - THREAD_DELETE
	 * - THREAD_LIST_SYNC
	 * - THREAD_MEMBER_UPDATE
	 * - THREAD_MEMBERS_UPDATE
	 * - STAGE_INSTANCE_CREATE
	 * - STAGE_INSTANCE_UPDATE
	 * - STAGE_INSTANCE_DELETE
	 * - VOICE_CHANNEL_STATUS_UPDATE
	 * - VOICE_CHANNEL_START_TIME_UPDATE
	 */
	Guilds: 1 << 0,
	/**
	 * Enables events about guild member updates and presence in threads.
	 *
	 * **Events:**
	 * - GUILD_MEMBER_ADD
	 * - GUILD_MEMBER_UPDATE
	 * - GUILD_MEMBER_REMOVE
	 * - THREAD_MEMBERS_UPDATE
	 *
	 * @remarks Privileged intent. Required for member list and join/leave tracking.
	 */
	GuildMembers: 1 << 1,
	/**
	 * Enables events for audit logs and bans in guilds.
	 *
	 * **Events:**
	 * - GUILD_AUDIT_LOG_ENTRY_CREATE
	 * - GUILD_BAN_ADD
	 * - GUILD_BAN_REMOVE
	 */
	GuildModeration: 1 << 2,
	/**
	 * Enables events about emojis, stickers, and soundboard sounds in guilds.
	 *
	 * **Events:**
	 * - GUILD_EMOJIS_UPDATE
	 * - GUILD_STICKERS_UPDATE
	 * - GUILD_SOUNDBOARD_SOUND_CREATE
	 * - GUILD_SOUNDBOARD_SOUND_UPDATE
	 * - GUILD_SOUNDBOARD_SOUND_DELETE
	 * - GUILD_SOUNDBOARD_SOUNDS_UPDATE
	 */
	GuildExpressions: 1 << 3,
	/**
	 * Enables events about integrations in guilds.
	 *
	 * **Events:**
	 * - GUILD_INTEGRATIONS_UPDATE
	 * - INTEGRATION_CREATE
	 * - INTEGRATION_UPDATE
	 * - INTEGRATION_DELETE
	 */
	GuildIntegrations: 1 << 4,
	/**
	 * Enables webhook update events in guilds.
	 *
	 * **Events:**
	 * - WEBHOOKS_UPDATE
	 */
	GuildWebhooks: 1 << 5,
	/**
	 * Enables invite creation and deletion events in guilds.
	 *
	 * **Events:**
	 * - INVITE_CREATE
	 * - INVITE_DELETE
	 */
	GuildInvites: 1 << 6,
	/**
	 * Enables voice state and effect events in guilds.
	 *
	 * **Events:**
	 * - VOICE_CHANNEL_EFFECT_SEND
	 * - VOICE_STATE_UPDATE
	 */
	GuildVoiceStates: 1 << 7,
	/**
	 * Enables presence update events in guilds.
	 *
	 * **Events:**
	 * - PRESENCE_UPDATE
	 *
	 * @remarks Privileged intent. Required for presence tracking.
	 */
	GuildPresences: 1 << 8,
	/**
	 * Enables message events in guilds.
	 *
	 * **Events:**
	 * - MESSAGE_CREATE
	 * - MESSAGE_UPDATE
	 * - MESSAGE_DELETE
	 * - MESSAGE_DELETE_BULK
	 */
	GuildMessages: 1 << 9,
	/**
	 * Enables message reaction events in guilds.
	 *
	 * **Events:**
	 * - MESSAGE_REACTION_ADD
	 * - MESSAGE_REACTION_REMOVE
	 * - MESSAGE_REACTION_REMOVE_ALL
	 * - MESSAGE_REACTION_REMOVE_EMOJI
	 */
	GuildMessageReactions: 1 << 10,
	/**
	 * Enables typing start events in guilds.
	 *
	 * **Events:**
	 * - TYPING_START
	 */
	GuildMessageTyping: 1 << 11,
	/**
	 * Enables message and channel pin events in direct messages.
	 *
	 * **Events:**
	 * - MESSAGE_CREATE
	 * - MESSAGE_UPDATE
	 * - MESSAGE_DELETE
	 * - CHANNEL_PINS_UPDATE
	 */
	DirectMessages: 1 << 12,
	/**
	 * Enables message reaction events in direct messages.
	 *
	 * **Events:**
	 * - MESSAGE_REACTION_ADD
	 * - MESSAGE_REACTION_REMOVE
	 * - MESSAGE_REACTION_REMOVE_ALL
	 * - MESSAGE_REACTION_REMOVE_EMOJI
	 */
	DirectMessageReactions: 1 << 13,
	/**
	 * Enables typing start events in direct messages.
	 *
	 * **Events:**
	 * - TYPING_START
	 */
	DirectMessageTyping: 1 << 14,
	/**
	 * Enables access to message content in most events.
	 *
	 * **Events:**
	 * - (No events, enables content for messages)
	 *
	 * @remarks Privileged intent. Required for reading message content.
	 */
	MessageContent: 1 << 15,
	/**
	 * Enables scheduled event updates in guilds.
	 *
	 * **Events:**
	 * - GUILD_SCHEDULED_EVENT_CREATE
	 * - GUILD_SCHEDULED_EVENT_UPDATE
	 * - GUILD_SCHEDULED_EVENT_DELETE
	 * - GUILD_SCHEDULED_EVENT_USER_ADD
	 * - GUILD_SCHEDULED_EVENT_USER_REMOVE
	 */
	GuildScheduledEvents: 1 << 16,
	/**
	 * Enables auto moderation rule configuration events in guilds.
	 *
	 * **Events:**
	 * - AUTO_MODERATION_RULE_CREATE
	 * - AUTO_MODERATION_RULE_UPDATE
	 * - AUTO_MODERATION_RULE_DELETE
	 */
	AutoModerationConfiguration: 1 << 20,
	/**
	 * Enables auto moderation execution events in guilds.
	 *
	 * **Events:**
	 * - AUTO_MODERATION_ACTION_EXECUTION
	 */
	AutoModerationExecution: 1 << 21,
	/**
	 * Enables poll vote events in guilds.
	 *
	 * **Events:**
	 * - MESSAGE_POLL_VOTE_ADD
	 * - MESSAGE_POLL_VOTE_REMOVE
	 */
	GuildMessagePolls: 1 << 24,
	/**
	 * Enables poll vote events in direct messages.
	 *
	 * **Events:**
	 * - MESSAGE_POLL_VOTE_ADD
	 * - MESSAGE_POLL_VOTE_REMOVE
	 */
	DirectMessagePolls: 1 << 25,
} as const;

/**
 * Canonical string constants for dispatch event names (`t`) emitted by Discord.
 *
 * These values are used to match incoming `GatewayPayload` dispatch packets,
 * register handlers, and map events to required intents.
 *
 * Keeping event names centralized prevents typos and makes event-intent mapping
 * logic easier to maintain across the runtime.
 *
 * @see https://discord.com/developers/docs/topics/gateway-events#commands-and-events
 */
export const GatewayEvents = {
	/**
	 * Emitted when the client becomes ready to start receiving events.
	 * This is the first event received after successful Identify or Resume.
	 *
	 * @note this event does not necessarily indicate that all guilds are loaded or available yet.
	 * Guild availability is indicated by GUILD_CREATE events, and large guilds may still be loading
	 * after this event is emitted.
	 *
	 * Required intent: none (sent regardless of intents)	 */
	Ready: "READY",
	/**
	 * Emitted when the bot either joins a guild or during initial connection with all existing guilds
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	GuildCreate: "GUILD_CREATE",
	/**
	 * Guild metadata changes (name, features, settings).
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	GuildUpdate: "GUILD_UPDATE",
	/**
	 * Guild removed from session (deleted, unavailable, or left).
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	GuildDelete: "GUILD_DELETE",
	/**
	 * Role created in a guild.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	GuildRoleCreate: "GUILD_ROLE_CREATE",
	/**
	 * Role updated in a guild.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	GuildRoleUpdate: "GUILD_ROLE_UPDATE",
	/**
	 * Role removed from a guild.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	GuildRoleDelete: "GUILD_ROLE_DELETE",
	/**
	 * Channel created.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ChannelCreate: "CHANNEL_CREATE",
	/**
	 * Channel updated.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ChannelUpdate: "CHANNEL_UPDATE",
	/**
	 * Channel deleted.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ChannelDelete: "CHANNEL_DELETE",
	/**
	 * Channel pin timestamp changed (guild or DM).
	 *
	 * Required intents: `GatewayIntents.Guilds` or `GatewayIntents.DirectMessages`
	 */
	ChannelPinsUpdate: "CHANNEL_PINS_UPDATE",
	/**
	 * Thread created.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ThreadCreate: "THREAD_CREATE",
	/**
	 * Thread updated.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ThreadUpdate: "THREAD_UPDATE",
	/**
	 * Thread deleted.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ThreadDelete: "THREAD_DELETE",
	/**
	 * Active thread sync for channels/guild.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ThreadListSync: "THREAD_LIST_SYNC",
	/**
	 * Current user's membership in a thread changed.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	ThreadMemberUpdate: "THREAD_MEMBER_UPDATE",
	/**
	 * Thread member delta update.
	 *
	 * Required intents: `GatewayIntents.Guilds` or `GatewayIntents.GuildMembers`
	 */
	ThreadMembersUpdate: "THREAD_MEMBERS_UPDATE",
	/**
	 * Stage instance created.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	StageInstanceCreate: "STAGE_INSTANCE_CREATE",
	/**
	 * Stage instance updated.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	StageInstanceUpdate: "STAGE_INSTANCE_UPDATE",
	/**
	 * Stage instance deleted.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	StageInstanceDelete: "STAGE_INSTANCE_DELETE",
	/**
	 * Voice channel status text changed.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	VoiceChannelStatusUpdate: "VOICE_CHANNEL_STATUS_UPDATE",
	/**
	 * Voice channel scheduled start time changed.
	 *
	 * Required intent: `GatewayIntents.Guilds`
	 */
	VoiceChannelStartTimeUpdate: "VOICE_CHANNEL_START_TIME_UPDATE",
	/**
	 * Member joined guild.
	 *
	 * Required intent: `GatewayIntents.GuildMembers` (privileged)
	 */
	GuildMemberAdd: "GUILD_MEMBER_ADD",
	/**
	 * Member fields changed in guild.
	 *
	 * Required intent: `GatewayIntents.GuildMembers` (privileged)
	 */
	GuildMemberUpdate: "GUILD_MEMBER_UPDATE",
	/**
	 * Member left or was removed from guild.
	 *
	 * Required intent: `GatewayIntents.GuildMembers` (privileged)
	 */
	GuildMemberRemove: "GUILD_MEMBER_REMOVE",
	/**
	 * New guild audit log entry created.
	 *
	 * Required intent: `GatewayIntents.GuildModeration`
	 */
	GuildAuditLogEntryCreate: "GUILD_AUDIT_LOG_ENTRY_CREATE",
	/**
	 * User banned from guild.
	 *
	 * Required intent: `GatewayIntents.GuildModeration`
	 */
	GuildBanAdd: "GUILD_BAN_ADD",
	/**
	 * User unbanned from guild.
	 *
	 * Required intent: `GatewayIntents.GuildModeration`
	 */
	GuildBanRemove: "GUILD_BAN_REMOVE",
	/**
	 * Guild custom emojis changed.
	 *
	 * Required intent: `GatewayIntents.GuildExpressions`
	 */
	GuildEmojisUpdate: "GUILD_EMOJIS_UPDATE",
	/**
	 * Guild stickers changed.
	 *
	 * Required intent: `GatewayIntents.GuildExpressions`
	 */
	GuildStickersUpdate: "GUILD_STICKERS_UPDATE",
	/**
	 * Guild soundboard sound created.
	 *
	 * Required intent: `GatewayIntents.GuildExpressions`
	 */
	GuildSoundboardSoundCreate: "GUILD_SOUNDBOARD_SOUND_CREATE",
	/**
	 * Guild soundboard sound updated.
	 *
	 * Required intent: `GatewayIntents.GuildExpressions`
	 */
	GuildSoundboardSoundUpdate: "GUILD_SOUNDBOARD_SOUND_UPDATE",
	/**
	 * Guild soundboard sound deleted.
	 *
	 * Required intent: `GatewayIntents.GuildExpressions`
	 */
	GuildSoundboardSoundDelete: "GUILD_SOUNDBOARD_SOUND_DELETE",
	/**
	 * Guild soundboard catalog refreshed.
	 *
	 * Required intent: `GatewayIntents.GuildExpressions`
	 */
	GuildSoundboardSoundsUpdate: "GUILD_SOUNDBOARD_SOUNDS_UPDATE",
	/**
	 * Guild integration settings changed.
	 *
	 * Required intent: `GatewayIntents.GuildIntegrations`
	 */
	GuildIntegrationsUpdate: "GUILD_INTEGRATIONS_UPDATE",
	/**
	 * Integration created.
	 *
	 * Required intent: `GatewayIntents.GuildIntegrations`
	 */
	IntegrationCreate: "INTEGRATION_CREATE",
	/**
	 * Integration updated.
	 *
	 * Required intent: `GatewayIntents.GuildIntegrations`
	 */
	IntegrationUpdate: "INTEGRATION_UPDATE",
	/**
	 * Integration deleted.
	 *
	 * Required intent: `GatewayIntents.GuildIntegrations`
	 */
	IntegrationDelete: "INTEGRATION_DELETE",
	/**
	 * Webhooks changed in a channel.
	 *
	 * Required intent: `GatewayIntents.GuildWebhooks`
	 */
	WebhooksUpdate: "WEBHOOKS_UPDATE",
	/**
	 * Invite created.
	 *
	 * Required intent: `GatewayIntents.GuildInvites`
	 */
	InviteCreate: "INVITE_CREATE",
	/**
	 * Invite deleted.
	 *
	 * Required intent: `GatewayIntents.GuildInvites`
	 */
	InviteDelete: "INVITE_DELETE",
	/**
	 * Voice channel effect used (for example, soundboard reaction/effect).
	 *
	 * Required intent: `GatewayIntents.GuildVoiceStates`
	 */
	VoiceChannelEffectSend: "VOICE_CHANNEL_EFFECT_SEND",
	/**
	 * Voice state changed for a user.
	 *
	 * Required intent: `GatewayIntents.GuildVoiceStates`
	 */
	VoiceStateUpdate: "VOICE_STATE_UPDATE",
	/**
	 * Member presence changed.
	 *
	 * Required intent: `GatewayIntents.GuildPresences` (privileged)
	 */
	PresenceUpdate: "PRESENCE_UPDATE",
	/**
	 * Message created in guild or DM.
	 *
	 * Required intents: `GatewayIntents.GuildMessages` or `GatewayIntents.DirectMessages`
	 *
	 * Note: message text fields can require `GatewayIntents.MessageContent`
	 */
	MessageCreate: "MESSAGE_CREATE",
	/**
	 * Message updated in guild or DM.
	 *
	 * Required intents: `GatewayIntents.GuildMessages` or `GatewayIntents.DirectMessages`
	 *
	 * Note: content fields can require `GatewayIntents.MessageContent`
	 */
	MessageUpdate: "MESSAGE_UPDATE",
	/**
	 * Message deleted in guild or DM.
	 *
	 * Required intents: `GatewayIntents.GuildMessages` or `GatewayIntents.DirectMessages`
	 */
	MessageDelete: "MESSAGE_DELETE",
	/**
	 * Multiple guild messages deleted together.
	 *
	 * Required intent: `GatewayIntents.GuildMessages`
	 */
	MessageDeleteBulk: "MESSAGE_DELETE_BULK",
	/**
	 * Reaction added to a message (guild or DM).
	 *
	 * Required intents: `GatewayIntents.GuildMessageReactions` or `GatewayIntents.DirectMessageReactions`
	 */
	MessageReactionAdd: "MESSAGE_REACTION_ADD",
	/**
	 * Reaction removed from a message (guild or DM).
	 *
	 * Required intents: `GatewayIntents.GuildMessageReactions` or `GatewayIntents.DirectMessageReactions`
	 */
	MessageReactionRemove: "MESSAGE_REACTION_REMOVE",
	/**
	 * All reactions cleared from a message.
	 *
	 * Required intents: `GatewayIntents.GuildMessageReactions` or `GatewayIntents.DirectMessageReactions`
	 */
	MessageReactionRemoveAll: "MESSAGE_REACTION_REMOVE_ALL",
	/**
	 * One emoji's reactions cleared from a message.
	 *
	 * Required intents: `GatewayIntents.GuildMessageReactions` or `GatewayIntents.DirectMessageReactions`
	 */
	MessageReactionRemoveEmoji: "MESSAGE_REACTION_REMOVE_EMOJI",
	/**
	 * User started typing (guild or DM).
	 *
	 * Required intents: `GatewayIntents.GuildMessageTyping` or `GatewayIntents.DirectMessageTyping`
	 */
	TypingStart: "TYPING_START",
	/**
	 * Guild scheduled event created.
	 *
	 * Required intent: `GatewayIntents.GuildScheduledEvents`
	 */
	GuildScheduledEventCreate: "GUILD_SCHEDULED_EVENT_CREATE",
	/**
	 * Guild scheduled event updated.
	 *
	 * Required intent: `GatewayIntents.GuildScheduledEvents`
	 */
	GuildScheduledEventUpdate: "GUILD_SCHEDULED_EVENT_UPDATE",
	/**
	 * Guild scheduled event deleted.
	 *
	 * Required intent: `GatewayIntents.GuildScheduledEvents`
	 */
	GuildScheduledEventDelete: "GUILD_SCHEDULED_EVENT_DELETE",
	/**
	 * User subscribed to a guild scheduled event.
	 *
	 * Required intent: `GatewayIntents.GuildScheduledEvents`
	 */
	GuildScheduledEventUserAdd: "GUILD_SCHEDULED_EVENT_USER_ADD",
	/**
	 * User unsubscribed from a guild scheduled event.
	 *
	 * Required intent: `GatewayIntents.GuildScheduledEvents`
	 */
	GuildScheduledEventUserRemove: "GUILD_SCHEDULED_EVENT_USER_REMOVE",
	/**
	 * Auto moderation rule created.
	 *
	 * Required intent: `GatewayIntents.AutoModerationConfiguration`
	 */
	AutoModerationRuleCreate: "AUTO_MODERATION_RULE_CREATE",
	/**
	 * Auto moderation rule updated.
	 *
	 * Required intent: `GatewayIntents.AutoModerationConfiguration`
	 */
	AutoModerationRuleUpdate: "AUTO_MODERATION_RULE_UPDATE",
	/**
	 * Auto moderation rule deleted.
	 *
	 * Required intent: `GatewayIntents.AutoModerationConfiguration`
	 */
	AutoModerationRuleDelete: "AUTO_MODERATION_RULE_DELETE",
	/**
	 * Auto moderation action executed.
	 *
	 * Required intent: `GatewayIntents.AutoModerationExecution`
	 */
	AutoModerationActionExecution: "AUTO_MODERATION_ACTION_EXECUTION",
	/**
	 * Poll vote added on a message (guild or DM).
	 *
	 * Required intents: `GatewayIntents.GuildMessagePolls` or `GatewayIntents.DirectMessagePolls`
	 */
	MessagePollVoteAdd: "MESSAGE_POLL_VOTE_ADD",
	/**
	 * Poll vote removed on a message (guild or DM).
	 *
	 * Required intents: `GatewayIntents.GuildMessagePolls` or `GatewayIntents.DirectMessagePolls`
	 */
	MessagePollVoteRemove: "MESSAGE_POLL_VOTE_REMOVE",
} as const;