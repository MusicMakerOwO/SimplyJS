import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

// Discord's own name for this is GUILD_MEMBER_ADD. SimplyJS lines the member events up with
// the Create/Delete naming the message events already use, so if you're following along with
// Discord's documentation, MemberCreate is the one to look for there.
export default createEvent(ClientEvents.MemberCreate, (client, member) => {
	console.log(`[member] ${member.user.username} joined`);
});
