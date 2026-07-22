import { CommandHandler } from "../types.js";

export default {
    name: 'coinflip',
    async execute(client, message, args) {
        const heads = Math.random() > 0.5;
        const result = heads ? "heads" : "tails";
        await message.reply(`A coin was flipped and came up **${result}**`);
    }
} as CommandHandler;