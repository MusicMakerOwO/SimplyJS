# TODO

## Pre-beta blockers

Everything here adds *new public surface*. Landing it after the beta tag means either a semver
break or living with the gap for a full major cycle, so it goes in first.

- [ ] Multipart / file upload support in `src/Rest.ts`
  - `#execute` hardcodes `Content-Type: application/json` and `body: JSON.stringify(data)`, so there is no code path that can send a file
  - Blocks: message attachments, emoji/sticker/soundboard uploads from a file (`modify()` currently only accepts a pre-encoded data URI), guild icon/banner uploads, and the `attachment://` references that `FileComponent` and `MediaGallery` require
  - Needs a `files` field on `MessagePayload` and a `payload_json` + `FormData` branch when files are present
- [ ] Message fetching
  - There is no `GET /channels/{id}/messages` or `GET /channels/{id}/messages/{id}` anywhere; no `channel.messages` manager exists
  - Send, edit, delete, pin, and react all work, but a message cannot be read back by ID and history cannot be paged
  - Wants a message manager mirroring the other caches, with `fetch(id)` and a list form taking `before`/`after`/`around`/`limit`
- [ ] Member list fetching + `REQUEST_GUILD_MEMBERS`
  - `Members.fetch()` only does single-member GETs; there is no `GET /guilds/{id}/members` list and no member search
  - `GatewayOpCodes.RequestGuildMembers` (op 8) is defined but never sent, and `GUILD_MEMBERS_CHUNK` is not modeled in `GatewayEvents` or handled
  - Without both, a guild's member cache can never be populated
- [ ] Sharding
  - `#handleHello` sends `Identify` with no `shard` array and there is no shard manager, so the library hard-stops at the ~2500 guild boundary
  - `GatewayCloseCodes.ShardingRequired` is correctly treated as fatal, which makes the ceiling a clean failure rather than a silent one - but it is still a ceiling
  - Likely reshapes `Client` / `WSClient` construction, which is exactly why it belongs before the API freezes

## Active backlog

### Components v2

All component types are already modeled in `src/Types/Components.ts` and the message flag exists as
`MessageFlags.IS_COMPONENTS_V2`. What is missing is the builder + send plumbing. `LabelBuilder`
(type 18, modal-only) is already written and exported, so it is not listed below.

Each builder follows the existing house pattern - a class implementing its own payload type, with
`from()`, chainable setters, and a `validate()` that throws on Discord's constraints.

#### Builders

- [ ] `TextDisplayBuilder` - `TEXT_DISPLAY` (10)
  - Single `content` field, supports markdown/mentions/emoji
  - `content` counts toward the message's 4000-character v2 budget
  - Worth doing first: `Section` and `Container` both take these as children, so the others can be tested against it
- [ ] `ThumbnailBuilder` - `THUMBNAIL` (11)
  - `media` (`UnfurledMediaItem`), optional `description` (max 1024) and `spoiler`
  - Only valid as a `Section` accessory - `validate()` cannot catch misuse on its own, so the check belongs in `SectionBuilder`
  - Image, gif, and animated webp media only
- [ ] `SectionBuilder` - `SECTION` (9)
  - `components` must be 1-3 `TextDisplay`s, and `accessory` is required (a `Button` or `Thumbnail`)
  - Both bounds and the required accessory are `validate()` cases
- [ ] `MediaGalleryBuilder` - `MEDIA_GALLERY` (12)
  - `items` must be 1-10 `MediaGalleryItem`s, each with `media` plus optional `description` (max 1024) and `spoiler`
  - Wants an `addItem()` / `addItems()` pair rather than only a bulk setter
- [ ] `FileBuilder` - `FILE` (13)
  - `file` (`UnfurledMediaItem`) plus optional `spoiler`
  - `name` and `size` are response-only - Discord populates them, so they should not be settable
  - Blocked in practice by multipart upload; only accepts `attachment://<filename>` references
- [ ] `SeparatorBuilder` - `SEPARATOR` (14)
  - Optional `divider` (defaults true) and `spacing` (`SeparatorSpacingSizes`, defaults `SMALL`)
  - No required fields, so this is the cheapest one to land
- [ ] `ContainerBuilder` - `CONTAINER` (17)
  - `components` accepts `ActionRow`, `TextDisplay`, `Section`, `MediaGallery`, `FileComponent`, `Separator` - but not another `Container`
  - Optional `accent_color` (nullable) and `spoiler`
  - Do this last; it is the only nesting component and is easiest to test once the children exist

#### Plumbing

