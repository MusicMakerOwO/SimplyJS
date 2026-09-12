import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

export const UserUpdate = defineEvent({
	name: GatewayEvents.UserUpdate,
	handler: (client, data: DiscordUser): void => {
		const oldUser = client.users.get(data.id)?.clone();
		const newUser = client.users.upsert(data);

		// The bot's own profile can change too, and `client.user` must not go stale
		if (client.user?.id === newUser.id) client.user = newUser;

		client.emit(ClientEvents.UserUpdate, oldUser, newUser);
	}
});
