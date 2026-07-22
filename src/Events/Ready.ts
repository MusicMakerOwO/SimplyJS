import { GatewayEvents } from "../Types/DiscordGateway.js";
import { defineEvent, JSONObject } from "../Types/Internal.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

const READY_GUILD_FALLBACK_TIMEOUT_MS = 15_000;

type ReadyPayload = {
	v: number,
	user_settings: JSONObject,
	user: DiscordUser,
	session_type: "normal",
	session_id: string,
	resume_gateway_url: string,
	presences: [],
	guilds: { id: string, unavailable: true }[],
	geo_ordered_rtc_regions: string[]
	auth: JSONObject,
	application: {
		id: string,
		flags_new: string,
		flags: number
	}
};

export const Ready = defineEvent({
	name   : GatewayEvents.Ready,
	handler: (client, data: ReadyPayload): void => {
		const user = client.users.upsert(data.user);
		client.user = user;

		const requiredGuilds = new Set<string>( data.guilds.map(x => x.id) );
		if (requiredGuilds.size === 0) return void client.emit(ClientEvents.Ready, user);

		let timeout: NodeJS.Timeout | undefined;

		let done = false;
		const finalize = () => {
			if (done) return;
			done = true;

			clearTimeout(timeout);
			timeout = undefined;

			client.removeListener(ClientEvents.GuildCreate, callback);
			client.emit(ClientEvents.Ready, user);
		};

		const callback = (guild: Guild) => {
			requiredGuilds.delete(guild.id);
			if (requiredGuilds.size === 0) finalize();
		};

		client.on(ClientEvents.GuildCreate, callback);
		timeout = setTimeout(finalize, READY_GUILD_FALLBACK_TIMEOUT_MS).unref();
	}
});