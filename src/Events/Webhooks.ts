import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";
import { Guild } from "../Structures/index.js";
import { ResolveLocation } from "./ResolveLocation.js";

/**
 * Fires when a webhook is created, updated, or deleted in a channel. Discord sends no information
 * about which webhook changed, only where it happened, so the payload is emitted with the location
 * resolved. `guild` and `channel` fall back to a bare `{ id }` object when not present in the local
 * cache. Fetch the channel's webhooks to see the new state.
 */
export const WebhooksUpdate = defineEvent({
	name: GatewayEvents.WebhooksUpdate,
	handler: (client, data: {
		guild_id: string,
		channel_id: string
	}): void => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);

		client.emit(ClientEvents.WebhooksUpdate, {
			guild: guild as Guild | { id: string },
			channel: channel
		});
	}
});
