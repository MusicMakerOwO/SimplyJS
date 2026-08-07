import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

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