import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

// Whole-customId lookup, the 11-buttons-and-selects approach. 12-button-args splits the id
// off its arguments first, and would drop straight in here if these buttons needed to carry
// state - the two are the same dispatcher with one extra split.
export default {
	name: ClientEvents.ButtonUsed,
	async execute(client, [interaction]) {
		const button = client.buttons.get(interaction.customId);
		if (!button) {
			await interaction.reply(`Unknown button "${interaction.customId}"`);
			return;
		}

		try {
			await button.execute(client, interaction);
		} catch (error) {
			console.log(error);
			await interaction.reply("Something went wrong!");
		}
	}
} as EventHandler<typeof ClientEvents.ButtonUsed>;