import { ButtonHandler } from "../types.js";

export default {
	customId: 'ticket_cancel',
	async execute(client, interaction) {
		// `update()` edits the message the button is attached to, rather than sending a new
		// one - the only response option components have that slash commands don't.
		// Passing empty arrays is what strips the embed and the buttons back off; omitting a
		// field leaves whatever was there alone, so clearing has to be explicit.
		await interaction.update({
			content: 'Ticket cancelled.',
			embeds: [],
			components: []
		});
	}
} as ButtonHandler;
