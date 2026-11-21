import { Client } from "./Client.js";
import { GatewayEvents } from "./Types/DiscordGateway.js";
import { Awaitable, ObjectValues } from "./Types/HelperTypes.js";
import { EventHandler, JSONObject } from "./Types/Internal.js";
import { WarningCodes } from "./Types/SimplyJSTypes.js";
import { EmitWarning } from "./Warnings.js";
import type { WSClient } from "./WSClient.js";

import * as AvailableEvents from "./Events/index.js";

type GatewayEventName = ObjectValues<typeof GatewayEvents>;
/**
 * Signature of the function returned by {@link CreateDispatch}, routing a named gateway event to its
 * handler. `shard` is the connection the event arrived on, which every {@link WSClient} passes.
 */
export type DispatchFunction = (
	client: Client,
	event: GatewayEventName,
	data: JSONObject,
	shard?: WSClient
) => void;

/**
 * Handler invoked for a single gateway event, receiving the raw event data payload and the shard it
 * arrived on. `shard` is only missing when a handler is called by hand rather than by a connection.
 */
export type EventCallback<T extends JSONObject = JSONObject> = (client: Client, data: T, shard?: WSClient) => Awaitable<void>

/**
 * Events already reported as unhandled, per client. Every shard builds its own dispatch function,
 * so a set inside one would repeat the warning once per shard.
 */
const WarnedUnhandledEvents = new WeakMap<Client, Set<string>>();

/**
 * Creates a dispatch function for handling events. This function contains a mapping of all events and names, this cannot be changed at runtime.
 * @param eventOverrides Per-event handlers to use instead of the library's built-in ones from `./Events`, keyed by gateway event name.
 */
export function CreateDispatch(
	eventOverrides: Partial<Record<GatewayEventName, EventCallback>> = {}
): DispatchFunction {
	const events = new Map<string, EventCallback>();

	for (const availableEvent of Object.values(AvailableEvents)) {
		const event = availableEvent as EventHandler<GatewayEventName, JSONObject>;
		if (events.has(event.name)) throw new Error(`Duplicate event name: ${event.name}`);
		events.set(event.name, event.handler);
	}

	for (const [eventName, eventOverride] of Object.entries(eventOverrides)) {
		if (!eventOverride) continue;
		events.set(eventName, eventOverride);
	}

	return (client, event, data, shard): void => {
		if (!events.has(event)) {
			let warned = WarnedUnhandledEvents.get(client);
			if (!warned) {
				warned = new Set();
				WarnedUnhandledEvents.set(client, warned);
			}
			if (!warned.has(event)) {
				warned.add(event);
				EmitWarning(client, WarningCodes.UnhandledEvent, `Unhandled event: "${event}" - No internal handler defined`);
			}
			return;
		}

		try {
			const result = events.get(event)!(client, data, shard);
			if (result instanceof Promise) {
				result.catch(error => console.error(`Error in handler for event "${event}":`, error));
			}
		} catch (error) {
			console.error(`Error in handler for event "${event}":`, error);
		}
	};
}