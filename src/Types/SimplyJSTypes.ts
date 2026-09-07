import type {
	DiscordAuditLogEntry,
	DiscordAutoModerationAction,
	DiscordAutoModerationRule,
	DiscordAutoModerationRuleTriggerType,
	DiscordChannel,
	DiscordEmoji,
	DiscordGuild,
	DiscordGuildScheduledEvent,
	DiscordRole,
	DiscordSticker, DiscordUser
} from "./DiscordAPITypes.js";
import type { ObjectValues } from "./HelperTypes.js";
import type { AutoModerationRule } from "../Structures/AutoModerationRule.js";
import type { Guild } from "../Structures/Guild.js";
import type { GuildScheduledEvent } from "../Structures/GuildScheduledEvent.js";
import type { Integration } from "../Structures/Integration.js";
import type { Invite } from "../Structures/Invite.js";
import type { Member } from "../Structures/Member.js";
import type { Message } from "../Structures/Message.js";
import type { Presence } from "../Structures/Presence.js";
import type { Role } from "../Structures/Role.js";
import type { Sticker } from "../Structures/Sticker.js";
import type { ThreadMember } from "../Structures/ThreadMember.js";
import type { User } from "../Structures/User.js";
import { Emoji } from "../Structures/Emoji.js";
import { BaseChannel } from "../Structures/Channels/BaseChannel.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { GuildVoiceChannel } from "../Structures/Channels/GuildVoiceChannel.js";
import { GuildAnnouncementChannel } from "../Structures/Channels/GuildAnnouncementChannel.js";
import { GuildCategoryChannel } from "../Structures/Channels/GuildCategoryChannel.js";
import { GuildForumChannel } from "../Structures/Channels/GuildForumChannel.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import { GuildStageChannel } from "../Structures/Channels/GuildStageChannel.js";
import {
	AutocompleteInteraction,
	ButtonInteraction,
	MessageContextMenuInteraction,
	ModalInteraction,
	SelectMenuInteraction,
	SlashCommandInteraction,
	UserContextMenuInteraction
} from "../Structures/index.js";

/** Every concrete channel structure the library can produce, falling back to `BaseChannel` for unhandled types */
export type Channel =
	| GuildAnnouncementChannel
	| GuildTextChannel
	| GuildVoiceChannel
	| GuildCategoryChannel
	| GuildForumChannel
	| GuildStageChannel
	| GuildThreadChannel
	| BaseChannel

/** The channels a message can actually live in - i.e. every channel exposing `send()` */
export type MessageableChannel =
	| GuildAnnouncementChannel
	| GuildTextChannel
	| GuildVoiceChannel
	| GuildStageChannel
	| GuildThreadChannel

/**
 * Every concrete interaction structure the library can produce for a gateway `INTERACTION_CREATE`
 * dispatch. Excludes `PingInteraction` - that variant only occurs over an HTTP interactions
 * endpoint, never on the gateway.
 */
export type AnyInteraction =
	| SlashCommandInteraction
	| UserContextMenuInteraction
	| MessageContextMenuInteraction
	| ButtonInteraction
	| SelectMenuInteraction
	| AutocompleteInteraction
	| ModalInteraction

/** Payload for `MessageDelete`; Discord only sends identifiers, never the deleted message itself */
export type MessageDeletePayload = {
	/** ID of the deleted message */
	id: string;
	/** Channel the message was deleted from */
	channelId: string;
	/** Guild the channel belongs to, or `null` for DM channels */
	guildId: string | null;
};

/** Payload for `MessageDeleteBulk`; Discord only sends identifiers, never the deleted messages themselves */
export type MessageDeleteBulkPayload = {
	/** IDs of the deleted messages */
	ids: string[];
	/** Channel the messages were deleted from */
	channelId: string;
	/** Guild the channel belongs to, or `null` for DM channels */
	guildId: string | null;
};

/** Payload for `InviteDelete`; Discord only sends the invite's location and code, never the invite itself */
export type InviteDeletePayload = {
	/** Channel the invite pointed to */
	channelId: string;
	/** Guild the invite belonged to, omitted for group DM invites */
	guildId?: string;
	/** The invite code that was deleted */
	code: string;
};

/**
 * Payload for `AutoModerationActionExecution`; describes a single action an auto moderation rule
 * carried out. Nothing here is cached - the event reports an occurrence, not an entity.
 */
