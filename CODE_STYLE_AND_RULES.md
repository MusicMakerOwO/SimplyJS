# Code Style and Rules

This document is a practical guide for working in `Simplicity2`. It focuses on the style and structure already used in the repository, so new code fits the existing runtime, type system, and event flow.

## 1) Core principles

- Prefer **small, explicit modules** over large abstractions.
- Keep **Discord protocol details centralized** in the `src/Types/` files.
- Use **typed contracts** for reusable behavior (`src/Contracts/`).
- Favor **cache-backed runtime objects** for Discord entities (`src/Structures/` + `src/Cache/`).
- Keep public exports flowing through `src/index.ts`.

Example of the current public barrel:

```ts
export * from "./Builders/index.js";
export * from "./Cache/index.js";
export * from "./Events/index.js";
export * from "./Structures/index.js";
export * from "./Types/index.js";
```

## 2) Module and import style

### Use ESM imports with `.js` suffixes in TypeScript

The project compiles to dual-format output, but source files import local modules using explicit `.js` endings.

```ts
import { Rest } from "./Rest.js";
import { WSClient } from "./WSClient.js";
import { GatewayIntents } from "./Types/DiscordGateway.js";
```

### Prefer `node:` imports for built-ins

This is enforced by lint rules.

```ts
import { EventEmitter } from "node:events";
```

### Group imports by responsibility

A common pattern is:

1. framework/runtime imports
2. local type imports
3. local runtime classes

For example, `src/Client.ts` imports the websocket client, REST client, intent resolver, and caches as separate concerns.

## 3) TypeScript conventions

### Use `as const` for protocol maps

Constants that represent Discord protocol values are defined as objects instead of `enum`s.

```ts
export const GatewayOpCodes = {
	Dispatch: 0,
	Heartbeat: 1,
	Identify: 2,
} as const;
```

### Derive unions from maps with `ObjectValues`

This keeps runtime values and type unions synchronized.

```ts
export type GatewayEventName = ObjectValues<typeof GatewayEvents>;
```

### Keep shared utility types tiny and reusable

The repo already centralizes helpers like `Awaitable`, `DeepPartial`, and `ObjectValues` in `src/Types/HelperTypes.ts`.

### Prefer exact object shapes for payload helpers

`src/Types/Internal.ts` defines `JSONObject`, `JSONValue`, and `MessagePayload` so request and event signatures stay explicit.

## 4) Runtime architecture rules

### Client bootstraps auth, gateway, and caches

`src/Client.ts` is the main entry point. It wires the token into both `Rest` and `WSClient`, resolves intents, and creates top-level caches.

```ts
this.socket = new WSClient(this, {
	intents: ResolveIntents(options.intents),
});
this.rest = new Rest();

this.socket.setToken(options.token);
this.rest.setToken(options.token);
```

### Keep REST concerns in `src/Rest.ts`

REST calls are handled through a small authenticated request layer. Cache `fetch()` methods should call this client rather than duplicating `fetch()` logic elsewhere.

```ts
const fetched = await this.client.rest.get<DiscordGuild>(`/guilds/${id}`);
return this.upsert(fetched);
```

### Keep gateway behavior in `src/WSClient.ts`

`WSClient` owns the handshake, heartbeat scheduling, dispatching, and disconnect lifecycle. The dispatch path is:

`message` → parse payload → `CreateDispatch()` result → event handler

## 5) Gateway and event rules

### Centralize gateway constants in `src/Types/DiscordGateway.ts`

The codebase keeps opcodes, intents, and event names in one place, with comments describing the relevant Discord behavior and required intents.

This is the canonical pattern for new gateway constants:

```ts
export const GatewayEvents = {
	GuildCreate: "GUILD_CREATE",
	MessageCreate: "MESSAGE_CREATE",
} as const;
```

### Add new gateway handlers in `src/Events/`

Each handler is a named `const` exported through `defineEvent(...)`.

