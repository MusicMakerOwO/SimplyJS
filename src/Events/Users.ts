import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/**
 * Fires when the bot's own account changes. Discord sends `USER_UPDATE` for the current user only,
 * so this is surfaced as `ClientUserUpdate` and mainly keeps `client.user` fresh.
 */
export const UserUpdate = defineEvent({
	name: GatewayEvents.UserUpdate,
	handler: (client, data: DiscordUser): void => {
		const oldUser = client.users.get(data.id)?.clone();
		const newUser = client.users.upsert(data);

		// `client.user` must not go stale after an application edit
		if (client.user?.id === newUser.id) client.user = newUser;

		client.emit(ClientEvents.ClientUserUpdate, oldUser, newUser);
	}
});
