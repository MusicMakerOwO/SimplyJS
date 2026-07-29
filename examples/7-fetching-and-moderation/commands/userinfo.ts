import { CommandHandler } from "../types.js";

export default {
	name: 'userinfo',
	async execute(client, message, args) {
		const id = args[0];
		if (!id) return message.reply("Must provide a user ID");

		const user = client.users.get(id) ?? await client.users.fetch(id).catch(() => null);
		if (!user) return message.reply("Couldn't find that user");

		await message.reply(`**${user.username}** (${user.id}) - ${user.bot ? "Bot" : "User"}`);
	}
} as CommandHandler;
