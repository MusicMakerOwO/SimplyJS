import { Client, ClientEvents } from "../../dist/index.js";
import { FullClient } from "./types.js";

import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages", "MessageContent"]
}) as FullClient;

// Create the command cache on client for convenience.
// This isn't a requirement, but it's the most common approach.
client.commands = new Map();
// Binding commands directly to the client means you now have a
// global reference (given you can access the client) and makes
// utilities like a help command possible

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

// This is a very simple prefix "handler".
// The term was coined by the DiscordJS community and has since become the standard.
// Anything run in here applies to all commands, perfect for permission checks, database access, or logs

const PREFIX = '!';
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith(PREFIX)) return;

	if (!message.guild_id) return;

	const args = message.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift();
	if (!command) return;

	// Basic logs :D
	console.log(`@${message.user.username} > ${PREFIX}${command} ${args.join(' ')}`);

	// find the handler, using command name as key
	const handler = client.commands.get(command);
	if (!handler) {
		await message.reply(`Unknown command "${command}" - Try !help for a list of commands`);
		return;
	}

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