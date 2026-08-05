import { BaseCommandInteraction } from "./BaseCommandInteraction.js";
import { Message } from "../Message.js";
import { ApplicationCommandInteraction } from "../../Types/Interactions.js";
import { DiscordMessage } from "../../Types/MessageComponents.js";

/** A message context menu command, invoked by right-clicking/long-pressing a message. */
export class MessageContextMenuInteraction extends BaseCommandInteraction {
	// `declare`d - see the comment on `BaseCommandInteraction`'s fields for why.
	/** ID of the targeted message */
	declare targetId: string
	/** The targeted message */
	declare targetMessage: Message

	patch(data: ApplicationCommandInteraction): void {
		super.patch(data);

		if (data.data.target_id !== undefined) this.targetId = data.data.target_id;

		const resolvedMessage = this.targetId !== undefined
			? data.data.resolved?.messages?.[this.targetId]
			: undefined;
		if (resolvedMessage !== undefined) this.targetMessage = new Message(this.client, resolvedMessage as DiscordMessage);
	}
}