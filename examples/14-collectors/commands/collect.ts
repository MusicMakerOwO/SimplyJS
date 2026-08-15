import { SlashCommandBuilder, ClientEvents, createCollector } from "../../../dist/index.js";
import { CommandHandler } from "../types.js";

export default {
	data: new SlashCommandBuilder()
		.setName('collect')
		.setDescription('Collects the next 5 messages in this channel, or gives up after 30 seconds'),

	async execute(client, interaction) {
		await interaction.reply('Say something! Collecting the next **5** messages for **30 seconds**.');

		// The classic case, and the one the name "collector" comes from. Three bounds, any of
		// which can be left off:
		//   `max`    - stop after this many *collected* items, ends with reason "limit"
		//   `time`   - stop this long after creation no matter what, ends with reason "time"
		//   `idle`   - stop after this long with nothing collected, ends with reason "idle"
		// Leave all three off and the collector runs until `.stop()` is called - see session.ts.
		//
		// The filter runs before anything is counted, so bot messages and messages from other
		// channels never touch the `max` budget.
		const collector = createCollector(client, ClientEvents.MessageCreate, {
			filter: (message) => message.channelId === interaction.channelId && !message.user.bot,
			max: 5,
			time: 30_000
		});

		// "collect" fires with the event's own arguments spread out, so this is the same
		// `(message)` signature `client.on(ClientEvents.MessageCreate, ...)` would give.
		collector.on('collect', (message) => {
			console.log(`Collected from ${message.user.username}: ${message.content}`);
		});

		// "end" always fires exactly once, whichever bound tripped, which makes it the right
		// place for cleanup and summaries. `reason` is "limit" | "time" | "idle" | "user".
		//
		// Gotcha worth internalising: `collected` is an array of *argument tuples*, not an array
		// of messages, because a collector doesn't know that this particular event happens to
		// carry exactly one argument. Hence `([message])` rather than `(message)` - a collector
		// on `RoleUpdate` would destructure `([oldRole, newRole])` here the same way.
		collector.on('end', async (collected, reason) => {
			const lines = collected.map(([message]) => `- ${message.user.username}: ${message.content}`);

			await interaction.editReply(
				reason === 'limit'
					? `Got all 5!\n${lines.join('\n')}`
					: `Time's up, only got ${lines.length}.\n${lines.join('\n') || '- (nothing)'}`
			);
		});
	}
} as CommandHandler;
