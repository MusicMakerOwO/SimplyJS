import { CommandHandler } from "../types.js";
import { resolveMember } from "../resolveMember";

export default {
	// "!nickname @user New Name" -> "!nickname @user" clears it
	name: 'nickname',
	async execute(client, message, args) {
		const member = await resolveMember(client, message.guildId!, args.shift());
		if (!member) return message.reply("Couldn't find that member");

		try {
			await member.setNickname(args.join(' ') || null);
			await message.reply(`Updated **${member.user.username}**'s nickname`);
		} catch (error) {
			console.log(error);
			await message.reply("Something went wrong - do I have the Manage Nicknames permission?");
		}
	}
} as CommandHandler;