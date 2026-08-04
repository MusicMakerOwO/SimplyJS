import { Awaitable, ObjectValues } from "./HelperTypes.js";
import { GatewayEvents } from "./DiscordGateway.js";
import { Client } from "../Client.js";
import { AllowedMentions, Embed, MessageReference } from "./MessageComponents.js";
import { MessageComponent } from "./Components.js";

/** Raw gateway event name, as sent in the `t` field of a dispatch payload */
export type GatewayEventName = ObjectValues<typeof GatewayEvents>;

/** Pairing of a raw gateway event name with the handler that processes its payload */
export type EventHandler<
	TName extends GatewayEventName,
	TData extends JSONObject
> = {
	name: TName;
	handler: (client: Client, data: TData) => Awaitable<void>;
}

/**
 * Identity helper for declaring an `EventHandler`.
 *
 * Exists purely so each `src/Events/*.ts` module gets type inference on `name`/`handler`
 * without having to spell out the generic parameters by hand.
 * @param event The event name and handler pairing.
 */
export function defineEvent<
	TName extends GatewayEventName,
	TData extends JSONObject
>(event: EventHandler<TName, TData>): EventHandler<TName, TData> {
	return event;
}

/** Any value representable in JSON */
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
/** A JSON object with string keys */
export type JSONObject = Record<string, JSONValue>;
/** A JSON array */
export type JSONArray = JSONValue[];

/** Full message payload accepted by `send()` and `reply()`; a plain string is shorthand for `{ content }` */
export type MessagePayload = {
	/** Plain text message content */
	content?: string;
	/** Rich embeds to attach, up to Discord's per-message limit */
	embeds?: Embed[];
	/** Whether to send as a text-to-speech message */
	tts?: boolean;
	/** Controls which mentions in the content actually notify users/roles */
	allowed_mentions?: AllowedMentions;
	/** Reference to another message, used for replies */
	message_reference?: MessageReference;
	/** Message components (buttons, select menus, etc) */
	components?: MessageComponent[];
	/** IDs of stickers to attach to the message */
	sticker_ids?: string[];
}

/** A class constructor accepting any arguments and producing `T`, used to type mixin base classes */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;