import { Client } from "../Client.js";
import { Interaction, InteractionTypes } from "../Types/Interactions.js";
import { ApplicationCommandTypes } from "../Types/ApplicationCommand.js";
import { ComponentTypes } from "../Types/Components.js";
import { PingInteraction } from "../Structures/Interactions/PingInteraction.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";
import { UserContextMenuInteraction } from "../Structures/Interactions/UserContextMenuInteraction.js";
import { MessageContextMenuInteraction } from "../Structures/Interactions/MessageContextMenuInteraction.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SelectMenuInteraction } from "../Structures/Interactions/SelectMenuInteraction.js";
import { AutocompleteInteraction } from "../Structures/Interactions/AutocompleteInteraction.js";
import { ModalInteraction } from "../Structures/Interactions/ModalInteraction.js";

/** Union of every concrete interaction class this factory can produce. */
export type AnyInteraction =
	| PingInteraction
	| SlashCommandInteraction
	| UserContextMenuInteraction
	| MessageContextMenuInteraction
	| ButtonInteraction
	| SelectMenuInteraction
	| AutocompleteInteraction
	| ModalInteraction;

/**
 * Constructs the correct concrete interaction subclass for a raw interaction payload, based on
 * its `type` and, for commands/components, the more specific `data.type`/`data.component_type`.
 * @param client The client instance.
 * @param data The raw interaction payload.
 * @returns The constructed interaction instance.
 */
export function CreateInteraction(client: Client, data: Interaction): AnyInteraction {
	switch (data.type) {
		case InteractionTypes.PING:
			return new PingInteraction(client, data);

		case InteractionTypes.APPLICATION_COMMAND:
			switch (data.data.type) {
				case ApplicationCommandTypes.USER:
					return new UserContextMenuInteraction(client, data);
				case ApplicationCommandTypes.MESSAGE:
					return new MessageContextMenuInteraction(client, data);
				case ApplicationCommandTypes.CHAT_INPUT:
				default:
					return new SlashCommandInteraction(client, data);
			}

		case InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE:
			return new AutocompleteInteraction(client, data);

		case InteractionTypes.MESSAGE_COMPONENT:
			// I with there was a better way to differentiate them, thanks Discord :')
			if (data.data.component_type === ComponentTypes.BUTTON) {
				return new ButtonInteraction(client, data);
			} else {
				return new SelectMenuInteraction(client, data);
			}

		case InteractionTypes.MODAL_SUBMIT:
			return new ModalInteraction(client, data);
	}
}