import { BaseInteraction } from "./BaseInteraction.js";
import { Repliable } from "../../Mixins/Interactions/Repliable.js";
import { ModalSubmitInteraction as ModalSubmitInteractionPayload } from "../../Types/Interactions.js";
import { ModalComponent } from "../../Types/Components.js";

/**
 * A modal form submission. Can't show a further modal in response - only commands and
 * component interactions can do that.
 */
export class ModalInteraction extends Repliable(BaseInteraction) {
	// `declare`d rather than plain fields - `patch()` runs as part of the `super()` chain from
	// `BaseInteraction`'s constructor, further up than this class's own field initializers, so a
	// real field declaration would run its (implicit `undefined`) initializer after `patch()`
	// already set the value, wiping it out.
	/** Developer-defined id of the modal that was submitted */
	declare customId: string
	/** Values submitted by the user */
	declare fields: ModalComponent[]

	patch(data: ModalSubmitInteractionPayload): void {
		super.patch(data);
		this.customId = data.data.custom_id;
		this.fields = data.data.components;
	}
}