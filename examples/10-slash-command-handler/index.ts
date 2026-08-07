import { Client, ClientEvents } from "../../dist/index.js";
import { FullClient } from "./types.js";

import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds"]
}) as FullClient;

// Create the command cache on client for convenience.
// This isn't a requirement, but it's the most common approach.
// Commands are keyed by `data.name`, which is the name registered with Discord and the one
// that comes back on the interaction. The filename and the export alias are never involved.
client.commands = new Map();

for (const command of Object.values(Commands)) {
	// Throwing rather than warning, unlike 4-prefix-handler: a duplicate slash command name
	// is unrecoverable, since Discord would only keep one of them anyway. Better to fail at
	// boot than to silently run whichever happened to load second.
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
		// Worth knowing before you build on this: an interaction can only be replied to once.
		// If a command replies and *then* throws, this line tries to reply a second time and
		// Discord rejects it, so the real error gets buried under a second one. A production
		// handler tracks whether it has already responded and switches to followUp() when it
		// has - left simple here to keep the routing legible.
		await interaction.reply("Something went wrong!");
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});