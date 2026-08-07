import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Button-only: rolling is a single repeatable action, no need for a select menu.
export default {
	data: new SlashCommandBuilder()
		.setName('dice')
		.setDescription('Rolls a six-sided die'),

	async execute(client, interaction) {
		const roll = new ButtonBuilder()
			.setStyle(ButtonStyles.PRIMARY)
			.setLabel('🎲 Roll')
			.setCustomID('dice_roll');

		await interaction.reply({
			content: 'Click to roll!',
			components: [new ActionRowBuilder().addComponents(roll)]
		});
	}
} as CommandHandler;
