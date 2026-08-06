import { Client } from "../../dist/index.js";
import * as Commands from "./commands";

// Discord recommends only re-registering commands when they've actually changed,
// not on every boot - so this lives in its own script, run separately from the bot.
// No login needed: registering commands is a plain REST call, the gateway is never touched.
const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

const commands = Object.values(Commands).map(command => command.data);

client.registerPublicCommands(commands).then(() => {
	console.log('Slash commands registered!');
});
