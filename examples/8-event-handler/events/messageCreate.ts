import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.MessageCreate,
	execute(client, message) {
		console.log(`[message] #${message.channel?.name ?? message.channel_id} @${message.user.username}: ${message.content}`);
	}
} as EventHandler<typeof ClientEvents.MessageCreate>;
