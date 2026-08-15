import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyles, ClientEvents, awaitEvent } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('confirm')
		.setDescription('Asks for confirmation, then waits 15 seconds for an answer'),

	async execute(client, interaction) {
		// Deferring first, then editing, because `editReply` hands back the `Message` it wrote
		// while `reply` returns nothing - and the filter below needs that message's id.
		await interaction.deferReply();
		const prompt = await interaction.editReply({
			content: 'Are you sure you want to proceed? This cannot be undone.',
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setStyle(ButtonStyles.DANGER).setLabel('Delete it').setCustomId('confirm:yes'),
					new ButtonBuilder().setStyle(ButtonStyles.SECONDARY).setLabel('Cancel').setCustomId('confirm:no')
				)
			]
		});

		// `awaitEvent` is the whole "wait for one specific thing to happen" case in a single
		// call. It builds a collector with `max: 1`, hands back the event's arguments as a
		// tuple, and stops the collector in a `finally` - so whether someone clicks, nobody
		// clicks, or the filter never matches anyone, the listener is always detached. That is
		// the failure mode the manual `client.on(...)` version usually gets wrong: the "nobody
		// ever clicked" path leaves a listener attached for the rest of the process's life.
		//
		// The filter is what makes this prompt private without any registration: a click only
		// counts if it came from the person who ran the command *and* landed on this exact
		// message. Someone else clicking, or the same person clicking an older prompt, simply
		// isn't collected - there's no shared handler to guard, so there's nothing to get
		// wrong later.
		try {
			const [button] = await awaitEvent(client, ClientEvents.ButtonUsed, {
				filter: (button) => button.user.id === interaction.user.id && button.message.id === prompt.id,
				time: 15_000
			});

			await button.update({
				content: button.customId === 'confirm:yes' ? 'Done!' : 'Cancelled, nothing was touched.',
				components: []
			});
		} catch {
			// `awaitEvent` rejects when `time` runs out, so the timeout path is the catch block.
			// Disabling the buttons matters here: an un-disabled prompt that has already expired
			// still looks clickable, and clicking it does nothing at all.
			//
			// Worth being blunt about - this cleanup only runs while the process is alive. If the
			// bot restarts during those 15 seconds the collector is gone with it and the buttons
			// stay enabled forever, dead but clickable. Nothing you can write inside a collector
			// protects against that; a prompt that has to survive a restart needs a registered
			// button handler (see examples 11-13) instead.
			await interaction.editReply({
				content: 'Timed out, nothing was done.',
				components: []
			});
		}
	}
} as CommandHandler;