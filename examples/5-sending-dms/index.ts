import { Client, ClientEvents } from "../../dist/index.js";

const client = new Client({
	token: process.env.TOKEN!,
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
		if (!message.channel) return;
		await message.channel.send(args.join(' ') || "📢");
		return;
	}

	// "!reply" -> replies with a ping (default)
	// "!reply silent" -> replies without pinging the original author
	if (command === 'reply') {
		const silent = args[0] === 'silent';
		await message.reply("This is a reply!", { ping: silent ? true : false });
		return;
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});