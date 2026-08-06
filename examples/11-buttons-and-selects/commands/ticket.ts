import { SlashCommandBuilder, ActionRowBuilder, StringSelectBuilder, ButtonBuilder, ButtonStyles, EmbedBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Mixes both component kinds on one message: a select menu picks the ticket's
// category, a button in a separate row lets the user back out instead.
export default {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('Opens a new support ticket'),

	async execute(client, interaction) {
		const embed = new EmbedBuilder()
			.setTitle('New Support Ticket')
			.setDescription('Pick a category below, or cancel if you opened this by mistake.')
			.setColor('#5865F2');

		const category = new StringSelectBuilder()
			.setCustomID('ticket_category')
			.setPlaceholder('Select a category')
			.addOption('Bug Report', 'bug', { description: "Something isn't working" })
			.addOption('Billing', 'billing', { description: 'Payment or subscription issue' })
			.addOption('Feedback', 'feedback', { description: 'A suggestion or idea' });

		const cancel = new ButtonBuilder()
			.setStyle(ButtonStyles.SECONDARY)
			.setLabel('Cancel')
			.setCustomID('ticket_cancel');

		await interaction.reply({
			embeds: [embed],
			// An action row can hold a single select menu, or up to 5 buttons - never both,
			// so the select and the button each get their own row.
			components: [
				new ActionRowBuilder().addComponents(category),
				new ActionRowBuilder().addComponents(cancel)
			]
		});
	}
} as CommandHandler;