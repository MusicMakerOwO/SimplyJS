import { Client } from "../../dist/index.js";
import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

// Buttons and selects are never registered, only commands are. A component is created when a
// message is sent, so Discord learns about it then rather than up front.
const commands = Object.values(Commands).map(command => command.data);

// Global registration, so allow up to an hour for changes to appear.
// registerGuildCommands(commands, guildID) is instant and the better one to develop against.
client.registerPublicCommands(commands)
	.then(() => {
		console.log('Slash commands registered!');
	})
	.catch(console.error);