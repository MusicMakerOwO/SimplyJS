import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Button-only: closing a ticket is a single yes/no decision, which is exactly what
// buttons are for - a select menu would be overkill for two fixed choices.
export default {
	data: new SlashCommandBuilder()
		.setName('close')
		.setDescription('Closes this ticket'),

	async execute(client, interaction) {
		const confirm = new ButtonBuilder()
			.setStyle(ButtonStyles.DANGER)
			.setLabel('Confirm')
			.setCustomID('close_confirm');

		const cancel = new ButtonBuilder()
			.setStyle(ButtonStyles.SECONDARY)
			.setLabel('Cancel')
			.setCustomID('close_cancel');

		// Both buttons fit in one row, unlike commands/ticket.ts where a select forced a
		// second row. DANGER colours the confirm button red, which is the only signal a user
		// gets that it's the destructive one.
		await interaction.reply({
			content: 'Are you sure you want to close this ticket? This cannot be undone.',
			components: [new ActionRowBuilder().addComponents(confirm, cancel)]
		});
	}
} as CommandHandler;
