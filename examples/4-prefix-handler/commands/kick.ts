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

        const targetID = ( /\d+/.exec(targetUser) ?? [] )[0];
        if (!targetID) return message.reply(`Unknown user "${args[0]}", either ping them or type their ID`);

        const member =
			// check cache, avoids rate limit and tons faster
            message.guild!.members.get(targetID) ??
			// otherwise fetch from API
            await message.guild!.members.fetch(targetID);
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