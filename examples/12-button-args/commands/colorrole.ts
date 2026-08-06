import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyles, InteractiveButtonStyle } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

// Assumes a role named "Red"/"Blue"/"Green"/"Yellow" already exists in the server -
// see buttons/color.ts for what happens when clicked.
const COLORS: { label: string; style: InteractiveButtonStyle }[] = [
	{ label: 'Red', style: ButtonStyles.DANGER },
	{ label: 'Blue', style: ButtonStyles.PRIMARY },
	{ label: 'Green', style: ButtonStyles.SUCCESS },
	{ label: 'Yellow', style: ButtonStyles.SECONDARY }
];

export default {
	data: new SlashCommandBuilder()
		.setName('colorrole')
		.setDescription('Posts a color role picker'),

	async execute(client, interaction) {
		const buttons = COLORS.map(({ label, style }) =>
			new ButtonBuilder()
				.setStyle(style)
				.setLabel(label)
				// customId format: `color:<the color, lowercased>` - the `color` base id is what
				// routes this click to buttons/color.ts, and everything after the `:` is read
				// there as the arg, eg. `color:red` -> colorArg === "red".
				.setCustomID(`color:${label.toLowerCase()}`)
		);

		await interaction.reply({
			content: 'Pick a color role - click again to remove it.',
			components: [new ActionRowBuilder().addComponents(...buttons)]
		});
	}
} as CommandHandler;
