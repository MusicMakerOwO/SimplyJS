import { CommandHandler } from "../types.js";
import { EmbedBuilder } from "../../../dist/index.js";

export default {
	name: 'help',
	async execute(client, message, args) {
		// This is the payoff for putting the commands on the client: a help command can list
		// every other command without importing any of them.
		const commandList = Array.from( client.commands.values() ).map( cmd => '!' + cmd.name ).join('\n');

		// Embeds are the boxed, coloured messages bots post. 6-embeds covers them properly;
		// all you need here is that a builder collects the fields and gets sent as-is.
		const embed = new EmbedBuilder();
		// Setter or plain assignment, both work - pick whichever reads better to you.
		embed.setTitle("Help");
		embed.description = commandList;

		// Passing an object instead of a string is how you send anything that isn't plain
		// text. `content` is the text field, and it's optional when there's an embed.
		await message.reply({ embeds: [embed] });
	}
} as CommandHandler;