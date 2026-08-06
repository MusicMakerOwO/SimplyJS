import { Client, ClientEvents } from "../../dist/index.js";
import { FullClient } from "./types.js";

import * as Commands from "./commands";
import * as Buttons from "./buttons";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds"]
}) as FullClient;

client.commands = new Map();
for (const command of Object.values(Commands)) {
	if (client.commands.has(command.data.name)) {
		throw new Error(`Duplicate command name: "${command.data.name}"`);
	}
	client.commands.set(command.data.name, command);
}

// Buttons are keyed by their base id, not their full customId - `color:red` and
// `color:blue` are two different customIds but both resolve to the single `color` handler.
client.buttons = new Map();
for (const button of Object.values(Buttons)) {
	if (client.buttons.has(button.id)) {
		throw new Error(`Duplicate button id: "${button.id}"`);
	}
	client.buttons.set(button.id, button);
}

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

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

// The customId is split into a base id and its args before the handler lookup - this is the
// whole "button args" trick. Every button in this example writes its customId as
// `id:arg1:arg2:...`, colon-separated, eg. `color:red` or `counter:add:3` - splitting on `:`
// here recovers both pieces. Since Discord round-trips whatever customId a button was built
// with, that string can double as a routing key *and* a place to stash small bits of state,
// so neither a temporary collector nor a database is needed to remember it between clicks.
client.on(ClientEvents.ButtonUsed, async (interaction) => {
	const [id, ...args] = interaction.customId.split(':');

	const button = client.buttons.get(id);
	if (!button) {
		await interaction.reply(`Unknown button "${id}"`);
		return;
	}

	try {
		await button.execute(client, interaction, ...args);
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