# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### Added

#### File uploads
- Multipart file upload support in `Rest` (`src/Rest.ts`). `post()`, `patch()`, and `put()` take an optional fourth `files: FileAttachment[]` argument; when it is non-empty the request body becomes a `FormData` carrying the JSON payload under `payload_json` plus one `files[n]` part per attachment, and the `Content-Type` header is omitted so `fetch` can set it with the multipart boundary. Files deliberately travel as a separate argument rather than inside the payload, so the JSON body stays exactly what goes on the wire. Everything else — the per-bucket request queue, rate limit accounting, `429` handling, and `5xx` backoff — is shared with JSON requests rather than duplicated for uploads; the only upload-specific behaviour is that the `FormData` is rebuilt on each attempt, since a body already handed to `fetch` is consumed and cannot be replayed on a retry. Lists are validated before the request is sent: at most 10 files, no empty names, and no duplicate names (a duplicate would make an `attachment://<name>` reference ambiguous)
- `MessagePayload.attachments` (`src/Types/Internal.ts`) — `{ name, data, description? }[]`, where `data` is a `Buffer`, `Uint8Array`, or `string`. A `string` is uploaded as its UTF-8 bytes and is never read from disk, so there is no ambiguity between file contents and a path. `MessagePayload.flags` was added alongside it, which is what `IS_COMPONENTS_V2` will need. `InteractionCallbackMessages.attachments` (`src/Types/Interactions.ts`) takes the same shape, replacing the upload-less `Pick<Attachment, "id"> & Partial<...>` it previously declared
- `RetainedAttachment` (`src/Types/Internal.ts`) — `{ id, filename?, description? }`, naming an attachment already on a message so an edit keeps it. Editing replaces a message's whole attachment list, so anything left out is removed; an `attachments` entry is an upload when it carries `data` and a retained attachment otherwise, which means both can be mixed in one list
- `SplitAttachments()` (`src/Structures/Message.ts`) — splits a payload into the JSON body and the files to upload, turning each attachment into an `{ id, filename?, description? }` descriptor. That descriptor is what an `attachment://<filename>` reference in an embed or a `FileComponent` / `MediaGallery` resolves against, so the two halves are built together. Uploads are numbered by their position among the *files* rather than among the attachments, so interleaving them with retained attachments still lines each descriptor up with its `files[n]` part; retained entries keep their real ids, which are snowflakes and so never collide with those indices. It returns a shallow copy rather than mutating the caller's payload
- Attachments are wired into `channel.send()`, `message.reply()`, `message.update()`, `user.send()`, `webhook.send()`, and the interaction responses — `reply()`, `editReply()`, `followUp()`, and `update()`. The two callback-route responses (`reply()` and `update()`) nest the message body in `data` while the uploads stay top-level form parts, which is the shape Discord expects. `CreateMessagePayload()` now accepts an attachment-only message rather than rejecting it as empty
- Multipart test coverage (`src/Tests/Multipart.test.ts`), asserting the form body and its parts, the absent `Content-Type`, that file-less requests still send JSON, and that a retried request builds a fresh body

#### Message fetching
- `MessageManager` (`src/Managers/Messages.ts`) on `channel.messages`, with an overloaded `fetch()`: `fetch(id)` reads a single message back by id, and `fetch({ limit?, before?, after?, around? })` pages a channel's history. Available on every channel using the `Messageable` mixin — `GuildTextChannel`, `GuildVoiceChannel`, and `GuildThreadChannel` — and created lazily on first access, so channels built during a `GUILD_CREATE` burst do not each allocate one. Messages could previously be sent, edited, deleted, pinned and reacted to, but never read back
- The manager holds **no cache**, unlike the guild collections. A channel's message history is unbounded, so caching it would mean owning an eviction policy and the memory cost of thousands of messages; every call goes straight to the API and returns fresh `Message` instances. Message authors and mentions still land in the global user cache, since `Message.patch()` upserts them. `send()`, `deleteMessage()`, and `bulkDeleteMessages()` stay on the channel itself rather than moving onto the manager
- `before`, `after`, and `around` are mutually exclusive — Discord rejects more than one — so the manager throws before the request is sent rather than letting it fail server-side. `limit` is deliberately not range-checked client-side, matching `GuildBanManager`

#### Webhooks
- `Webhook` structure (`src/Structures/Webhook.ts`) covering the full webhook object, with lazy `guild` / `channel` getters that resolve from cache, an `avatarURL()` helper that returns `null` when no avatar hash is set, and a `toString()` that prefers the `url` Discord sent over a reconstructed one. Actions are `edit()`, `delete()`, and `send()`; `edit()` and `delete()` use the token-authenticated route when the webhook carries a `token` and the permission-checked route otherwise, and `edit()` throws rather than silently failing when asked to move a tokenless-route-only `channel_id` over the token route. `send()` always requests `?wait=true` so it can return a real `Message`, passes `thread_id` as a query parameter rather than in the body, and throws when the webhook has no token
- `WebhookCache` (`src/Managers/Webhooks.ts`) on `guild.webhooks`, with `fetch(id)`, `fetchAll()`, `fetchChannel(channelId)`, and `create(channelId, options, reason?)`. Discord never sends webhooks in `GUILD_CREATE` and `WEBHOOKS_UPDATE` names only the channel that changed, so the cache starts empty and `fetchChannel()` is the intended way to resync after that event

#### Components v2
- `ComponentBuilder` (`src/Builders/ComponentBuilder.ts`) — abstract base for component builders, carrying the optional `id` every component shares and a chainable `setId()` that rejects non-integers and values outside 32 bits. `id` is what lets a specific component be targeted when editing a message. Only the Components v2 builders extend it so far; the v1 builders still have no `id` support
- `TextDisplayBuilder` (`src/Builders/TextDisplayBuilder.ts`) — markdown text rendered like message content, respecting the message's `allowed_mentions`. Discord's 4,000-character limit applies across all of a message's text rather than per-component, so the builder validates only that `content` is non-empty rather than inventing a per-component cap
- `SeparatorBuilder` (`src/Builders/SeparatorBuilder.ts`) — vertical padding with an optional divider line. Both fields are optional and are left unset unless explicitly set, so Discord applies its own defaults (`divider` true, `spacing` `SMALL`); `setSpacing()` rejects anything that is not `SeparatorSpacingSizes.SMALL` or `.LARGE`, which only untyped JavaScript callers can produce
- Components v2 builder test coverage (`src/Tests/ComponentsV2.test.ts`), kept separate from the v1 `src/Tests/Components.test.ts` so the v1 suite stays a stable regression surface as the remaining v2 builders land

