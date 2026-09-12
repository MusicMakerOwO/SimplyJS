import { BaseInteraction } from "../../Structures/Interactions/BaseInteraction.js";
import { Message, PreparePayload } from "../../Structures/Message.js";
import { Constructor } from "../../Types/Internal.js";
import { DiscordMessage } from "../../Types/MessageComponents.js";
import { InteractionCallbackMessages, InteractionCallbackTypes } from "../../Types/Interactions.js";
import { MessageFlags } from "../../Types/index.js";

/** Full reply payload, or a plain string shorthand for `{ content }` */
export type InteractionReplyPayload = InteractionCallbackMessages | string;

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
			const { body, files } = PreparePayload(resolveReplyPayload(content));
			if (typeof content === 'object' && content.ephemeral) {
				body.flags ??= 0;
				body.flags |= MessageFlags.EPHEMERAL;
			}
			// the callback route nests the message in `data`, but uploads stay top-level form parts
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE,
				data: body,
			}, undefined, files);
		}

		/**
		 * Acknowledges the interaction with a loading state, deferring the actual response until {@link editReply} is called.
		 * Must be used when a reply can't be produced within Discord's 3-second interaction timeout.
		 * @param ephemeral Whether the eventual response should only be visible to the invoking user.
		 */
		async deferReply(ephemeral = false): Promise<void> {
			await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
				type: InteractionCallbackTypes.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
				...(ephemeral ? { data: { flags: MessageFlags.EPHEMERAL } } : {}),
			});
		}

		/**
		 * Edits this interaction's original response.
		 *
		 * Unlike `message.update()`, this cannot hold an edit to the Components V2 rules on the
		 * strength of what it is editing - the original response is addressed by token rather than
		 * fetched, so its flags are never seen here. An edit that looks like v2 on its own is still
		 * checked; one that does not is left to Discord.
		 * @param content Plain text content, or a full reply payload.
		 */
		async editReply(content: InteractionReplyPayload): Promise<Message> {
			const { body, files } = PreparePayload(resolveReplyPayload(content));
			const response = await this.client.rest.patch<DiscordMessage>(
				`/webhooks/${this.applicationId}/${this.token}/messages/@original`,
				body,
				undefined,
				files
			);
			return new Message(this.client, response);
		}

		/**
		 * Sends an additional message in response to this interaction, after an initial
		 * {@link reply} or {@link deferReply}.
		 * @param content Plain text content, or a full reply payload.
		 */
		async followUp(content: InteractionReplyPayload): Promise<Message> {
			const { body, files } = PreparePayload(resolveReplyPayload(content));
			const response = await this.client.rest.post<DiscordMessage>(
				`/webhooks/${this.applicationId}/${this.token}`,
				body,
				undefined,
				files
			);
			return new Message(this.client, response);
		}

		/** Deletes this interaction's original response. */
		async deleteReply(): Promise<void> {
			await this.client.rest.delete(`/webhooks/${this.applicationId}/${this.token}/messages/@original`);
		}
	} as unknown as Constructor<RepliableClass<InstanceType<TBase>>>;
}