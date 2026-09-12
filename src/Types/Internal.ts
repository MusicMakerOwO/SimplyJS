import { Awaitable, ObjectValues } from "./HelperTypes.js";
import { GatewayEvents } from "./DiscordGateway.js";
import { Client } from "../Client.js";
import { AllowedMentions, Embed, MessageReference, PollCreateRequest } from "./MessageComponents.js";
import { MessageComponent } from "./Components.js";

/** Raw gateway event name, as sent in the `t` field of a dispatch payload */
export type GatewayEventName = ObjectValues<typeof GatewayEvents>;

/** Pairing of a raw gateway event name with the handler that processes its payload */
export type EventHandler<
	TName extends GatewayEventName,
	TData extends JSONObject
> = {
	name: TName;
	handler: (client: Client, data: TData) => Awaitable<void>;
}

/**
 * Identity helper for declaring an `EventHandler`.
 *
 * Exists purely so each `src/Events/*.ts` module gets type inference on `name`/`handler`
 * without having to spell out the generic parameters by hand.
 * @param event The event name and handler pairing.
 */
export function defineEvent<
	TName extends GatewayEventName,
	TData extends JSONObject
>(event: EventHandler<TName, TData>): EventHandler<TName, TData> {
	return event;
}

/** Any value representable in JSON */
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
/** A JSON object with string keys */
export type JSONObject = Record<string, JSONValue>;
/** A JSON array */
export type JSONArray = JSONValue[];

/**
 * The raw bytes of a file to upload.
 *
 * Emoji and sticker uploads take this instead of a {@link FileAttachment}: those endpoints already
 * take the name of the thing being created and Discord ignores the filename, so there is nothing
 * left worth naming. The file type is read from the contents rather than an extension
 * (`DetectMimeType()`), and `ResolveUpload()` supplies the filename the form needs.
 */
export type UploadInput = Buffer | Uint8Array;

/**
 * A file for one of Discord's JSON image fields - a guild icon, an avatar, a soundboard sound, and
 * so on - either as raw bytes or as a data URI you encoded yourself.
 *
 * These endpoints take the file inline in the JSON body rather than as a multipart upload, so the
 * bytes are encoded with `ToDataURI()` before being sent. A `string` must already be a data URI;
 * nothing here reads from the disk.
 */
export type ImageInput = UploadInput | string;

/**
 * A file to upload alongside a message.
 *
 * Sending one of these switches the request from a JSON body to `multipart/form-data`; see
 * {@link Rest.post}. Reference an attachment from an embed or component with `attachment://<name>`.
 */
export type FileAttachment = {
	/** Filename as it will appear in Discord, including the extension */
	name: string;
	/** File contents. A `string` is uploaded as its UTF-8 bytes, not read from disk */
	data: Buffer | Uint8Array | string;
	/** Alt text, shown to screen readers and on hover */
	description?: string;
}

/**
 * An attachment already on a message, named so an edit keeps it.
 *
 * Editing a message replaces its whole attachment list, so any existing attachment left out of the
 * list is removed. Include one of these to hold onto it.
 */
export type RetainedAttachment = {
	/** The existing attachment's id, as it appears on the message */
	id: string;
	/** Renames the attachment when set, otherwise the current name is kept */
	filename?: string;
	/** Replaces the alt text when set, otherwise the current description is kept */
	description?: string;
}

/**
 * An entry in a payload's `attachments` list: either a {@link FileAttachment} to upload, or a
 * {@link RetainedAttachment} naming one already on the message. Entries carrying `data` are uploads.
 */
export type MessageAttachmentInput = FileAttachment | RetainedAttachment;

/** Wire-format attachment descriptor, as it appears in the JSON body Discord receives */
export type AttachmentDescriptor = {
	/** For uploads, the index of the matching `files[n]` form part; for retained ones, the real id */
	id: string;
	filename?: string;
	description?: string;
}

/** Full message payload accepted by `send()` and `reply()`; a plain string is shorthand for `{ content }` */
export type MessagePayload = {
	/** Plain text message content */
	content?: string;
	/** Rich embeds to attach, up to Discord's per-message limit */
	embeds?: Embed[];
	/** Whether to send as a text-to-speech message */
	tts?: boolean;
	/** Controls which mentions in the content actually notify users/roles */
	allowed_mentions?: AllowedMentions;
	/** Reference to another message, used for replies */
	message_reference?: MessageReference;
	/** Message components (buttons, select menus, etc) */
	components?: MessageComponent[];
	/** IDs of stickers to attach to the message */
	sticker_ids?: string[];
	/**
	 * A poll to send with the message. Not accepted when editing, and cannot be combined with
	 * Components V2 - see {@link ResolveComponentsV2Flags}
	 */
	poll?: PollCreateRequest;
	/**
	 * Files to upload with the message (sent as `multipart/form-data`), and, when editing,
	 * {@link RetainedAttachment} entries naming the existing attachments to keep
	 */
	attachments?: MessageAttachmentInput[];
	/** Message flags bitfield, such as `SUPPRESS_EMBEDS` or `IS_COMPONENTS_V2` */
	flags?: number;
}

/** A {@link MessagePayload} with the user-facing `attachments` replaced by their wire descriptors */
export type MessagePayloadBody = Omit<MessagePayload, 'attachments'> & {
	attachments?: AttachmentDescriptor[];
}

/** A class constructor accepting any arguments and producing `T`, used to type mixin base classes */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;