- [ ] Export the new builders from `src/Builders/index.ts`
- [ ] Set `IS_COMPONENTS_V2` on the send path when a payload contains v2 components
- [ ] Reject the v1/v2 mixing cases Discord rejects (`content`/`embeds` alongside v2 components)
- [ ] Enforce the message-wide v2 limits (40 components total, 4000 characters across all `TextDisplay`s)
- Note: `FileComponent` and `MediaGallery` only accept `attachment://` references, so both stay
  half-usable until multipart upload lands

### Voice Chat

Deferred to a later update - `VOICE_STATE_UPDATE`, `VOICE_CHANNEL_EFFECT_SEND`,
`VOICE_CHANNEL_STATUS_UPDATE`, `VOICE_CHANNEL_START_TIME_UPDATE`, the stage instance events, and
the `/stage-instances` REST resource all ride along with this.

### Missing REST resources

Whole resource categories with no coverage, roughly in order of how often a bot author would reach
for them.

- [ ] Webhooks
  - `WEBHOOKS_UPDATE` is handled and `src/Rest.ts` already buckets webhook routes, but there is no `Webhook` structure or manager - no create, edit, delete, or execute
  - The only `/webhooks/` routes in use are interaction followups
- [ ] Thread creation
  - Every thread *event* is handled and cached, but `POST /channels/{id}/threads`, `POST /channels/{id}/messages/{id}/threads`, and the archived-thread listing endpoints are all absent
- [ ] Application resource
  - `/applications/@me`, application-owned emojis, role connection metadata
- [ ] Monetization
  - Entitlements, SKUs, and subscriptions - no REST and no events
  - `BaseInteraction.entitlements` is still typed `JSONObject[]`, and `SKUButtonBuilder` can produce a purchase button whose result the library cannot observe
- [ ] Poll endpoints
  - `Message.poll` is read-only; no answer-voters fetch and no expire endpoint
- [ ] Guild extras
  - Onboarding, welcome screen, templates, widget, prune, vanity URL, MFA level, guild preview, `/sticker-packs`
- [ ] Announcement channel follow (`POST /channels/{id}/followers`)
- [ ] Application command permission endpoints

### Quality of Life
- [ ] Add release automation + quality gates
  - Automate changelog/version consistency checks before publish

## Tests to add

- [ ] `src/Tests/WSClient.test.ts`
  - reconnect opcode flow
  - invalid session resume-vs-identify branching
  - heartbeat ACK timeout + timer cleanup on close/destroy
  - session_id and resume_gateway_url tracking
- [ ] `src/Tests/CacheOperations.test.ts`
  - Guild cache upsert/fetch/update
  - User cache upsert/fetch/update
  - Guild-scoped cache interactions (Channels, Roles, Members, Stickers, Emojis)

## Further planning

- [ ] Continue gateway parity pass for remaining high-value dispatch events
  - Voice, stage instance, and voice channel effect events are deliberately deferred with the Voice Chat work
  - The non-voice gaps are the `❌ not modeled` rows in the status table below - `USER_UPDATE` and `GUILD_MEMBERS_CHUNK` are the two that affect ordinary bots
- [ ] Give the remaining `*Update` handlers a real "old" value
  - `MemberUpdate`, `GuildUpdate`, `ChannelUpdate`, `RoleUpdate`, `GuildScheduledEventUpdate`, and `AutoModerationRuleUpdate` all call `cache.get()` then `cache.upsert()`; since `upsert` patches the existing instance in place, the `old` and `new` arguments they emit are the *same, already-mutated* object, so listeners cannot diff them
  - `PresenceUpdate` solves this with `Presence.clone()` (`src/Structures/Presence.ts`); the same treatment needs a `clone()` on each of the other structures
- [ ] Seed the active thread list from `GUILD_CREATE`
  - Discord sends a `threads` array (every active thread the bot can see) in `GUILD_CREATE`, but `DiscordGuildCreate` (`src/Types/DiscordAPITypes.ts`) doesn't model it and `Guild.patch` doesn't read it, so `guild.channels` has no threads until a `THREAD_CREATE` or `THREAD_LIST_SYNC` arrives
  - The same payload's thread `member` blobs would seed `thread.members` for the current user at the same time
- [ ] Harden `User.patch` against partial user payloads
  - `src/Structures/User.ts` assigns `id`/`username`/`discriminator`/`global_name`/`avatar` unconditionally, so upserting a partial user (as `PRESENCE_UPDATE` sends) blanks those fields on an already-cached user. `PresenceUpdate` guards at the call site; guarding in `patch` would cover every future partial-user payload
  - Tradeoff: it weakens the "always set" invariant implied by the `!` definite-assignment markers on those fields
- [ ] Model application team types in `src/Types/DiscordAPITypes.ts`
  - Replace the current `team?: Record<string, JSONObject>[]` placeholder with typed team and team-member models
  - Thread the new types through any application metadata consumers once they exist

