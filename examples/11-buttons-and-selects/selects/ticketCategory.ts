import { SelectHandler } from "../types.js";

const LABELS: Record<string, string> = {
	bug: 'Bug Report',
	billing: 'Billing',
	feedback: 'Feedback'
};

export default {
	customId: 'ticket_category',
	async execute(client, interaction) {
		// String selects report choices as an array of `value`s, even when `max_values` is set to 1
		const [category] = interaction.values;

		await interaction.update({
			content: `🎫 Ticket opened under **${LABELS[category]}**. A staff member will be with you shortly.`,
			embeds: [],
			components: []
		});
	}
} as SelectHandler;