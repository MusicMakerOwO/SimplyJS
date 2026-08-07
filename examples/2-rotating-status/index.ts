import { ActivityType, Client, ClientEvents } from "../../dist/index.js";

const client = new Client({
	token: process.env.TOKEN!,
	// No intents at all. Intents only gate *incoming* events, and this bot never reacts
	// to anything - it just pushes its own status outward. Ready always fires regardless.
	intents: []
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);

	// The "status" shown under a bot's name is an activity: a type plus a name.
	// The type decides the verb Discord puts in front of the name, so PLAYING + "the guitar"
	// renders as "Playing the guitar". CUSTOM is the exception and shows the name on its own.
	const statuses = [
		{ type: ActivityType.PLAYING, name: "with SimplyJS" },
		{ type: ActivityType.PLAYING, name: "the guitar" },
		{ type: ActivityType.LISTENING, name: "some tunes" },
		{ type: ActivityType.LISTENING, name: "a podcast" },
		{ type: ActivityType.WATCHING, name: "the matrix" },
		{ type: ActivityType.CUSTOM, name: "Better than DiscordJS 🔥"}
	];

	// Walk the list forever, wrapping back to the start with the modulo.
	// Discord rate limits presence updates to roughly 5 per 20 seconds, so keep the
	// interval comfortably above ~4s or the gateway will start dropping the extras.
	let i = 0;
	setInterval(() => {
		const status = statuses[i];
		client.setStatusMessage(status.type, status.name);
		i = (i + 1) % statuses.length;
		// .unref() tells Node this timer isn't a reason to keep the process alive.
		// Without it, the interval alone would keep the bot running forever after
		// client.destroy() had already closed the gateway. This is a best practice
		// no matter where you go.
	}, 5_000).unref();
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});