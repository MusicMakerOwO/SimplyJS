import { Client, SlashCommandInteraction } from "../../dist/index.js";
import { SlashCommandBuilder } from "../../dist/index.js";

export interface CommandHandler {
	data: SlashCommandBuilder;
	execute: (client: Client, interaction: SlashCommandInteraction) => Promise<void>;
}

export interface FullClient extends Client {
	commands: Map<string, CommandHandler>;
}
