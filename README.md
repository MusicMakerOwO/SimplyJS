# SimplyJS

A Discord.JS alternative focused on minimalism and developer experience.

 - [About](#about)
 - [Why SimplyJS](#why-simplyjs)
 - [Installation](#installation)
 - [Quick Start](#quick-start)
 - [Usage](#usage)
	- [Sending messages & replies](#sending-messages--replies)
	- [Direct messages](#direct-messages)
	- [Embeds](#embeds)
	- [Fetching & moderation](#fetching--moderation)
	- [Command handlers (multi-file)](#command-handlers-multi-file)
	- [Event handlers (multi-file)](#event-handlers-multi-file)
	- [Overriding gateway event handlers](#overriding-gateway-event-handlers)
	- [Rotating presence/status](#rotating-presencestatus)
 - [Examples](#examples)
 - [Advanced / Internals](#advanced--internals)
 - [Development](#development)
 - [Status and known limitations](#status-and-known-limitations)
 - [Contributing](#contributing)
 - [License](#license)

## About

SimplyJS is a TypeScript-first Discord library meant for bots that don't need every corner of the Discord API surface. It's currently alpha software at `1.2.0-alpha`, so the public API can still shift between releases.

## Why SimplyJS

Most Discord libraries grow to cover every possible use case, which means a lot of surface area you never touch just to get a bot running. SimplyJS goes the other way: a small, typed core (gateway, REST, caches, structures) that covers the common paths well, and gets out of your way for everything else. No enums to memorize instead of string keys, no hidden magic in the event pipeline, and no dependencies beyond `ws`. If you outgrow it, the internals are small enough to read in an afternoon (see [Advanced / Internals](#advanced--internals)).

## Installation

Requirements: Node.js >= 20 and a Discord bot token.

```bash
npm install simplyjs
```

## Quick Start

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

## Usage

### Sending messages & replies

`message.reply()` attaches to the triggering message; `channel.send()` sends a standalone message instead.

```ts
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith("!")) return;
	const [command, ...args] = message.content.slice(1).split(/ +/);

	if (command === "announce" && message.channel) {
		await message.channel.send(args.join(" ") || "📢");
	}
});
```

> **NOTE**\
> `message.reply()` pings the original author by default, matching Discord's own client behavior. Pass `{ ping: false }` to suppress it:
> ```ts
> await message.reply("Got it, no ping!", { ping: false });
> ```

### Direct messages

`message.user.send()` opens or reuses a DM channel automatically.

```ts
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith("!dm ")) return;
	const text = message.content.slice(4);

	try {
		await message.user.send(text || "Hi!");
		await message.reply("Check your DMs!");
	} catch {
		await message.reply("I couldn't DM you - do you have DMs disabled?");
	}
});
```

> **WARNING**\
> DMs can fail if the user has them closed or has blocked the bot - always wrap `send()` to a user in a `try`/`catch`.

### Embeds

`EmbedBuilder` validates as you build, not just when you send - each setter enforces the relevant Discord field limit immediately.

```ts
import { EmbedBuilder } from "simplyjs";

const embed = new EmbedBuilder()
	.setTitle(`${message.user.username}`)
	.setColor("#5865F2")
	.addFields([
		{ name: "ID", value: message.user.id, inline: true },
		{ name: "Bot?", value: message.user.bot ? "Yes" : "No", inline: true }
	])
	.setFooter({ text: `Requested in #${message.channel?.name ?? "unknown"}` })
	.setTimestamp(new Date());

await message.reply({ embeds: [embed] });
```

| Limit | Max |
| --- | --- |
| `setTitle()` | 256 characters |
| `setFooter()` | 2048 characters |
| Total embed size (`EmbedBuilder.validate()`) | 6000 characters |

> **NOTE**\
> If you're coming from `discord.js`: there's no named-color constant support (hex string or decimal number only), fields can be set via plain property assignment (`embed.description = "..."`) as well as setters, and validation errors throw synchronously as soon as a limit is exceeded rather than surfacing later as a Discord API error. `EmbedBuilder.from(embed)` hydrates a builder from an existing payload if you need to edit one you fetched.

### Fetching & moderation

Resolve a `@mention` or raw ID against the guild's member cache, falling back to a fetch:

```ts
async function resolveMember(client: FullClient, guildId: string, input?: string) {
	const id = (/\d+/.exec(input ?? "") ?? [])[0];
	if (!id) return null;

	const guild = client.guilds.get(guildId);
	if (!guild) return null;

	return guild.members.get(id) ?? await guild.members.fetch(id).catch(() => null);
}
```

Moderation actions are methods directly on the structure:

```ts
const member = await resolveMember(client, message.guildId!, args.shift());
if (!member) return message.reply("Couldn't find that member");

try {
	await member.kick(args.join(" ") || undefined);
	await message.reply(`Kicked **${member.user.username}**`);
} catch {
	await message.reply("Something went wrong - do I have the Kick Members permission?");
}
```

### Command handlers (multi-file)

Load command objects into a `Map` and dispatch them from a shared `MessageCreate` listener - the same pattern most prefix-command bots converge on:

```ts
// commands/ping.ts
export default {
	name: "ping",
	async execute(client, message, args) {
		await message.reply("Pong!");
	}
};
```

```ts
// index.ts
import * as Commands from "./commands";

client.commands = new Map();
for (const command of Object.values(Commands)) {
	client.commands.set(command.name, command);
}

const PREFIX = "!";
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith(PREFIX)) return;
	const [name, ...args] = message.content.slice(PREFIX.length).split(/ +/);

	const handler = client.commands.get(name);
	if (!handler) return;

	try {
		await handler.execute(client, message, args);
	} catch (error) {
		console.log(error);
		await message.reply("Something went wrong!");
	}
});
```

### Event handlers (multi-file)

Splitting event handling into one file per event keeps things tidy as a bot grows - `createEvent()` pairs a handler with the event it's bound to so it stays type-safe:

```ts
// events/ready.ts
import { ClientEvents } from "simplyjs";
import { createEvent } from "./types.js";

export default createEvent(ClientEvents.Ready, (client, user) => {
	console.log(`[ready] Logged in as ${user.username}`);
});
```

```ts
// index.ts
import * as Events from "./events";

for (const event of Object.values(Events)) {
	client.on(event.name, (...args: any[]) => event.execute(client, ...args));
}
```

### Overriding gateway event handlers

Every dispatch event (`GUILD_CREATE`, `MESSAGE_CREATE`, etc.) has a built-in handler that updates caches/structures before emitting the public client event. Pass an override through the `ws` option to replace that event's entry entirely:

```ts
import { Client, GatewayEvents } from "simplyjs";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages"],
	ws: {
		eventOverrides: {
			[GatewayEvents.MessageCreate]: (client, data) => {
				console.log("raw MESSAGE_CREATE payload:", data);
			}
		}
	}
});
```

> **WARNING**\
> This is a full replacement, not a "run before/after" hook - the built-in handler that upserts the message into cache and emits `ClientEvents.MessageCreate` never runs once you override it. `CreateDispatch()` builds one handler map at construction time and doesn't support layering.

### Rotating presence/status

```ts
import { ActivityType } from "simplyjs";

client.on(ClientEvents.Ready, (user) => {
	const statuses = [
		{ type: ActivityType.PLAYING, name: "with SimplyJS" },
		{ type: ActivityType.LISTENING, name: "some tunes" },
		{ type: ActivityType.WATCHING, name: "the matrix" }
	];

	let i = 0;
	setInterval(() => {
		const status = statuses[i];
		client.setStatusMessage(status.type, status.name);
		i = (i + 1) % statuses.length;
	}, 5_000).unref();
});
```

## Examples

Full end-to-end projects live in [`examples/`](./examples):

| Folder | What it shows |
| --- | --- |
| [`1-ping`](./examples/1-ping) | Smallest possible bot - login, `Ready`, one `!ping` command |
| [`2-rotating-status`](./examples/2-rotating-status) | Rotating presence/status on an interval |
| [`3-prefix-commands`](./examples/3-prefix-commands) | Single-file prefix command bot |
| [`4-prefix-handler`](./examples/4-prefix-handler) | Multi-file command registry loaded into a `Map` |
| [`5-sending-dms`](./examples/5-sending-dms) | Sending DMs and handling closed-DM failures |
| [`6-embeds`](./examples/6-embeds) | `EmbedBuilder` usage, including error-style embeds |
| [`7-fetching-and-moderation`](./examples/7-fetching-and-moderation) | Member resolution, kicks, bans, timeouts, role management |
| [`8-event-handler`](./examples/8-event-handler) | One-file-per-event handler structure |
| [`9-slash-commands-basics`](./examples/9-slash-commands-basics) | Registering and responding to a single slash command |
| [`10-slash-command-handler`](./examples/10-slash-command-handler) | Multi-file slash command registry, same pattern as `4-prefix-handler` |
| [`11-buttons-and-selects`](./examples/11-buttons-and-selects) | Responding to button and select menu interactions |
| [`12-button-args`](./examples/12-button-args) | Encoding state in `customId` to avoid needing collectors |
| [`13-all-handlers`](./examples/13-all-handlers) | Commands, buttons, selects, and event handlers wired together |
| [`14-collectors`](./examples/14-collectors) | `createCollector`/`awaitEvent` for temporary, filtered event listeners |

## Advanced / Internals

`Client` is the composition root - on construction it resolves your intents into a bitfield and starts the gateway (`WSClient`) and REST (`Rest`) clients, and owns the top-level guild/user caches.

Gateway messages flow through a fixed pipeline: `WSClient` (`src/WSClient.ts`) owns the raw socket, runs the `Hello` → `Identify` → heartbeat handshake, and hands every `DISPATCH` payload to a dispatcher built by `CreateDispatch()` (`src/EventDispatcher.ts`), which routes each gateway event to a handler in `src/Events/`. Handlers update the relevant cache/structure and then emit the public-facing event via `Client.emit(...)`. Structures (`Guild`, `Channel`, `Message`, etc.) are thin wrappers around the raw API objects that expose the methods you call, like `message.reply()` or `member.kick()`, all routed back through `client.rest` (`src/Rest.ts`), which authenticates every request, retries `429`s/transient `5xx`s, and tracks rate limits per route via a `TTLCache` (`src/DataStructures/TTLCache.ts`).

Non-obvious design notes:

> **HINT**\
> **Intents are more flexible than they look.** You can pass a raw `number`, an array of `GatewayIntents` values, or plain key names like `"Guilds"`. `ResolveIntents`/`HasIntent` in `src/Intents.ts` normalize any of these into a bitfield. There's no event-to-intent gating yet, so a missing intent currently drops events silently rather than failing loudly.

> **NOTE**\
> **Permissions and intents are bigint bitfields, not enums.** The generic `BitField` class (`src/DataStructures/BitField.ts`) backs things like `Role.permissions`. Raw Discord permission flag values live in `Constants.ts`.

> **NOTE**\
> **There are no TypeScript `enum`s in this codebase.** Every constant-like map (opcodes, intents, events, statuses, activity types) is an `as const` object instead, with `ObjectValues<typeof X>` (`src/Types/HelperTypes.ts`) deriving the value union - a deliberate pattern applied consistently across `src/Types/*.ts`.

> **HINT**\
> **`Ready` doesn't fire the moment the gateway says it should.** `src/Events/Ready.ts` collects every guild ID from the `READY` payload (including ones marked `unavailable`), then waits for a matching `GuildCreate` for each one. Only once every guild has arrived, or 15 seconds have passed, does the library emit its own public `Ready` event - so handlers never fire before caches are actually populated.

> **WARNING**\
> **Timers are required to call `.unref()`.** This is enforced by a custom ESLint rule, `local/require-unref-on-timers` (`eslint.config.ts`). The polling loops in `Client.login()`/`Client.destroy()` are the reference examples if you're adding a new timer.

Structures and caches also split along ownership: `APIClientStructure<T>` holds a reference to `client` only, `APIGuildStructure<T>` holds both `client` and `guild` (`src/Contracts/DiscordStructure.ts`), and caches mirror the split via `GlobalCache`/`GuildScopedCache` (`src/Contracts/CacheStructure.ts`). See `CODE_STYLE_AND_RULES.md` for the full reasoning behind these patterns.

## Development

```bash
npm run check       # eslint + tsc --noEmit
npm run build       # check, then rm -rf dist/ and tsup (emits ESM + CJS + .d.ts to dist/)
npm test            # vitest run (tests live in src/Tests/**/*.ts)
npm run lint        # eslint .
npm run lint:fix    # eslint . --fix
npm run linecount   # top 10 largest .ts files by line count
```

## Status and known limitations

The project is alpha software; gateway resiliency and Discord API coverage are still being built out (tracked in `TODO.md`). Notably:

- `WSClient` handles `GatewayOpCodes.Reconnect` / `InvalidSession`, tracks `session_id`/`resume_gateway_url` from `READY`, and resumes instead of re-identifying when possible; heartbeat ACKs are tracked and an unacked heartbeat triggers a reconnect. There's still no close-code-aware backoff or max-retry/terminal-failure detection - a dead connection reconnects immediately and indefinitely.
- Gateway event coverage is partial. Dispatch handlers exist for guilds, channels, members, roles, messages, reactions, emojis, stickers, and invites, but events like `PresenceUpdate`, `TypingStart`, `VoiceStateUpdate`, threads, bans, and interactions are not yet handled.
- No interaction/slash-command support. Only traditional message-based (prefix) commands are demonstrated, since component/interaction payloads (`src/Types/Internal.ts`) are placeholders for a later update.
- Large portions of `src/` still lack JSDoc coverage (tracked file-by-file in `docs.md`).

## Contributing

Before opening a PR:

- Read `CODE_STYLE_AND_RULES.md` — it documents the actual patterns this codebase expects (event handler shape, `as const` + `ObjectValues` instead of enums, getter-vs-method rules, `.unref()` on timers, etc.), and PRs that don't follow it will need rework.
- Run `npm run check` (lint + typecheck) and `npm test` locally — the CI workflows (`.github/workflows/node.js.yml`, `bun.yml`, `deno.yml`) build and test the project on Node 20/22/24, Bun, and Deno for every push/PR to `main`, so failures there will block merge anyway.
- If you're adding a new gateway event handler, cache, or structure, make sure it's exported from the right barrel file (`src/Events/index.ts`, `src/index.ts`, etc.) — see section 11 of `CODE_STYLE_AND_RULES.md`.
- If you fix or add something meaningful, add an entry to `CHANGELOG.md` and check off (or add) the matching item in `TODO.md`.

There's no formal CONTRIBUTING.md or PR template yet, so use your judgment and keep changes scoped. Keep commits scoped to one logical change, using this repo's loose `type(scope): Description` convention:

| Type       | Description                                                      |
|------------|------------------------------------------------------------------|
| `feat`     | A new feature                                                    |
| `fix`      | A bug fix                                                        |
| `refactor` | A code change that neither fixes a bug nor adds a feature        |
| `test`     | Adding or updating tests                                         |
| `style`    | Changes that don't affect meaning (whitespace, formatting, etc.) |
| `docs`     | Documentation changes                                            |
| `chore`    | Tooling, config, or maintenance work                             |

## License

MIT. See [LICENSE](./LICENSE).