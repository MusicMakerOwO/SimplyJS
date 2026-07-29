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
	if (!message.guild) return;

	const args = message.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift();
	if (!command) return;

	if (command === 'userinfo') {
		const embed = new EmbedBuilder()
			.setTitle(`${message.user.username}`)
			.setColor("#5865F2")
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
