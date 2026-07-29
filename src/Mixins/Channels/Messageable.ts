import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { CreateMessagePayload, Message } from "../../Structures/Message.js";
import { Constructor, MessagePayload } from "../../Types/Internal.js";
import { DiscordMessage } from "../../Types/MessageComponents.js";

/** A message, or the ID of one. */
export type MessageResolvable = Message | Message['id'];

type MessageableClass<T> = {
	send(content: string | MessagePayload): Promise<Message>;
	deleteMessage(message: MessageResolvable, reason?: string): Promise<void>;
	bulkDeleteMessages(messages: MessageResolvable[], reason?: string): Promise<string[]>;
} & T;

function resolveMessageID(message: MessageResolvable): string {
	return typeof message === "string"
		? message
		: message.id;
}

export function Messageable<TBase extends Constructor<BaseChannel>>(
	Base: TBase,
): Constructor<MessageableClass<InstanceType<TBase>>> {
	return class extends Base {
		async send(content: string | MessagePayload): Promise<Message> {
			const payload = CreateMessagePayload(content);
			const response = await this.client.rest.post<DiscordMessage>(`/channels/${this.id}/messages`, payload);
			return new Message(this.client, response);
		}

		/**
		 * Deletes a single message from this channel.
		 * @param message The message, or its ID.
		 * @param reason Reason to attach to the audit log entry.
		 */
		async deleteMessage(message: MessageResolvable, reason?: string): Promise<void> {
			const id = resolveMessageID(message);
			await this.client.rest.delete(
				`/channels/${this.id}/messages/${id}`,
				reason ? { "X-Audit-Log-Reason": reason } : undefined
			);
		}

		/**
		 * Deletes up to 100 messages from this channel in a single request. Duplicate IDs are
		 * removed before sending, and a single remaining message falls back to a normal delete
		 * since Discord rejects bulk deletes of fewer than two messages.
		 *
		 * Discord will not bulk delete messages older than two weeks.
		 * @param messages The messages, or their IDs.
		 * @param reason Reason to attach to the audit log entry.
		 * @returns The IDs that were requested to be deleted.
		 * @throws {Error} When no messages are provided, or more than 100 unique messages are provided.
		 */
		async bulkDeleteMessages(messages: MessageResolvable[], reason?: string): Promise<string[]> {
			const ids = [...new Set(messages.map(resolveMessageID))];

			if (ids.length === 0) throw new Error("Cannot bulk delete without any messages");
			if (ids.length > 100) throw new Error(`Cannot bulk delete more than 100 messages at once, received ${ids.length}`);

			if (ids.length === 1) {
				await this.deleteMessage(ids[0]!, reason);
				return ids;
			}

			await this.client.rest.post(
				`/channels/${this.id}/messages/bulk-delete`,
				{ messages: ids },
				reason ? { "X-Audit-Log-Reason": reason } : undefined
			);

			return ids;
		}
	} as unknown as Constructor<MessageableClass<InstanceType<TBase>>>;
}
