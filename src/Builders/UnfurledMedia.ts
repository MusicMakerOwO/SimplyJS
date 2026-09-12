import { UnfurledMediaItem } from "../Types/Components.js";

/** Maximum length of the alt text on any media-bearing component */
const MAX_DESCRIPTION_LENGTH = 1024;

/** The scheme Discord uses to reference a file uploaded alongside the same message */
export const ATTACHMENT_PROTOCOL = "attachment://";

/**
 * Anything the media setters accept - a full {@link UnfurledMediaItem} or a bare url string, which
 * is the only field the object has anyway.
 */
export type MediaInput = UnfurledMediaItem | string;

/**
 * Normalizes a media setter's argument into an {@link UnfurledMediaItem}.
 * @param media A media item, or the url on its own.
 * @returns The media item to store on the builder.
 * @throws {Error} When the url is missing or empty.
 */
export function ResolveMedia(media: MediaInput): UnfurledMediaItem {
	const item = typeof media === "string" ? { url: media } : media;

	if (!item?.url || item.url.length === 0) throw new Error("Media must have a url");

	return item;
}

/**
 * Runtime checks of a media item, shared by every component that displays one.
 *
 * `attachmentOnly` is for {@link FileComponent}, which Discord only accepts as an
 * `attachment://<filename>` reference to a file uploaded with the same message. This only checks the
 * reference's *shape* - whether it resolves against the payload's attachments is a send-time check,
 * since the builder cannot see the payload it will end up in.
 * @param label Name of the owning component, used in the error messages.
 * @param media The media item to check.
 * @param attachmentOnly Whether only `attachment://` references are valid.
 * @throws {Error} When the url is missing, or is not an attachment reference when one is required.
 */
export function ValidateMedia(label: string, media: UnfurledMediaItem | undefined, attachmentOnly = false): void {
	if (!media?.url || media.url.length === 0) throw new Error(`${label} must have a url`);

	if (!attachmentOnly) return;

	if (!media.url.startsWith(ATTACHMENT_PROTOCOL)) {
		throw new Error(`${label} only accepts ${ATTACHMENT_PROTOCOL}<filename> references - Received ${media.url}`);
	}

	if (media.url.length === ATTACHMENT_PROTOCOL.length) {
		throw new Error(`${label} reference is missing a filename - Received ${media.url}`);
	}
}

/**
 * Runtime check of the alt text shared by thumbnails and media gallery items.
 * @param label Name of the owning component, used in the error message.
 * @param description The alt text to check, if any.
 * @throws {Error} When the description is longer than 1024 characters.
 */
export function ValidateMediaDescription(label: string, description: string | undefined): void {
	if (description !== undefined && description.length > MAX_DESCRIPTION_LENGTH) {
		throw new Error(`${label} description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer - Received ${description.length} characters`);
	}
}
