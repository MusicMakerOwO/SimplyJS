import { CommandHandler } from "../types.js";

export default {
	// Users are global, members are per-guild: a User is the account, a Member is that
	// account's membership of one server (nickname, roles, join date). This command wants
	// the account, so it goes through client.users rather than resolveMember.
	name: 'userinfo',
	async execute(client, message, args) {
		const id = args[0];
		if (!id) return message.reply("Must provide a user ID");

		// Same cache-then-fetch shape as resolveMember, one level up on the client.
		const user = client.users.get(id) ?? await client.users.fetch(id).catch(() => null);
		if (!user) return message.reply("Couldn't find that user");

		await message.reply(`**${user.username}** (${user.id}) - ${user.bot ? "Bot" : "User"}`);
	}
} as CommandHandler;
