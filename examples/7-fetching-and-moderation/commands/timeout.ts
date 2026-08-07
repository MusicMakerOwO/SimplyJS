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
		// A timeout is stored as the moment it ends, not a duration, so pass an absolute
		// Date. Passing null is what clears one early.
		const expires = minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;

		try {
			await member.timeoutUntil(expires, args.join(' ') || undefined);
			await message.reply(expires
				? `Timed out **${member.user.username}** for ${minutes} minute(s)`
				: `Cleared **${member.user.username}**'s timeout`);
		} catch (error) {
			console.log(error);
			// Usually a missing Moderate Members permission, or the target outranking the
			// bot. Discord also refuses any timeout further out than 28 days.
			await message.reply("Something went wrong - do I have the Moderate Members permission?");
		}
	}
} as CommandHandler;