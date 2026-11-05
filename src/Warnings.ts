import type { Client } from "./Client.js";
import { ClientEvents, ClientWarning, WarningCodes } from "./Types/SimplyJSTypes.js";
import { ObjectValues } from "./Types/HelperTypes.js";

/**
 * Reports a {@link ClientWarning} through {@link ClientEvents.Warn}, or prints it with
 * `console.warn` when nothing is listening.
 *
 * The fallback is what keeps warnings loud by default: a bot that never heard of `Warn` still
 * sees them, and one that listens has taken over the output and decides what to keep. Every
 * warning the library raises goes through here, so that rule holds for all of them.
 *
 * Never throws. Warnings are raised from places that cannot absorb a listener's exception: a
 * `newListener` hook (where it would make `client.on()` itself throw), an unref'd timer (where it
 * would crash the process), and the `catch` of an interaction response (where it would replace
 * the Discord error the caller is about to see). A `Warn` listener that throws gets its error
 * printed, alongside the warning it failed on so that warning is not lost.
 *
 * @internal Not intended for use outside the library.
 */
export function EmitWarning(client: Client, code: ObjectValues<typeof WarningCodes>, message: string): void {
	if (client.listenerCount(ClientEvents.Warn) === 0) {
		console.warn(`[SimplyJS] ${message}`);
		return;
	}

	const warning: ClientWarning = { code, message };
	try {
		client.emit(ClientEvents.Warn, warning);
	} catch (error) {
		console.warn(`[SimplyJS] ${message}`);
		console.error(`Error in a "${ClientEvents.Warn}" listener:`, error);
	}
}