#### Gateway
- `TYPING_START` dispatch handler (`src/Events/Typing.ts`), surfaced as the `TypingStart` client event. Emits the resolved `guild`, `channel`, and `user` (each falling back to a bare `{ id }` object when uncached, with `guild` `null` for DMs), the guild-only `member` payload upserted into the guild's member cache (`null` in DMs), and `timestamp` converted from Discord's unix-seconds value to a `Date`
- `AUTO_MODERATION_RULE_CREATE`, `AUTO_MODERATION_RULE_UPDATE`, and `AUTO_MODERATION_RULE_DELETE` dispatch handlers (`src/Events/AutoModeration.ts`), surfaced as the `AutoModerationRuleCreate` / `AutoModerationRuleUpdate` / `AutoModerationRuleDelete` client events. Requires the `AutoModerationConfiguration` intent. Rules are wrapped in the new `AutoModerationRule` structure (`src/Structures/AutoModerationRule.ts`) and cached per guild on `guild.autoModerationRules` (`src/Managers/AutoModeration.ts`). Discord never includes rules in `GUILD_CREATE`, so that cache starts empty and fills from gateway events or an explicit `fetch(id)` / `fetchAll()`; `AutoModerationRuleDelete` therefore emits the raw payload whenever the rule was not already cached
- `AUTO_MODERATION_ACTION_EXECUTION` dispatch handler (`src/Events/AutoModeration.ts`), surfaced as the `AutoModerationActionExecution` client event with a camelCased `AutoModerationActionExecutionPayload`. Requires the `AutoModerationExecution` intent. Nothing is cached — the event reports an occurrence, not an entity — and the optional `channelId` / `messageId` / `alertSystemMessageId` fields are omitted rather than nulled when Discord leaves them out
- `MESSAGE_REACTION_REMOVE_ALL` and `MESSAGE_REACTION_REMOVE_EMOJI` dispatch handlers (`src/Events/Reactions.ts`), surfaced as the `ReactionRemoveAll` / `ReactionRemoveEmoji` client events, completing the reaction family. Both emit the resolved `guild` and `channel` (falling back to a bare `{ id }` object when uncached, with `guild` `null` for DMs) alongside `messageId`, and `ReactionRemoveEmoji` adds the cleared `emoji`. Discord sends no information about which reactions were removed, and the library has no message cache, so neither handler mutates any cache state
- `MESSAGE_POLL_VOTE_ADD` and `MESSAGE_POLL_VOTE_REMOVE` dispatch handlers (`src/Events/Polls.ts`), surfaced as the `MessagePollVoteAdd` / `MessagePollVoteRemove` client events. Requires the `GuildMessagePolls` intent in guilds, or `DirectMessagePolls` in DMs. Both emit the resolved `guild`, `channel`, and `user` (each falling back to a bare `{ id }` object when uncached, with `guild` `null` for DMs) alongside `messageId` and `answerId`, which matches the chosen answer's `answer_id` in the poll's `answers` array. Nothing is cached: the payload carries no message and the library has no message cache, so a running tally has to be kept by the listener or re-read with a message fetch. Changing a vote in a single-select poll arrives as a remove followed by an add, so the two events are not independent
- `GUILD_SCHEDULED_EVENT_CREATE`, `GUILD_SCHEDULED_EVENT_UPDATE`, and `GUILD_SCHEDULED_EVENT_DELETE` dispatch handlers (`src/Events/GuildScheduledEvents.ts`), surfaced as the `GuildScheduledEventCreate` / `GuildScheduledEventUpdate` / `GuildScheduledEventDelete` client events. Requires the `GuildScheduledEvents` intent. Events are wrapped in the new `GuildScheduledEvent` structure (`src/Structures/GuildScheduledEvent.ts`, with `modify()` and `delete()`) and cached per guild on `guild.scheduledEvents` (`src/Managers/GuildScheduledEvents.ts`, with `fetch(id)` / `fetchAll()` / `create()`). Discord includes `guild_scheduled_events` in `GUILD_CREATE`, so the cache is seeded on connect rather than starting empty. Starting, ending, and cancelling an event all arrive as `GuildScheduledEventUpdate` `status` changes.
- `GUILD_SCHEDULED_EVENT_USER_ADD` and `GUILD_SCHEDULED_EVENT_USER_REMOVE` dispatch handlers (`src/Events/GuildScheduledEvents.ts`), surfaced as the `GuildScheduledEventUserAdd` / `GuildScheduledEventUserRemove` client events, completing the scheduled event family. Requires the `GuildScheduledEvents` intent. Both emit the `event`, the `user`, and the `guild`; the payload carries ids only, so `event` and `user` each fall back to a bare `{ id }` object when uncached. No subscriber cache was added — Discord never sends a subscriber list over the gateway, so any such cache would be permanently partial — but `event.userCount` is incremented/decremented (floored at zero) when it is already known from a `fetch` that requested user counts, and left `undefined` otherwise rather than being invented from a zero baseline
- `CHANNEL_PINS_UPDATE` dispatch handler (`src/Events/Channels.ts`), surfaced as the `ChannelPinsUpdate` client event. Emits the resolved `guild` and `channel` (falling back to a bare `{ id }` object when uncached, with `guild` `null` for DMs) alongside `lastPinTimestamp`, normalized to `null` when Discord omits it. Discord does not say which message was pinned, and does not fire this event when a pinned message is deleted, so nothing is cached
- `PRESENCE_UPDATE` dispatch handler (`src/Events/Presence.ts`), surfaced as the `PresenceUpdate` client event. Requires the **privileged** `GuildPresences` intent. Presences are wrapped in the new `Presence` structure (`src/Structures/Presence.ts`, with `customStatus`, `activityOfType()`, `isOn(device)`, and `user` / `member` accessors) and cached per guild on `guild.presences` (`src/Managers/Presences.ts`), with `member.presence` as a shorthand. Discord includes `presences` in `GUILD_CREATE`, so the cache is seeded on connect. Offline users are never retained — Discord omits them from `GUILD_CREATE` and the handler drops an entry once its status goes `offline` — so `member.presence` is `undefined` for anyone offline, unseen, or when the intent is off. Unlike the other `*Update` handlers, `oldPresence` is a detached `clone()` taken before the cache is patched, so it can actually be diffed against `newPresence`. The payload's `user` object is partial (Discord guarantees only `id`), so it is only upserted into the user cache when it arrives complete, never blanking an already-cached user
- Inbound presence types (`src/Types/DiscordAPITypes.ts`) — `DiscordPresence`, `DiscordActivity` and its `Timestamps` / `Emoji` / `Party` / `Assets` / `Secrets` sub-shapes, `DiscordClientStatus`, `DiscordPartialUser`, and the `ActivityFlags` bitfield. `ClientActivity` is now derived from `DiscordActivity` via `Pick` so the outbound and inbound shapes cannot drift apart, and `PresenceStatus` adds the outbound-only `invisible` that `Client.setStatus()` accepts (inbound presences never report it — Discord shows invisible users as `offline`, so `Status` deliberately omits it)
- `DiscordGuildCreate` type (`src/Types/DiscordAPITypes.ts`) — names the `DiscordGuild` + `channels` / `members` / `guild_scheduled_events` / `presences` intersection that `GUILD_CREATE` actually delivers, replacing the copy of it that was inlined in both `Guild`'s constructor and `patch`
- `WEBHOOKS_UPDATE` dispatch handler (`src/Events/Webhooks.ts`), surfaced as the `WebhooksUpdate` client event. Requires the `GuildWebhooks` intent. Emits the resolved `guild` and `channel` (falling back to a bare `{ id }` object when uncached; the event is guild-only, so `guild` is never `null`). Discord sends no information about which webhook changed or how, only where it happened, so nothing is cached — fetch the channel's webhooks to see the new state
- `THREAD_CREATE`, `THREAD_UPDATE`, and `THREAD_DELETE` dispatch handlers (`src/Events/Threads.ts`), surfaced as the `ThreadCreate` / `ThreadUpdate` / `ThreadDelete` client events. Threads are cached alongside regular channels in the guild's `ChannelCache`, so `guild.channels` is the single source of truth and `BaseChannel.isThreadChannel()` narrows to `GuildThreadChannel`. `ThreadDelete` emits the cached thread when it has one and the raw partial payload otherwise
- `THREAD_MEMBER_UPDATE`, `THREAD_MEMBERS_UPDATE`, and `THREAD_LIST_SYNC` dispatch handlers (`src/Events/Threads.ts`), surfaced as the `ThreadMemberUpdate` / `ThreadMembersUpdate` / `ThreadListSync` client events, completing the thread family. Thread membership is wrapped in the new `ThreadMember` structure (`src/Structures/ThreadMember.ts`) and cached per thread on `thread.members` (`src/Managers/ThreadMembers.ts`, with `fetch(userId)` / `fetchAll()`), keyed by user id. `ThreadMemberUpdate` only ever fires for the current user; `ThreadMembersUpdate` is a delta (`added` / `removed`) that Discord caps at 50 additions and only populates beyond the current user with the **privileged** `GuildMembers` intent, so use `thread.members.fetchAll()` when the complete list matters. `ThreadListSync` is a true sync: it caches every thread it carries, then evicts cached threads under the synced `channel_ids` (or the whole guild, when Discord omits that field) that the payload did not list, reporting their ids as `evicted` since they are already gone from the cache by the time listeners run
- `INTEGRATION_CREATE`, `INTEGRATION_UPDATE`, and `INTEGRATION_DELETE` dispatch handlers (`src/Events/Integrations.ts`), surfaced as the `IntegrationCreate` / `IntegrationUpdate` / `IntegrationDelete` client events. Requires the `GuildIntegrations` intent. Integrations are wrapped in the new `Integration` structure (`src/Structures/Integration.ts`, with a `role` accessor and `delete()` — Discord deprecated the modify endpoint, so there is deliberately no `modify()`) and cached per guild on `guild.integrations` (`src/Managers/Integrations.ts`, with `fetch(id)` / `fetchAll()`). Discord never includes integrations in `GUILD_CREATE`, so that cache starts empty and fills from gateway events or an explicit fetch; `fetch(id)` has to list every integration and pick from the result because there is no single-integration endpoint. `INTEGRATION_DELETE` carries ids only, so `IntegrationDelete` emits a bare `{ id }` object when the integration was not cached, alongside the `guild` and the `applicationId` Discord sends for `discord` type integrations. Everything past `account` is absent for bot and `guild_subscription` integrations, so the subscriber fields stay `undefined` rather than being defaulted
- `GUILD_INTEGRATIONS_UPDATE` dispatch handler (`src/Events/Integrations.ts`), surfaced as the `GuildIntegrationsUpdate` client event, completing the integration family. Requires the `GuildIntegrations` intent. Discord sends the guild id and nothing else — it does not say which integration changed or how — so nothing is cached and listeners that need the detail should call `guild.integrations.fetchAll()`
- `GUILD_SOUNDBOARD_SOUND_CREATE`, `GUILD_SOUNDBOARD_SOUND_UPDATE`, and `GUILD_SOUNDBOARD_SOUND_DELETE` dispatch handlers (`src/Events/SoundboardSounds.ts`), surfaced as the `SoundboardSoundCreate` / `SoundboardSoundUpdate` / `SoundboardSoundDelete` client events. Requires the `GuildExpressions` intent. Sounds are wrapped in the new `SoundboardSound` structure (`src/Structures/SoundboardSound.ts`, with an `emoji` accessor, `modify()`, and `delete()`) and cached per guild on `guild.soundboardSounds` (`src/Managers/SoundboardSounds.ts`, with `fetch(id)` / `fetchAll()` / `create()`). Discord includes `soundboard_sounds` in `GUILD_CREATE`, so the cache is seeded on connect rather than starting empty. Unlike every other guild expression the primary key is `sound_id` rather than `id`, so the structure exposes it as `soundId` and the cache is keyed on it; `SoundboardSoundDelete` therefore emits a bare `{ soundId }` object when the sound was not cached. A sound's icon is either a custom emoji (`emojiId`) or a standard unicode one (`emojiName`), never both, so the `emoji` accessor returns `undefined` for standard-emoji and iconless sounds rather than pretending they resolve. `fetchAll()` unwraps the `items` array this endpoint wraps its response in, which no other guild collection endpoint does
- `GUILD_SOUNDBOARD_SOUNDS_UPDATE` dispatch handler (`src/Events/SoundboardSounds.ts`), surfaced as the `SoundboardSoundsUpdate` client event, completing the soundboard family. Requires the `GuildExpressions` intent. Upserts every sound in the payload and derives individual `SoundboardSoundCreate` / `SoundboardSoundUpdate` events from the diff, then emits the batch once. Unlike the `GUILD_EMOJIS_UPDATE` handler it deliberately does **not** evict cached sounds absent from the payload: Discord does not document this event as a guaranteed full-list replacement, so treating an absence as a deletion risks silently dropping live sounds, and `GUILD_SOUNDBOARD_SOUND_DELETE` is the authoritative removal signal. The emitted `sounds` array is therefore only what the payload carried, not necessarily the guild's full soundboard — read `guild.soundboardSounds` for that
- `DiscordSoundboardSound` and its gateway payloads (`src/Types/DiscordAPITypes.ts`) — the soundboard sound object plus the `GUILD_SOUNDBOARD_SOUND_CREATE` / `GUILD_SOUNDBOARD_SOUND_UPDATE` / `GUILD_SOUNDBOARD_SOUND_DELETE` / `GUILD_SOUNDBOARD_SOUNDS_UPDATE` shapes. `DiscordGuildCreate` gains the `soundboard_sounds` field Discord has always sent but the type never modelled
- `DiscordGuildScheduledEvent` and its supporting types (`src/Types/DiscordAPITypes.ts`) — the scheduled event object, privacy level, entity types, status, entity metadata, and recurrence rule (frequency/weekday/month/n-weekday). These replace the `JSONObject` placeholders previously used for `DiscordInvite.guild_scheduled_event` and `DiscordAuditLog.guild_scheduled_events`, so `Invite.guildScheduledEvent` is now fully typed
- `DiscordIntegration` and its supporting types (`src/Types/DiscordAPITypes.ts`) — the integration object, its `type` union, expire behaviors, account and application sub-shapes, and the `INTEGRATION_CREATE` / `INTEGRATION_UPDATE` / `INTEGRATION_DELETE` / `GUILD_INTEGRATIONS_UPDATE` gateway payloads. These replace the `JSONObject[]` placeholder previously used for `DiscordAuditLog.integrations`

