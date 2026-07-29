import { Client } from "../../dist/index.js";

import * as Events from "./events";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages", "GuildMembers", "GuildModeration", "MessageContent"]
});

// Splitting event handling into one file per event keeps things tidy as a bot grows.
// In the wider bot communities this is often referred to as the "event handler".
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