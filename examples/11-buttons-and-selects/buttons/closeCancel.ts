import { ButtonHandler } from "../types.js";

export default {
	customId: 'close_cancel',
	async execute(client, interaction) {
		await interaction.update({
			content: 'Cancelled - this ticket remains open.',
			components: []
		});
	}
} as ButtonHandler;
