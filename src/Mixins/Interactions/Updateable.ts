import { BaseInteraction } from "../../Structures/Interactions/BaseInteraction.js";
import { Constructor } from "../../Types/Internal.js";
import { InteractionCallbackTypes } from "../../Types/Interactions.js";
import { InteractionReplyPayload } from "./Repliable.js";

type ComponentAcknowledgeableClass<T> = {
	update(content: InteractionReplyPayload): Promise<void>;
	deferUpdate(): Promise<void>;
} & T;

function resolveReplyPayload(input: InteractionReplyPayload) {
	return typeof input === "string" ? { content: input } : input;
}

/**
 * Mixes methods for editing a component's originating message in-place into an interaction
 * class. Applied only to `MessageComponentInteraction` (buttons and select menus) - unlike
 * `Repliable`'s `reply`, these acknowledge the interaction by updating the message the
 * component is attached to rather than sending a new one, which only component interactions
 * are allowed to do.
 * @param Base The interaction class to extend.
 */
export function Updateable<TBase extends Constructor<BaseInteraction>>(
	Base: TBase,
): Constructor<ComponentAcknowledgeableClass<InstanceType<TBase>>> {
	return class extends Base {
		/**
		 * Edits the message this component is attached to, acknowledging the interaction.
		 * @param content Plain text content, or a full reply payload.
		 */
		async update(content: InteractionReplyPayload): Promise<void> {
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.UPDATE_MESSAGE,
				data: resolveReplyPayload(content),
			});
		}

		/**
		 * Acknowledges the interaction without editing or showing a loading state, leaving the
		 * attached message as-is until edited later via `editReply`.
		 */
		async deferUpdate(): Promise<void> {
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.DEFERRED_UPDATE_MESSAGE,
			});
		}
	} as unknown as Constructor<ComponentAcknowledgeableClass<InstanceType<TBase>>>;
}