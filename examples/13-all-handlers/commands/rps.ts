import { SlashCommandBuilder, ActionRowBuilder, StringSelectBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Select-only: three mutually exclusive choices, nothing to confirm or cancel.
export default {
	data: new SlashCommandBuilder()
		.setName('rps')
		.setDescription('Play rock-paper-scissors against the bot'),

	async execute(client, interaction) {
		const move = new StringSelectBuilder()
			.setCustomId('rps_move')
			.setPlaceholder('Choose your move')
			.addOption('Rock', 'rock', { emoji: { name: '🪨' } })
			.addOption('Paper', 'paper', { emoji: { name: '📄' } })
			.addOption('Scissors', 'scissors', { emoji: { name: '✂️' } });

		await interaction.reply({
			content: 'Rock, paper, scissors - choose your move!',
			components: [new ActionRowBuilder().addComponents(move)]
		});
	}
} as CommandHandler;