## [1.2.0-alpha] - 2026 August 16

### Added

#### Slash commands
- `SlashCommandBuilder` (`src/Builders/SlashCommandBuilder.ts`) — fluent builder for application (slash) commands, including subcommands, subcommand groups, and all Discord option types with per-type validation
- `ApplicationCommand` type definitions (`src/Types/ApplicationCommand.ts`) — full typings for application command payloads and option shapes
- `SlashCommandOptions` (`src/Managers/SlashCommandOptions.ts`) — typed accessors (`getString`, `getInteger`, `getNumber`, `getBoolean`, `getUser`, `getMember`, `getRole`, `getChannel`, `getMentionable`, `getAttachment`) for a slash command interaction's resolved options, including nested subcommand/group values
- `Client.registerPublicCommands(commands)` / `Client.registerGuildCommands(guildId, commands)` — replace all global or guild-scoped slash commands via REST

#### Message components
- Every builder **is** its wire payload — `ButtonBuilder implements InteractiveButton`, `ModalBuilder implements InteractionCallbackModal`, and so on — with fields stored under their snake_case wire names (`custom_id`, `min_values`, `default_values`). There is no `toJSON()`: builders can be sent, inspected, cloned, or logged as-is, nested builders need no conversion, and `components` is a plain array you can `push` to or splice
- `ActionRowBuilder` (`src/Builders/ActionRowBuilder.ts`) — container builder for buttons and select menus, generic over the component payload type so builders and plain objects can be mixed freely
- `ButtonBuilder`, `LinkButtonBuilder`, `SKUButtonBuilder` (`src/Builders/ButtonBuilder.ts`, `src/Builders/LinkButtonBuilder.ts`, `src/Builders/SKUButtonBuilder.ts`) — one builder per button style family (interactive, link, and SKU/premium), each only exposing the fields valid for its style
- `ResolveButton()` / `ValidateButton()` (`src/Builders/ResolveButton.ts`) — build or validate the correct button builder for a payload whose style isn't known up front
- `StringSelectBuilder`, `UserSelectBuilder`, `RoleSelectBuilder`, `ChannelSelectBuilder`, `MentionableSelectBuilder` (`src/Builders/*SelectBuilder.ts`) — all Discord select menu types, sharing common option/constraint logic via `BaseSelectBuilder` / `EntitySelectBuilder`
- `ModalBuilder`, `LabelBuilder`, `TextInputBuilder` (`src/Builders/ModalBuilder.ts`, `src/Builders/LabelBuilder.ts`, `src/Builders/TextInputBuilder.ts`) — modal construction with labeled text input fields
- `Components` type definitions (`src/Types/Components.ts`) — full typings for all message component kinds
- Comprehensive builder test coverage (`src/Tests/Components.test.ts`, `src/Tests/SlashCommandBuilder.test.ts`, `src/Tests/SlashCommandOptions.test.ts`) for construction and validation of every builder, plus a wire-format suite pinning that each builder's own properties are exactly the payload Discord expects

