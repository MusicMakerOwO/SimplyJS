import { Client, ClientEvents } from "../../dist/index.js";
import { FullClient } from "./types.js";

import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	// "GuildMembers" is the second privileged intent, alongside MessageContent. Both have to
	// be enabled under Bot > Privileged Gateway Intents in the Developer Portal. Without it
	// the member cache stays empty and never fills, so !members reports zero and every
	// lookup falls through to a REST fetch. As with MessageContent, nothing errors.
	intents: ["Guilds", "GuildMessages", "GuildMembers", "MessageContent"]
}) as FullClient;

client.commands = new Map();

for (const command of Object.values(Commands)) {
	if (client.commands.has(command.name)) {
		console.log(`Duplicate command name: "${command.name}" - ignoring...`);
		continue;
	}
	client.commands.set(command.name, command);
}

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

const PREFIX = '!';
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith(PREFIX)) return;
	if (!message.guild_id) return; // these commands only make sense from a guild

	const args = message.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift();
	if (!command) return;

	const handler = client.commands.get(command);
	if (!handler) return; // silently ignore unknown commands

	try {
		await handler.execute(client, message, args);
	} catch (error) {
		console.log(error);
		await message.reply("Something went wrong!");
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});
