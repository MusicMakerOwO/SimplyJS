import { Client, SlashCommandInteraction, ButtonInteraction } from "../../dist/index.js";
import { SlashCommandBuilder } from "../../dist/index.js";

export interface CommandHandler {
	data: SlashCommandBuilder;
	execute: (client: Client, interaction: SlashCommandInteraction) => Promise<void>;
}

export interface ButtonHandler {
	/** Base id matched against the customId, once its args have been split off - see `customId.ts` */
	id: string;
	execute: (client: Client, interaction: ButtonInteraction, ...args: string[]) => Promise<void>;
}

export interface FullClient extends Client {
	commands: Map<string, CommandHandler>;
	buttons: Map<string, ButtonHandler>;
}
