import { BaseInteraction } from "./BaseInteraction.js";
import {
	ApplicationCommandAutocompleteInteraction,
	ApplicationCommandInteractionDataOption,
	InteractionCallbackTypes
} from "../../Types/Interactions.js";
import { ApplicationCommandOptionChoice } from "../../Types/ApplicationCommand.js";

/** Recursively searches an option tree (including subcommand/group nesting) for the focused option */
function findFocusedOption(options: ApplicationCommandInteractionDataOption[]): ApplicationCommandInteractionDataOption | undefined {
	for (const option of options) {
		if (option.focused) return option;
		if (option.options !== undefined) {
			const nested = findFocusedOption(option.options);
			if (nested !== undefined) return nested;
		}
	}
	return undefined;
}

/** A request for autocomplete suggestions while the user is filling out a command's options. */
export class AutocompleteInteraction extends BaseInteraction {
	// `declare`d rather than plain fields - `patch()` runs as part of the `super()` chain from
	// `BaseInteraction`'s constructor, further up than this class's own field initializers, so a
	// real field declaration would run its (implicit `undefined`) initializer after `patch()`
	// already set the value, wiping it out.
	/** Name of the command being autocompleted */
	declare commandName: string
	/** Id of the command being autocompleted */
	declare commandId: string
	/** The full option tree as filled in so far */
	declare options: ApplicationCommandInteractionDataOption[]
	/** The option currently focused by the user, i.e. the one being autocompleted */
	declare focusedOption?: ApplicationCommandInteractionDataOption

	// `patch()` runs as part of the `super()` chain from `BaseInteraction`'s constructor, before
	// this class's own private-field brand is installed on `this` - a private `#findFocusedOption`
	// helper called from here would throw ("Receiver must be an instance of class
	// AutocompleteInteraction"), so this is a plain module-level function instead.
	patch(data: ApplicationCommandAutocompleteInteraction): void {
		super.patch(data);
		this.commandId = data.data.id;
		this.commandName = data.data.name;
		this.options = data.data.options ?? [];

		const focused = findFocusedOption(this.options);
		if (focused !== undefined) this.focusedOption = focused;
	}

	/**
	 * Responds to this interaction with suggested choices, the only valid response.
	 * @param choices Suggested choices, up to 25.
	 */
	async respond(choices: ApplicationCommandOptionChoice[]): Promise<void> {
		await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
			type: InteractionCallbackTypes.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			data: { choices },
		});
	}
}
