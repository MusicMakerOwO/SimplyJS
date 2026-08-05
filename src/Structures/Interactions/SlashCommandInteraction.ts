import { BaseCommandInteraction } from "./BaseCommandInteraction.js";
import { ApplicationCommandInteraction, ApplicationCommandInteractionDataOption } from "../../Types/Interactions.js";

/**
 * A slash command invocation. `options` is left as the raw resolved option tree for now -
 * typed accessors (`getString`, `getUser`, etc.) are a planned follow-up.
 */
export class SlashCommandInteraction extends BaseCommandInteraction {
	// `declare`d - see the comment on `BaseCommandInteraction`'s fields for why.
	/** Params and values provided by the user, including nested subcommand/group options */
	declare options: ApplicationCommandInteractionDataOption[]

	patch(data: ApplicationCommandInteraction): void {
		super.patch(data);
		this.options = data.data.options ?? [];
	}
}