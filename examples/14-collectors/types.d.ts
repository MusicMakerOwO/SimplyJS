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
//
// A real bot usually wants both: registered handlers for the buttons that must still work after
// a restart, and collectors for the short-lived flows. That mix used to be a trap, because both
// halves would try to answer the same click and whichever replied second got back
// `40060 Interaction has already been acknowledged`. Collectors now get the interaction first,
// and the one they take is marked `interaction.claimed` - so a registered handler opens with
//
//   if (interaction.claimed) return;
//
// and the two stop competing. Examples 11-13 all do this.
export interface FullClient extends Client {
	commands: Map<string, CommandHandler>;
}