export type AutoModerationActionExecutionPayload = {
	/** Guild the action was executed in */
	guildId: string;
	/** The action that was executed */
	action: DiscordAutoModerationAction;
	/** ID of the rule the action belongs to; resolve it with `guild.autoModerationRules.fetch(ruleId)` */
	ruleId: string;
	/** Trigger type of the rule that fired */
	ruleTriggerType: ObjectValues<typeof DiscordAutoModerationRuleTriggerType>;
	/** User who generated the content that triggered the rule */
	userId: string;
	/** Channel the content was posted in, omitted when it was not posted in a channel */
	channelId?: string;
	/** Message the content belongs to, omitted when the message was blocked */
	messageId?: string;
	/** The system alert message posted for this action, only present for `SEND_ALERT_MESSAGE` actions */
	alertSystemMessageId?: string;
	/** The user-generated text content, empty without the `MessageContent` intent */
	content: string;
	/** The configured word or phrase that triggered the rule */
	matchedKeyword: string | null;
	/** The substring of `content` that triggered the rule, empty or `null` without the `MessageContent` intent */
	matchedContent: string | null;
};

/**
 * Payload for `ThreadMembersUpdate`; Discord sends a delta rather than the full member list, and
 * caps `added` at 50 entries. Removals are ids only - the removed {@link ThreadMember} is already
 * gone from `thread.members` by the time listeners run.
 */
export type ThreadMembersUpdatePayload = {
	/** Guild the thread belongs to */
	guild: Guild;
	/** The thread whose membership changed */
	thread: GuildThreadChannel;
	/** Approximate number of members in the thread, capped at `50` by Discord */
	memberCount: number;
	/** Members that joined the thread; only populated with the privileged `GuildMembers` intent */
	added: ThreadMember[];
	/** Ids of the users that left the thread */
	removed: string[];
};

/** Payload for `ThreadListSync`; the full set of active threads the client can see in a guild */
export type ThreadListSyncPayload = {
	/** Guild the threads belong to */
	guild: Guild;
	/** The synced threads, now cached in `guild.channels` */
	threads: GuildThreadChannel[];
	/**
	 * Ids of the threads dropped from the cache because the sync did not list them - they were
	 * archived or deleted while the client could not see them.
	 */
	evicted: string[];
};

