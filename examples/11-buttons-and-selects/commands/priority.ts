import { SlashCommandBuilder, ActionRowBuilder, StringSelectBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Select-only: there's nothing to confirm or cancel here, just one choice to make.
export default {
	data: new SlashCommandBuilder()
		.setName('priority')
		.setDescription("Sets this ticket's priority"),

	async execute(client, interaction) {
		const priority = new StringSelectBuilder()
			.setCustomId('priority_select')
			.setPlaceholder('Select a priority')
			.addOption('Low', 'low')
			.addOption('Medium', 'medium')
			.addOption('High', 'high')
			.addOption('Urgent', 'urgent');

		await interaction.reply({
			content: 'What priority is this ticket?',
			components: [new ActionRowBuilder().addComponents(priority)]
		});
	}
} as CommandHandler;