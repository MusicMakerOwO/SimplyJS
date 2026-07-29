import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.MemberCreate, (client, member) => {
	console.log(`[member] ${member.user.username} joined`);
});
