import { Awaitable, ObjectValues } from "./HelperTypes.js";
import { GatewayEvents } from "./DiscordGateway.js";
import { Client } from "../Client.js";
import { AllowedMentions, Embed, MessageReference } from "./MessageComponents.js";

export type GatewayEventName = ObjectValues<typeof GatewayEvents>;

export type EventHandler<
	TName extends GatewayEventName,
	TData extends JSONObject
> = {
	name: TName;
	handler: (client: Client, data: TData) => Awaitable<void>;
}

export function defineEvent<
	TName extends GatewayEventName,
	TData extends JSONObject
>(event: EventHandler<TName, TData>): EventHandler<TName, TData> {
	return event;
}

export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
export type JSONObject = Record<string, JSONValue> | JSONValue[];

export type MessagePayload = {
	content?: string;
	embeds?: Embed[];
	tts?: boolean;
	allowed_mentions?: AllowedMentions;
	message_reference?: MessageReference;
	// TODO Components and interactions coming in a later update
	components?: JSONObject[];
	sticker_ids?: string[];
}