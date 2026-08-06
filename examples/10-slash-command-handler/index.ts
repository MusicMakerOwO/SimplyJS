import { Client, ClientEvents } from "../../dist/index.js";
import { FullClient } from "./types.js";

import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds"]
}) as FullClient;

// Create the command cache on client for convenience.
// This isn't a requirement, but it's the most common approach.
client.commands = new Map();

for (const command of Object.values(Commands)) {
	if (client.commands.has(command.data.name)) {
		throw new Error(`Duplicate command name: "${command.data.name}"`);
	}
	client.commands.set(command.data.name, command);
}

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// `SlashCommandUsed` fires only for slash commands, so no need to check the interaction type here.
// Anything run in here applies to all commands, perfect for permission checks, database access, or logs
client.on(ClientEvents.SlashCommandUsed, async (interaction) => {
	const command = client.commands.get(interaction.commandName);
	if (!command) {
		await interaction.reply(`Unknown command "${interaction.commandName}"`);
		return;
	}

	try {
		await command.execute(client, interaction);
	} catch (error) {
		console.log(error);
		await interaction.reply("Something went wrong!");
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});