import { Client, Message } from "../../dist/index.js";

export interface CommandHandler {
	name: string;
	execute: (client: FullClient, message: Message, args: string[]) => Promise<void>;
}

export interface FullClient extends Client {
	commands: Map<string, CommandHandler>;
}