import { SlashCommandBuilder } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('greet')
		.setDescription('Greets a user')
		.addUserOption('user', 'The user to greet', { required: true }),

	async execute(client, interaction) {
		const user = interaction.options.getUser('user')!; // required field
		await interaction.reply(`Hello, ${user}!`); // calls User.toString() and generates a ping automatically
	}
} as CommandHandler;
