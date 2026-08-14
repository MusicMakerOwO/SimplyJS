import { CommandHandler } from "../types.js";
import { resolveMember } from "../resolveMember";

export default {
	name: 'kick',
	async execute(client, message, args) {
		const member = await resolveMember(client, message.guildId!, args.shift());
		if (!member) return message.reply("Couldn't find that member");

		try {
			await member.kick(args.join(' ') || undefined);
			await message.reply(`Kicked **${member.user.username}**`);
		} catch (error) {
			console.log(error);
			await message.reply("Something went wrong - do I have the Kick Members permission?");
		}
	}
} as CommandHandler;