import { ActionRowBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { ButtonHandler } from "../types.js";

export default {
	customId: 'dice_roll',
	async execute(client, interaction) {
		const result = Math.floor(Math.random() * 6) + 1;

		await interaction.update({
			content: `You rolled a **${result}**!`,
			// The old button stays around since we do not overwrite it
			// If you want to clear the old buttons set `components: []`
		});
	}
} as ButtonHandler;