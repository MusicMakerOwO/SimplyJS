import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.MemberDelete, (client, guild, member) => {
	// member is a full Member when it was cached, otherwise just its ids and user - both carry `user`
	console.log(`[member] ${member.user.username} left ${guild.name}`);
});
