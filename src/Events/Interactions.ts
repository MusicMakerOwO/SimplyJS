import {
	AnyInteraction,
	ClientEvents,
	defineEvent,
	DiscordInteraction,
	GatewayEvents,
	InteractionEvent
} from "../Types/index.js";
import { CreateInteraction } from "../Factory/CreateInteraction.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";
import { UserContextMenuInteraction } from "../Structures/Interactions/UserContextMenuInteraction.js";
import { MessageContextMenuInteraction } from "../Structures/Interactions/MessageContextMenuInteraction.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SelectMenuInteraction } from "../Structures/Interactions/SelectMenuInteraction.js";
import { AutocompleteInteraction } from "../Structures/Interactions/AutocompleteInteraction.js";
import { ModalInteraction } from "../Structures/Interactions/ModalInteraction.js";
import { PingInteraction } from "../Structures/index.js";

type InteractionClass = abstract new (...args: never[]) => AnyInteraction;

/**
 * The class behind each of the {@link InteractionEvents}.
 *
 * A mapped type over `InteractionEvent` rather than a list of `if`s, so an event added to
 * `InteractionEvents` without a class here is a compile error rather than an interaction collectors
 * can claim but nothing ever emits. Lookup order does not matter: no two classes below are related
 * by inheritance - the command types are siblings under `BaseCommandInteraction`, the component
 * types siblings under `MessageComponentInteraction`.
 */
const EventClasses: { [E in InteractionEvent]: InteractionClass } = {
	[ClientEvents.SlashCommandUsed]: SlashCommandInteraction,
	[ClientEvents.UserContextMenuUsed]: UserContextMenuInteraction,
	[ClientEvents.MessageContextMenuUsed]: MessageContextMenuInteraction,
	[ClientEvents.ButtonUsed]: ButtonInteraction,
	[ClientEvents.SelectMenuUsed]: SelectMenuInteraction,
	[ClientEvents.AutocompleteUsed]: AutocompleteInteraction,
	[ClientEvents.ModalSubmitted]: ModalInteraction,
};

/** Hoisted so the lookup below allocates nothing per interaction */
const EventEntries = Object.entries(EventClasses) as [InteractionEvent, InteractionClass][];

/** Maps an interaction to the type-specific client event emitted alongside `InteractionCreate` */
function EventFor(interaction: AnyInteraction): InteractionEvent | null {
	for (const [event, type] of EventEntries) {
		if (interaction instanceof type) return event;
	}

	return null;
}

export const InteractionCreate = defineEvent({
	name: GatewayEvents.InteractionCreate,
	handler: (client, data: DiscordInteraction) => {
		// The factory's return type includes PingInteraction for the HTTP interactions endpoint,
		// which this gateway handler never actually receives - this check exists purely to
		// narrow that wider type back down to `AnyInteraction` for everything below.
		const interaction = CreateInteraction(client, data);
		if (interaction instanceof PingInteraction) return void interaction.pong();

		const event = EventFor(interaction);

		// Collectors get first refusal, *before* anything is emitted. Discord allows one initial
		// response per interaction, and a collector is registered later than the startup handlers
		// it competes with - so left to `EventEmitter` ordering the handler always answers first
		// and the collector's reply always comes back `40060 already acknowledged`. Settling
		// ownership first inverts that: by the time handlers run, who owns this interaction is
		// decided, and `claimed` is how they find out.
		//
		// The manager owns the emit rather than this handler awaiting and emitting itself, because
		// the gateway does not await dispatches - see `dispatchInteraction`, which keeps
		// concurrent interactions in the order they arrived and stays fully synchronous when no
		// filter suspends. Collectors on non-interaction events never come through here; there is
		// no exclusive response to arbitrate over a `MessageCreate`.
		return client.collectors.dispatchInteraction(interaction, event, () => {
			// Emitted either way, claimed or not, so that logging and metrics listeners see every
			// interaction - `claimed` tells a responder to stand down, it does not hide events.
			client.emit(ClientEvents.InteractionCreate, interaction);

			// `EventFor` already paired this interaction with its event above. The cast is because
			// that pairing is a runtime fact about the `instanceof` chain: with the event name
			// widened to a union, `emit` narrows its argument tuple to the intersection of all of
			// them, which is `never`.
			if (event !== null) {
				(client.emit as (event: string, ...args: unknown[]) => boolean)(event, interaction);
			}
		});
	}
});
