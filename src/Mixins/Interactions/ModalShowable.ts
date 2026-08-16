import { BaseInteraction } from "../../Structures/Interactions/BaseInteraction.js";
import { ModalBuilder } from "../../Builders/ModalBuilder.js";
import { Constructor } from "../../Types/Internal.js";
import { InteractionCallbackModal, InteractionCallbackTypes } from "../../Types/Interactions.js";

type ModalShowableClass<T> = {
	showModal(modal: InteractionCallbackModal): Promise<void>;
} & T;

/**
 * Mixes `showModal` into an interaction class. Applied to command and component interactions -
 * not modal submits (Discord can't pop a second modal from within one) and not autocomplete
 * requests (which can only be acknowledged with suggestion choices).
 * @param Base The interaction class to extend.
 */
export function ModalShowable<TBase extends Constructor<BaseInteraction>>(
	Base: TBase,
): Constructor<ModalShowableClass<InstanceType<TBase>>> {
	return class extends Base {
		/**
		 * Responds to this interaction by popping up a modal form. Can only be called once, as the
		 * initial response to the interaction - not after a `reply`/`deferReply`.
		 * @param modal The modal to display - a {@link ModalBuilder} or a raw payload, which are
		 * the same shape.
		 */
		async showModal(modal: InteractionCallbackModal): Promise<void> {
			ModalBuilder.validate(modal);
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.MODAL,
				data: modal,
			});
		}
	} as unknown as Constructor<ModalShowableClass<InstanceType<TBase>>>;
}