```ts
export const GuildCreate = defineEvent({
	name: GatewayEvents.GuildCreate,
	handler: (client, data: DiscordGuild): void => {
		const guild = client.guilds.upsert(data);
		client.emit(ClientEvents.GuildCreate, guild);
	}
});
```

### Export new handlers from `src/Events/index.ts`

`src/EventDispatcher.ts` builds its handler map from that barrel. If a new event file is created, it must be exported there or the dispatcher will never see it.

### Keep event names and required intents documented

The comments in `src/Types/DiscordGateway.ts` are part of the source of truth. When adding a dispatch event, document:

- what it represents
- what intent is required
- whether it applies to guilds, DMs, or both

## 6) Cache and structure rules

### Use `GlobalCache` for top-level client caches

Top-level collections such as `Client.guilds` and `Client.users` extend `GlobalCache`.

```ts
export class GuildCache extends GlobalCache<string, Guild, DiscordGuild> {
	upsert(data: DiscordGuild): Guild {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Guild(this.client, data));
		}
		return this.get(data.id)!;
	}
}
```

### Use `GuildCache` for guild-scoped collections

Guild-owned caches should live on the owning structure, such as `Guild.channels`, `Guild.roles`, `Guild.members`, and similar collections.

### Structures should patch themselves from API data

`src/Structures/Guild.ts` and `src/Structures/Message.ts` follow the same pattern: constructors call `patch(data)`, and `patch` updates fields in place.

When a field may be missing in a partial update, guard it explicitly:

```ts
if ("icon" in data && data.icon !== undefined) this.icon = data.icon;
if ("banner" in data && data.banner !== undefined) this.banner = data.banner;
```

This preserves prior state when Discord omits unchanged values.

### Keep cache mutation loops explicit

Use `for...of` loops instead of `forEach` so mutation flow stays readable and works well with lint rules.

```ts
for (const apiChannel of data.channels) {
	this.channels.upsert(apiChannel);
}
```

### Getters must stay within owned data

A getter is acceptable when its cost is proportional to what the object already owns. If computing the value requires touching a sibling collection, a parent manager, or anything the object does not directly hold, it must be a method instead.

Use a getter for direct or trivial derivations owned by the class:

```ts
get joinedAt(): Date {
	return new Date(this.joined_at);
}
```

Use a method when the calculation depends on external state, sibling collections, or mutable cross-entity resolution:

```ts
hasPermission(flag: number): boolean {
	// resolves roles, channel overwrites, and inherited state
	return this.client.permissions.resolveMemberPermission(this, flag);
}
```

Examples of acceptable and unacceptable getter behavior:

- `guild.roles.highest` is acceptable because the manager owns the collection and `O(n)` over that owned collection is expected.
- `member.joinedAt` is acceptable because the member owns its raw timestamp and converting it to a `Date` is trivial.
- `role.position` is NOT acceptable because it would need to inspect sibling roles; that belongs on the manager, for example `guild.roles.positionOf(role)`.
- `member.permissions` is NOT acceptable because it depends on role resolution and mutable cross-entity state; use a method such as `member.hasPermission(flag)` or `member.permissionsIn(channel)`.

### Smart / self-overwriting getters

Smart (self-overwriting) getters are permitted but only when the computed value is:

- Expensive enough that caching it per-instance is beneficial (CPU, allocations, or repeated lookups).
- Stable for the expected lifetime of the instance — The value must not change (note pointers bypass this)

If you use this pattern:

- Implement it by computing the value once and replacing the instance getter with a concrete property using `Object.defineProperty(this, "name", { value })`.
- Document the behavior in a short JSDoc comment on the getter so callers know the value is cached and will not update when underlying caches change.
- Prefer a method instead when the value depends on mutable external state, sibling collections, or should always return the latest view.

Example (acceptable use):

```ts
get guild(): Guild | null {
  const value = this.client.guilds.get(this.guild_id!) ?? null;
  Object.defineProperty(this, 'guild', {
	value: value
  });
  return value;
}
```

