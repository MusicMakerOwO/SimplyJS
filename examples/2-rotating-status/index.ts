import { ActivityType, Client, ClientEvents } from "../../dist/index.js";

const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);

	const statuses = [
		{ type: ActivityType.PLAYING, name: "with SimplyJS" },
		{ type: ActivityType.PLAYING, name: "the guitar" },
		{ type: ActivityType.LISTENING, name: "some tunes" },
		{ type: ActivityType.LISTENING, name: "a podcast" },
		{ type: ActivityType.WATCHING, name: "the matrix" },
		{ type: ActivityType.CUSTOM, name: "Better than DiscordJS 🔥"}
	];

	let i = 0;
	setInterval(() => {
		const status = statuses[i];
		client.setStatusMessage(status.type, status.name);
		i = (i + 1) % statuses.length;
	}, 5_000).unref();
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});