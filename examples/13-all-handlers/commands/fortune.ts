import { SlashCommandBuilder, ActionRowBuilder, StringSelectBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Mixes both component kinds, like commands/ticket.ts over in ../11-buttons-and-selects: a
// select menu for a deliberate pick, plus a button in its own row for leaving it to chance.
export default {
	data: new SlashCommandBuilder()
		.setName('fortune')
		.setDescription('Reveals your fortune'),

	async execute(client, interaction) {
		const category = new StringSelectBuilder()
			.setCustomID('fortune_category')
			.setPlaceholder('Pick a category')
			.addOption('Love', 'love')
			.addOption('Career', 'career')
			.addOption('Luck', 'luck');

		const random = new ButtonBuilder()
			.setStyle(ButtonStyles.SECONDARY)
			.setLabel('🎲 Surprise me')
			.setCustomID('fortune_random');

		await interaction.reply({
			content: 'Pick a category for your fortune, or leave it to chance.',
			components: [
				new ActionRowBuilder().addComponents(category),
				new ActionRowBuilder().addComponents(random)
			]
		});
	}
} as CommandHandler;
