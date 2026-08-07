import { Client, ClientEvents, ClientEventMap } from "../../dist/index.js";
import { CommandHandler, ButtonHandler, SelectHandler, EventHandler, FullClient } from "./types.js";

import * as Commands from "./commands";
import * as Buttons from "./buttons";
import * as Selects from "./selects";
import * as Events from "./events";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds"]
}) as FullClient;

// One cache per interaction kind, all keyed the same way: by the identifier Discord sends
// back on the interaction (`commandName` for commands, `customId` for buttons/selects).
client.commands = new Map();
for (const command of Object.values(Commands) as CommandHandler[]) {
	if (client.commands.has(command.data.name)) {
		throw new Error(`Duplicate command name: "${command.data.name}"`);
	}
	client.commands.set(command.data.name, command);
}

client.buttons = new Map();
for (const button of Object.values(Buttons) as ButtonHandler[]) {
	if (client.buttons.has(button.customId)) {
		throw new Error(`Duplicate button customId: "${button.customId}"`);
	}
	client.buttons.set(button.customId, button);
}

client.selects = new Map();
for (const select of Object.values(Selects) as SelectHandler[]) {
	if (client.selects.has(select.customId)) {
		throw new Error(`Duplicate select customId: "${select.customId}"`);
	}
	client.selects.set(select.customId, select);
}

// Event handler, see examples/8-event-handler for more details
for (const event of Object.values(Events) as EventHandler<keyof ClientEventMap>[]) {
	client.on(event.name, (...args: any[]) => event.execute(client, args as ClientEventMap[keyof ClientEventMap]));
}

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});