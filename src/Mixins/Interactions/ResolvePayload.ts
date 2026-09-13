import { InteractionCallbackMessages, InteractionReplyMessages } from "../../Types/Interactions.js";
import { MessageFlags } from "../../Types/index.js";

/** Full payload for a new message response, or a plain string shorthand for `{ content }` */
export type InteractionReplyPayload = InteractionReplyMessages | string;

/**
 * Full payload for editing an existing response, or a plain string shorthand for `{ content }`.
 *
 * Unlike {@link InteractionReplyPayload} this does not accept `ephemeral` - an edit cannot change
 * whether the message it edits is private.
 */
export type InteractionEditPayload = InteractionCallbackMessages | string;

/**
 * Normalizes a reply payload for the callbacks that send a new message, translating `ephemeral` into
 * the message flag Discord actually reads.
 *
 * The key is dropped rather than passed through: Discord has no `ephemeral` field, and
 * `SplitAttachments()` only strips `attachments`, so anything left here rides onto the wire as junk.
 *
 * Setting `flags` before `PreparePayload()` rather than after is deliberate and safe either way -
 * a Components V2 payload has the bit folded into the flags it returns, and a non-v2 one has no
 * flags of its own to compute, leaving this value to pass straight through.
 * @param input Plain text content, or a full reply payload.
 */
export function ResolveReplyPayload(input: InteractionReplyPayload): InteractionCallbackMessages {
	if (typeof input === "string") return { content: input };

	const { ephemeral, ...rest } = input;
	if (!ephemeral) return rest;

	return { ...rest, flags: (rest.flags ?? 0) | MessageFlags.EPHEMERAL };
}

/**
 * Normalizes a payload for the callbacks that edit an existing message, which have no `ephemeral` to
 * account for.
 * @param input Plain text content, or a full edit payload.
 */
export function ResolveEditPayload(input: InteractionEditPayload): InteractionCallbackMessages {
	return typeof input === "string" ? { content: input } : input;
}
