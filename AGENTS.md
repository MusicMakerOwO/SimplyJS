# AGENTS.md

## Project snapshot
- `Simplicity` is a TypeScript-first Discord library (`package.json` description: minimal `discord.js` alternative).
- Current implementation is still type- and protocol-heavy, but runtime layers are no longer fully empty: `src/Client.ts` wires auth/login/destroy with top-level caches (`GuildCache`, `UserCache`), `src/WSClient.ts` has gateway handshake/heartbeat/event dispatch logic, `src/Rest.ts` has authenticated `GET`/`POST`/`PATCH`/`DELETE`/`PUT` helpers, and `src/EventDispatcher.ts` routes gateway events using handlers exported from `src/Events/index.ts`.

## Architecture and data flow (what exists now)
- Core protocol constants are centralized in `src/Types/DiscordGateway.ts` (`GatewayOpCodes`, `GatewayIntents`, `GatewayEvents`, `GatewayPayload`).
- Runtime bootstrapping currently flows through `src/Client.ts`: constructor sets token on both `WSClient` and `Rest`, resolves intents via `ResolveIntents`, instantiates top-level caches (`GuildCache`, `UserCache`), and exposes `login()` / `destroy()`. `login()` polls `socket.ready`; `destroy()` calls `socket.destroy()` and polls until disconnected.
- `WSClient` stores resolved intents on `socket.intents`, and Identify in `WSClient.#handleHello` sends `this.intents`.
- `WSClient` extends `EventEmitter<WSEvents>` (typed events: `RAW`, `HEARTBEAT`, `HEARTBEAT_ACK`) and creates a dispatch function with `CreateDispatch()`; gateway dispatches flow through `this.dispatch(this.client, data.t, data.d)`.
- Event-to-intent resolution lives in `src/Intents.ts` via `EventRequiredIntent`; this is the main cross-file bridge between gateway events and enabled intents.
- Intent normalization helpers (`ResolveIntents`, `HasIntent`) convert mixed user input (number, key names, numeric array) into a bitfield.
- Gateway dispatch flows: `WSClient.#handleMessage` → `CreateDispatch()` result from `src/EventDispatcher.ts` → handler module exported from `src/Events/index.ts` (e.g., `GuildCreate`) → updates `Client` cache or structure in `src/Structures/` or `src/Cache/`.
- Gateway handlers then emit the public client event surface from `src/Types/SimplicityTypes.ts` (`ClientEvents` / `ClientEventMap`) via `Client.emit(...)`.
- `Client.guilds` and `Client.users` are top-level caches (`GuildCache`, `UserCache`, both extending `GlobalCache<string, V, API>`); `fetch(id)` uses REST and `upsert()` to patch/create entries, and `Guild` owns nested caches for `channels`, `roles`, `emojis`, `stickers`, and `members`.
- `src/Rest.ts` keeps route/bucket rate-limit state in `src/Cache/TTLCache.ts` (`routeRateLimits`, `routeToBucket`) and exposes `RestOptions` for `retryAfterRateLimit`, `rateLimitDurationMultiplier`, and `perRouteRateLimits`.
- Abstract base classes in `src/Contracts/` define the structural contracts:
  - `APIClientStructure<T>` — client-bound structures needing `client` access (holds `protected readonly client: Client`)
  - `APIGuildStructure<T>` — guild-owned structures needing both `client` and `guild` access (holds `protected readonly client: Client` and `protected readonly guild: Guild`)
  - `GlobalCache<K,V,API>` / `GuildCache<K,V,API>` — typed Maps with `abstract upsert(data: API): V` and `abstract fetch(key: K): Promise<V>` for top-level and guild-scoped caches respectively
  - `ComponentBuilder<T>` — builder contract requiring `from(value: T)` and `validate()` methods
- Domain model types for Discord REST/gateway payloads are in `src/Types/DiscordAPITypes.ts` and `src/Types/MessageComponents.ts`.
- Gateway packet envelope typing (including Hello/Ready payload shapes) is in `src/Types/DiscordGateway.ts` via `GatewayPayload<T>`.
- `src/Types/Internal.ts` defines event contracts (`EventHandler`) plus `defineEvent(...)` for strongly typed handler declarations.
- `src/Types/Internal.ts` also defines `JSONPrimitive`, `JSONValue`, `JSONObject` used by `Rest` method signatures.
- Shared utility types (`ObjectValues`, `DeepPartial`, `Awaitable`) are in `src/Types/HelperTypes.ts` and are reused across type modules.
- `src/EventDispatcher.ts` `CreateDispatch(...)` builds a handler map from `src/Events/index.ts` exports, detects duplicate event names, supports optional per-event overrides (used in tests), and invokes async handlers via `void handler(...)`.

