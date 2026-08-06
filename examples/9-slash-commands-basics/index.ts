import { Client, ClientEvents } from "../../dist/index.js";

// Run `register.ts` first (and again whenever the commands change)
// Discord discouranges registering commands on every boot
const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds"]
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// `InteractionCreate` fires for every interaction regardless of the type
// `SlashCommandUsed` fires only for slash commands
client.on(ClientEvents.SlashCommandUsed, async (interaction) => {
	if (interaction.commandName === 'ping') {
		await interaction.reply('Pong!');
		return;
	}

	if (interaction.commandName === 'coinflip') {
		const heads = Math.random() > 0.5;
		const result = heads ? "heads" : "tails";
		await interaction.reply(`The coin landed on **${result}**`);
		return;
	}

	if (interaction.commandName === 'greet') {
		const user = interaction.options.getUser('user')!; // required field
		await interaction.reply(`Hello, ${user}!`); // calls User.toString() and generates a ping automatically
		return;
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});