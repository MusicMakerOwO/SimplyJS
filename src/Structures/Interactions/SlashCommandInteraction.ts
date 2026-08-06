import { BaseCommandInteraction } from "./BaseCommandInteraction.js";
import { ApplicationCommandInteraction } from "../../Types/Interactions.js";
import { SlashCommandOptions } from "../../Managers/SlashCommandOptions.js";

/**
 * A slash command invocation. `options` gives typed accessors (`getString`, `getUser`, etc.)
 * over the command's resolved parameters, including nested subcommand/group options.
 */
export class SlashCommandInteraction extends BaseCommandInteraction {
	// `declare`d - see the comment on `BaseCommandInteraction`'s fields for why.
	/** Params and values provided by the user, including nested subcommand/group options */
	declare options: SlashCommandOptions

	patch(data: ApplicationCommandInteraction): void {
		super.patch(data);
		const guild = this.guildId !== undefined ? this.client.guilds.get(this.guildId) : undefined;
		this.options = new SlashCommandOptions(this.client, guild, data.data.options ?? [], data.data.resolved ?? {});
	}
}