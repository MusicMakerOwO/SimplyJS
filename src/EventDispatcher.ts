import { Client } from "./Client.js";
import { GatewayEvents } from "./Types/DiscordGateway.js";
import { Awaitable, ObjectValues } from "./Types/HelperTypes.js";
import { EventHandler, JSONObject } from "./Types/Internal.js";

import * as AvailableEvents from "./Events/index.js";

type GatewayEventName = ObjectValues<typeof GatewayEvents>;
export type DispatchFunction = (
	client: Client,
	event: GatewayEventName,
	data: JSONObject
) => void;

export type EventCallback<T extends JSONObject = JSONObject> = (client: Client, data: T) => Awaitable<void>

/**
 * Creates a dispatch function for handling events. This function contains a mapping of all events and names, this cannot be changed at runtime.
 * @param eventOverrides
 * @constructor
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

	return (client, event, data): void => {
		if (!events.has(event)) return console.warn(`Unhandled event: "${event}" - No internal handler defined`);
		void events.get(event)!(client, data);
	};
}