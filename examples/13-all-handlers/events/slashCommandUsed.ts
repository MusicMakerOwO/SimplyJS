import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

// The routing that sat inline in 10-slash-command-handler's index.ts, moved into an event
// file. Same code, it just lives with the other events now.
//
// `typeof ClientEvents.SlashCommandUsed` rather than plain `ClientEvents.SlashCommandUsed`
// because the generic wants the *type* of that value, not the value. ClientEvents is an
// `as const` object rather than an enum, so its members are values first and `typeof` is what
// turns one back into the string literal type EventHandler is keyed on.
export default {
	name: ClientEvents.SlashCommandUsed,
	// The payload arrives as an array, so destructure the one interaction out of it.
	// See the note in ../index.ts on why this differs from 8-event-handler.
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