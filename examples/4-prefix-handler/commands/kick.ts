import { CommandHandler } from "../types.js";

export default {
    name: 'kick',
    async execute(client, message, args) {
        if (args.length === 0) {
            return message.reply('Must provide a user to kick');
        }
        const targetUser = args.shift()!;
        const reason = args.length > 0
            ? args.join(' ')
            : 'No reason provided';

        // A ping arrives as the literal text "<@123456789>", so the first run of digits is
        // the user's ID whether they pinged or typed the ID out.
        const targetID = ( /\d+/.exec(targetUser) ?? [] )[0];
        if (!targetID) return message.reply(`Unknown user "${args[0]}", either ping them or type their ID`);

        const member =
			// check cache, avoids rate limit and tons faster
            message.guild!.members.get(targetID) ??
			// otherwise fetch from API, returning null rather than throwing when there's
			// no such member - that's what lets the check below give a useful message
            await message.guild!.members.fetch(targetID).catch( () => null );
        if (!member) return message.reply("That user is not in the server");

        try {
            await member.kick(reason);
            await message.reply("Successfully kicked user");
        } catch (error) {
            console.log(error);
            await message.reply("Something went wrong!");
        }
    }
} as CommandHandler;