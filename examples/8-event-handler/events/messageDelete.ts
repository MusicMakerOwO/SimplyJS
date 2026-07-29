import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.MessageDelete,
	execute(client, payload) {
		// Discord doesn't send the deleted message's content, only its ids.
		// If you need the content, cache messages yourself as they come in via MessageCreate.
		console.log(`[message] Message ${payload.id} deleted in channel ${payload.channel_id}`);
	}
} as EventHandler<typeof ClientEvents.MessageDelete>;
