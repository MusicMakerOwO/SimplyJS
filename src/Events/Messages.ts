import { defineEvent, JSONObject } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import { Message } from "../Structures/Message.js";
import { ClientEvents, MessageDeleteBulkPayload, MessageDeletePayload } from "../Types/SimplyJSTypes.js";

export const MessageCreate = defineEvent({
	name: GatewayEvents.MessageCreate,
	handler: (client, data: DiscordMessage & { guild_id: string | null; member?: JSONObject }) => {
		client.emit(ClientEvents.MessageCreate, new Message(client, data) );
	}
});

/** Fires when a single message is deleted; Discord only sends identifiers, not the deleted message */
export const MessageDelete = defineEvent({
	name: GatewayEvents.MessageDelete,
	handler: (client, data: {
		id: string,
		channel_id: string,
		guild_id: string | null
	}) => {
		const payload: MessageDeletePayload = {
			id: data.id,
			channelId: data.channel_id,
			guildId: data.guild_id
		};
		client.emit(ClientEvents.MessageDelete, payload);
	}
});

/** Fires when multiple messages are deleted at once; Discord only sends identifiers, not the deleted messages */
export const MessageDeleteBulk = defineEvent({
	name: GatewayEvents.MessageDeleteBulk,
	handler: (client, data: {
		ids: string[],
		channel_id: string,
		guild_id: string | null
	}) => {
		const payload: MessageDeleteBulkPayload = {
			ids: data.ids,
			channelId: data.channel_id,
			guildId: data.guild_id
		};
		client.emit(ClientEvents.MessageDeleteBulk, payload);
	}
});

export const MessageUpdate = defineEvent({
	name: GatewayEvents.MessageUpdate,
	handler: (client, data: DiscordMessage & { guild_id: string | null; member?: JSONObject }) => {
		client.emit(ClientEvents.MessageUpdate, new Message(client, data) );
	}
});
