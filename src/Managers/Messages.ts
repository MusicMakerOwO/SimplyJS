import { BaseChannel } from "../Structures/Channels/BaseChannel.js";
import { Message } from "../Structures/Message.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import { Client } from "../Client.js";

/** Pagination options for fetching a page of a channel's messages. */
export type MessageFetchOptions = {
	/** Max number of messages to return (1-100, default 50) */
	limit?: number;
	/** Get messages before this message ID */
	before?: string;
	/** Get messages after this message ID */
	after?: string;
	/** Get messages around this message ID */
	around?: string;
};

/**
 * Manages a channel's messages. This manager has no local cache — every method calls the REST API
 * directly, since a channel's message history is unbounded and caching it would mean owning an
 * eviction policy.
 */
export class MessageManager {
	client: Client;
	channel: BaseChannel;

	constructor(client: Client, channel: BaseChannel) {
		this.client = client;
		this.channel = channel;
	}

	/**
	 * Fetches a single message by id.
	 * @param id The message's id.
	 */
	async fetch(id: string): Promise<Message>;
	/**
	 * Fetches a page of the channel's messages, newest first.
	 * @param options Pagination options. At most one of `before`, `after` and `around` may be set.
	 * @throws {Error} When more than one of `before`, `after` and `around` is provided.
	 */
	async fetch(options?: MessageFetchOptions): Promise<Message[]>;
	async fetch(options?: string | MessageFetchOptions): Promise<Message | Message[]> {
		if (typeof options === 'string') {
			const response = await this.client.rest.get<DiscordMessage>(`/channels/${this.channel.id}/messages/${options}`);
			return new Message(this.client, response);
		} else {
			const anchors = [options?.before, options?.after, options?.around].filter(x => x !== undefined);
			if (anchors.length > 1) throw new Error("Only one of before, after and around may be provided when fetching messages");

			const params = new URLSearchParams();
			if (options?.limit) params.append('limit', options.limit.toString());
			if (options?.before) params.append('before', options.before);
			if (options?.after) params.append('after', options.after);
			if (options?.around) params.append('around', options.around);
			const query = params.toString()
				? `?${params.toString()}`
				: '';

			const response = await this.client.rest.get<DiscordMessage[]>(`/channels/${this.channel.id}/messages${query}`);
			const list = new Array<Message>(response.length);
			for (let i = 0; i < response.length; i++) {
				list[i] = new Message(this.client, response[i]);
			}
			return list;
		}
	}
}