#### Interactions
- `BaseInteraction` (`src/Structures/Interactions/BaseInteraction.ts`) and per-type interaction classes — `PingInteraction`, `SlashCommandInteraction`, `AutocompleteInteraction`, `MessageComponentInteraction`, `SelectMenuInteraction`, `ButtonInteraction`, `ModalInteraction`, `UserContextMenuInteraction`, `MessageContextMenuInteraction`
- `Repliable`, `Updateable`, and `ModalShowable` mixins (`src/Mixins/Interactions/`) — shared `reply()`/`deferReply()`/`followUp()`, `update()`/`deferUpdate()`, and `showModal()` behavior across the relevant interaction types. `showModal()` accepts a `ModalBuilder` or a raw `InteractionCallbackModal`, since they're the same shape
- `MessageFlags` constants (`src/Types/DiscordAPITypes.ts`) and an `ephemeral` shorthand on `reply()`/`update()` payloads, for responses only the invoking user can see
- `CreateInteraction()` factory (`src/Factory/CreateInteraction.ts`) — builds the correct interaction class from a raw gateway payload; returns `AnyInteraction | PingInteraction`
- `InteractionCreate` gateway event handler (`src/Events/Interactions.ts`) for `INTERACTION_CREATE`, emitting `ClientEvents.InteractionCreate`
- `DiscordInteraction` type (`src/Types/Interactions.ts`, renamed from `Interaction` to match the `Discord*` naming convention used by other API types)
- Test coverage for interaction classes, mixins, and the `InteractionCreate` event handler (`src/Tests/Interactions.test.ts`)

