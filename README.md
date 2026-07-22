# SimplyJS
A Discord.JS alternative focused on minimalism and developer experience

TypeScript-first from the ground up, meant for bots that don't need
every corner of the Discord API surface.
It's currently alpha software at `1.0.2-alpha`, so the public API can still shift between releases.

## Requirements

- Node.js >= 18
- A Discord bot token

## Install

```bash
npm install simplyjs
```

## Quick start

```ts
import { Client, ClientEvents } from "simplyjs";

const client = new Client({
	token: process.env.TOKEN!,
	// Intents tell Discord which kinds of events this bot wants to receive.
	// Only enable what you need. Excess intents can mean extra RAM usage
	// and events you don't care about.
	intents: ["Guilds", "GuildMessages", "MessageContent"]
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

client.on(ClientEvents.MessageCreate, async (message) => {
	if (message.content === "!ping") {
		await message.reply("Pong!");
	}
});

process.on("SIGINT", async () => {
	await client.destroy();
	process.exitCode = 0;
});
```

More end-to-end examples live in `examples/`: a ping-pong bot (`1-ping`), a rotating presence/status bot (`2-rotating-status`), a single-file prefix command bot (`3-prefix-commands`), and a multi-file command-registry bot (`4-prefix-handler`) that loads command objects (`{ name, execute(client, message, args) }`) into a `Map` and dispatches them from a shared `MessageCreate` listener.

## Architecture

`Client` is the composition root. Everything else hangs off it. On construction
it resolves your intents into a bitfield and starts the gateway and HTTP clients.
It also owns the top-level guild/user caches. Login and destroy are both just:
kick off the socket lifecycle, then poll until it is done.

Gateway messages flow through the library in a fixed pipeline. `WSClient` (`src/WSClient.ts`) owns the raw socket: it opens the connection, runs the `Hello` → `Identify` → heartbeat handshake, and hands every incoming `DISPATCH` payload to a dispatch function built by `CreateDispatch()` (`src/EventDispatcher.ts`). That dispatcher is really just a lookup table: it takes the gateway event name and routes it to the matching handler in `src/Events/`, where each domain gets its own file (`Guilds.ts`, `Channels.ts`, `Members.ts`, `Roles.ts`, `Messages.ts`, `Reactions.ts`, `Emojis.ts`, `Stickers.ts`, `Ready.ts`). Handlers are declared with `defineEvent(...)` (`src/Types/Internal.ts`) so the dispatcher knows the payload shape at compile time instead of trusting `any`.

From there a handler does two things: it updates whatever cache or structure the event touches (`src/Cache/*.ts`, `src/Structures/*.ts`), and it emits the public-facing event through `Client.emit(...)` using the names and payloads defined in `src/Types/SimplicityTypes.ts`. The structures themselves (`Guild`, `Channel`, `Member`, `Message`, `Role`, `Emoji`, `Sticker`, `User`) are thin wrappers around the raw API objects. Their job is to expose the methods you actually call, like `message.reply()`, `member.kick()`, or `channel.send()`, all of which route back through `client.rest`.

That REST layer lives in `src/Rest.ts`. It authenticates every request against `https://discord.com/api/v9`, and it tracks rate limits per route (`routeRateLimits`, `routeToBucket`) using the generic `TTLCache` (`src/Cache/TTLCache.ts`). If Discord returns a `429` or a transient `5xx`, the request is retried rather than surfaced as an error.

### Non-obvious design notes

**Intents are more flexible than they look.** You can pass a raw `number`, an array of `GatewayIntents` values, or plain key names like `"Guilds"`. `ResolveIntents`/`HasIntent` in `src/Intents.ts` normalize any of these into a single bitfield. The same file also maps each gateway event to the intent required to receive it, via `EventRequiredIntent`, so a missing intent fails loudly instead of just silently dropping events.

**Permissions and intents are bigint bitfields, not enums.** The generic `BitField` class (`src/DataStructures/BitField.ts`) backs things like `Role.permissions`. If you're looking for the raw Discord permission flag values, they live in `Constants.ts`.

**There are no TypeScript `enum`s in this codebase.** Every constant-like map (opcodes, intents, events, statuses, activity types) is defined as an `as const` object instead, with `ObjectValues<typeof X>` (`src/Types/HelperTypes.ts`) deriving the value union. It's a deliberate pattern, not an oversight, and it's applied consistently across `src/Types/*.ts`.

**`Ready` doesn't fire the moment the gateway says it should.** `src/Events/Ready.ts` first collects every guild ID from the `READY` payload, including ones marked `unavailable`, then waits for a matching `GuildCreate` for each one. Only once every guild has arrived, or 15 seconds have passed, does the library emit its own public `Ready` event. This exists specifically so your handlers never fire before the caches are actually populated.

**Timers are required to call `.unref()`.** This isn't a convention you have to remember; it's enforced by a custom ESLint rule, `local/require-unref-on-timers` (`eslint.config.ts`). The polling loops in `Client.login()` and `Client.destroy()` are the reference examples if you're adding a new timer and want to see the pattern in practice.

**Structures split along ownership, and so do caches.** `APIClientStructure<T>` is for anything scoped to the client itself, and it holds a reference to `client`. `APIGuildStructure<T>` is for anything owned by a guild, and it holds both `client` and `guild`. See `src/Contracts/DiscordStructure.ts` for the base classes. Caches mirror the same split: `GlobalCache` and `GuildCache` in `src/Contracts/CacheStructure.ts`.

## Advanced usage

