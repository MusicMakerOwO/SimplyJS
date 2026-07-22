import { Client, ClientEvents } from "../../dist/index.js";

// Client is the main entry point - it manages the gateway connection,
// caches, and exposes all events and actions.
const client = new Client({
	token: process.env.TOKEN!,
	// Intents tell Discord which kinds of events this bot wants to receive.
	// A good rule of thumb is to only enable the ones we need.
	// Excess intents may create excessive ram usage or fire events that you don't even care about.
	intents: ["Guilds", "GuildMessages", "MessageContent"]
});

// Start the gateway connection. login() is async but we don't await it here;
// the bot will emit Ready once it's fully connected.
client.login();

// Fires once the handshake completes and the bot is ready to receive events.
client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// Fires for every message the bot can see in a guild.
client.on(ClientEvents.MessageCreate, async (message) => {
	if (message.content === '!ping') {
		await message.reply("Pong!");
		return;
	}
});

// Clean shutdown on Ctrl+C - lets the bot drain and close the gateway
// connection gracefully before the process exits.
process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');

	// process.exit(0) is effectively the same but this is the propper method according to mozilla
	process.exitCode = 0;
});