import { Client } from "./Client.js";
import { GatewayEvents } from "./Types/DiscordGateway.js";
import { Awaitable, ObjectValues } from "./Types/HelperTypes.js";
import { EventHandler, JSONObject } from "./Types/Internal.js";

import * as AvailableEvents from "./Events/index.js";

type GatewayEventName = ObjectValues<typeof GatewayEvents>;
/** Signature of the function returned by {@link CreateDispatch}, routing a named gateway event to its handler */
export type DispatchFunction = (
	client: Client,
	event: GatewayEventName,
	data: JSONObject
) => void;

/** Handler invoked for a single gateway event, receiving the raw event data payload */
export type EventCallback<T extends JSONObject = JSONObject> = (client: Client, data: T) => Awaitable<void>

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

	const warnedUnhandledEvents = new Set<string>();

	return (client, event, data): void => {
		if (!events.has(event)) {
			if (!warnedUnhandledEvents.has(event)) {
				warnedUnhandledEvents.add(event);
				console.warn(`Unhandled event: "${event}" - No internal handler defined`);
			}
			return;
		}

		try {
			const result = events.get(event)!(client, data);
			if (result instanceof Promise) {
				result.catch(error => console.error(`Error in handler for event "${event}":`, error));
			}
		} catch (error) {
			console.error(`Error in handler for event "${event}":`, error);
		}
	};
}