A few things that don't fit the quick-start example but are worth knowing about. See `CODE_STYLE_AND_RULES.md` for the reasoning behind the patterns these are built on.

### Overriding gateway event handlers

Every dispatch event (`GUILD_CREATE`, `MESSAGE_CREATE`, etc.) has a built-in handler that updates caches/structures before emitting the public client event (`src/Events/*.ts`, wired up by `CreateDispatch()` in `src/EventDispatcher.ts`). If you need different behavior for a specific gateway event, pass an override through the `ws` option on `Client` - it replaces that event's entry in the dispatcher's lookup table entirely, so you're responsible for whatever caching the default handler would have done:

```ts
import { Client, GatewayEvents } from "simplyjs";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages"],
	ws: {
		eventOverrides: {
			[GatewayEvents.MessageCreate]: (client, data) => {
				console.log("raw MESSAGE_CREATE payload:", data);
				// note: the built-in handler that upserts the message into
				// cache and emits ClientEvents.MessageCreate never runs here
			}
		}
	}
});
```

This is a full replacement, not a "run before/after" hook - `CreateDispatch()` builds one handler map at construction time and doesn't support layering (see `src/EventDispatcher.ts`).

### Replying without pinging the author

`Message.reply()` pings the original author by default (matching Discord's own client behavior). Pass `{ ping: false }` to suppress it - internally this just sets `allowed_mentions.replied_user = false` on the outgoing payload (`src/Structures/Message.ts`):

```ts
client.on(ClientEvents.MessageCreate, async (message) => {
	await message.reply("Got it, no ping!", { ping: false });
});
```

### `EmbedBuilder`

`EmbedBuilder` (`src/Builders/EmbedBuilder.ts`) validates as you build, not just when you send. Each setter enforces the relevant Discord field limit immediately (e.g. `setTitle()` throws past 256 characters, `setFooter()` throws past 2048), and the static `EmbedBuilder.validate(embed)` re-checks the assembled object for an empty embed or a total character count over 6000 before anything is sent. There's also `EmbedBuilder.from(embed)` to hydrate a builder from an existing payload (e.g. one fetched off an existing message) instead of only building from scratch.

```ts
import { EmbedBuilder } from "simplyjs";

const embed = new EmbedBuilder()
	.setTitle("Help")
	.setDescription(commandList)
	.setColor("#ff7900")
	.addFields([{ name: "Prefix", value: "!", inline: true }]);

await message.reply({ embeds: [embed] });
```

If you're coming from `discord.js`, the main differences: there's no `EmbedBuilder#setColor` accepting named color constants (hex string or decimal number only), fields are set via plain property assignment or the same setters (`embed.description = "..."` works too - it's a plain class, not getter/setter-only), and validation errors throw synchronously as soon as a limit is exceeded rather than surfacing later as a Discord API error.

## Development

```bash
npm run check      # eslint + tsc --noEmit
npm run build       # check, then rm -rf dist/ and tsup (emits ESM + CJS + .d.ts to dist/)
npm test            # vitest run (tests live in src/Tests/**/*.ts)
npm run lint        # eslint .
npm run lint:fix    # eslint . --fix
npm run linecount   # top 10 largest .ts files by line count
```

## Status and known limitations

The project is alpha software; gateway resiliency and Discord API coverage are still being built out (tracked in `TODO.md`). Notably:

- No reconnect/resume handling yet. `GatewayOpCodes.Reconnect` / `InvalidSession` aren't handled, and `session_id`/`resume_gateway_url` from `READY` aren't tracked or reused, so a dropped connection re-identifies from scratch rather than resuming.
- No close-code-aware backoff or max-retry/terminal-failure detection for reconnects.
- Gateway event coverage is partial. Dispatch handlers exist for guilds, channels, members, roles, messages, reactions, emojis, and stickers, but events like `PresenceUpdate`, `TypingStart`, `VoiceStateUpdate`, threads, and interactions are not yet handled.
- No interaction/slash-command support. Only traditional message-based (prefix) commands are demonstrated, since component/interaction payloads (`src/Types/Internal.ts`) are placeholders for a later update.
- Large portions of `src/` still lack JSDoc coverage (tracked file-by-file in `docs.md`).

## Contributing

Before opening a PR:

- Read `CODE_STYLE_AND_RULES.md` — it documents the actual patterns this codebase expects (event handler shape, `as const` + `ObjectValues` instead of enums, getter-vs-method rules, `.unref()` on timers, etc.), and PRs that don't follow it will need rework.
- Run `npm run check` (lint + typecheck) and `npm test` locally — the CI workflow (`.github/workflows/node.js.yml`) runs `npm run build` and `npm run test` on Node 20, 22, and 24 for every push/PR to `main`, so failures there will block merge anyway.
- If you're adding a new gateway event handler, cache, or structure, make sure it's exported from the right barrel file (`src/Events/index.ts`, `src/index.ts`, etc.) — see section 11 of `CODE_STYLE_AND_RULES.md`.
- If you fix or add something meaningful, add an entry to `CHANGELOG.md` and check off (or add) the matching item in `TODO.md`.

There's no formal CONTRIBUTING.md or PR template yet, so use your judgment and keep changes scoped.

### Commit hygiene

Existing history follows a loose `type(scope): Description` convention (e.g. `feat(workflow): Added tests for node 20, 22, and 24`, `fix(package.json): Updated license to match git repo`). Keep commits scoped to one logical change, and write messages that describe *what changed and why*, not just "fix stuff" — it makes `git log`/`git blame` actually useful when tracking down why a particular pattern exists later.

## License

MIT. See [LICENSE](./LICENSE).