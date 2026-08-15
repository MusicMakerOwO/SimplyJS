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
 * Not currently used internally - exposed as a building block for consumers (or a future library
 * feature) that want to guard REST calls requiring a privileged intent, e.g. refusing to fetch
 * guild members without `GuildMembers`.
 */
export function HasIntent(bitfield: number, targetIntent: ObjectValues<typeof GatewayIntents>): boolean {
	return !!(bitfield & targetIntent);
}
