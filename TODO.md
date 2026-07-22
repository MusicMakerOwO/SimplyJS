# TODO

## Active backlog

- [ ] Harden gateway reconnect/session handling in `src/WSClient.ts`
  - Handle `GatewayOpCodes.Reconnect` and `GatewayOpCodes.InvalidSession` with resume/identify flow
  - Track and reuse `session_id` / `resume_gateway_url` from READY
  - Track and clear heartbeat timers on close/destroy
  - Emit/handle heartbeat ACK state and add ACK timeout detection
- [ ] Add reconnect policy controls in `src/Client.ts` + `src/WSClient.ts`
  - Include close-code aware backoff, max retries, and clear terminal failure state
- [ ] Add more examples
  - Sending a direct message to a user
  - Sending a message in a guild channel
  - Replying to a message, with and without pinging the author
  - Building and sending an embed with `EmbedBuilder`
  - Reacting to a message and demonstrating emoji handling
  - Fetching guilds, users, channels, and members from caches
  - Basic moderation example using member actions (`timeout`, `kick`, `ban`)
  - Role management example: create, modify, and inspect role order
  - Event logging example that prints a few common gateway events
- [ ] Add release automation + quality gates
  - Automate changelog/version consistency checks before publish

## Tests to add

- [ ] `src/Tests/WSClient.test.ts`
  - reconnect opcode flow
  - invalid session resume-vs-identify branching
  - heartbeat ACK timeout + timer cleanup on close/destroy
  - session_id and resume_gateway_url tracking
- [ ] `src/Tests/Rest.test.ts`
  - 429 retry using JSON body `retry_after`
  - 429 retry using rate-limit headers
  - transient 5xx retry policy and terminal failure behavior
- [ ] `src/Tests/CacheOperations.test.ts`
  - Guild cache upsert/fetch/update
  - User cache upsert/fetch/update
  - Guild-scoped cache interactions (Channels, Roles, Members, Stickers, Emojis)
- [x] Test ReactionAdd and ReactionRemove event handlers

## Further planning

- [ ] Continue gateway parity pass for remaining high-value dispatch events
  - Current gaps: VoiceStateUpdate, PresenceUpdate, TypingStart, MessageReactionAdd/Remove, GuildMemberAdd, scheduled events, threads, integrations, webhooks, invites, and many others
- [ ] Add component and interaction payload support
  - Define interaction structures in `src/Structures/` (InteractionMessage, InteractionCommandOption, etc.)
  - Add `ButtonBuilder`, `SelectMenuBuilder`, `ModalBuilder` in `src/Builders/`
  - Update `src/Types/MessageComponents.ts` to structured types for interactions instead of JSONObject
- [ ] Model application team types in `src/Types/DiscordAPITypes.ts`
  - Replace the current `team?: Record<string, JSONObject>[]` placeholder with typed team and team-member models
  - Thread the new types through any application metadata consumers once they exist
- [ ] Interaction collectors (buttons, select menus, modals)
- [ ] Slash command builder and all the options
- [ ] `client.registerCommands(...)`
- [ ] Create a mixin system for channel class inheritance

## JSDoc documentation

Structures — add JSDoc to all public methods in `src/Structures/`:
- [x] `Guild.ts`: `leave()`, `modify()`
- [x] `Channel.ts`: `send()`, `delete()`, `modify()`
- [x] `Member.ts`: `addRole()`, `removeRole()`, `setRoles()`, `timeoutUntil()`, `kick()`, `ban()`, `setNickname()`
- [x] `Role.ts`: `delete()`, `modify()`
- [x] `Emoji.ts`: `delete()`, `modify()`
- [x] `Sticker.ts`: `delete()`, `modify()`
- [x] `Message.ts`: `reply()`, `delete()`, `update()`, `pin()`, `unpin()`, `react()`
- [x] `User.ts`: `send()`

Caches — add JSDoc to public methods in `src/Cache/`:
- [x] `Roles.ts`: `create()`, `toSorted()`, `highest()`, `lowest()`, `everyone` getter

Core runtime — add JSDoc to public exports in `src/`:
- [x] `Client.ts`: class docs, `login()`, `destroy()`, `setStatus()`, `setStatusMessage()`
- [x] `WSClient.ts`: class docs, main public methods
- [x] `Rest.ts`: class docs, `get()`, `post()`, `patch()`, `delete()`, `put()`
- [x] `EventDispatcher.ts`: `CreateDispatch()` function docs
- [x] `Intents.ts`: `ResolveIntents()`, `HasIntent()` function docs

Builders — add JSDoc to methods in `src/Builders/`:
- [x] `EmbedBuilder.ts`: all setter methods, `from()`, `validate()`

Contracts — add JSDoc to public abstract classes in `src/Contracts/`:
- [x] `DiscordStructure.ts`: `APIActionableStructure`, `APIClientStructure`, `APIGuildStructure`
- [x] `CacheStructure.ts`: `GlobalCache`, `GuildCache` abstract methods

## Completed (verified in current codebase)

- [x] Implement `src/Cache/TTLCache.ts`
  - Added a reusable internal TTL cache with per-entry expiry, cleanup scheduling, `touch()`, and remaining-lifetime helpers
  - Added focused coverage in `src/Tests/TTLCache.test.ts`
