import { Client, SlashCommandBuilder } from "../../dist/index.js";

// Discord recommends only re-registering commands when they've actually changed,
// not on every boot - so this lives in its own script, run separately from the bot.
// No login needed: registering commands is a plain REST call, the gateway is never touched.
const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

const commands = [
	new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with pong'),

	new SlashCommandBuilder()
		.setName('coinflip')
		.setDescription('Flips a coin'),

	new SlashCommandBuilder()
		.setName('greet')
		.setDescription('Greets a user')
		.addUserOption('user', 'The user to greet', { required: true })
];

// registerPublicCommands() makes all the commands public
// There is also registerGuildCommands(commands, guildID) if you want the commands locked to just 1 guild
client.registerPublicCommands(commands).then(() => {
	console.log('Slash commands registered!');
});