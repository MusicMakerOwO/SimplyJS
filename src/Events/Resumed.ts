import { GatewayEvents } from "../Types/DiscordGateway.js";
import { defineEvent } from "../Types/Internal.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/**
 * Fires once a dropped connection has been resumed and the gateway has replayed missed events.
 *
 * The socket-level counterpart is `WSEvents.Resumed`, which fires as soon as the `RESUMED`
 * dispatch arrives.
 */
export const Resumed = defineEvent({
	name   : GatewayEvents.Resumed,
	handler: (client): void => {
		client.emit(ClientEvents.Resumed);
	}
});
