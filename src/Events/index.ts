/**
 * Gateway dispatch handlers.
 *
 * Each export in this directory is built with `defineEvent()` ({@link defineEvent}), pairing a raw
 * gateway event name (the `t` field of a dispatch payload) with a handler that receives the
 * `Client` and the raw event data. `WSClient` looks these up by name and invokes the matching
 * handler whenever a dispatch payload arrives; the handler is responsible for updating the
 * relevant cache and re-emitting a friendlier `ClientEvents` event for consumers of the library.
 */
export { GuildCreate, GuildUpdate, GuildDelete } from "./Guilds.js";
export { ChannelCreate, ChannelUpdate, ChannelDelete, ChannelPinsUpdate } from "./Channels.js";
export {
	ThreadCreate,
	ThreadUpdate,
	ThreadDelete,
	ThreadMemberUpdate,
	ThreadMembersUpdate,
	ThreadListSync
} from "./Threads.js";
export { MemberCreate, MemberUpdate, MemberDelete, MembersChunk } from "./Members.js";
export { PresenceUpdate } from "./Presence.js";
export { RoleCreate, RoleUpdate, RoleDelete } from "./Roles.js";
export { MessageCreate, MessageUpdate, MessageDelete, MessageDeleteBulk } from "./Messages.js";
export { ReactionAdd, ReactionRemove, ReactionRemoveAll, ReactionRemoveEmoji } from "./Reactions.js";
export { EmojisUpdate } from "./Emojis.js";
export { StickersUpdate } from "./Stickers.js";
export {
	SoundboardSoundCreate,
	SoundboardSoundUpdate,
	SoundboardSoundDelete,
	SoundboardSoundsUpdate
} from "./SoundboardSounds.js";
export { InviteCreate, InviteDelete } from "./Invites.js";
export { WebhooksUpdate } from "./Webhooks.js";
export { TypingStart } from "./Typing.js";
export { GuildBanAdd, GuildBanRemove } from "./Bans.js";
export { AuditLogEntryCreate } from "./AuditLogs.js";
export {
	AutoModerationRuleCreate,
	AutoModerationRuleUpdate,
	AutoModerationRuleDelete,
	AutoModerationActionExecution
} from "./AutoModeration.js";
export {
	GuildScheduledEventCreate,
	GuildScheduledEventUpdate,
	GuildScheduledEventDelete,
	GuildScheduledEventUserAdd,
	GuildScheduledEventUserRemove
} from "./GuildScheduledEvents.js";
export {
	IntegrationCreate,
	IntegrationUpdate,
	IntegrationDelete,
	GuildIntegrationsUpdate
} from "./Integrations.js";
export { MessagePollVoteAdd, MessagePollVoteRemove } from "./Polls.js";
export { InteractionCreate } from "./Interactions.js";
export { Ready } from "./Ready.js";