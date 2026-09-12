import { Client } from "../Client.js";
import { DiscordMember } from "../Types/DiscordAPITypes.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import { MessagePayload } from "../Types/Internal.js";
import { CreateMessagePayload, Message, PreparePayload } from "./Message.js";

/** Identifies the webhook a {@link WebhookMessage} was sent through, and the thread it landed in */
export type WebhookMessageContext = {
	/** the id of the webhook that sent this message */
	webhookId: string;
	/** the token of the webhook that sent this message, the authorization for editing it */
	webhookToken: string;
	/** id of the thread the message lives in, when it was sent into one */
	threadId?: string;
}

/**
 * A message sent by a {@link Webhook}, which can be edited and deleted with the webhook's own token.
 *
 * The plain {@link Message} operations do not work on one of these: its author is the webhook rather
 * than the bot, so {@link Message.update} refuses it outright, and {@link Message.delete} goes through
 * the channel route, which needs `MANAGE_MESSAGES`. This subclass overrides both to use
 * `/webhooks/{id}/{token}/messages/{id}` instead, which needs no permissions at all.
 *
 * The inherited channel operations - {@link Message.reply}, {@link Message.pin}, {@link Message.react} -
 * are left alone. A webhook token cannot perform them; they are the bot's to do.
 *
 * @see https://docs.discord.com/developers/resources/webhook#edit-webhook-message
 */
export class WebhookMessage extends Message {
	/**
	 * The id of the webhook that sent this message.
	 *
	 * Narrows the optional {@link Message.webhookId} - it is filled from the payload's `webhook_id`
	 * there and so may be absent, but is always known here because the sending webhook supplied it.
	 */
	declare webhookId: string;
	/** the token of the webhook that sent this message, the authorization for editing it */
	webhookToken: string;
	/** id of the thread this message lives in, when it was sent into one */
	threadId?: string;

	constructor(
		client: Client,
		data: DiscordMessage & { guild_id?: string | null; member?: Partial<DiscordMember> | null },
		context: WebhookMessageContext
	) {
		super(client, data);
		this.webhookId = context.webhookId;
		this.webhookToken = context.webhookToken;
		if (context.threadId !== undefined) this.threadId = context.threadId;
	}

	/** The context needed to build another {@link WebhookMessage} for the same webhook and thread */
	get context(): WebhookMessageContext {
		return {
			webhookId: this.webhookId,
			webhookToken: this.webhookToken,
			...(this.threadId !== undefined && { threadId: this.threadId })
		};
	}

	/**
	 * Edits this message through the webhook that sent it.
	 *
	 * Unlike {@link Message.update} this does not check the author - the webhook token is the
	 * authorization, so there is no bot user to compare against.
	 * @param content Updated message content or payload.
	 * @returns The updated message, still addressable through the same webhook.
	 * @throws {Error} When the payload breaks one of the Components V2 rules.
	 * @see https://docs.discord.com/developers/resources/webhook#edit-webhook-message
	 */
	override async update(
		content: string | Omit<MessagePayload, 'sticker_ids' | 'message_reference' | 'poll'>
	): Promise<WebhookMessage> {
		// this message's own flags, so editing a v2 message keeps it held to the v2 rules
		const { body, files } = PreparePayload(CreateMessagePayload(content), this.flags);
		const response = await this.client.rest.patch<DiscordMessage>(
			WebhookMessageRoute(this.id, this.context),
			body,
			undefined,
			files
		);
		return new WebhookMessage(this.client, response, this.context);
	}

	/**
	 * Deletes this message through the webhook that sent it, which needs no permissions.
	 * @see https://docs.discord.com/developers/resources/webhook#delete-webhook-message
	 */
	override async delete(): Promise<void> {
		return await this.client.rest.delete(WebhookMessageRoute(this.id, this.context));
	}
}

/**
 * Builds the `/webhooks/{id}/{token}/messages/{id}` route, carrying the thread the message lives in.
 *
 * Messages sent into a thread are only addressable with `thread_id` on the query string - without it
 * Discord looks in the webhook's own channel and answers `404`.
 * @param messageId Id of the message being addressed.
 * @param context The webhook the message was sent through, see {@link WebhookMessageContext}.
 */
export function WebhookMessageRoute(messageId: string, context: WebhookMessageContext): string {
	const base = `/webhooks/${context.webhookId}/${context.webhookToken}/messages/${messageId}`;
	return context.threadId ? `${base}?thread_id=${context.threadId}` : base;
}
