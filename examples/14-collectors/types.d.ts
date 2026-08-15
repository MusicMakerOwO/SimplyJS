import { Client, SlashCommandInteraction } from "../../dist/index.js";
import { SlashCommandBuilder } from "../../dist/index.js";

export interface CommandHandler {
	data: SlashCommandBuilder;
	execute: (client: Client, interaction: SlashCommandInteraction) => Promise<void>;
}

// There is deliberately no `ButtonHandler`/`SelectHandler` here, unlike examples 11-13. Every
// button in this example is owned by the collector that created it, so there is nothing to
// register and nothing for `index.ts` to look up on a click - the collector's filter decides
// which clicks belong to it, and the collector dies when the flow it belongs to is over.
export interface FullClient extends Client {
	commands: Map<string, CommandHandler>;
}
