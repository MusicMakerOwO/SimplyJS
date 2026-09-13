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
	- [Emojis & stickers](#emojis--stickers)
	- [Threads](#threads)
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

### Components v2

Components v2 replaces a message's `content` and `embeds` with a component tree you lay out yourself. You do not set the flag or check the rules - passing v2 components to any send path is enough:

```ts
import { readFile } from "node:fs/promises";
import {
	ContainerBuilder,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder
} from "simplyjs";

const container = new ContainerBuilder()
	.setAccentColor("#5865F2")
	.addComponents(
		new SectionBuilder()
			.addComponents(new TextDisplayBuilder().setContent("## Welcome\nGlad you made it."))
			.setAccessory(new ThumbnailBuilder().setMedia("attachment://banner.png")),
		new SeparatorBuilder(),
		new TextDisplayBuilder().setContent("-# Sent by SimplyJS")
	);

await message.channel.send({
	components: [container],
	attachments: [{ name: "banner.png", data: await readFile("./banner.png") }]
});
```

`TextDisplay`, `Thumbnail`, `Section`, `MediaGallery`, `File`, `Separator`, and `Container` all have builders, and each one *is* its wire payload, so a tree can be sent, logged, or cloned as-is. Media setters take a bare url string as shorthand for the full media object, and `MediaGalleryBuilder.addItems()` takes either.

The rules that no single component can check for itself are enforced when you send:

| Checked on send | Behavior |
| --- | --- |
| `IS_COMPONENTS_V2` | Set for you when the payload uses a v2-only component. An action-row-only message stays v1 |
| `content` / `embeds` / `sticker_ids` / `poll` | Rejected on a v2 message, which is what Discord does - with an error naming the v2 replacement |
| Component count | 40 max, counting nested children |
| Text length | 4000 characters across every `TextDisplay`, which is a message-wide budget rather than a per-component one |
| `attachment://` references | Cross-checked against the message's own `attachments`, so a typo'd filename throws locally instead of returning a 400 |

> **NOTE**\
> Editing a message that is already v2 keeps it held to the v2 rules even when the edit alone would not look like one - `message.update()` and a component interaction's `update()` both read the flags of the message they are editing. `interaction.editReply()` cannot: it addresses the original response by token and never sees its flags.

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

`guild.members.fetch()` is overloaded: pass an ID for one member, or pagination options for a page of them. `fetchAll()` pages through the whole guild, and `search()` matches a username or nickname prefix - both need the **privileged** `GuildMembers` intent:

```ts
const page = await guild.members.fetch({ limit: 100 });   // one page, ordered by ascending user ID
const everyone = await guild.members.fetchAll();          // one request per 1000 members
const matches = await guild.members.search("mus", 5);     // prefix match on username/nickname
```

`fetchGateway()` asks over the gateway instead of REST, using `RequestGuildMembers` (op 8). It is not rate limited per 1000 members, and it is the only way to fetch members together with their presences or to look up a batch of user IDs in one call. It resolves once the last chunk of the response arrives:

```ts
const everyone = await guild.members.fetchGateway();                       // whole guild, one request
const some = await guild.members.fetchGateway({ userIds: ["1", "2"] });    // batch lookup, no intent needed
const withPresences = await guild.members.fetchGateway({ presences: true });
```

`query` and `userIds` are mutually exclusive, `userIds` is capped at 100, and the manager throws rather than sending a request Discord would silently drop for a missing intent. Every chunk is also emitted as `GuildMembersChunk` as it lands, so a very large fetch can be streamed instead of awaited:

```ts
client.on(ClientEvents.GuildMembersChunk, ({ members, chunkIndex, chunkCount }) => {
	console.log(`chunk ${chunkIndex + 1}/${chunkCount}: ${members.length} members`);
});
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

### Emojis & stickers

`guild.emojis.create()` and `guild.stickers.create()` upload from raw file bytes - the type is read from the contents, so you never pass an extension or a path, and nothing is read from disk for you:

```ts
import { readFile } from "node:fs/promises";

const emoji = await guild.emojis.create({
	name: "blobwave",
	image: await readFile("./blobwave.png")   // PNG, GIF, JPEG, or WebP
});

const sticker = await guild.stickers.create({
	name: "wave",
	description: "a waving blob",
	tags: ["wave", "hello"],                  // a single string works too
	file: await readFile("./wave.png")        // PNG, APNG, GIF, or Lottie JSON
});
```

`image` also accepts a data URI if you already encoded one yourself, and a Lottie sticker can be handed over as the animation object rather than bytes:

```ts
await guild.stickers.create({
	name: "spin",
	description: "a spinning blob",
	tags: "spin",
	file: { v: "5.5.7", layers: [] }          // serialized for you
});
```

Both throw before spending a request when the file is not a format the endpoint accepts.

The same is true of the image fields that travel inline in a JSON body - `guild.modify()`'s icon, splash, discovery splash, and banner, `guild.roles.create()` / `role.modify()`'s icon, a scheduled event's image, a webhook's avatar, and `guild.soundboardSounds.create()`'s sound - all take bytes and are encoded on the way out. On an edit, leaving a field out keeps the current image and passing `null` clears it:

```ts
await guild.modify({ icon: await readFile("./icon.png") });
await guild.modify({ banner: null });     // removes the banner
```

### Threads

Threadable channels (text, announcement, forum) expose a `threads` manager. Threads are channels, so anything it creates or lists lands in `guild.channels` rather than a separate collection:

```ts
const thread = await channel.threads.create({ name: "bug-triage", autoArchiveDuration: 1440 });
await thread.send("Starting here.");

// a thread hanging off an existing message
await channel.threads.createFromMessage(message.id, { name: "spinoff" });

// a forum post carries its first message in the same request
await forum.threads.createForumPost({
	name: "Read me first",
	message: { content: "Rules and guidelines", embeds: [ embed ] },
	appliedTags: [ tagId ],
});

const active = await channel.threads.fetchActive();
const { threads, hasMore } = await channel.threads.fetchArchived({ limit: 25 });
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

Gateway messages flow through a fixed pipeline: `WSClient` (`src/WSClient.ts`) owns the raw socket, runs the `Hello` → `Identify` → heartbeat handshake, and hands every `DISPATCH` payload to a dispatcher built by `CreateDispatch()` (`src/EventDispatcher.ts`), which routes each gateway event to a handler in `src/Events/`. Handlers update the relevant cache/structure and then emit the public-facing event via `Client.emit(...)`. Structures (`Guild`, `Channel`, `Message`, etc.) are thin wrappers around the raw API objects that expose the methods you call, like `message.reply()` or `member.kick()`, all routed back through `client.rest` (`src/Rest.ts`), which authenticates every request, retries `429`s/transient `5xx`s, and tracks rate limits per route via a `TTLCache` (`src/DataStructures/TTLCache.ts`). Requests sharing a bucket are queued and sent one at a time, and an exhausted bucket (`X-RateLimit-Remaining: 0`) is waited out before sending rather than after being rejected, so a burst of concurrent calls paces itself instead of stampeding into a wall of `429`s.

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

- `WSClient` handles `GatewayOpCodes.Reconnect` / `InvalidSession`, tracks `session_id`/`resume_gateway_url` from `READY`, and resumes instead of re-identifying when possible; heartbeat ACKs are tracked and an unacked heartbeat triggers a reconnect. Reconnects are close-code aware: fatal codes (bad token, disallowed intents, bad shard/API version) stop retrying and emit `WSEvents.Disconnect`, session-invalidating codes re-identify instead of resuming, and everything else retries with exponential backoff + jitter up to `maxReconnectAttempts` (default 10). A successful resume is observable as `ClientEvents.Resumed`; `ClientEvents.Ready` is not emitted again, since the client was already ready and the gateway replays whatever was missed.
- Gateway event coverage is partial. Dispatch handlers exist for guilds, channels, threads (including membership), members, roles, messages, reactions, emojis, stickers, soundboard sounds, invites, integrations, presences, user profile updates, and typing indicators, but events like `VoiceStateUpdate`, stage instances, voice channel effects, entitlements, and subscriptions are not yet handled.
- `channel.messages` holds no cache, unlike every other manager. A channel's message history is unbounded, so `fetch(id)` and `fetch({ limit, before, after, around })` always hit the API and hand back fresh `Message` instances — there is nothing to read synchronously and nothing to go stale. It is available on text, voice, and thread channels; announcement and stage channels do not have it yet. `before`, `after`, and `around` are mutually exclusive.
- `guild.integrations` is not seeded from `GUILD_CREATE` — Discord does not send integrations there — so it starts empty and only fills from `Integration*` gateway events or an explicit `guild.integrations.fetchAll()`. `GuildIntegrationsUpdate` says only that *something* changed in a guild, so treat it as a signal to refetch.
- `guild.webhooks` is likewise never seeded from `GUILD_CREATE`, and `WebhooksUpdate` tells you only which channel changed, not which webhook or how — call `guild.webhooks.fetchChannel(channelId)` to resync. A `Webhook` fetched without a token (anything the bot's own application did not create) cannot be executed, so `webhook.send()` throws for those — as do `fetchMessage()`, `editMessage()`, and `deleteMessage()`, which have no bot-authenticated route to fall back on.
- `webhook.send()` returns a `WebhookMessage`, not a `Message`. The message belongs to the webhook rather than to the bot, so editing and deleting it go through the webhook's token instead of the channel — which is also why they need no permissions. Its `reply()`, `pin()`, and `react()` are still ordinary channel operations and need the bot's own permissions as usual.
- `guild.soundboardSounds` is keyed by sound id, not `id` — Discord's soundboard sound object uses `sound_id`, which the `SoundboardSound` structure surfaces as `soundId`. The cache is seeded from `GUILD_CREATE` and kept current by the `SoundboardSound*` events, which need the `GuildExpressions` intent. `SoundboardSoundsUpdate` upserts every sound it carries but never evicts: Discord does not document that payload as a guaranteed full-list replacement, so `GUILD_SOUNDBOARD_SOUND_DELETE` is treated as the only authoritative removal signal.
- `guild.members` fills from `GUILD_CREATE`, the member gateway events, and both fetch paths above. Prefer `fetchGateway()` over `fetchAll()` for a full member list: `fetchAll()` costs one heavily rate limited REST request per 1000 members, while the gateway streams the same members back as `GUILD_MEMBERS_CHUNK` dispatches. Chunks are matched to their request by a `nonce` the manager generates, so concurrent `fetchGateway()` calls do not cross-talk; a request whose chunks never arrive rejects on its `time` timeout (30s by default) rather than hanging.
- `channel.threads` has no cache of its own, since threads are channels: `create()`, `createForumPost()`, `createFromMessage()`, and the `fetchActive()` / `fetchArchived()` / `fetchArchivedPrivate()` / `fetchJoinedArchivedPrivate()` listings all upsert into `guild.channels`. Discord has no per-channel active listing, so `fetchActive()` requests the guild-wide one and narrows the result. `before` is an archive timestamp on the archived listings but a thread ID on the joined-private one. Active threads are seeded into `guild.channels` from `GUILD_CREATE`, so they are readable on connect without a fetch; archived threads still require one.
- `thread.members` is only ever complete for the current user without the **privileged** `GuildMembers` intent, and `ThreadMembersUpdate` caps its `added` list at 50 either way, so call `thread.members.fetchAll()` when you need the full membership of a busy thread. Threads themselves live in `guild.channels` alongside regular channels, not in a separate collection.
- File uploads take raw bytes, never a path — this library never touches the disk, so you read the file and it identifies the type from the contents rather than trusting an extension. That covers `guild.emojis.create()`, `guild.stickers.create()`, and every inline image field (guild icon/splash/discovery splash/banner, role icons, scheduled event images, webhook avatars, and soundboard sounds); an already-encoded data URI is still accepted everywhere. Application-owned emojis have no create path at all.
- `PresenceUpdate` and `guild.presences` require the **privileged** `GuildPresences` intent, which must also be enabled for the application in the Discord developer portal. Without it the event never fires and the cache stays empty. Offline users are not retained, so `member.presence` is `undefined` for anyone offline, unseen, or when the intent is off.
- Interactions are supported — slash and context menu commands, autocomplete, buttons, select menus, and modals all have typed structures (`src/Structures/Interactions/`) and builders (`src/Builders/`), and commands are registered with `client.registerPublicCommands()` / `client.registerGuildCommands()`. `ephemeral` belongs only on the responses that send a new message — `reply()`, `deferReply()`, and `followUp()`; a response's visibility is fixed when the interaction is first answered, so `editReply()` and a component's `update()` reject the key rather than accepting and ignoring it. Components v2 is built out: `TextDisplay`, `Thumbnail`, `Section`, `MediaGallery`, `File`, `Separator`, and `Container` all have builders, and the send path sets `IS_COMPONENTS_V2` for you, rejects the v1/v2 combinations Discord refuses, enforces the message-wide limits, and resolves `attachment://` references against the payload's own attachments so a mismatched filename throws locally instead of coming back as a 400. One gap remains — monetization is unmodeled: `interaction.entitlements` is still a raw `JSONObject[]`, and while `SKUButtonBuilder` can render a purchase button, there is no entitlement or SKU API and no way to observe the result.
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