export const ClientEvents = {
	/**
	 * Fired once the client is ready for normal use.
	 *
	 * Listener arguments: `user` ({@link User}).
	 *
	 * Note: this is emitted after the raw `READY` payload is processed and after the
	 * initial required guilds from that payload have been received, or when the ready
	 * fallback timeout completes.
	 */
	Ready: "Ready",

	/**
	 * Fired when a guild becomes available to the client.
	 * Listener arguments: `guild` ({@link Guild}).
	 */
	GuildCreate: "GuildCreate",
	/**
	 * Fired when guild metadata changes.
	 * Listener arguments: `oldGuild` ({@link Guild} | `undefined`), `newGuild` ({@link Guild}).
	 */
	GuildUpdate: "GuildUpdate",
	/**
	 * Fired when a guild is removed, deleted, or becomes unavailable.
	 * Listener arguments: `guild` ({@link Guild} | {@link DiscordGuild}).
	 */
	GuildDelete: "GuildDelete",

	/**
	 * Fired when a guild channel is created.
	 * Listener arguments: `channel` ({@link Channel}).
	 */
	ChannelCreate: "ChannelCreate",
	/**
	 * Fired when a guild channel changes.
	 * Listener arguments: `oldChannel` ({@link Channel} | `undefined`), `newChannel` ({@link Channel}).
	 */
	ChannelUpdate: "ChannelUpdate",
	/**
	 * Fired when a guild channel is deleted.
	 * Listener arguments: `channel` ({@link Channel} | {@link DiscordChannel}).
	 */
	ChannelDelete: "ChannelDelete",
	/**
	 * Fired when a message is pinned or unpinned in a channel. Not fired when a pinned message is deleted.
	 * Listener arguments: `payload` (`{ guild, channel, lastPinTimestamp }`).
	 */
	ChannelPinsUpdate: "ChannelPinsUpdate",

	/**
	 * Fired when a thread is created, or when the client is added to a thread it could not previously see.
	 * Listener arguments: `thread` ({@link Channel}).
	 */
	ThreadCreate: "ThreadCreate",
	/**
	 * Fired when a thread changes, such as being archived, locked, or renamed.
	 * Listener arguments: `oldThread` ({@link Channel} | `undefined`), `newThread` ({@link Channel}).
	 */
	ThreadUpdate: "ThreadUpdate",
	/**
	 * Fired when a thread is deleted. The gateway only sends a partial channel here, so uncached
	 * threads are emitted as raw data.
	 * Listener arguments: `thread` ({@link Channel} | {@link DiscordChannel}).
	 */
	ThreadDelete: "ThreadDelete",
	/**
	 * Fired when the current user's own thread membership changes, such as after joining a thread
	 * or changing its notification settings. Only ever fires for the current user.
	 * Listener arguments: `member` ({@link ThreadMember}).
	 */
	ThreadMemberUpdate: "ThreadMemberUpdate",
	/**
	 * Fired when users are added to or removed from a thread. Requires the privileged
	 * `GuildMembers` intent to see anyone other than the current user.
	 * Listener arguments: `payload` ({@link ThreadMembersUpdatePayload}).
	 */
	ThreadMembersUpdate: "ThreadMembersUpdate",
	/**
	 * Fired when the client gains access to threads it could not previously see, typically right
	 * after joining a guild or a channel. Carries the full active thread list for the channels it
	 * covers, so threads missing from it are dropped from the cache.
	 * Listener arguments: `payload` ({@link ThreadListSyncPayload}).
	 */
	ThreadListSync: "ThreadListSync",

	/**
	 * Fired when a member joins a guild.
	 * Listener arguments: `member` ({@link Member}).
	 */
	MemberCreate: "MemberCreate",
	/**
	 * Fired when guild member data changes.
	 * Listener arguments: `oldMember` ({@link Member} | `undefined`), `newMember` ({@link Member}).
	 */
	MemberUpdate: "MemberUpdate",
	/**
	 * Fired when a member leaves or is removed from a guild.
	 * Listener arguments: `member` ({@link Member} | {@link DiscordUser}).
	 */
	MemberDelete: "MemberDelete",

	/**
	 * Fired when a guild emoji sync contains newly added emojis.
	 * Listener arguments: `guild` ({@link Guild}), `emoji` ({@link Emoji}).
	 */
	EmojiCreate: "EmojiCreate",
	/**
	 * Fired when a guild emoji sync contains changed emojis.
	 * Listener arguments: `guild` ({@link Guild}), `oldEmoji` ({@link Emoji} | `undefined`), `newEmoji` ({@link Emoji}).
	 */
	EmojiUpdate: "EmojiUpdate",
	/**
	 * Fired when a guild emoji sync removes emojis.
	 * Listener arguments: `guild` ({@link Guild}), `emoji` ({@link Emoji} | {@link DiscordEmoji}).
	 */
	EmojiDelete: "EmojiDelete",

	/**
	 * Fired when a guild sticker sync contains newly added stickers.
	 * Listener arguments: `guild` ({@link Guild}), `sticker` ({@link Sticker}).
	 */
	StickerCreate: "StickerCreate",
	/**
	 * Fired when a guild sticker sync contains changed stickers.
	 * Listener arguments: `guild` ({@link Guild}), `oldSticker` ({@link Sticker} | `undefined`), `newSticker` ({@link Sticker}).
	 */
	StickerUpdate: "StickerUpdate",
	/**
	 * Fired when a guild sticker sync removes stickers.
	 * Listener arguments: `guild` ({@link Guild}), `sticker` ({@link Sticker} | {@link DiscordSticker}).
	 */
	StickerDelete: "StickerDelete",

	/**
	 * Fired when a role is created in a guild.
	 * Listener arguments: `role` ({@link Role}).
	 */
	RoleCreate: "RoleCreate",
	/**
	 * Fired when role data changes.
	 * Listener arguments: `oldRole` ({@link Role} | `undefined`), `newRole` ({@link Role}).
	 */
	RoleUpdate: "RoleUpdate",
	/**
	 * Fired when a role is deleted from a guild.
	 * Listener arguments: `role` ({@link Role} | {@link DiscordRole}).
	 */
	RoleDelete: "RoleDelete",

	/**
	 * Fired when an auto moderation rule is created in a guild.
	 * Listener arguments: `rule` ({@link AutoModerationRule}).
	 */
	AutoModerationRuleCreate: "AutoModerationRuleCreate",
	/**
	 * Fired when an auto moderation rule is updated.
	 * `oldRule` is `undefined` when the rule was not already cached.
	 * Listener arguments: `oldRule` ({@link AutoModerationRule} | `undefined`), `newRule` ({@link AutoModerationRule}).
	 */
	AutoModerationRuleUpdate: "AutoModerationRuleUpdate",
	/**
	 * Fired when an auto moderation rule is deleted from a guild.
	 * Falls back to the raw gateway payload when the rule was not cached.
	 * Listener arguments: `rule` ({@link AutoModerationRule} | {@link DiscordAutoModerationRule}).
	 */
	AutoModerationRuleDelete: "AutoModerationRuleDelete",
	/**
	 * Fired when an auto moderation rule is triggered and executes an action.
	 * Requires the `AutoModerationExecution` intent.
	 * Listener arguments: `payload` ({@link AutoModerationActionExecutionPayload}).
	 */
	AutoModerationActionExecution: "AutoModerationActionExecution",

	/**
	 * Fired when a scheduled event is created in a guild.
	 * Requires the `GuildScheduledEvents` intent.
	 * Listener arguments: `event` ({@link GuildScheduledEvent}).
	 */
	GuildScheduledEventCreate: "GuildScheduledEventCreate",
	/**
	 * Fired when a scheduled event is updated, including when it starts, ends, or is cancelled.
	 * `oldEvent` is `undefined` when the event was not already cached.
	 * Requires the `GuildScheduledEvents` intent.
	 * Listener arguments: `oldEvent` ({@link GuildScheduledEvent} | `undefined`), `newEvent` ({@link GuildScheduledEvent}).
	 */
	GuildScheduledEventUpdate: "GuildScheduledEventUpdate",
	/**
	 * Fired when a scheduled event is deleted from a guild.
	 * Falls back to the raw gateway payload when the event was not cached.
	 * Requires the `GuildScheduledEvents` intent.
	 * Listener arguments: `event` ({@link GuildScheduledEvent} | {@link DiscordGuildScheduledEvent}).
	 */
	GuildScheduledEventDelete: "GuildScheduledEventDelete",
	/**
	 * Fired when a user subscribes to a scheduled event.
	 * `event` and `user` fall back to a bare `{ id }` object when not present in the local cache.
	 * Requires the `GuildScheduledEvents` intent.
	 * Listener arguments: `event` ({@link GuildScheduledEvent} | `{ id: string }`), `user` ({@link User} | `{ id: string }`), `guild` ({@link Guild}).
	 */
	GuildScheduledEventUserAdd: "GuildScheduledEventUserAdd",
	/**
	 * Fired when a user unsubscribes from a scheduled event.
	 * `event` and `user` fall back to a bare `{ id }` object when not present in the local cache.
	 * Requires the `GuildScheduledEvents` intent.
	 * Listener arguments: `event` ({@link GuildScheduledEvent} | `{ id: string }`), `user` ({@link User} | `{ id: string }`), `guild` ({@link Guild}).
	 */
	GuildScheduledEventUserRemove: "GuildScheduledEventUserRemove",

	/**
	 * Fired when an integration is added to a guild, such as a Twitch or YouTube subscriber sync
	 * or a newly installed bot.
	 * Requires the `GuildIntegrations` intent.
	 * Listener arguments: `integration` ({@link Integration}).
	 */
	IntegrationCreate: "IntegrationCreate",
	/**
	 * Fired when a guild integration is updated.
	 * `oldIntegration` is `undefined` when the integration was not already cached, which is common
	 * because integrations are never seeded from `GUILD_CREATE`.
	 * Requires the `GuildIntegrations` intent.
	 * Listener arguments: `oldIntegration` ({@link Integration} | `undefined`), `newIntegration` ({@link Integration}).
	 */
	IntegrationUpdate: "IntegrationUpdate",
	/**
	 * Fired when an integration is removed from a guild.
	 * The gateway payload carries ids only, so `integration` falls back to a bare `{ id }` object
	 * when it was not cached. `applicationId` is only present for `discord` integrations.
	 * Requires the `GuildIntegrations` intent.
	 * Listener arguments: `integration` ({@link Integration} | `{ id: string }`), `guild` ({@link Guild}), `applicationId` (`string` | `undefined`).
	 */
	IntegrationDelete: "IntegrationDelete",
	/**
	 * Fired when a guild's integrations change in a way Discord does not describe - it names the
	 * guild and nothing else. Call `guild.integrations.fetchAll()` to resync.
	 * Requires the `GuildIntegrations` intent.
	 * Listener arguments: `guild` ({@link Guild}).
	 */
	GuildIntegrationsUpdate: "GuildIntegrationsUpdate",

	/**
	 * Fired when a message is created.
	 * Listener arguments: `message` ({@link Message}).
	 */
	MessageCreate: "MessageCreate",
	/**
	 * Fired when a message is updated.
	 * Listener arguments: `message` ({@link Message}).
	 */
	MessageUpdate: "MessageUpdate",
	/**
	 * Fired when a message is deleted.
	 * Listener arguments: `payload` ({@link MessageDeletePayload}).
	 */
	MessageDelete: "MessageDelete",
	/**
	 * Fired when multiple messages are deleted at once.
	 * Listener arguments: `payload` ({@link MessageDeleteBulkPayload}).
	 */
	MessageDeleteBulk: "MessageDeleteBulk",

	/**
	 * Fired when a reaction is added to a message.
	 * Listener arguments: `payload`.
	 */
	ReactionAdd: "ReactionAdd",
	/**
	 * Fired when a reaction is removed from a message.
	 * Listener arguments: `payload`.
	 */
	ReactionRemove: "ReactionRemove",
	/**
	 * Fired when every reaction is cleared from a message.
	 * Listener arguments: `payload`.
	 */
	ReactionRemoveAll: "ReactionRemoveAll",
	/**
	 * Fired when every reaction for a single emoji is cleared from a message.
	 * Listener arguments: `payload`.
	 */
	ReactionRemoveEmoji: "ReactionRemoveEmoji",

	/**
	 * Fired when a user votes on a poll.
	 * Requires the `GuildMessagePolls` intent in guilds, or `DirectMessagePolls` in DMs.
	 * Listener arguments: `payload`.
	 */
	MessagePollVoteAdd: "MessagePollVoteAdd",
	/**
	 * Fired when a user retracts a poll vote. Changing a vote in a single-select poll arrives as a
	 * remove for the old answer followed by an add for the new one.
	 * Requires the `GuildMessagePolls` intent in guilds, or `DirectMessagePolls` in DMs.
	 * Listener arguments: `payload`.
	 */
	MessagePollVoteRemove: "MessagePollVoteRemove",

	/**
	 * Fired when a user's status or activities change. Requires the privileged `GuildPresences`
	 * intent; without it this never fires and `guild.presences` stays empty.
	 *
	 * `oldPresence` is a detached snapshot taken before the update, not a live cache entry, so it
	 * can be diffed against `newPresence`. It is `undefined` the first time a user is seen. A
	 * presence that goes offline is emitted and then dropped from the cache.
	 * Listener arguments: `oldPresence` ({@link Presence} | `undefined`), `newPresence` ({@link Presence}).
	 */
	PresenceUpdate: "PresenceUpdate",

	/**
	 * Fired when a webhook is created, updated, or deleted in a channel. Discord does not send the
	 * webhook itself, only where the change happened.
	 * Listener arguments: `payload` (`{ guild, channel }`).
	 */
	WebhooksUpdate: "WebhooksUpdate",

	/**
	 * Fired when a user starts typing in a channel. `guild`, `channel`, and `user` fall back to a
	 * bare `{ id }` object when not present in the local cache, and `guild` is `null` for DMs.
	 * Listener arguments: `payload` (`{ guild, channel, user, member, timestamp }`).
	 */
	TypingStart: "TypingStart",

	/**
	 * Fired when an invite is created.
	 * Listener arguments: `invite` ({@link Invite}).
	 */
	InviteCreate: "InviteCreate",
	/**
	 * Fired when an invite is deleted. Discord does not send the invite itself.
	 * Listener arguments: `payload` ({@link InviteDeletePayload}).
	 */
	InviteDelete: "InviteDelete",

	/**
	 * Fired when a user is banned from a guild.
	 * Listener arguments: `guild` ({@link Guild}), `user` ({@link User}).
	 */
	GuildBanAdd: "GuildBanAdd",
	/**
	 * Fired when a user ban is removed from a guild.
	 * Listener arguments: `guild` ({@link Guild}), `user` ({@link User}).
	 */
	GuildBanRemove: "GuildBanRemove",

	/**
	 * Fired when an audit log entry is created in a guild.
	 * Listener arguments: `guild` ({@link Guild}), `entry` ({@link DiscordAuditLogEntry}).
	 */
	AuditLogEntryCreate: "AuditLogEntryCreate",

	/**
	 * Fired when an interaction is created (slash command, button, select menu, modal, etc.).
	 * Also emitted, alongside `InteractionCreate`, is one of `SlashCommandUsed`,
	 * `UserContextMenuUsed`, `MessageContextMenuUsed`, `ButtonUsed`, `SelectMenuUsed`,
	 * `AutocompleteUsed`, or `ModalSubmitted` - whichever matches the interaction's concrete
	 * type - so consumers don't have to discriminate the union themselves.
	 * Listener arguments: `interaction` ({@link AnyInteraction}).
	 */
	InteractionCreate: "InteractionCreate",

	/**
	 * Fired when a slash (chat input) command is used.
	 * Listener arguments: `interaction` ({@link SlashCommandInteraction}).
	 */
	SlashCommandUsed: "SlashCommandUsed",
	/**
	 * Fired when a user context menu command is used.
	 * Listener arguments: `interaction` ({@link UserContextMenuInteraction}).
	 */
	UserContextMenuUsed: "UserContextMenuUsed",
	/**
	 * Fired when a message context menu command is used.
	 * Listener arguments: `interaction` ({@link MessageContextMenuInteraction}).
	 */
	MessageContextMenuUsed: "MessageContextMenuUsed",
	/**
	 * Fired when a button is clicked.
	 * Listener arguments: `interaction` ({@link ButtonInteraction}).
	 */
	ButtonUsed: "ButtonUsed",
	/**
	 * Fired when a select menu is used.
	 * Listener arguments: `interaction` ({@link SelectMenuInteraction}).
	 */
	SelectMenuUsed: "SelectMenuUsed",
	/**
	 * Fired when a command's autocomplete input is focused and needs suggestions.
	 * Listener arguments: `interaction` ({@link AutocompleteInteraction}).
	 */
	AutocompleteUsed: "AutocompleteUsed",
	/**
	 * Fired when a modal form is submitted.
	 * Listener arguments: `interaction` ({@link ModalInteraction}).
	 */
	ModalSubmitted: "ModalSubmitted",

} as const;