#### Collectors
- `createCollector(emitter, event, options)` / `awaitEvent(emitter, event, options)` (`src/Collector.ts`) — temporary, filtered event listeners that resolve or auto-cleanup after a `time`/`idle`/`max` bound, for flows like "wait for the next message from this user" without wiring up a permanent handler
- `examples/14-collectors` — example project demonstrating collector usage
- Test coverage for collector lifecycle and cleanup behavior (`src/Tests/Collector.test.ts`)

#### Gateway
- `WSClient` now handles `GatewayOpCodes.Reconnect` and `GatewayOpCodes.InvalidSession`, tracks `session_id`/`resume_gateway_url` from `READY`, and resumes the session (via `GatewayOpCodes.Resume`) instead of re-identifying from scratch when possible
- `WSClient` now tracks heartbeat ACK state and reconnects if the gateway never acknowledges a heartbeat, instead of heartbeating into a dead connection indefinitely
- `WSEvents` gained `RECONNECT`, `INVALID_SESSION`, and `HELLO`, mirroring the corresponding `GatewayOpCodes` alongside the existing `RAW`/`HEARTBEAT`/`HEARTBEAT_ACK` events
- `GatewayCloseCodes` (`src/Types/DiscordGateway.ts`) — every gateway close code, documented by whether reconnecting can recover from it
- `WSEvents.Disconnect` — fired with a reason and close code when the client stops reconnecting for good, either because Discord rejected the connection fatally or because every retry was used up
- `WSOptions.maxReconnectAttempts` (default `10`) — cap on consecutive reconnect attempts before giving up; the counter resets on every successful `READY`/`RESUMED`

#### Tooling
- CI workflows for Bun (`.github/workflows/bun.yml`) and Deno (`.github/workflows/deno.yml`) run the build and test suite on every push/PR to `main`, alongside the existing Node workflow

#### Public API
- `Utils`, `Contracts`, `Factory`, and `Mixins` now exported from the package root, alongside `ChannelPermissionManager`, `GuildBanManager`, `GuildInviteManager`, and `SlashCommandOptions`
- `SlashCommandBuilder` gained an instance `validate()` method

### Changed

- `EmbedBuilder` now implements `Embed` directly for improved type safety
- Audit log type updated to properly reference the new slash command types
- `ActionRowBuilder`, `LabelBuilder`, and `ModalBuilder` are now generic over their component payload types rather than builder types, so raw payload objects and builders can be mixed freely within them

### Fixed

- REST rate limiting is no longer reactive-only. An `X-RateLimit-Remaining: 0` on any response now records the bucket's reset window pre-emptively, and requests sharing a rate limit key are serialized through a per-bucket queue, so a burst of concurrent calls paces itself instead of all passing the limit check together, hitting Discord together, and coming back `429` together
- A global rate limit now pauses every bucket. It was recorded but only ever honoured by clients running with `perRouteRateLimits` disabled
- `WSClient.#reconnect()` no longer retries immediately and forever. Reconnects are scheduled with exponential backoff and full jitter (1s base, 60s cap, first attempt still immediate) and stop after `maxReconnectAttempts`. Fatal close codes (4004 authentication failed, 4010–4014 invalid shard/sharding required/invalid API version/invalid or disallowed intents) now stop reconnecting entirely instead of replaying a rejected `IDENTIFY` in a tight loop, and `4007`/`4009` drop the stale session so the next connection identifies rather than resuming
- `GatewayOpCodes.InvalidSession` now waits Discord's mandated randomized 1–5 seconds before reconnecting, instead of re-identifying instantly and burning the session start rate limit
- `Client.login()` now rejects with the gateway's actual failure reason when the connection is rejected outright (bad token, disallowed intents), instead of waiting the full ten seconds to blame a Discord outage
- `eslint.config.ts` imports `Plugin` from `@eslint/core` as a type-only import, since that package only ships types and no runtime logic
- All builders now implement their corresponding JSON payload interface directly, for improved type safety
- Minimum supported Node version raised from 18 to 20, matching what the test suite actually requires
- **Breaking:** structure and type fields renamed from Discord's wire-format snake_case to camelCase with an `Id` suffix across the library (e.g. `channel_id` → `channelId`, `guild_id` → `guildId`, `mention_everyone` → `mentionEveryone`), for consistency with the rest of the public API
- `GuildBanManager.delete()` now takes a user id instead of unbanning the whole guild
- Invite `fetch()`/`delete()` now hit `/invites/:code` instead of a nonexistent guild-scoped route
- `Member.timeoutUntil(null)` now sends `null` instead of the current timestamp
- `Member.setNickname()` now sends the `nick` field instead of `nickname`
- Guild ban event handlers no longer assume the guild is cached
- Default avatar URLs now resolve under `/embed/avatars/` instead of an incorrect path
- `User.avatarURL()` now only returns a `.gif` extension for avatars with an animated hash
- REST requests now target Discord API v10 and include a `User-Agent` header
- `Message.react()` now URL-encodes the emoji with `encodeURIComponent` instead of `encodeURI`
- `ReactionAdd` now looks up the channel by channel id instead of guild id
- Channel permission overwrites, position, and topic no longer crash on partial channel payloads
- `Message.patch()` now updates `guildId` and `member` instead of locking them to their first-seen value
- Smart getters on `Message` and `Invite` are now recoverable after a cache-miss memoization
- `ResolvePermissions` no longer throws when a role or `@everyone` is missing from cache
- Role sorting was broken: `highest()`/`lowest()` were inverted and `toSorted()` mutated cached positions
- `BitField` now throws a clear error on unknown flag names instead of a `BigInt` `SyntaxError`
- `CreateInteraction()` now throws on an unrecognized interaction type instead of returning `undefined`
- `ButtonBuilder.from()` and `LinkButtonBuilder.from()` no longer crash on a missing label
- Removed the duplicate `EPHEMERAL_FLAG` constant in favor of `MessageFlags.EPHEMERAL`
- Interaction `reply()` now sends the payload it built instead of rebuilding and discarding it
- `EmbedBuilder.setColor()` no longer has an unreachable `else` branch
- `GuildStickerManager.modify()` no longer mutates the caller's options object
- Async gateway event handler rejections are now caught, so a failing handler no longer floods stderr with unhandled-event warnings
- `ClientEvents` member and role events now use their own key names instead of the raw gateway event names
- Fixed `ClientEvents.StickerUpdate` value, which was `StickersUpdate` and didn't match its key
- `Client.destroy()` now clears the user cache in addition to the guild cache
- Renamed the abstract per-guild cache base to `GuildScopedCache` to resolve a naming collision with the top-level `GuildCache`