- [x] Add functions to change client status and status messages
- [x] Add `guild.roles.create()` for easy role creation
- [x] Add events for `EMOJI_CREATE`, `EMOJI_UPDATE`, and `EMOJI_DELETE`
  - Discord unfortunately only emits EMOJI_UPDATE as just one giant array of new emojis
  - I want to take it upon myself to filter out this list and emit events for each change, hence the `CREATE` and `DELETE`
- [x] Add events for `STICKER_CREATE`, `STICKER_UPDATE`, and `STICKER_DELETE`
  - Same issue as above for emojis
- [x] Add API methods for modify a guild
  - Only updating name, icon, and basic settings for now
- [x] Add API methods for members
  - Including features like `timeout()` and `setRoles()`
- [x] Add API methods for message objects, stuff like `pin()`, `unpin()`, and `react()`
- [x] Export the public API from `src/index.ts`
  - Re-export `Client`, intent/constants, commonly used structures/builders, and relevant types so consumers can import from package root
- [x] Dispatch function needs to be created at runtime instead of compile timeout
  - Exports a singleton instance currently
  - Might lead to bugs if an event relies on a state
- [x] Add a test suite for converting message payloads and sending
- [x] Ready event should wait for all guilds to arrive before emitting
  - A `debounce()` would be easiest but would fail if a large guild comes through (think hundreds of members, channels, roles, and overwrites)
  - The READY event emits a list of guild IDs so maybe I could just sit and wait for all of those to arrive before emitting
  - But what if a guild *truly is* unavailable? Then I would just be waiting forever? Or maybe Discord would still emit a GUILD_CREATE but just repeat that it is unavailable?
- [x] Wire `ClientOptions.ws` through `src/Client.ts` into `src/WSClient.ts`
  - `Client` passes through `jitter_override` and `eventOverrides`
  - `WSClient` now forwards `eventOverrides` into `CreateDispatch(...)`
- [x] Add coverage for client-level event override wiring in `src/Tests/EventDispatcher.handlers.test.ts`
  - verifies `Client` -> `WSClient` -> `CreateDispatch(eventOverrides)` path
  - asserts override is used and built-in READY side effects are bypassed
- [x] Implement structure action methods that were previously stubs
  - `src/Structures/Role.ts`: `delete()` / `modify()`
  - `src/Structures/Emoji.ts`: `delete()` / `modify()`
  - `src/Structures/Sticker.ts`: `delete()` / `modify()`
  - `src/Structures/Channel.ts`: `modify()`
- [x] Expand gateway event parity in `src/Events/` + `src/Events/index.ts`
	- Add handlers for more gateway dispatch events already modeled in `src/Types/DiscordGateway.ts`
- [x] Add tests for user DM send flow in `src/Structures/User.ts`
	- Validate DM channel lazy creation/caching
	- Validate return type behavior matches `Promise<Message>`
- [x] Fix `User.send()` return type wrapping in `src/Structures/User.ts`
	- Now returns `new Message(client, response)` instead of raw REST response
	- Tests already validate flow in `src/Tests/StructureActions.test.ts` (50 tests, all passing)
- [x] `src/Tests/StructureActions.test.ts` — 50 tests, all passing
	- `Channel`: `send()`, `delete()`, `modify()`, empty-message guard
	- `Role`: `delete()`, `modify()` with color/colors variants
	- `Emoji`: `delete()`, `modify()` with string roles, object roles, and mixed array
	- `Sticker`: `delete()`, `modify()` full and partial
	- `Member`: all 7 action methods, 28-day timeout guard, audit-log reason headers
	- `Message`: all 6 action methods, authorship guard, ping suppression, react overloads
	- `Guild`: `leave()`, `modify()`
	- `User.send()`: DM channel creation on first send, channel reuse on subsequent sends
- [x] `src/Tests/EventDispatcher.handlers.test.ts` (expand existing)
	- Added tests for event handler lifecycle behavior (register, invoke, override, and per-dispatch isolation)
	- Added cross-check coverage for event → intent mapping via `EventRequiredIntent`
- [x] Expand gateway event parity in `src/Events/` + `src/Events/index.ts`
	- Added handlers for more dispatch events defined in `src/Types/DiscordGateway.ts`
	- Baseline parity work for modeled events is now in place
- [x] Build a full structure action regression suite in `src/Tests/StructureActions.test.ts`
	- Shared mocked `client.rest` harness, route/body assertions for all structure action methods
	- Return-shape checks (`Promise<void>`, `Promise<Message>`, `instanceof Message`)
	- Guard/throw checks (`update()` authorship, `timeoutUntil()` 28-day limit, empty message)
	- Compile-time compat guard for `Emoji.modify()` mixed roles via `// @ts-expect-error`
- [x] Add Discord rate-limit handling in `src/Rest.ts`
	- Respect `429` response fields/headers (`retry_after`, global, bucket headers)
	- Retry safely for transient failures and surface non-retryable failures clearly
- [x] Abstract permission serialization into a dedicated util function for better testing and easy reuse
- [x] Add events for `REACTION_ADD` and `REACTION_REMOVE`
- [x] Complete role-management follow-ups in `src/Cache/Roles.ts`
	- Add permission-resolvable input type for `create(...)`
	- Add role position move API
- [x] Create a manager class for `Channel.permission_overwrites`