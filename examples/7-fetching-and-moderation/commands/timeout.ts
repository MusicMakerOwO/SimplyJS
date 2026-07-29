import { CommandHandler } from "../types.js";
import { resolveMember } from "../resolveMember";

export default {
	// "!timeout @user 10" -> times out for 10 minutes
	// "!timeout @user 0" -> clears an active timeout
	name: 'timeout',
	async execute(client, message, args) {
		const member = await resolveMember(client, message.guild_id!, args.shift());
		if (!member) return message.reply("Couldn't find that member");

		const minutes = parseInt(args.shift() ?? '') || 0;
		const expires = minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;

		try {
			await member.timeoutUntil(expires, args.join(' ') || undefined);
			await message.reply(expires
				? `Timed out **${member.user.username}** for ${minutes} minute(s)`
				: `Cleared **${member.user.username}**'s timeout`);
		} catch (error) {
			console.log(error);
			await message.reply("Something went wrong - timeouts can't exceed 28 days");
		}
	}
} as CommandHandler;