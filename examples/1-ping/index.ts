// Every example imports from "../../dist" because they live inside the SimplyJS repo.
// In your own project this line is `import { Client, ClientEvents } from "simplyjs";`
import { Client, ClientEvents } from "../../dist/index.js";

// Client is the main entry point, it manages the gateway connection, caches, and exposes all events and actions.
const client = new Client({
	// Your bot token, from the Discord Developer Portal under Applications > (your app) > Bot.
	// Never commit it. Node can load one from a file for you: `node --env-file=.env index.ts`
	// with a .env containing `TOKEN=your-token-here`.
	// A more common aproach however is using a package called dotenv: https://npmjs.org/dotenv
	token: process.env.TOKEN!,

	// Intents tell Discord which kinds of events this bot wants to receive.
	// A good rule of thumb is to only enable the ones we need.
	// Excess intents may create excessive ram usage or fire events that you don't even care about.
	//
	// "MessageContent" is a *privileged* intent - it has to be switched on manually under
	// Bot > Privileged Gateway Intents in the Developer Portal. If it isn't, the bot still
	// connects and logs in normally, but every `message.content` arrives as an empty string,
	// so the `!ping` check below silently never matches. No error is thrown either way, so
	// this is worth checking first whenever a message command "does nothing".
	intents: ["Guilds", "GuildMessages", "MessageContent"]
});

// Start the gateway connection. login() is async but we don't await it here;
// the bot will emit Ready once it's fully connected.
client.login();

// Attaching listeners after login() is safe: connecting takes several network round trips,
// so the rest of this file has long since finished running by the time any event arrives.
// Ordering the two the other way round works exactly the same.

// Fires once the handshake completes and the bot is ready to receive events.
// `user` is the bot's own account, not whoever invited it.
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

	// Setting exitCode lets Node finish what it's already doing and exit on its own,
	// where process.exit() would cut off any pending writes. Same result here, better habit.
	process.exitCode = 0;
});