## [1.1.0-alpha] - 2026 July 31

### Added

#### Permissions system
- `ChannelPermissionManager` (`src/Managers/ChannelPermissionManager.ts`) — manages and calculates channel-level permission overrides
- `Resolver` (`src/Permissions/Resolver.ts`) — calculates effective member permissions at both guild and channel levels with inheritance and override support
- `Member.permissions()` — resolves guild-level permissions live from the member's current roles (guild owner and `ADMINISTRATOR` always resolve to every permission)
- `Member.permissionsIn(channel)` — resolves effective permissions inside a specific channel, applying `@everyone`/role/member overwrites on top of guild permissions
- `Member.hasPermission(...permissions)` / `Member.hasPermissionsIn(channel, ...permissions)` — convenience checks against the resolved permission set
- `Resolver` and `BitField` now re-exported from the package root (`src/index.ts`), along with `Constants`
- Comprehensive permission resolver tests covering all permission combinations and inheritance scenarios, expanded to cover the new `Member` permission methods

#### User avatars
- `User.avatarURL(animated?)` — builds the CDN avatar URL, defaulting to animated `.webp` unless `animated: false` is passed
- `User.defaultAvatarURL()` — computes the correct Discord default avatar (legacy discriminator modulo or new username-based index)

#### Invites
- `Invite` class (`src/Structures/Invite.ts`) — wraps the Discord invite object/metadata, exposing invite, inviter, target, and expiration details
- `INVITE_CREATE` and `INVITE_DELETE` gateway event handlers (`src/Events/Invites.ts`)
- Test coverage for the `Invite` class and its event handlers

#### Bans
- `GuildBanManager` (`src/Managers/GuildBans.ts`) — manages guild bans with `create()`, `delete()`, and paginated `fetch()` operations
- `GuildBanAdd` and `GuildBanRemove` gateway event handlers (`src/Events/Bans.ts`)
- `ClientEvents.GuildBanAdd` and `ClientEvents.GuildBanRemove` client events with JSDoc documentation
- Pagination support for fetching bans: `limit`, `before`, and `after` query parameters
- Comprehensive test coverage for ban events and manager operations

#### Messages
- `Channel.deleteMessage(message, reason?)` and `Channel.bulkDeleteMessages(messages, reason?)` on the `Messageable` mixin — both accept `Message` instances or raw IDs
- `bulkDeleteMessages()` de-duplicates IDs, falls back to a single delete for one message, and rejects empty or >100 message batches
- `MessageDeleteBulk` gateway event handler (`src/Events/Messages.ts`) for `MESSAGE_DELETE_BULK`, emitting `ClientEvents.MessageDeleteBulk` with `{ ids, channel_id, guild_id }`
- Test coverage for both delete paths, including audit log reason headers

#### Audit logs
- `AuditLogEntryCreate` gateway event handler (`src/Events/AuditLogs.ts`) for `GUILD_AUDIT_LOG_ENTRY_CREATE`
- `ClientEvents.AuditLogEntryCreate` client event, emitting the guild and the raw `DiscordAuditLogEntry`
- Registered the ban and audit log handlers in `src/Events/index.ts` so the dispatcher actually routes them

#### Channel type hierarchy
- `BaseChannel` (`src/Structures/BaseChannel.ts`) — new base class for all channel types with shared functionality
- `GuildTextChannel` (`src/Structures/GuildTextChannel.ts`) — dedicated class for text channels
- `GuildVoiceChannel` (`src/Structures/GuildVoiceChannel.ts`) — dedicated class for voice channels
- `GuildCategoryChannel` (`src/Structures/GuildCategoryChannel.ts`) — dedicated class for category channels
- `GuildAnnouncementChannel` (`src/Structures/GuildAnnouncementChannel.ts`) — dedicated class for announcement channels
- `GuildForumChannel` (`src/Structures/GuildForumChannel.ts`) — dedicated class for forum channels
- `GuildStageChannel` (`src/Structures/GuildStageChannel.ts`) — dedicated class for stage channels
- `GuildThreadChannel` (`src/Structures/GuildThreadChannel.ts`) — dedicated class for thread channels
- `CreateChannel` factory (`src/Factory/CreateChannel.ts`) — creates appropriate channel type instances from Discord API payloads
- `Messageable` mixin (`src/Structures/Mixins/Channels/Messageable.ts`) — shared message-sending functionality for text-based channels
- `ROADMAP.md` — project roadmap outlining planned features and direction

### Channel Discrimination
- New functions to easily tell channel types apart: text, voice, thread, category
  - `isTextChannel()` -> `GuildTextChannel | GuildAnnouncementChannel`
  - `isVoiceChannel()` -> `GuildVoiceChannel | GuildStageChannel`
  - `isThreadChannel()` -> `GuildThreadChannel` (public/private/announcement)
  - `isCategoryChannel()` -> `GuildCategoryChannel`

