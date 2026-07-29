import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.MessageCreate, (client, message) => {
	console.log(`[message] #${message.channel?.name ?? message.channel_id} @${message.user.username}: ${message.content}`);
});
