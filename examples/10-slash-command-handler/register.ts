import { Client } from "../../dist/index.js";
import * as Commands from "./commands";

// Discord recommends only re-registering commands when they've actually changed,
// not on every boot - so this lives in its own script, run separately from the bot.
// No login needed: registering commands is a plain REST call, the gateway is never touched.
const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

// The improvement over 9-slash-commands-basics: the builders aren't written out again here,
// they're pulled off the same command files index.ts loads. Adding a command file now
// registers it and handles it, with no second list to keep in sync.
const commands = Object.values(Commands).map(command => command.data);

// Global registration, so allow up to an hour for changes to show up in Discord.
// registerGuildCommands(commands, guildID) updates instantly and is the easier one to
// develop against.
client.registerPublicCommands(commands)
	.then(() => {
		console.log('Slash commands registered!');
	})
	.catch(console.error);
