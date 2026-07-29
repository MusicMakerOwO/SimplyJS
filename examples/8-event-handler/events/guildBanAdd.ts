import { ClientEvents } from "../../../dist/index.js";
import { EventHandler } from "../types.js";

export default {
	name: ClientEvents.GuildBanAdd,
	execute(client, guild, user) {
		console.log(`[ban] ${user.username} was banned from ${guild.name}`);
	}
} as EventHandler<typeof ClientEvents.GuildBanAdd>;
