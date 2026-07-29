import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.MemberDelete, (client, member) => {
	// member is a full Member when it was cached, otherwise just the raw user payload
	const username = 'user' in member ? member.user.username : member.username;
	console.log(`[member] ${username} left`);
});
