import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.SlashCommandUsed,
	async execute(client, [interaction]) {
		const command = client.commands.get(interaction.commandName);
		if (!command) {
			await interaction.reply(`Unknown command "${interaction.commandName}"`);
			return;
		}

		try {
			await command.execute(client, interaction);
		} catch (error) {
			console.log(error);
			await interaction.reply("Something went wrong!");
		}
	}
} as EventHandler<typeof ClientEvents.SlashCommandUsed>;