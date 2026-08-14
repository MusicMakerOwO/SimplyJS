import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('counter')
		.setDescription('Starts a counter anyone can click through'),

	async execute(client, interaction) {
		await interaction.reply({
			content: 'Count: **0**',
			// customId format: `counter:<action>:<count>` - see buttons/counter.ts, which parses
			// this same format back apart on click. Starting at 0, so every button's count arg
			// is "0" here.
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setStyle(ButtonStyles.DANGER   ).setLabel('-1'   ).setCustomId('counter:sub:0'  ),
					new ButtonBuilder().setStyle(ButtonStyles.SECONDARY).setLabel('Reset').setCustomId('counter:reset:0'),
					new ButtonBuilder().setStyle(ButtonStyles.SUCCESS  ).setLabel('+1'   ).setCustomId('counter:add:0'  )
				)
			]
		});
	}
} as CommandHandler;