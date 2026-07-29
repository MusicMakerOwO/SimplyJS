import { Client, ClientEventMap } from "../../dist/index.js";

export interface EventHandler<E extends keyof ClientEventMap = keyof ClientEventMap> {
	name: E;
	execute: (client: Client, ...args: ClientEventMap[E]) => void | Promise<void>;
}

/**
 * Ties an event name to a handler whose arguments TypeScript checks against that
 * specific event's payload, inferred from `name` - no manual type annotation needed.
 */
export function createEvent<E extends keyof ClientEventMap>(
	name: E,
	execute: (client: Client, ...args: ClientEventMap[E]) => void | Promise<void>
): EventHandler<E> {
	return { name, execute };
}