## Conventions specific to this repo
- Use ESM imports with explicit `.js` suffix even in `.ts` source (example: `import { GatewayEvents } from "./Types/DiscordGateway.js"`).
- Prefer `const` object maps + `as const` for enum-like values (seen across `src/Types/*.ts`) rather than TypeScript `enum`.
- Derive value unions from maps using `ObjectValues<typeof X>` for API field typing.
- Keep heavy inline API documentation/comments close to exported types; this codebase treats docs as part of source-of-truth.
- Treat `CODE_STYLE_AND_RULES.md` as a required guide for every future edit; follow its rules for JSDoc, getter boundaries, and code-style expectations before making changes.
- Structure `patch(data)` methods use `if ("key" in data)` guards for every optional field so partial updates are safe (see `src/Structures/Guild.ts`).
- New event handlers go in `src/Events/` as named `const` exports created with `defineEvent(...)` from `src/Types/Internal.ts`; export them from `src/Events/index.ts` so `EventDispatcher` can register them.
- New domain structures extend `APIClientStructure<T>` or `APIGuildStructure<T>` from `src/Contracts/DiscordStructure.ts`, depending on whether the structure is client-bound or guild-owned.
- New top-level caches extend `GlobalCache<K,V,API>` from `src/Contracts/CacheStructure.ts` and must implement `upsert(data)` and `fetch(key)`.
- Builders implement `ComponentBuilder<T>` from `src/Contracts/ComponentBuilder.ts` (requires `from` and `validate` methods).

## Tooling and workflows
- Type/lint check: `npm run check` (runs ESLint + `tsc --noEmit`).
- Build: `npm run build` (lint + typecheck + `tsc --noEmit` + `tsup`, outputs ESM/CJS + d.ts to `dist/`).
- Tests: `npm test` (`vitest run`), with test discovery configured as `src/Tests/**/*.ts` in `vitest.config.ts`.
- Examples check/build: `npm run check:examples` (runs ESLint + `tsc --noEmit` in `examples/`) and `npm run build:examples` (runs the same typecheck plus `scripts/build-examples.js`).
- Raw linting: `npm run lint` (library) and `npm run lint:examples` (examples).
- Post-release backlog lives in `TODO.md`: add ideas as unchecked checklist items (`- [ ] ...`), and in the PR that ships an item, mark it complete in `TODO.md` (`- [x] ...`).
- Treat `TODO.md` as an active product backlog, not a passive notes file: future agents should proactively add missing features, follow-up work, and cleanup items there, then mark them complete when they are shipped.
- Release history lives in `CHANGELOG.md`. Use the following format — add a new `## [version] - YYYY-MM-DD` heading at the top for each release, with `### Added`, `### Changed`, `### Fixed`, and `### Removed` subsections as needed (omit empty subsections). Unreleased work-in-progress goes under a `## [Unreleased]` heading at the top.
- Optional `tsgo` alternatives exist for typecheck/build (`npm run check:go`, `npm run build:go`).
- Lint auto-fix: `npm run lint:fix`.

## Lint rules agents must respect
- Custom ESLint rule `local/require-unref-on-timers` in `eslint.config.ts` requires `setTimeout(...).unref()` / `setInterval(...).unref()` chaining.
- `@typescript-eslint/no-floating-promises` is `error`; do not leave unhandled promises.
- Unicorn rules enforced include `unicorn/no-array-for-each` (prefer `for...of`), `unicorn/prefer-node-protocol` (use `node:` imports), and `unicorn/no-process-exit`.

## Integration boundaries
- External runtime deps are currently minimal: `ws` (gateway transport candidate).
- Discord API vocabulary is pinned locally via constant/type files (`src/Types/DiscordGateway.ts`, `src/Types/DiscordOAuth.ts`, `src/Types/DiscordAPITypes.ts`) instead of pulling from a generated SDK.
- Package entrypoints are dual-format (`package.json` `main`: `dist/index.cjs`, `module`: `dist/index.js`) with conditional `exports` for ESM/CJS consumers, and `src/index.ts` is the active public barrel export.

## Practical guidance for new agents
- Review `CODE_STYLE_AND_RULES.md` before editing code so new changes stay aligned with the documented style and behavioral rules.
- Check `TODO.md` when planning work; if you discover an obvious missing feature or cleanup item while editing, add it there so the backlog stays current.
- Implement runtime behavior by extending existing typed protocol surfaces first (start from `GatewayPayload`, `GatewayEvents`, `EventRequiredIntent`).
- When adding new Discord constants/types, follow the existing `as const` + `ObjectValues` pattern for consistency.
- If adding timers in future `Client`/`Rest` code, chain `.unref()` immediately to satisfy lint and avoid process hang.
- Add tests under `src/Tests/` or Vitest will not discover them.
- To handle a new gateway dispatch event: create/update a handler in `src/Events/` using `defineEvent(...)`, then export it from `src/Events/index.ts`; `EventDispatcher` auto-registers exported handlers.
- `Rest` targets `https://discord.com/api/v9`; use `client.rest.get<T>(path)` / `.post<T>(path, body)` etc. in cache `fetch()` impls.
- For public API changes, update exports in `src/index.ts` (it already re-exports builders/cache/events/structures/types and core runtime modules).