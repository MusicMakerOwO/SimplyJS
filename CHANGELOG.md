# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Permissions system
- `ChannelPermissionManager` (`src/Managers/ChannelPermissionManager.ts`) — manages and calculates channel-level permission overrides
- `Resolver` (`src/Permissions/Resolver.ts`) — calculates effective member permissions at both guild and channel levels with inheritance and override support
- Comprehensive permission resolver tests covering all permission combinations and inheritance scenarios

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

### Changed

- Renamed `src/Cache/` directory to `src/Managers/` to better describe their role as cache managers with fetch/upsert operations
- **BREAKING**: `Channel` structure split into individual type-specific classes (`GuildTextChannel`, `GuildVoiceChannel`, etc.). Code importing or type-checking `Channel` must update to use the appropriate subclass type

## [1.0.0-alpha]

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
- `SimplicityTypes` (`src/Types/SimplicityTypes.ts`) — `ClientEventMap` typed event map used by `Client`; `Status`, `ActivityType`, `ClientActivity`
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

### Changed