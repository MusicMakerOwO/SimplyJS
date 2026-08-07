import { ActionRowBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { ButtonHandler } from "../types.js";

export default {
	customId: 'dice_roll',
	async execute(client, interaction) {
		const result = Math.floor(Math.random() * 6) + 1;

		// Only `content` is passed, and update() leaves out anything it isn't given, so the
		// Roll button survives and the user can roll again. Passing `components: []` is what
		// would strip it, the way the fortune handlers end their panel.
		await interaction.update({
			content: `You rolled a **${result}**!`
		});
	}
} as ButtonHandler;