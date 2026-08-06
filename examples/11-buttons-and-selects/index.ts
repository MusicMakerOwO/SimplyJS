import { Client, ClientEvents } from "../../dist/index.js";
import { FullClient } from "./types.js";

import * as Commands from "./commands";
import * as Buttons from "./buttons";
import * as Selects from "./selects";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds"]
}) as FullClient;

// One cache per interaction kind, all keyed the same way commands are: by the
// identifier Discord sends back on the interaction (`commandName` for commands,
// `customId` for buttons/selects).
client.commands = new Map();
for (const command of Object.values(Commands)) {
	if (client.commands.has(command.data.name)) {
		throw new Error(`Duplicate command name: "${command.data.name}"`);
	}
	client.commands.set(command.data.name, command);
}

client.buttons = new Map();
for (const button of Object.values(Buttons)) {
	if (client.buttons.has(button.customId)) {
		throw new Error(`Duplicate button customId: "${button.customId}"`);
	}
	client.buttons.set(button.customId, button);
}

client.selects = new Map();
for (const select of Object.values(Selects)) {
	if (client.selects.has(select.customId)) {
		throw new Error(`Duplicate select customId: "${select.customId}"`);
	}
	client.selects.set(select.customId, select);
}

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// You may start to notice the repetition between the handlers.
// This will be solved in an upcoming example by combining the event handler in.
// This also enables some other really nice features we will showcase.

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

// Buttons and select menus dispatch exactly like slash commands - look the interaction up
// by its identifier and run the matching handler. Discord doesn't error if a component
// interaction is never acknowledged, but the button/select just spins forever on the
// user's end, so every handler below always replies, updates, or defers.
client.on(ClientEvents.ButtonUsed, async (interaction) => {
	const button = client.buttons.get(interaction.customId);
	if (!button) {
		await interaction.reply(`Unknown button "${interaction.customId}"`);
		return;
	}

	try {
		await button.execute(client, interaction);
	} catch (error) {
		console.log(error);
		await interaction.reply("Something went wrong!");
	}
});

client.on(ClientEvents.SelectMenuUsed, async (interaction) => {
	const select = client.selects.get(interaction.customId);
	if (!select) {
		await interaction.reply(`Unknown select menu "${interaction.customId}"`);
		return;
	}

	try {
		await select.execute(client, interaction);
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