#### Documentation
- JSDoc documentation for `BitField.resolve()` method for improved IDE support and developer experience
- JSDoc coverage added across the rest of the codebase (managers, mixins, structures, `Rest`, `WSClient`, types) for improved IDE support and developer experience

### Changed

- Renamed `src/Cache/` directory to `src/Managers/` to better describe their role as cache managers with fetch/upsert operations
- Moved channel structure classes (`BaseChannel`, `GuildTextChannel`, `GuildVoiceChannel`, etc.) into `src/Structures/Channels/`
- Moved mixins out of `src/Structures/Mixins/` into a dedicated `src/Mixins/` root folder
- Split the `JSONObject` / `JSONArray` helper types into two distinct definitions instead of one combined type
- **BREAKING**: `Channel` structure split into individual type-specific classes (`GuildTextChannel`, `GuildVoiceChannel`, etc.). Code importing or type-checking `Channel` must update to use the appropriate subclass type
- **BREAKING**: `Member.permissions` is no longer a raw permission bitfield string patched from the API — it's now a `Member.permissions()` method that resolves live permissions from the member's roles

## [1.0.0-alpha] - 2026 July 22

### Added

#### Core runtime
- `Client` class (`src/Client.ts`) — typed `EventEmitter<ClientEventMap>` that wires together `WSClient`, `Rest`, `GuildCache`, and `UserCache`; exposes `login()` / `destroy()` lifecycle methods with polling-based ready/disconnected detection
- `WSClient` class (`src/WSClient.ts`) — WebSocket gateway client handling Hello → Identify handshake, jitter-based heartbeat scheduling, sequence tracking, and raw message dispatch via `CreateDispatch()`
- `WSOptions` type — exposes `jitter_override` and `eventOverrides` to allow per-client gateway customization
- `ClientOptions.ws` field — passes `WSOptions` through from `Client` constructor into `WSClient` so all gateway options are configurable from the top-level options object
- `eventOverrides` now correctly forwarded from `ClientOptions.ws` → `WSClient` constructor → `CreateDispatch()` so registered overrides are actually active at runtime
- `Rest` class (`src/Rest.ts`) — authenticated REST client targeting Discord API v9 with `get`, `post`, `patch`, `delete`, and `put` helpers; supports optional per-request header overrides (e.g. `X-Audit-Log-Reason`)
- `CreateDispatch()` factory (`src/EventDispatcher.ts`) — builds a fresh handler map from all exports in `src/Events/index.ts` at call time (not module load time); detects duplicate event names; accepts `eventOverrides` to replace built-in handlers per event; warns on unhandled events
- `ResolveIntents` / `HasIntent` helpers (`src/Intents.ts`) — normalize mixed intent input (number, bitfield array, string key array) into a single bitfield; used by `Client` constructor
- `EventRequiredIntent` map (`src/Intents.ts`) — cross-reference from gateway event names to the intent required to receive them
- `setStatus(status)` / `setStatusMessage(type, message)` on `Client` — send live `PresenceUpdate` gateway payloads; supports all `Status` and `ActivityType` values

#### Structures
- `Guild` (`src/Structures/Guild.ts`) — full Discord guild structure with partial-safe `patch()` guards for all optional fields; owns guild-scoped `ChannelCache`, `RoleCache`, `EmojiCache`, `StickerCache`, and `MemberCache`
  - `Guild.modify(changes)` — PATCH `/guilds/:id` with a typed partial change set (name, icon, verification level, limits, locale, etc.)
  - `Guild.leave()` — DELETE `/users/@me/guilds/:id`
- `Member` (`src/Structures/Member.ts`) — guild member structure with full partial-safe `patch()`; upserts the nested `User` into the top-level user cache on every patch
  - `Member.addRole(id)` / `Member.removeRole(id)` — PUT/DELETE role membership
  - `Member.setRoles(ids)` — bulk role replacement via PATCH
  - `Member.timeoutUntil(date, reason?)` — communication timeout with 28-day guard and optional audit-log reason
  - `Member.kick(reason?)` — DELETE guild member with optional audit-log reason
  - `Member.ban(options)` — PUT guild ban with `deleteMessageSeconds` and optional audit-log reason
  - `Member.setNickname(name)` — PATCH member nickname
- `Message` (`src/Structures/Message.ts`) — full Discord message structure; stores all optional fields with `in` guards; maps `mentions` array through the user cache
  - `Message.reply(content, options?)` — POST with `message_reference` and optional no-ping behavior
  - `Message.delete()` — DELETE `/channels/:id/messages/:id`
  - `Message.update(content)` — PATCH with bot-authorship guard
  - `Message.pin()` / `Message.unpin()` — PUT/DELETE pinned messages
  - `Message.react(emoji)` — PUT reaction; accepts raw Unicode string, `Emoji` instance, or `DiscordEmoji` object; URL-encodes the emoji name automatically
- `CreateMessagePayload(input)` helper — normalises `string | MessagePayload` and validates that the result is non-empty before sending
- `Channel` (`src/Structures/Channel.ts`) — Discord channel structure with partial-safe `patch()`
- `Role` (`src/Structures/Role.ts`) — Discord role structure with partial-safe `patch()`
- `Emoji` (`src/Structures/Emoji.ts`) — Discord emoji structure with partial-safe `patch()`
- `Sticker` (`src/Structures/Sticker.ts`) — Discord sticker structure with partial-safe `patch()`
- `User` (`src/Structures/User.ts`) — Discord user structure; can open DM channels and send messages

#### Caches
- `GuildCache` (`src/Cache/Guilds.ts`) — top-level guild cache extending `GlobalCache`; `upsert()` creates or patches `Guild` instances; `fetch(id)` hits REST and upserts
- `UserCache` (`src/Cache/Users.ts`) — top-level user cache extending `GlobalCache`
- `TTLCache` (`src/Cache/TTLCache.ts`) — internal reusable TTL-backed cache with per-entry expiry, automatic cleanup scheduling, `touch()`, and `remainingTTL()` helpers for upcoming rate-limit and lifecycle features
- `RoleCache` (`src/Cache/Roles.ts`) — guild-scoped role cache with `toSorted()` (position + snowflake-stable sort), `highest()`, `lowest()`, `everyone` getter, and `create(data)` to POST a new role
- `EmojiCache` (`src/Cache/Emojis.ts`) — guild-scoped emoji cache
- `StickerCache` (`src/Cache/Stickers.ts`) — guild-scoped sticker cache
- `ChannelCache` (`src/Cache/Channels.ts`) — guild-scoped channel cache
- `MemberCache` (`src/Cache/Members.ts`) — guild-scoped member cache