## 7) Builder rules

### Builders implement `ComponentBuilder<T>`

Builders are used for validation and conversion of API-ready payloads. `src/Builders/EmbedBuilder.ts` is the current example.

A builder should provide:

- `from(value)` to hydrate from an existing payload
- `validate()` to enforce all builder invariants

### Validate as close to mutation as possible

`EmbedBuilder` validates lengths when setters are called, then validates the final object again in `validate()`.

```ts
setTitle(value: string): this {
	EmbedBuilder.assertMaxLength("Title", value, 256);
	this.title = value;
	return this;
}
```

### Keep builder error messages specific

Prefer messages that tell the caller what exceeded which limit, as seen in the embed builder’s length checks.

## 8) Async and timer rules

### Always await or intentionally void promises

`@typescript-eslint/no-floating-promises` is enforced. If a promise is intentionally fire-and-forget, make that obvious with `void`.

`src/EventDispatcher.ts` uses this pattern when invoking handlers:

```ts
void events.get(event)!.handler(client, data);
```

### Unref timers immediately

Timers must not keep the process alive. The repo has a custom lint rule that requires direct `.unref()` chaining.

```ts
setInterval(() => {
	// heartbeat
}, this.heartbeat_interval * this.jitter).unref();
```

### Never use `process.exit()`

The client instance should never kill the process, only destroy its instance.

## 9) Comments and documentation

### Keep comments close to the exported type or behavior

This repository treats docs as part of the source of truth, especially in protocol-heavy files like `src/Types/DiscordGateway.ts`.

### Use comments for intent, not restating code

Good comments explain why a field exists, what Discord requires, or how a payload should be interpreted.

Example from `src/Structures/Message.ts`:

```ts
/**
 * Extra field not in types
 * @see https://docs.discord.com/developers/events/gateway-events#message-create
 */
guild_id?: string | null
```

### Prefer JSDoc for public APIs and non-obvious behavior

When documenting exported classes, methods, event handlers, builders, or protocol types, use JSDoc-style comments with:

- a short description of what the item does
- usage notes when the API is not obvious
- a code snippet when an example would reduce confusion

Keep the docs practical and close to the implementation. The goal is for most public or reusable code to be understandable from the source alone.

## 10) Testing and validation workflow

### Use the repo scripts that match the scope of the change

- `npm run check` for lint + typecheck on the library
- `npm run build` for the release build path
- `npm test` for Vitest suite in `src/Tests/`
- `npm run check:examples` for the example app

### Keep tests close to the behavior they cover

The existing test layout under `src/Tests/` is organized around features like dispatcher behavior, gateway lifecycle, REST requests, and payload handling.

### Prefer targeted tests for protocol changes

When changing gateway events, cache mutation logic, or message payload helpers, add or update tests that exercise the exact runtime path instead of broad end-to-end coverage.

## 11) Public API rules

### Update `src/index.ts` when adding public modules

If a new builder, cache, structure, event group, or runtime service is meant to be public, export it from `src/index.ts` so package consumers can reach it from the main entrypoint.

### Keep runtime code and types aligned

If a constant is added to `src/Types/DiscordGateway.ts`, make sure any matching handler, intent resolver, or event mapper is updated in the relevant runtime module.

## 12) Practical examples to follow

- `src/Client.ts` — app bootstrap and cache construction
- `src/WSClient.ts` — gateway handshake, heartbeat, and dispatch
- `src/EventDispatcher.ts` — event registration and handler overrides
- `src/Cache/Guilds.ts` — cache upsert and REST-backed fetch
- `src/Structures/Guild.ts` — partial patching and nested cache ownership
- `src/Builders/EmbedBuilder.ts` — validation-heavy builder pattern
- `src/Types/DiscordGateway.ts` — canonical protocol constants and intent commentary

If a new change does not fit these patterns, it usually means one of the existing files above should be updated first.