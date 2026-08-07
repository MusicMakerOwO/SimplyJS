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

		// "String" select because the options are values we made up. Discord also offers
		// user, role, channel and mentionable selects, which populate themselves from the
		// server instead of from a list you write out.
		//
		// Note the casing: it's .setCustomID() when building, but interaction.customId when
		// reading it back in selects/ticketCategory.ts. Easy one to get caught by.
		const category = new StringSelectBuilder()
			.setCustomID('ticket_category')
			.setPlaceholder('Select a category')
			// addOption(label, value): the label is what the user sees, the value is what
			// comes back on the interaction. Keeping values short and machine-friendly makes
			// the handler easier to write, and lets the label change without breaking it.
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