import { GatewayIntents } from "./Types/DiscordGateway.js";
import { ObjectValues } from "./Types/HelperTypes.js";

/** Convert `ClientOptions.intents` to a bitfield of intents */
export function ResolveIntents(
	input:
		| number
		| ObjectValues<typeof GatewayIntents>[]
		| (keyof typeof GatewayIntents)[]
): number {
	if (typeof input === "number") return input;

	if (input.every(x => typeof x === "number")) {
		return input.reduce((a, b) => a | b, 0);
	}

	let intents = 0;
	for (const intent of input) {
		if (!(intent in GatewayIntents)) throw new Error(`Unknown intent: "${intent}"`);
		intents |= GatewayIntents[intent];
	}
	return intents;
}

/**
 * Checks whether a resolved intents bitfield includes a given intent.
 *
 * Used internally by `guild.members.fetchGateway()`, which refuses to send a request Discord would
 * silently ignore, and by the listener check behind `WarningCodes.MissingIntent`. Exposed for
 * consumers guarding their own intent-dependent code the same way.
 */
export function HasIntent(bitfield: number, targetIntent: ObjectValues<typeof GatewayIntents>): boolean {
	return !!(bitfield & targetIntent);
}
