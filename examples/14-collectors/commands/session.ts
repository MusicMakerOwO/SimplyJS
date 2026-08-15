import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyles, ClientEvents, createCollector } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

const COLOURS = ['red', 'green', 'blue'] as const;
const SIZES = ['small', 'medium', 'large'] as const;

/** The order draft this session is editing, kept in memory for as long as the collector lives */
type Draft = {
	colour: typeof COLOURS[number];
	size: typeof SIZES[number];
};

function render(draft: Draft, disabled: boolean) {
	return {
		content: `Your order: **${draft.size} ${draft.colour}**`,
		components: [
			new ActionRowBuilder().addComponents(
				new ButtonBuilder().setStyle(ButtonStyles.SECONDARY).setLabel('Next colour').setCustomId('session:colour').setDisabled(disabled),
				new ButtonBuilder().setStyle(ButtonStyles.SECONDARY).setLabel('Next size').setCustomId('session:size').setDisabled(disabled),
				new ButtonBuilder().setStyle(ButtonStyles.SUCCESS).setLabel('Submit').setCustomId('session:submit').setDisabled(disabled)
			)
		]
	};
}

export default {
	data: new SlashCommandBuilder()
		.setName('session')
		.setDescription('A little order builder, driven entirely by one collector'),

	async execute(client, interaction) {
		await interaction.deferReply();

		// The state this session edits lives right here, in the closure the collector captures.
		// That's the whole trick, and it's what most people actually reach for collectors for:
		// the listener and the state it operates on are created together, scoped to one message,
		// and thrown away together.
		//
		// Compare examples/12-button-args, which stores its counter inside the customId because
		// it has nowhere else to put it. That works without any listener state, but it's lossy -
		// two people clicking at once both read the value they were shown and one increment gets
		// lost. Here there's one authoritative `draft` object per message, so concurrent clicks
		// are applied in the order the gateway delivers them and nothing is dropped.
		const draft: Draft = { colour: 'red', size: 'medium' };
		const panel = await interaction.editReply(render(draft, false));

		// No `time` and no `max`, so this session is open-ended - it lasts as long as someone is
		// still clicking. `idle` is the safety net: 60 seconds of silence and it ends itself
		// rather than sitting in memory for the rest of the process's life.
		const collector = createCollector(client, ClientEvents.ButtonUsed, {
			filter: (button) => button.user.id === interaction.user.id && button.message.id === panel.id,
			idle: 60_000
		});

		collector.on('collect', async (button) => {
			if (button.customId === 'session:submit') {
				await button.update(render(draft, true));
				// Ends the collector with reason "user", which fires "end" below - always stop a
				// session explicitly when it's finished, otherwise it lingers until `idle` trips.
				collector.stop();
				return;
			}

			if (button.customId === 'session:colour') {
				draft.colour = COLOURS[(COLOURS.indexOf(draft.colour) + 1) % COLOURS.length]!;
			} else {
				draft.size = SIZES[(SIZES.indexOf(draft.size) + 1) % SIZES.length]!;
			}

			await button.update(render(draft, false));

			// `idle` already re-arms on every collected item, so this is redundant here - it's
			// shown because `resetTimer` is how you extend a session from *outside* the collect
			// path, or swap the bounds mid-flight: `collector.resetTimer({ idle: 120_000 })`.
			collector.resetTimer();
		});

		collector.on('end', async (_collected, reason) => {
			if (reason === 'user') return; // already re-rendered as disabled in the submit branch

			await interaction.editReply({
				content: `Session expired. Last state: **${draft.size} ${draft.colour}**`,
				components: render(draft, true).components
			});
		});

		// One last time, because this is exactly where the mistake gets made: `draft` is a plain
		// object in this process's memory and the collector holding it is a plain listener in
		// this process's memory. Restart the bot and both vanish mid-session - the panel stays
		// on screen with live-looking buttons that now do nothing, and no `end` handler ever
		// runs to disable them, because the code that would have run it is gone too.

		// That is fine for a throwaway builder like this one. It is not fine for a ticket panel,
		// a role menu, or anything else that has to keep working after a deploy. Those want a
		// registered `customId` handler (examples 11-13) with their state in the message or a
		// database, so any process that receives the click can serve it.
	}
} as CommandHandler;