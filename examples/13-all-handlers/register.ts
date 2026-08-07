import { Client } from "../../dist/index.js";
import * as Commands from "./commands";

const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

const commands = Object.values(Commands).map(command => command.data);

client.registerPublicCommands(commands).then(() => {
	console.log('Slash commands registered!');
});