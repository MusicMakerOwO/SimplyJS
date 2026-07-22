import { CommandHandler } from "../types.js";

export default {
	name: 'ping',
	async execute(client, message, args) {
		await message.reply("Pong!");
	}
} as CommandHandler;