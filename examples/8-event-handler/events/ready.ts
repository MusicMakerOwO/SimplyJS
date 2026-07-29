import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.Ready,
	execute(client, user) {
		console.log(`[ready] Logged in as ${user.username}`);
	}
} as EventHandler<typeof ClientEvents.Ready>;