## Discord gateway event implementation status

This table previously listed only events already present in `GatewayEvents`, which made anything
*not* modeled invisible. The rows below now include events missing from `src/Types/DiscordGateway.ts`
entirely, so the gaps are visible rather than implied.

Legend:
- ✅ handler implemented and exported from `src/Events/index.ts`
- ❌ modeled in `GatewayEvents`, no handler yet
- ⬜ not modeled at all - the type does not exist in `src/Types/DiscordGateway.ts`

| Discord event                          | Implemented |
|----------------------------------------|-------------|
| READY                                  | ✅           |
| RESUMED                                | ❌ [^3]      |
| USER_UPDATE                            | ⬜ [^1]      |
| GUILD_MEMBERS_CHUNK                    | ⬜ [^2]      |
| ENTITLEMENT_CREATE                     | ⬜           |
| ENTITLEMENT_UPDATE                     | ⬜           |
| ENTITLEMENT_DELETE                     | ⬜           |
| SUBSCRIPTION_CREATE                    | ⬜           |
| SUBSCRIPTION_UPDATE                    | ⬜           |
| SUBSCRIPTION_DELETE                    | ⬜           |
| APPLICATION_COMMAND_PERMISSIONS_UPDATE | ⬜           |
| GUILD_CREATE                           | ✅           |
| GUILD_UPDATE                           | ✅           |
| GUILD_DELETE                           | ✅           |
| GUILD_ROLE_CREATE                      | ✅           |
| GUILD_ROLE_UPDATE                      | ✅           |
| GUILD_ROLE_DELETE                      | ✅           |
| CHANNEL_CREATE                         | ✅           |
| CHANNEL_UPDATE                         | ✅           |
| CHANNEL_DELETE                         | ✅           |
| CHANNEL_PINS_UPDATE                    | ✅           |
| THREAD_CREATE                          | ✅           |
| THREAD_UPDATE                          | ✅           |
| THREAD_DELETE                          | ✅           |
| THREAD_LIST_SYNC                       | ✅           |
| THREAD_MEMBER_UPDATE                   | ✅           |
| THREAD_MEMBERS_UPDATE                  | ✅           |
| STAGE_INSTANCE_CREATE                  | ❌           |
| STAGE_INSTANCE_UPDATE                  | ❌           |
| STAGE_INSTANCE_DELETE                  | ❌           |
| VOICE_CHANNEL_STATUS_UPDATE            | ❌           |
| VOICE_CHANNEL_START_TIME_UPDATE        | ❌           |
| GUILD_MEMBER_ADD                       | ✅           |
| GUILD_MEMBER_UPDATE                    | ✅           |
| GUILD_MEMBER_REMOVE                    | ✅           |
| GUILD_AUDIT_LOG_ENTRY_CREATE           | ✅           |
| GUILD_BAN_ADD                          | ✅           |
| GUILD_BAN_REMOVE                       | ✅           |
| GUILD_EMOJIS_UPDATE                    | ✅           |
| GUILD_STICKERS_UPDATE                  | ✅           |
| GUILD_SOUNDBOARD_SOUND_CREATE          | ✅           |
| GUILD_SOUNDBOARD_SOUND_UPDATE          | ✅           |
| GUILD_SOUNDBOARD_SOUND_DELETE          | ✅           |
| GUILD_SOUNDBOARD_SOUNDS_UPDATE         | ✅           |
| GUILD_INTEGRATIONS_UPDATE              | ✅           |
| INTEGRATION_CREATE                     | ✅           |
| INTEGRATION_UPDATE                     | ✅           |
| INTEGRATION_DELETE                     | ✅           |
| WEBHOOKS_UPDATE                        | ✅           |
| INVITE_CREATE                          | ✅           |
| INVITE_DELETE                          | ✅           |
| VOICE_CHANNEL_EFFECT_SEND              | ❌           |
| VOICE_STATE_UPDATE                     | ❌           |
| PRESENCE_UPDATE                        | ✅           |
| MESSAGE_CREATE                         | ✅           |
| MESSAGE_UPDATE                         | ✅           |
| MESSAGE_DELETE                         | ✅           |
| MESSAGE_DELETE_BULK                    | ✅           |
| MESSAGE_REACTION_ADD                   | ✅           |
| MESSAGE_REACTION_REMOVE                | ✅           |
| MESSAGE_REACTION_REMOVE_ALL            | ✅           |
| MESSAGE_REACTION_REMOVE_EMOJI          | ✅           |
| TYPING_START                           | ✅           |
| GUILD_SCHEDULED_EVENT_CREATE           | ✅           |
| GUILD_SCHEDULED_EVENT_UPDATE           | ✅           |
| GUILD_SCHEDULED_EVENT_DELETE           | ✅           |
| GUILD_SCHEDULED_EVENT_USER_ADD         | ✅           |
| GUILD_SCHEDULED_EVENT_USER_REMOVE      | ✅           |
| AUTO_MODERATION_RULE_CREATE            | ✅           |
| AUTO_MODERATION_RULE_UPDATE            | ✅           |
| AUTO_MODERATION_RULE_DELETE            | ✅           |
| AUTO_MODERATION_ACTION_EXECUTION       | ✅           |
| MESSAGE_POLL_VOTE_ADD                  | ✅           |
| MESSAGE_POLL_VOTE_REMOVE               | ✅           |
| INTERACTION_CREATE                     | ✅           |

