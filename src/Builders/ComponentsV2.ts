import { AnyComponent, ComponentTypes, MessageComponent } from "../Types/Components.js";
import { MessageFlags } from "../Types/DiscordAPITypes.js";
import { MessageAttachmentInput } from "../Types/Internal.js";
import { ATTACHMENT_PROTOCOL } from "./UnfurledMedia.js";

/** Maximum number of components in a v2 message, counting nested children */
export const MAX_V2_COMPONENTS = 40;
/** Maximum number of characters across every text display in a v2 message */
export const MAX_V2_CONTENT_LENGTH = 4000;

/**
 * The component types that are only valid on a Components V2 message. An {@link ActionRow} is
 * deliberately absent - it is valid in both versions, so a payload holding nothing but action rows
 * is still a v1 message and must not be flagged as v2.
 */
const v2OnlyTypes: readonly number[] = [
	ComponentTypes.SECTION,
	ComponentTypes.TEXT_DISPLAY,
	ComponentTypes.MEDIA_GALLERY,
	ComponentTypes.FILE,
	ComponentTypes.SEPARATOR,
	ComponentTypes.CONTAINER
];

/** What a single pass over a payload's components learns about it */
export type ComponentSummary = {
	/** Total number of components, counting nested children */
	count: number;
	/** Characters summed across every {@link TextDisplay}'s content */
	contentLength: number;
	/** Whether any component is only valid on a v2 message */
	usesV2: boolean;
	/** Every `attachment://` reference found, paired with the component that made it */
	references: { label: string; filename: string }[];
};

/** Records an `attachment://<filename>` reference, ignoring ordinary urls */
function collectReference(summary: ComponentSummary, label: string, url: string | undefined): void {
	if (!url?.startsWith(ATTACHMENT_PROTOCOL)) return;
	summary.references.push({ label, filename: url.slice(ATTACHMENT_PROTOCOL.length) });
}

/** Walks one component and its children, folding everything the send path needs into `summary` */
function walk(component: AnyComponent, summary: ComponentSummary): void {
	if (!component) return;

	summary.count++;
	if (v2OnlyTypes.includes(component.type)) summary.usesV2 = true;

	switch (component.type) {
		case ComponentTypes.TEXT_DISPLAY:
			summary.contentLength += component.content?.length ?? 0;
			break;

		case ComponentTypes.FILE:
			collectReference(summary, "File component", component.file?.url);
			break;

		case ComponentTypes.THUMBNAIL:
			collectReference(summary, "Thumbnail", component.media?.url);
			break;

		case ComponentTypes.MEDIA_GALLERY:
			for (const item of component.items ?? []) {
				collectReference(summary, "Media gallery item", item?.media?.url);
			}
			break;

		case ComponentTypes.SECTION:
			for (const child of component.components ?? []) walk(child, summary);
			walk(component.accessory, summary);
			break;

		case ComponentTypes.ACTION_ROW:
		case ComponentTypes.CONTAINER:
			for (const child of component.components ?? []) walk(child, summary);
			break;
	}
}

/**
 * Summarizes a payload's components in a single pass.
 *
 * Every send-path check needs the same traversal - the flag needs to know whether a v2-only type
 * appeared, the limits need the counts, and the attachment cross-check needs the references - so it
 * happens once and the checks read the result.
 * @param components The payload's top-level components, if any.
 * @returns The summary, all zeroed when there are no components.
 */
export function SummarizeComponents(components: MessageComponent[] | undefined): ComponentSummary {
	const summary: ComponentSummary = { count: 0, contentLength: 0, usesV2: false, references: [] };

	for (const component of components ?? []) walk(component, summary);

	return summary;
}

/**
 * Checks that every `attachment://<filename>` a component references names a file being uploaded
 * with the same message.
 *
 * Discord resolves these references against the message's own `attachments`, so a filename that does
 * not match anything there comes back as a 400 with no indication of which component was at fault.
 * Doing the lookup here turns that into a local throw naming both.
 *
 * A {@link FileAttachment} upload is matched on its `name`, and a {@link RetainedAttachment} on its
 * `filename` when it renames the attachment. A retained attachment that keeps its current name gives
 * nothing to match against, so the check steps aside entirely rather than reporting a reference it
 * cannot actually rule out.
 * @param summary The payload's component summary.
 * @param attachments The payload's attachments, if any.
 * @throws {Error} When a reference has no matching attachment.
 */
