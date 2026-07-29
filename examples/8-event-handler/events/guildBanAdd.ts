import { ClientEvents } from "../../../dist/index.js";
import { createEvent } from "../types.js";

export default createEvent(ClientEvents.GuildBanAdd, (client, guild, user) => {
	console.log(`[ban] ${user.username} was banned from ${guild.name}`);
});
