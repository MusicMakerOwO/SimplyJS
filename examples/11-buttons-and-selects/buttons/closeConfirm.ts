import { ButtonHandler } from "../types.js";

export default {
	customId: 'close_confirm',
	async execute(client, interaction) {
		// A real bot would archive or delete the ticket's channel here.
		await interaction.update({
			content: '✅ Ticket closed',
			components: []
		});
	}
} as ButtonHandler;