export type ClientEventMap = {
	[ClientEvents.Ready]: [user: User];

	[ClientEvents.GuildCreate]: [guild: Guild];
	[ClientEvents.GuildUpdate]: [oldGuild: Guild | undefined, newGuild: Guild];
	[ClientEvents.GuildDelete]: [guild: Guild | DiscordGuild];

	[ClientEvents.ChannelCreate]: [channel: Channel];
	[ClientEvents.ChannelUpdate]: [oldChannel: Channel | undefined, newChannel: Channel];
	[ClientEvents.ChannelDelete]: [channel: Channel | DiscordChannel];
	[ClientEvents.ChannelPinsUpdate]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		lastPinTimestamp: string | null
	}];

	[ClientEvents.ThreadCreate]: [thread: Channel];
	[ClientEvents.ThreadUpdate]: [oldThread: Channel | undefined, newThread: Channel];
	[ClientEvents.ThreadDelete]: [thread: Channel | DiscordChannel];
	[ClientEvents.ThreadMemberUpdate]: [member: ThreadMember];
	[ClientEvents.ThreadMembersUpdate]: [payload: ThreadMembersUpdatePayload];
	[ClientEvents.ThreadListSync]: [payload: ThreadListSyncPayload];

	[ClientEvents.MemberCreate]: [member: Member];
	[ClientEvents.MemberUpdate]: [oldMember: Member | undefined, newMember: Member];
	[ClientEvents.MemberDelete]: [member: Member | DiscordUser];

	[ClientEvents.EmojiCreate]: [guild: Guild, emoji: Emoji];
	[ClientEvents.EmojiUpdate]: [guild: Guild, oldEmoji: Emoji | undefined, newEmoji: Emoji];
	[ClientEvents.EmojiDelete]: [guild: Guild, emoji: Emoji | DiscordEmoji];

	[ClientEvents.StickerCreate]: [guild: Guild, sticker: Sticker];
	[ClientEvents.StickerUpdate]: [guild: Guild, oldSticker: Sticker | undefined, newSticker: Sticker];
	[ClientEvents.StickerDelete]: [guild: Guild, sticker: Sticker | DiscordSticker];

	[ClientEvents.RoleCreate]: [role: Role];
	[ClientEvents.RoleUpdate]: [oldRole: Role | undefined, newRole: Role];
	[ClientEvents.RoleDelete]: [role: Role | DiscordRole];

	[ClientEvents.AutoModerationRuleCreate]: [rule: AutoModerationRule];
	[ClientEvents.AutoModerationRuleUpdate]: [oldRule: AutoModerationRule | undefined, newRule: AutoModerationRule];
	[ClientEvents.AutoModerationRuleDelete]: [rule: AutoModerationRule | DiscordAutoModerationRule];

	[ClientEvents.GuildScheduledEventCreate]: [event: GuildScheduledEvent];
	[ClientEvents.GuildScheduledEventUpdate]: [oldEvent: GuildScheduledEvent | undefined, newEvent: GuildScheduledEvent];
	[ClientEvents.GuildScheduledEventDelete]: [event: GuildScheduledEvent | DiscordGuildScheduledEvent];
	[ClientEvents.GuildScheduledEventUserAdd]: [event: GuildScheduledEvent | { id: string }, user: User | { id: string }, guild: Guild];
	[ClientEvents.GuildScheduledEventUserRemove]: [event: GuildScheduledEvent | { id: string }, user: User | { id: string }, guild: Guild];
	[ClientEvents.AutoModerationActionExecution]: [payload: AutoModerationActionExecutionPayload];

	[ClientEvents.IntegrationCreate]: [integration: Integration];
	[ClientEvents.IntegrationUpdate]: [oldIntegration: Integration | undefined, newIntegration: Integration];
	[ClientEvents.IntegrationDelete]: [integration: Integration | { id: string }, guild: Guild, applicationId?: string];
	[ClientEvents.GuildIntegrationsUpdate]: [guild: Guild];

	[ClientEvents.MessageCreate]: [message: Message];
	[ClientEvents.MessageUpdate]: [message: Message];
	[ClientEvents.MessageDelete]: [payload: MessageDeletePayload];
	[ClientEvents.MessageDeleteBulk]: [payload: MessageDeleteBulkPayload];

	[ClientEvents.ReactionAdd]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		messageId: string,
		member: Member | null,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		messageUserId?: string | null
		superReaction: boolean
	}];

	[ClientEvents.ReactionRemove]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		messageId: string,
		member: Member | null,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		messageUserId?: string | null
		superReaction: boolean
	}];

	[ClientEvents.ReactionRemoveAll]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		messageId: string
	}];

	[ClientEvents.ReactionRemoveEmoji]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		messageId: string,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>
	}];

	[ClientEvents.MessagePollVoteAdd]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		messageId: string,
		/** Id of the chosen answer, matching that answer's `answer_id` in the poll's `answers` array */
		answerId: number
	}];

	[ClientEvents.MessagePollVoteRemove]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		messageId: string,
		/** Id of the retracted answer, matching that answer's `answer_id` in the poll's `answers` array */
		answerId: number
	}];

	[ClientEvents.PresenceUpdate]: [oldPresence: Presence | undefined, newPresence: Presence];

	[ClientEvents.WebhooksUpdate]: [payload: {
		guild: Guild | { id: string },
		channel: Channel | { id: string }
	}];

	[ClientEvents.TypingStart]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		member: Member | null,
		timestamp: Date
	}];

	[ClientEvents.InviteCreate]: [invite: Invite];
	[ClientEvents.InviteDelete]: [payload: InviteDeletePayload];

	[ClientEvents.GuildBanAdd]: [guild: Guild, user: User];
	[ClientEvents.GuildBanRemove]: [guild: Guild, user: User];

	[ClientEvents.AuditLogEntryCreate]: [guild: Guild, entry: DiscordAuditLogEntry];

	[ClientEvents.InteractionCreate]: [interaction: AnyInteraction]
	[ClientEvents.SlashCommandUsed]: [interaction: SlashCommandInteraction];
	[ClientEvents.UserContextMenuUsed]: [interaction: UserContextMenuInteraction];
	[ClientEvents.MessageContextMenuUsed]: [interaction: MessageContextMenuInteraction];
	[ClientEvents.ButtonUsed]: [interaction: ButtonInteraction];
	[ClientEvents.SelectMenuUsed]: [interaction: SelectMenuInteraction];
	[ClientEvents.AutocompleteUsed]: [interaction: AutocompleteInteraction];
	[ClientEvents.ModalSubmitted]: [interaction: ModalInteraction];
};