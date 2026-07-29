import { Client, ClientEventMap } from "../../dist/index.js";

export interface EventHandler<E extends keyof ClientEventMap = keyof ClientEventMap> {
	name: E;
	execute: (client: Client, ...args: ClientEventMap[E]) => void | Promise<void>;
}
