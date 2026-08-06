import { SlashCommandBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('coinflip')
		.setDescription('Flips a coin'),

	async execute(client, interaction) {
		const heads = Math.random() > 0.5;
		const result = heads ? "heads" : "tails";
		await interaction.reply(`The coin landed on **${result}**`);
	}
} as CommandHandler;
