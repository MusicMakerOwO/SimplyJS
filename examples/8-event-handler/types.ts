import { Client, ClientEventMap } from "../../dist/index.js";

export interface EventHandler<E extends keyof ClientEventMap = keyof ClientEventMap> {
	name: E;
	execute: (client: Client, ...args: ClientEventMap[E]) => void | Promise<void>;
}

/**
 * Ties an event name to a handler whose arguments TypeScript checks against that
 * specific event's payload, inferred from `name` - no manual type annotation needed.
 *
 * The command examples got away with `export default { ... } as CommandHandler`, because every
 * command has the identical `execute` signature. Events don't: each one carries a different
 * payload, so the handler's arguments depend on which `name` was chosen. A cast can't express
 * that, since it checks against a type you've already had to name yourself. Passing `name` as
 * an argument lets TypeScript infer `E` from it and type `execute` to match, which is why this
 * is a function rather than an interface.
 */
export function createEvent<E extends keyof ClientEventMap>(
	name: E,
	execute: (client: Client, ...args: ClientEventMap[E]) => void | Promise<void>
): EventHandler<E> {
	return { name, execute };
}
