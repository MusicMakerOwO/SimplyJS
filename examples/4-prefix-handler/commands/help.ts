import { CommandHandler } from "../types.js";
import { EmbedBuilder } from "../../../dist/index.js";

export default {
	name: 'help',
	async execute(client, message, args) {
		const commandList = Array.from( client.commands.values() ).map( cmd => '!' + cmd.name ).join('\n');

		const embed = new EmbedBuilder();
		// Either method is allowed depending on preference!
		embed.setTitle("Help");
		embed.description = commandList;

		await message.reply({ embeds: [embed] });
	}
} as CommandHandler;