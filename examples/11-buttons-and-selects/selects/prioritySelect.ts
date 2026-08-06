import { SelectHandler } from "../types.js";

const LABELS: Record<string, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	urgent: 'Urgent'
};

export default {
	customId: 'priority_select',
	async execute(client, interaction) {
		const [priority] = interaction.values;
		await interaction.update({
			content: `Priority set to **${LABELS[priority]}**.`,
			components: []
		});
	}
} as SelectHandler;
