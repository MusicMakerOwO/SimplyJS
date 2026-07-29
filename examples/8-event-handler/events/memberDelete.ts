import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.MemberDelete,
	execute(client, member) {
		// member is a full Member when it was cached, otherwise just the raw user payload
		const username = 'user' in member ? member.user.username : member.username;
		console.log(`[member] ${username} left`);
	}
} as EventHandler<typeof ClientEvents.MemberDelete>;
