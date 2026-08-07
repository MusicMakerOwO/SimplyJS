import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.MessageCreate, (client, message) => {
	// This logs the bot's own messages too. Harmless while only logging, but anything that
	// *replies* here needs `if (message.user.bot) return` first, or two bots in the same
	// channel will happily talk each other into a rate limit.
	console.log(`[message] #${message.channel?.name ?? message.channel_id} @${message.user.username}: ${message.content}`);
});