#### Gateway event handlers (`src/Events/`)
- `GuildCreate` / `GuildUpdate` / `GuildDelete` — upsert/patch/evict `Guild` from cache
- `ChannelCreate` / `ChannelUpdate` / `ChannelDelete` — upsert/patch/evict `Channel` from the owning guild cache
- `MemberCreate` / `MemberUpdate` / `MemberDelete` — upsert/patch/evict `Member` from the owning guild cache
- `RoleCreate` / `RoleUpdate` / `RoleDelete` — upsert/patch/evict `Role` from the owning guild cache
- `MessageCreate` / `MessageUpdate` / `MessageDelete` — construct `Message` objects and emit typed client events
- `EmojisUpdate` — handles `GUILD_EMOJIS_UPDATE`; diffs the incoming array against the cache to emit synthetic per-emoji `EMOJI_CREATE`, `EMOJI_UPDATE`, and `EMOJI_DELETE` events (Discord only sends the full new list)
- `StickersUpdate` — same diffing approach as emojis for `GUILD_STICKERS_UPDATE`
- `Ready` — waits for all guild IDs listed in the READY payload to arrive as `GUILD_CREATE` events before emitting the client-level `READY` event (prevents partial-cache startup)

#### Builders
- `EmbedBuilder` (`src/Builders/EmbedBuilder.ts`) — implements `ComponentBuilder<Embed>`; fluent API with `from()` seed and `validate()` guard

#### Types
- `DiscordAPITypes` (`src/Types/DiscordAPITypes.ts`) — Discord REST/gateway payload shapes (`DiscordGuild`, `DiscordMember`, `DiscordRole`, `DiscordChannel`, `DiscordEmoji`, `DiscordSticker`, `DiscordUser`, `DiscordApplication`, etc.)
- `MessageComponents` (`src/Types/MessageComponents.ts`) — message payload subtypes (`Embed`, `Attachment`, `Reaction`, `Poll`, `MessageReference`, etc.)
- `DiscordGateway` (`src/Types/DiscordGateway.ts`) — `GatewayOpCodes`, `GatewayIntents`, `GatewayEvents`, and `GatewayPayload<T>` envelope type
- `DiscordOAuth` (`src/Types/DiscordOAuth.ts`) — OAuth2 scope and token type constants
- `SimplyJSTypes` (`src/Types/SimplyJSTypes.ts`) — `ClientEventMap` typed event map used by `Client`; `Status`, `ActivityType`, `ClientActivity`
- `Internal` (`src/Types/Internal.ts`) — `EventHandler<N,D>`, `defineEvent(...)` factory for strongly-typed handler declarations; `MessagePayload`; `JSONPrimitive` / `JSONValue` / `JSONObject` utility types
- `HelperTypes` (`src/Types/HelperTypes.ts`) — `ObjectValues<T>`, `DeepPartial<T>`, `Awaitable<T>` shared utility types

#### Contracts / abstract base classes
- `APIActionableStructure<T>` / `APIClientStructure<T>` / `APIGuildStructure<T>` (`src/Contracts/DiscordStructure.ts`) — base classes for structures that need `client` and/or `guild` access
- `GlobalCache<K,V,API>` / `GuildCache<K,V,API>` (`src/Contracts/CacheStructure.ts`) — abstract typed Maps requiring `upsert(data)` and `fetch(key)` implementations
- `ComponentBuilder<T>` (`src/Contracts/ComponentBuilder.ts`) — builder contract requiring `from(value)` and `validate()` methods

#### Public API
- `src/index.ts` barrel re-exports all builders, caches, events, structures, types, and core runtime modules so consumers can import everything from the package root
- Dual ESM + CJS output via `tsup` (`dist/index.js` / `dist/index.cjs`) with bundled TypeScript declarations

#### Tooling
- `npm run check` — ESLint + `tsc --noEmit` type check
- `npm run build` — lint → typecheck → clean `dist/` → `tsup` (ESM + CJS + `.d.ts`)
- `npm test` — Vitest test suite (`src/Tests/**/*.ts`)
- `npm run lint:fix` — ESLint auto-fix
- Optional `tsgo`-backed alternatives: `npm run check:go` / `npm run build:go`
- Custom ESLint rule `local/require-unref-on-timers` enforces `.unref()` on all `setTimeout` / `setInterval` calls

#### Tests (`src/Tests/`)
- `EmbedBuilder.test.ts` — `EmbedBuilder` construction and validation
- `EventDispatcher.handlers.test.ts` — unhandled event warning, route to built-in handler, event overrides, undefined override fallback, same data reference forwarding, and end-to-end `Client → WSClient → CreateDispatch(eventOverrides)` wiring
- `ExpressionEvents.arguments.test.ts` — event argument shape assertions
- `GatewayEvents.cache-mutations.test.ts` — cache state after each gateway event handler fires
- `Message.payload.test.ts` — `CreateMessagePayload` normalisation and empty-message guard
- `Rest.request.test.ts` — REST method routing and authenticated request construction
- `TTLCache.test.ts` — TTL cache expiry, overwrite rescheduling, `touch()`, infinite lifetime, callback, and validation coverage
- `WSClient.lifecycle.test.ts` — `WSClient` connect, heartbeat, and destroy lifecycle
- `StructureActions.test.ts` — comprehensive regression suite for all structure action methods (50 tests): `Guild.leave()` / `Guild.modify()`, `Channel.send()` / `Channel.delete()` / `Channel.modify()`, `Role.delete()` / `Role.modify()`, `Emoji.delete()` / `Emoji.modify()` with role normalization, `Sticker.delete()` / `Sticker.modify()` with tags normalization, `Member` timeout/kick/ban/role management with audit log headers, `Message` reply/delete/update/pin/react with authorship guards, and `User.send()` DM lazy creation + caching; includes hardcoded API-format body assertions to catch parameter transformations