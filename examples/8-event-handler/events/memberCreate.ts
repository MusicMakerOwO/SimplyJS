import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.MemberCreate,
	execute(client, member) {
		console.log(`[member] ${member.user.username} joined`);
	}
} as EventHandler<typeof ClientEvents.MemberCreate>;
