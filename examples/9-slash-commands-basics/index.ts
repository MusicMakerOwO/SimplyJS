import { Client, ClientEvents } from "../../dist/index.js";

// Run `register.ts` first (and again whenever the commands change)
// Discord discourages registering commands on every boot
const client = new Client({
	token: process.env.TOKEN!,
	// Slash commands need no message intents at all. Discord hands the whole interaction to
	// the bot when someone runs one, so there's nothing to listen in on and nothing
	// privileged to enable. This is the main reason to prefer them over prefix commands.
	intents: ["Guilds"]
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// `InteractionCreate` fires for every interaction regardless of the type
// `SlashCommandUsed` fires only for slash commands
//
// Every interaction comes with a deadline: Discord wants an acknowledgement within 3 seconds
// or it shows the user "This interaction failed", even if the work later succeeds. Replying
// counts as acknowledging, so the commands below are fine. Anything slower - a database
// query, an API call - should call `interaction.deferReply()` first, which buys 15 minutes,
// then finish with `interaction.editReply()`.
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
		// Options are read back by the name they were registered with in register.ts.
		// The `!` is needed because `{ required: true }` is a runtime rule Discord enforces,
		// not something the builder can feed back into the return type here.
		const user = interaction.options.getUser('user')!; // required field
		// Putting a User straight into a template string calls User.toString(), which
		// produces "<@123456789>" - the same mention format the prefix examples parsed with
		// a regex, just going the other way.
		await interaction.reply(`Hello, ${user}!`);
		return;
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});