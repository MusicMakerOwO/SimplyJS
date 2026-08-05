import { BaseInteraction } from "./BaseInteraction.js";
import { InteractionCallbackTypes } from "../../Types/Interactions.js";

/**
 * The initial handshake Discord sends to validate an interactions endpoint URL. Only relevant
 * to apps using an HTTP interactions endpoint rather than the gateway - bots connected over the
 * gateway will not see this interaction type in practice.
 */
export class PingInteraction extends BaseInteraction {
	/** Acknowledges the `PING`, the only valid response. */
	async pong(): Promise<void> {
		await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
			type: InteractionCallbackTypes.PONG,
		});
	}
}
