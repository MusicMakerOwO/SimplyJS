import { Client } from "../../dist/index.js";

import * as Events from "./events";

// Each intent below buys a specific set of events, and an event with no matching intent
// simply never fires. Mapping this example's handlers onto the list:
//   Guilds          -> guild and channel lifecycle, needed for the caches to fill at all
//   GuildMessages   -> messageCreate, messageDelete
//   GuildMembers    -> privileged; memberCreate, memberDelete
//   GuildModeration -> guildBanAdd
//   MessageContent  -> privileged; fills in message.content, which messageCreate logs
// A handler that never runs is nearly always a missing intent rather than a broken handler.
const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages", "GuildMembers", "GuildModeration", "MessageContent"]
});

// Splitting event handling into one file per event keeps things tidy as a bot grows.
// In the wider bot communities this is often referred to as the "event handler".
//
// Registering before login() is deliberate here: it guarantees a listener is attached before
// any event can arrive. The earlier examples call login() first and are equally fine, since
// connecting takes several round trips, but this ordering never has to rely on that.
for (const event of Object.values(Events)) {
	// TypeScript can't correlate `name` with `execute`'s argument types once handlers
	// are collected into a single array, so `any` is needed at this registration
	// boundary even though every individual handler file above is fully type-safe.
	client.on(event.name, (...args: any[]) => event.execute(client, ...args));
}

client.login();

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});