[^1]: The client's own user goes stale after an app edit, since nothing refreshes `client.user`.

[^2]: See the member fetching entry under "Pre-beta blockers" - the chunk event and the op 8 request that triggers it have to land together.

[^3]: Present in `GatewayEvents` but no handler is exported from `src/Events/index.ts`.

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

### Permissions
- [x] Finish incorporating `src/Permissions/Resolver.ts`
	- [x] `Member.hasPermission(permission): boolean`
	- [x] `Member.permissions(): BitField<Permissions>`
	- [x] `Member.hasPermissionsIn(channel): boolean`
	- [x] `Member.permissionsIn(channel): BitField<Permissions>`
	- Should permission functions be included on guilds and channels too?


### Moderation
- [x] Implement more ban controls
	- [x] Guild ban manager
		- `Guild.bans.add(userID, reason?)`
			- [x] Update `Member.ban(reason?)` to call this new function
		- `Guild.bans.remove(userID, auditLogReason?)`
		- `Guild.bans.fetch(userID)`
	- [x] `GUILD_BAN_ADD` and `GUILD_BAN_REMOVE` events handler
- [x] Add `GUILD_AUDIT_LOG_ENTRY_CREATE` event, named `AuditLogEntryCreate`
- [x] `Guild.fetchAuditLogs()`, unknown args
- [x] `MESSAGE_DELETE_BULK` event
- [x] `Channel.bulkDeleteMessages(messages, reason?)` — accepts `Message[]` or ID strings
- [x] `Channel.deleteMessage(message, reason?)`
- Invites
	- [x] Create an `Invite` class (https://docs.discord.com/developers/resources/invite#invite-object)
	- [x] `INVITE_CREATE` + `INVITE_DELETE` event handler
	- [x] Create GuildInviteManager
		- `Guild.invites.create(channel, options?)`
			- https://docs.discord.com/developers/resources/channel#create-channel-invite
		- `Guild.invites.delete(inviteCode, reason?)`
		- `Guild.invites.fetch(inviteCode?)`
			- Return all invites if no code provided
			- Additional data is returned if bot has `MANAGE_GUILD` permission
			- https://docs.discord.com/developers/resources/invite#invite-metadata-object

## Interactions
- [x] Interaction collectors (buttons, select menus, modals)
- [x] Slash command builder and all the options
- [x] `client.registerCommands(...)`
- [x] Create a mixin system for channel class inheritance
- [x] Start planning mixins for interactions
- [x] Add component and interaction payload support
	- Define interaction structures in `src/Structures/` (InteractionMessage, InteractionCommandOption, etc.)
	- Add `ButtonBuilder`, `SelectMenuBuilder`, `ModalBuilder` in `src/Builders/`
	- Update `src/Types/MessageComponents.ts` to structured types for interactions instead of JSONObject
- [x] Add interadtion options for slash commands (ie `Interaction.options.getUser(name)`)
- [x] Add collectors, name pending
  - Temporary filtered event listeners that await matching events over a time period and auto-cleanup
  - Useful for interactions like "wait for the next message from this user"
  - `createCollector()` / `awaitEvent()` in `src/Collector.ts`, with `Client`/`WSClient` overloads for argument inference
- [x] Add examples showcasing interactions
  - [x] Creating/Registering commands
  - [x] Responding to commands
  - [x] Responding to other components (buttons, select menus, modals)
  - [x] Using an interaction handler
  - [x] Introduce the idea of button args
    - split `interaction.customId` on `_`
    - Allows for state management on buttons themselves, without collectors
  - [x] Introduce collectors
     - BE SURE TO WARN THAT COLLECTORS DO NOT PERSIST AFTER RESTART. This is the #1 trouble point for beginners, they assume the button will always exist. This is the point of handlers and button args, they are permanant due to attached to the button directly
     - Pagination is a great example
     - `examples/14-collectors` covers this