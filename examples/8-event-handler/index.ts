import { Client, ClientEventMap } from "../../dist/index.js";
import { EventHandler } from "./types.js";

import * as Events from "./events";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages", "GuildMembers", "GuildModeration", "MessageContent"]
});

// Splitting event handling into one file per event keeps things tidy as a bot grows.
// In the wider bot communities this is often referred to as the "event handler".
function registerEvent(handler: EventHandler): void {
	// TypeScript can't correlate `name` with `execute`'s argument types once handlers
	// are collected into a single array, so `any` is needed at this registration
	// boundary even though every individual handler file above is fully type-safe.
	client.on(handler.name, (...args: unknown[]) => handler.execute(client, ...(args as ClientEventMap[keyof ClientEventMap])) as any);

	/*
	JS equivalent:
	client.on(handler.name, (...args) => {
		handler.execute(client, ...args);
	});
	*/
}

for (const event of Object.values(Events)) {
	registerEvent(event as EventHandler);
}

client.login();

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});