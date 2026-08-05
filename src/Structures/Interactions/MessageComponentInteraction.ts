import { BaseInteraction } from "./BaseInteraction.js";
import { Repliable } from "../../Mixins/Interactions/Repliable.js";
import { Updateable } from "../../Mixins/Interactions/Updateable.js";
import { ModalShowable } from "../../Mixins/Interactions/ModalShowable.js";
import { Message } from "../Message.js";
import { MessageComponentInteraction as MessageComponentInteractionPayload } from "../../Types/Interactions.js";

/**
 * Shared base for a button click or select menu choice. Not instantiated directly - use
 * `ButtonInteraction` or `SelectMenuInteraction`, chosen by `CreateInteraction` based on the
 * component's `ComponentType`.
 */
export class MessageComponentInteraction extends ModalShowable(Updateable(Repliable(BaseInteraction))) {
	// `declare`d rather than plain fields - `patch()` runs as part of the `super()` chain from
	// `BaseInteraction`'s constructor, further up than this class's own field initializers, so a
	// real field declaration would run its (implicit `undefined`) initializer after `patch()`
	// already set the value, wiping it out.
	/** Developer-defined id of the component that was interacted with */
	declare customId: string
	/** The message the component is attached to */
	declare message: Message

	patch(data: MessageComponentInteractionPayload): void {
		super.patch(data);
		this.customId = data.data.custom_id;
		this.message = new Message(this.client, data.message);
	}
}