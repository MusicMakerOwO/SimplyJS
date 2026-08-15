import { SlashCommandBuilder, ClientEvents, createCollector } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('wizard')
		.setDescription('Asks a few questions in a row, one message at a time'),

	async execute(client, interaction) {
		// One collector for the entire multi-step flow, rather than one per question. It has no
		// `max`, so it stays alive across every step, and an `idle` bound so an abandoned wizard
		// cleans itself up 30 seconds after the last answer instead of hanging around forever.
		const collector = createCollector(client, ClientEvents.MessageCreate, {
			filter: (message) => message.user.id === interaction.user.id && message.channelId === interaction.channelId,
			idle: 30_000
		});

		// `.next` is a promise for the next collected item, which turns the callback style into
		// straight-line `await` code - the questions read in the order they're actually asked.
		// It resolves with the same argument tuple `collected` holds, so `[message]` unwraps it.
		//
		// It rejects if the collector ends first, and "the collector ended" includes the idle
		// timeout, so walking away mid-wizard lands in the catch block rather than leaving a
		// promise pending forever.
		try {
			await interaction.reply("Let's set up your profile. What's your name?");
			const [nameMessage] = await collector.next;

			await interaction.followUp(`Nice to meet you, ${nameMessage.content}. What's your favourite colour?`);
			const [colourMessage] = await collector.next;

			await interaction.followUp(`What kind of magic do you prefer? Fire, water, ice, etc.`);
			const [magicMessage] = await collector.next;

			await interaction.followUp({
				embeds: [{
					title: "Wizard ID Card",
					color: 0x0077ff,
					description: `
Name: ${nameMessage.content}
Hat Color: ${colourMessage.content}
Magic Type: ${magicMessage.content}
`
				}]
			});
		} catch {
			await interaction.followUp('Wizard cancelled, you went quiet for 30 seconds.');
		} finally {
			// Stopping in a `finally` because the success path leaves the collector alive - it has
			// no `max`, so nothing ends it once the last question is answered. `.stop()` is
			// idempotent, so calling it on the idle path too (where it has already ended) is fine.
			collector.stop();
		}
	}
} as CommandHandler;