import { Client, SlashCommandInteraction, ButtonInteraction, SelectMenuInteraction, ClientEvents, ClientEventMap, SlashCommandBuilder } from "../../dist/index.js";

export interface CommandHandler {
	data: SlashCommandBuilder;
	execute: (client: Client, interaction: SlashCommandInteraction) => Promise<void>;
}

export interface ButtonHandler {
	customId: string;
	execute: (client: Client, interaction: ButtonInteraction) => Promise<void>;
}

export interface SelectHandler {
	customId: string;
	execute: (client: Client, interaction: SelectMenuInteraction) => Promise<void>;
}

export interface FullClient extends Client {
	commands: Map<string, CommandHandler>;
	buttons: Map<string, ButtonHandler>;
	selects: Map<string, SelectHandler>;
}

/**
 * Events take `FullClient` rather than plain `Client` because the routing handlers in
 * events/ need to reach `client.commands`, `client.buttons` and `client.selects`. The
 * individual command and button handlers don't, so they stay on the narrower type.
 *
 * `event` is the entire argument list as one array, which is why handlers destructure it as
 * `[interaction]`. 8-event-handler spreads the arguments instead; see ../index.ts.
 */
export interface EventHandler<T extends keyof ClientEventMap> {
	name: T;
	execute: (client: FullClient, event: ClientEventMap[T]) => Promise<void>
}