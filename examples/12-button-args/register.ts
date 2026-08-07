import { Client } from "../../dist/index.js";
import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

const commands = Object.values(Commands).map(command => command.data);

// Global registration, so allow up to an hour for changes to appear.
// registerGuildCommands(commands, guildID) is instant and the better one to develop against.
client.registerPublicCommands(commands)
	.then(() => {
		console.log('Slash commands registered!');
	})
	.catch(console.error);