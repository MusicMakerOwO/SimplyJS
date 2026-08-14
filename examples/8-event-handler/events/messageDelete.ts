import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.MessageDelete, (client, payload) => {
	// Discord doesn't send the deleted message's content, only its ids.
	// If you need the content, cache messages yourself as they come in via MessageCreate.
	console.log(`[message] Message ${payload.id} deleted in channel ${payload.channelId}`);
});