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

export interface EventHandler<T extends keyof ClientEventMap> {
	name: T;
	execute: (client: FullClient, event: ClientEventMap[T]) => Promise<void>
}