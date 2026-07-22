import { defineEvent, JSONObject } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import { Message } from "../Structures/Message.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";

export const MessageCreate = defineEvent({
	name: GatewayEvents.MessageCreate,
	handler: (client, data: DiscordMessage & { guild_id: string | null; member?: JSONObject }) => {
		client.emit(ClientEvents.MessageCreate, new Message(client, data) );
	}
});

export const MessageDelete = defineEvent({
	name: GatewayEvents.MessageDelete,
	handler: (client, data: {
		id: string,
		channel_id: string,
		guild_id: string | null
	}) => {
		client.emit(ClientEvents.MessageDelete, data);
	}
});

export const MessageUpdate = defineEvent({
	name: GatewayEvents.MessageUpdate,
	handler: (client, data: DiscordMessage & { guild_id: string | null; member?: JSONObject }) => {
		client.emit(ClientEvents.MessageUpdate, new Message(client, data) );
	}
});