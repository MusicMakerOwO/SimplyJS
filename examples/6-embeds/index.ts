import { Client, ClientEvents, EmbedBuilder } from "../../dist/index.js";

const client = new Client({
	token: process.env.TOKEN!,
	intents: ["Guilds", "GuildMessages", "MessageContent"]
});

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

const PREFIX = '!';
client.on(ClientEvents.MessageCreate, async (message) => {
	if (!message.content.startsWith(PREFIX)) return;
	// Earlier examples checked `message.guild_id`, which is the raw ID off the payload and is
	// set for every guild message. `message.guild` is the resolved Guild from the cache, so
	// this form doubles as "and we actually have that guild cached".
	if (!message.guild) return;

	const args = message.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift();
	if (!command) return;

	// Every setter returns the builder, so they chain. 4-prefix-handler's help command sets
	// the same fields by plain assignment instead - both produce the same payload.
	// Discord caps embeds at 25 fields and 6000 characters across all of them; the builder
	// throws when you cross a limit rather than letting Discord reject the whole message.
	if (command === 'userinfo') {
		const embed = new EmbedBuilder()
			.setTitle(`${message.user.username}`)
			.setColor("#5865F2")
			// `inline: true` lets short fields sit side by side rather than stacking,
			// up to three across
			.addFields([
				{ name: "ID", value: message.user.id, inline: true },
				{ name: "Bot?", value: message.user.bot ? "Yes" : "No", inline: true }
			])
			.setFooter({ text: `Requested in #${message.channel?.name ?? "unknown"}` })
			.setTimestamp(new Date());

		// EmbedBuilder is sent as-is, no need to call .toJSON() or similar
		await message.reply({ embeds: [embed] });
		return;
	}

	if (command === 'error') {
		// setColor also accepts hex numbers directly: 0xED4245 == "#ED4245"
		const embed = new EmbedBuilder()
			.setDescription("⚠️ Something went wrong, try again later.")
			.setColor(0xED4245);

		await message.reply({ embeds: [embed] });
		return;
	}
});

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});
