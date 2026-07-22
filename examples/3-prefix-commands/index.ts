import { Client, ClientEvents } from "../../dist/index.js";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages", "MessageContent"]
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// Prefix commands are often the forefront of using bots.
// However, your code will get messy very quickly if you do not take care to organize it.
// See the next example for ways to combat this.

const PREFIX = '!';
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith(PREFIX)) return;

	// ignore messages not sent in a guild
	if (!message.guild_id) return;

	// "!say hello world" -> ["say", "hello", "world"]
	const args = message.content.slice(PREFIX.length).split(/ +/);
	// The first argument is the command name, we steal that from above
	const command = args.shift();
	if (!command) return; // user only typed "!" and nothing else

	// command: "say"
	// args: ["hello", "world"]

	if (command === 'say') {
		await message.channel!.send(args.join(' '));
		return;
	}

	if (command === 'random') {
		// attempt to convert the input to a number, default to 0 if unable
		// "123" -> 123
		// "hello" -> 0
		const min = parseInt(args[0]) || 0;
		const max = parseInt(args[1]) || 0;
		const value = Math.floor(Math.random() * (max - min)) + min;
		await message.reply(`A number was pulled out of a hat: ${value}`);
		return;
	}

	if (command === 'coinflip') {
		const heads = Math.random() > 0.5; // true/false
		const result = heads ? "heads" : "tails";
		await message.reply(`A coin was flipped and came up **${result}**`);
	}

	if (command === 'kick') {
		if (args.length === 0) {
			return message.reply('Must provide a user to kick');
		}
		const targetUser = args.shift()!;
		const reason = args.length > 0
			? args.join(' ')
			: 'No reason provided';

		const targetID = (/\d+/.exec(targetUser) ?? [])[0];
		if (!targetID) return message.reply(`Unknown user "${args[0]}", either ping them or type their ID`);

		const member =
			message.guild!.members.get(targetID) ?? // check cache first
			await message.guild!.members.fetch(targetID).catch( () => null ); // fetch from API, return null if error
		if (!member) return message.reply("That user is not in the server");

		try {
			await member.kick(reason);
			await message.reply("Successfully kicked user");
		} catch (error) {
			console.log(error);
			await message.reply("Something went wrong!");
		}

		return;
	}

});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});