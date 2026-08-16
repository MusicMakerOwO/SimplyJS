# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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