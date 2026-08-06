import { SlashCommandBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with pong'),

	async execute(client, interaction) {
		await interaction.reply('Pong!');
	}
} as CommandHandler;
