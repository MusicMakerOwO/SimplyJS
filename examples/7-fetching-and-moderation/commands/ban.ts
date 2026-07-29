import { CommandHandler } from "../types.js";
import { resolveMember } from "../resolveMember";

export default {
	name: 'ban',
	async execute(client, message, args) {
		const member = await resolveMember(client, message.guild_id!, args.shift());
		if (!member) return message.reply("Couldn't find that member");

		try {
			await member.ban({ reason: args.join(' ') || undefined });
			await message.reply(`Banned **${member.user.username}**`);
		} catch (error) {
			console.log(error);
			await message.reply("Something went wrong - do I have the Ban Members permission?");
		}
	}
} as CommandHandler;