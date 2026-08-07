import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.SelectMenuUsed,
	async execute(client, [interaction]) {
		const select = client.selects.get(interaction.customId);
		if (!select) {
			await interaction.reply(`Unknown select menu "${interaction.customId}"`);
			return;
		}

		try {
			await select.execute(client, interaction);
		} catch (error) {
			console.log(error);
			await interaction.reply("Something went wrong!");
		}
	}
} as EventHandler<typeof ClientEvents.SelectMenuUsed>;