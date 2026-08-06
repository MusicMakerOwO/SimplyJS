import { ButtonHandler } from "../types.js";

export default {
	customId: 'ticket_cancel',
	async execute(client, interaction) {
		// `update()` edits the message the button is attached to, rather than sending a new
		// one - the only response option components have that slash commands don't.
		await interaction.update({
			content: 'Ticket cancelled.',
			embeds: [],
			components: []
		});
	}
} as ButtonHandler;
