import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.Ready, (client, user) => {
	console.log(`[ready] Logged in as ${user.username}`);
});