function validateAttachmentReferences(summary: ComponentSummary, attachments: MessageAttachmentInput[] | undefined): void {
	if (summary.references.length === 0) return;

	const names = new Set<string>();
	let unknownNames = false;

	for (const attachment of attachments ?? []) {
		if ("data" in attachment) names.add(attachment.name);
		else if (attachment.filename) names.add(attachment.filename);
		// a retained attachment keeping its current name could be any of the references
		else unknownNames = true;
	}

	if (unknownNames) return;

	for (const { label, filename } of summary.references) {
		if (names.has(filename)) continue;

		throw new Error(
			`${label} references ${ATTACHMENT_PROTOCOL}${filename}, but no attachment named "${filename}" was provided`
		);
	}
}

/** The shape of a payload the v2 rules care about, common to messages and interaction responses */
type ComponentsV2Payload = {
	components?: MessageComponent[];
	attachments?: MessageAttachmentInput[];
	flags?: number;
	content?: string;
	embeds?: unknown[];
	sticker_ids?: string[];
	poll?: unknown;
};

/**
 * Checks a payload against the message-wide Components V2 rules, and reports the flags it should be
 * sent with.
 *
 * This is the one place a payload is inspected automatically on the way out - the per-component
 * `validate()` methods stay opt-in, and nothing here calls them. It only enforces the rules a single
 * component cannot see for itself: whether the message as a whole is v2, what it may then no longer
 * carry, the budgets shared across every component, and whether the files its components point at
 * are actually being uploaded.
 *
 * Returns the flags rather than setting them, so the caller's payload is left untouched.
 * @param payload The normalized payload to check.
 * @param existingFlags Flags of the message being edited, when this is an edit. A message that is
 * already v2 stays v2, so its edits are held to the same rules even when the new payload carries
 * nothing that identifies it as one - an edit made up of action rows alone, say.
 * @returns The flags to send, or `undefined` when the payload is not a v2 message and needs none.
 * @throws {Error} When v1 and v2 features are mixed, a message-wide limit is exceeded, or an
 * `attachment://` reference does not resolve.
 */
export function ResolveComponentsV2Flags(payload: ComponentsV2Payload, existingFlags?: number): number | undefined {
	const summary = SummarizeComponents(payload.components);
	const flags = payload.flags ?? 0;
	const isV2 = summary.usesV2
		|| (flags & MessageFlags.IS_COMPONENTS_V2) !== 0
		|| ((existingFlags ?? 0) & MessageFlags.IS_COMPONENTS_V2) !== 0;

	if (!isV2) return undefined;

	if (payload.content !== undefined && payload.content.length > 0) {
		throw new Error("A message using Components V2 cannot also set content - use a TextDisplay component instead");
	}
	if (payload.embeds !== undefined && payload.embeds.length > 0) {
		throw new Error("A message using Components V2 cannot also set embeds - use a Container component instead");
	}
	if (payload.sticker_ids !== undefined && payload.sticker_ids.length > 0) {
		throw new Error("A message using Components V2 cannot also set sticker_ids");
	}
	if (payload.poll !== undefined) {
		throw new Error("A message using Components V2 cannot also set a poll");
	}

	if (summary.count > MAX_V2_COMPONENTS) {
		throw new Error(`A message cannot have more than ${MAX_V2_COMPONENTS} components, including nested ones - Received ${summary.count}`);
	}
	if (summary.contentLength > MAX_V2_CONTENT_LENGTH) {
		throw new Error(`A message cannot have more than ${MAX_V2_CONTENT_LENGTH} characters across its text displays - Received ${summary.contentLength}`);
	}

	validateAttachmentReferences(summary, payload.attachments);

	return flags | MessageFlags.IS_COMPONENTS_V2;
}
