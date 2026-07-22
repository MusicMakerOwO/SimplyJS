import { CommandHandler } from "../types.js";

export default {
	name: 'say',
	async execute(client, message, args) {
		await message.channel!.send( args.join(' ') );
	}
} as CommandHandler;