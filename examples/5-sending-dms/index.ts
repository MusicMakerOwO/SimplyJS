import { Client, ClientEvents } from "../../dist/index.js";

const client = new Client({
	token: process.env.TOKEN!,
	// "DirectMessages" is here so the bot can *receive* replies in DMs. Sending one needs no
	// intent at all - intents only ever gate incoming events, never outgoing requests.
	intents: ["Guilds", "GuildMessages", "DirectMessages", "MessageContent"]
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

const PREFIX = '!';
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith(PREFIX)) return;
	if (!message.guild_id) return; // these commands only make sense from a guild

	const args = message.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift();
	if (!command) return;

	// "!dm hello there" -> DMs the command author with "hello there"
	// message.user is who sent the message - User.send() opens/reuses a DM channel automatically
	if (command === 'dm') {
		try {
			await message.user.send(args.join(' ') || "Hi!");
			await message.reply("Check your DMs!");
		} catch {
			// DMs can fail if the user has them closed or has blocked the bot
			await message.reply("I couldn't DM you - do you have DMs disabled?");
		}
		return;
	}

	// "!announce some news" -> sends a standalone message in the current channel,
	// as opposed to reply() which attaches to the triggering message
	if (command === 'announce') {
		// Same nullable channel as in 3-prefix-commands, guarded with an early return here
		// instead of a `!`. Either is fine; this one can't be wrong if the cache misses.
		if (!message.channel) return;
		await message.channel.send(args.join(' ') || "📢");
		return;
	}

	// A reply always shows the "replying to" bar. `ping` controls the separate question of
	// whether the author also gets a notification for it, and defaults to false.
	// "!reply" -> replies quietly, no notification
	// "!reply loud" -> replies and pings the original author
	if (command === 'reply') {
		const loud = args[0] === 'loud';
		await message.reply("This is a reply!", { ping: loud });
		return;
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});