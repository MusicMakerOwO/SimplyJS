import { BaseInteraction } from "../../Structures/Interactions/BaseInteraction.js";
import { Message } from "../../Structures/Message.js";
import { Constructor } from "../../Types/Internal.js";
import { DiscordMessage } from "../../Types/MessageComponents.js";
import { InteractionCallbackMessages, InteractionCallbackTypes } from "../../Types/Interactions.js";

/** Message flag bit for an ephemeral (invoking-user-only) response */
const EPHEMERAL_FLAG = 1 << 6;

/** Full reply payload, or a plain string shorthand for `{ content }` */
export type InteractionReplyPayload = string | InteractionCallbackMessages;

function resolveReplyPayload(input: InteractionReplyPayload): InteractionCallbackMessages {
	return typeof input === "string" ? { content: input } : input;
}

type RepliableClass<T> = {
	reply(content: InteractionReplyPayload): Promise<void>;
	deferReply(ephemeral?: boolean): Promise<void>;
	editReply(content: InteractionReplyPayload): Promise<Message>;
	followUp(content: InteractionReplyPayload): Promise<Message>;
	deleteReply(): Promise<void>;
} & T;

/**
 * Mixes reply/defer/follow-up methods into an interaction class. Applied to every interaction
 * type that can be responded to with a message (commands, components, modal submits) - not
 * `PingInteraction`, which only ever gets a bare `PONG` ack.
 * @param Base The interaction class to extend.
 */
export function Repliable<TBase extends Constructor<BaseInteraction>>(
	Base: TBase,
): Constructor<RepliableClass<InstanceType<TBase>>> {
	return class extends Base {
		/**
		 * Responds to this interaction with a message. Can only be called once per interaction -
		 * use {@link followUp} to send additional messages afterward.
		 * @param content Plain text content, or a full reply payload.
		 */
		async reply(content: InteractionReplyPayload): Promise<void> {
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE,
				data: resolveReplyPayload(content),
			});
		}

		/**
		 * Acknowledges the interaction with a loading state, deferring the actual response until {@link editReply} is called.
		 * Must be used when a reply can't be produced within Discord's 3-second interaction timeout.
		 * @param ephemeral Whether the eventual response should only be visible to the invoking user.
		 */
		async deferReply(ephemeral = false): Promise<void> {
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
				...(ephemeral ? { data: { flags: EPHEMERAL_FLAG } } : {}),
			});
		}

		/**
		 * Edits this interaction's original response.
		 * @param content Plain text content, or a full reply payload.
		 */
		async editReply(content: InteractionReplyPayload): Promise<Message> {
			const response = await this.client.rest.patch<DiscordMessage>(
				`/webhooks/${this.applicationId}/${this.token}/messages/@original`,
				resolveReplyPayload(content),
			);
			return new Message(this.client, response);
		}

		/**
		 * Sends an additional message in response to this interaction, after an initial
		 * {@link reply} or {@link deferReply}.
		 * @param content Plain text content, or a full reply payload.
		 */
		async followUp(content: InteractionReplyPayload): Promise<Message> {
			const response = await this.client.rest.post<DiscordMessage>(
				`/webhooks/${this.applicationId}/${this.token}`,
				resolveReplyPayload(content),
			);
			return new Message(this.client, response);
		}

		/** Deletes this interaction's original response. */
		async deleteReply(): Promise<void> {
			await this.client.rest.delete(`/webhooks/${this.applicationId}/${this.token}/messages/@original`);
		}
	} as unknown as Constructor<RepliableClass<InstanceType<TBase>>>;
}