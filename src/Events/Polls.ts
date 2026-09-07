import { ClientEvents, defineEvent, GatewayEvents } from "../Types/index.js";
import { ResolveLocation } from "./ResolveLocation.js";

/** The raw `MESSAGE_POLL_VOTE_ADD` / `MESSAGE_POLL_VOTE_REMOVE` payload; both events share a shape */
type PollVotePayload = {
	user_id: string,
	channel_id: string,
	message_id: string,
	guild_id?: string,
	answer_id: number
};

/**
 * Fires when a user votes on a poll. `guild`, `channel`, and `user` fall back to a bare `{ id }`
 * object when not present in the local cache, and `guild` is `null` for DMs.
 *
 * Discord identifies the choice by `answerId`, which indexes into the poll's `answers` array by
 * that answer's `answer_id` - the message itself is not sent, and the library has no message
 * cache, so the running tally has to be kept by the listener or re-read with a message fetch.
 */
export const MessagePollVoteAdd = defineEvent({
	name   : GatewayEvents.MessagePollVoteAdd,
	handler: (client, data: PollVotePayload): void => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		client.emit(ClientEvents.MessagePollVoteAdd, {
			guild    : guild,
			channel  : channel,
			user     : user,
			messageId: data.message_id,
			answerId : data.answer_id
		});
	}
});

/**
 * Fires when a user retracts a poll vote. `guild`, `channel`, and `user` fall back to a bare
 * `{ id }` object when not present in the local cache, and `guild` is `null` for DMs.
 *
 * Changing a vote in a single-select poll arrives as a remove for the old answer followed by an
 * add for the new one, so the two events are not independent.
 */
export const MessagePollVoteRemove = defineEvent({
	name   : GatewayEvents.MessagePollVoteRemove,
	handler: (client, data: PollVotePayload): void => {
		const { guild, channel } = ResolveLocation(client, data.channel_id, data.guild_id);
		const user = client.users.get(data.user_id) ?? { id: data.user_id };

		client.emit(ClientEvents.MessagePollVoteRemove, {
			guild    : guild,
			channel  : channel,
			user     : user,
			messageId: data.message_id,
			answerId : data.answer_id
		});
	}
});
