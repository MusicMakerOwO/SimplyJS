import { ActionRowBuilder, ButtonBuilder, ButtonStyles } from "../../../dist/index.js";
import { ButtonHandler } from "../types.js";

export default {
	id: 'counter',
	// customId format: `counter:<action>:<count>`, eg. `counter:add:3` - `action` is
	// "add"/"sub"/"reset" and `count` is the value shown when this specific button was sent,
	// so the handler always knows the count it should be counting up/down from.
	async execute(client, interaction, action, countArg) {
		const count = Number(countArg);
		const next = action === 'add' ? count + 1 : action === 'sub' ? count - 1 : 0;

		// Rebuilds the same three buttons as commands/counter.ts, just with `next` baked into
		// their customIds instead of the starting count - that's the only place this counter's
		// value is stored, there's no in-memory or database state to keep in sync.
		//
		// The tradeoff of keeping state in the message: two people clicking at the same time
		// both read the count from the buttons they were shown, so one of the increments is
		// lost. Fine for a counter anyone can play with, not fine for anything that has to be
		// exact - that wants a real store keyed by message id.
		await interaction.update({
			content: `Count: **${next}**`,
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setStyle(ButtonStyles.DANGER).setLabel('-1').setCustomID(`counter:sub:${next}`),
					new ButtonBuilder().setStyle(ButtonStyles.SECONDARY).setLabel('Reset').setCustomID(`counter:reset:${next}`),
					new ButtonBuilder().setStyle(ButtonStyles.SUCCESS).setLabel('+1').setCustomID(`counter:add:${next}`)
				)
			]
		});
	}
} as ButtonHandler;
