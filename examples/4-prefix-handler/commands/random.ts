import { CommandHandler } from "../types.js";

export default {
    name: 'random',
    async execute(client, message, args) {
        const min = parseInt(args[0]) || 0;
        const max = parseInt(args[1]) || 0;
        const value = Math.floor(Math.random() * (max - min)) + min;
        await message.reply(`A number was pulled out of a hat: ${value}`);
    }
} as CommandHandler;