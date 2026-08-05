import { ClientEvents, defineEvent, DiscordInteraction, GatewayEvents } from "../Types/index.js";
import { CreateInteraction } from "../Factory/CreateInteraction.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";
import { UserContextMenuInteraction } from "../Structures/Interactions/UserContextMenuInteraction.js";
import { MessageContextMenuInteraction } from "../Structures/Interactions/MessageContextMenuInteraction.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SelectMenuInteraction } from "../Structures/Interactions/SelectMenuInteraction.js";
import { AutocompleteInteraction } from "../Structures/Interactions/AutocompleteInteraction.js";
import { ModalInteraction } from "../Structures/Interactions/ModalInteraction.js";
import { PingInteraction } from "../Structures/index.js";

export const InteractionCreate = defineEvent({
	name: GatewayEvents.InteractionCreate,
	handler: (client, data: DiscordInteraction) => {
		// The gateway never sends a PING interaction (that variant only occurs over the HTTP
		// interactions endpoint), so the factory's wider return type can be narrowed here.
		const interaction = CreateInteraction(client, data);
		if (interaction instanceof PingInteraction) return void interaction.pong();

		client.emit(ClientEvents.InteractionCreate, interaction);

		if (interaction instanceof SlashCommandInteraction) {
			client.emit(ClientEvents.SlashCommandUsed, interaction);
		} else if (interaction instanceof UserContextMenuInteraction) {
			client.emit(ClientEvents.UserContextMenuUsed, interaction);
		} else if (interaction instanceof MessageContextMenuInteraction) {
			client.emit(ClientEvents.MessageContextMenuUsed, interaction);
		} else if (interaction instanceof ButtonInteraction) {
			client.emit(ClientEvents.ButtonUsed, interaction);
		} else if (interaction instanceof SelectMenuInteraction) {
			client.emit(ClientEvents.SelectMenuUsed, interaction);
		} else if (interaction instanceof AutocompleteInteraction) {
			client.emit(ClientEvents.AutocompleteUsed, interaction);
		} else if (interaction instanceof ModalInteraction) {
			client.emit(ClientEvents.ModalSubmitted, interaction);
		}
	}
});