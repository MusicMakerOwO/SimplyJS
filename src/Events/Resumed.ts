import { GatewayEvents } from "../Types/DiscordGateway.js";
import { defineEvent } from "../Types/Internal.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/**
 * Fires `ShardResumed` and then `Resumed` once a dropped connection has been resumed and the
 * gateway has replayed missed events, both with the id of the shard that resumed.
 *
 * The socket-level counterpart is `WSEvents.Resumed`, which fires as soon as the `RESUMED`
 * dispatch arrives.
 */
export const Resumed = defineEvent({
	name   : GatewayEvents.Resumed,
	handler: (client, _data, shard): void => {
		const shardId = shard?.shardId ?? 0;
		client.emit(ClientEvents.ShardResumed, shardId);
		client.emit(ClientEvents.Resumed, shardId);
	}
});
