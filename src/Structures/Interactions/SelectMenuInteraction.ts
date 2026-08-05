import { MessageComponentInteraction } from "./MessageComponentInteraction.js";
import { MessageComponentInteraction as MessageComponentInteractionPayload } from "../../Types/Interactions.js";
import { ResolvedData } from "../../Types/MessageComponents.js";

/** A select menu choice (string, user, role, mentionable, or channel select) on a message. */
export class SelectMenuInteraction extends MessageComponentInteraction {
	// `declare`d - see the comment on `MessageComponentInteraction`'s fields for why.
	/** Values chosen by the user */
	declare values: string[]
	/** Resolved entities for the selected options, when the select type resolves entities */
	declare resolved?: ResolvedData

	patch(data: MessageComponentInteractionPayload): void {
		super.patch(data);
		this.values = data.data.values ?? [];
		if (data.data.resolved !== undefined) this.resolved = data.data.resolved;
	}
}
