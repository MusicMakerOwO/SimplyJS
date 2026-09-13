import { BaseInteraction } from "../../Structures/Interactions/BaseInteraction.js";
import { Message, PreparePayload } from "../../Structures/Message.js";
import { Constructor } from "../../Types/Internal.js";
import { InteractionCallbackTypes } from "../../Types/Interactions.js";
import { InteractionEditPayload, ResolveEditPayload } from "./ResolvePayload.js";

type ComponentAcknowledgeableClass<T> = {
	update(content: InteractionEditPayload): Promise<void>;
	deferUpdate(): Promise<void>;
} & T;

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
		 *
		 * Takes no `ephemeral` - this edits an existing message, whose visibility was fixed when it
		 * was first sent.
		 * @param content Plain text content, or a full edit payload.
		 */
		async update(content: InteractionEditPayload): Promise<void> {
			// `message` is declared by MessageComponentInteraction, the only class applying this
			// mixin - the mixin's own base is BaseInteraction, which does not know about it
			const { message } = this as Partial<{ message: Message }>;
			// the attached message's flags, so editing a v2 message keeps it held to the v2 rules
			const { body, files } = PreparePayload(ResolveEditPayload(content), message?.flags);
			// the callback route nests the message in `data`, but uploads stay top-level form parts
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.UPDATE_MESSAGE,
				data: body,
			}, undefined, files);
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