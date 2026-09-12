import { BitField, BitFieldValue } from "./DataStructures/BitField.js";
import { FileAttachment, ImageInput, UploadInput } from "./Types/Internal.js";

/**
 * Builds a BitField from any supported bitfield input format.
 *
 * @example
 * const bitfield = toBitField(DiscordPermissions, ["VIEW_CHANNEL", "SEND_MESSAGES"]);
 * bitfield.toString(); // "3072"
 */
export function CreateBitField<FlagMap extends Record<string, bigint>>(
	flagMap: FlagMap,
	bits: BitFieldValue<FlagMap>,
): BitField<FlagMap> {
	if (Array.isArray(bits)) {
		return new BitField(flagMap, 0n).set(true, ...bits);
	}

	return new BitField(flagMap, bits);
}

/**
 * Converts a bitfield value to an API-safe scalar.
 *
 * - bigint and array inputs are serialized to decimal strings.
 * - number and string inputs are returned unchanged.
 */
export function SerializeBitFieldValue<FlagMap extends Record<string, bigint>>(
	flagMap: FlagMap,
	bits: BitFieldValue<FlagMap>,
): string | number {
	if (typeof bits === "bigint" || Array.isArray(bits)) {
		return CreateBitField(flagMap, bits).toString();
	}

	return bits;
}

/**
 * MIME types Discord's upload endpoints accept, mapped to the extension a file of that type is
 * named with, see {@link ResolveUpload}.
 */
const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
	"image/png": "png",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"application/json": "json",
	"audio/mpeg": "mp3",
	"audio/ogg": "ogg"
};

/** Whether the bytes look like a JSON object, ignoring leading whitespace */
function IsJSONObject(bytes: Uint8Array): boolean {
	for (const byte of bytes) {
		if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
		return byte === 0x7b; // '{'
	}
	return false;
}

/**
 * Whether the bytes open on an MPEG audio frame header describing Layer III audio, ie. an MP3
 * without an ID3 tag ahead of it.
 *
 * The 11 sync bits alone are not enough of a signature to go on: they also match a UTF-16LE byte
 * order mark, so `FF FE ...` text would be detected as audio. The rest of the header's fixed fields
 * are checked to rule that out - the reserved encodings of the version, layer, bitrate index, and
 * sample rate are all rejected, and the layer is required to be III specifically, which is what
 * `audio/mpeg` means here and what a `FF FE`/`FF FF` lead-in cannot claim (both decode as Layer I).
 */
function IsMP3FrameHeader(bytes: Uint8Array): boolean {
	if (bytes.length < 3) return false;
	if (bytes[0] !== 0xff || (bytes[1]! & 0xe0) !== 0xe0) return false;

	if (((bytes[1]! >> 3) & 0b11) === 0b01) return false; // reserved MPEG version
	if (((bytes[1]! >> 1) & 0b11) !== 0b01) return false; // layer, where 01 is Layer III

	const bitrateIndex = (bytes[2]! >> 4) & 0b1111;
	if (bitrateIndex === 0b0000 || bitrateIndex === 0b1111) return false; // free and invalid

	return ((bytes[2]! >> 2) & 0b11) !== 0b11; // reserved sample rate
}

/** Whether `bytes` begins with the given byte sequence, ignoring positions given as `null` */
function StartsWith(bytes: Uint8Array, signature: (number | null)[]): boolean {
	if (bytes.length < signature.length) return false;
	return signature.every((byte, index) => byte === null || bytes[index] === byte);
}

/**
 * Determines the MIME type of a file from its contents.
 *
 * Deliberately does not look at a filename. This library never touches the disk, so uploads arrive
 * as bytes a caller has read themselves and often have no filename at all - and where there is one,
 * an extension is only a claim. A `.png` holding JPEG data would have Discord reject the upload,
 * while the magic bytes say what the file actually is.
 *
 * @param bytes The file contents to inspect.
 * @returns The detected MIME type, such as `image/png`.
 * @throws {Error} When the contents match no supported type.
 */
export function DetectMimeType(bytes: UploadInput): string {
	if (StartsWith(bytes,[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
	if (StartsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
	if (StartsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
	// WebP is a RIFF container, so the format only shows up in the four bytes after the length
	if (
		StartsWith(bytes, [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50])
	) {
		return "image/webp";
	}
	if (StartsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return "audio/ogg"; // "OggS"
	if (StartsWith(bytes, [0x49, 0x44, 0x33])) return "audio/mpeg"; // "ID3" tag ahead of the audio
	// An MP3 without an ID3 tag opens on a frame header rather than a signature
	if (IsMP3FrameHeader(bytes)) return "audio/mpeg";
	// Lottie stickers are JSON, which has no signature - the first non-whitespace byte is the tell
	if (IsJSONObject(bytes)) return "application/json";

	throw new Error(
		`Could not determine the file type from its contents. Supported types: ${Object.keys(EXTENSIONS_BY_MIME_TYPE).join(", ")}`
	);
}

/**
 * Names an upload for the multipart form, since {@link UploadInput} carries no filename.
 *
 * Endpoints that take an {@link UploadInput} already take the name of the thing being created as
 * their own argument, and Discord ignores the filename on them, so there is nothing to be gained by
 * making callers supply one. The form still needs *some* filename, so it is built here from the
 * name of the thing being created and the extension of the detected type.
 *
 * @param data The file contents.
 * @param fallbackName Base name for the file, usually the name of the thing being created.
 * @returns The file, named.
 * @throws {Error} When the file type cannot be determined, see {@link DetectMimeType}.
 */
export function ResolveUpload(data: UploadInput, fallbackName: string): FileAttachment {
	const extension = EXTENSIONS_BY_MIME_TYPE[DetectMimeType(data)] ?? "bin";
	return { data, name: `${fallbackName}.${extension}` };
}

/**
 * Encodes a file as the base64 data URI Discord's JSON image fields expect (emoji images, guild
 * icons, avatars, and so on).
 *
 * A `string` that is already a data URI is returned untouched, so callers that pre-encoded their
 * image keep working.
 *
 * @param file The file to encode, or an already-encoded data URI.
 * @returns A `data:<mime>;base64,<data>` string.
 * @throws {Error} When the file type cannot be determined, see {@link DetectMimeType}.
 */
export function ToDataURI(file: ImageInput): string {
	if (typeof file === "string") {
		if (!file.startsWith("data:")) throw new Error("An image string must already be a data URI");
		return file;
	}

	return `data:${DetectMimeType(file)};base64,${Buffer.from(file).toString("base64")}`;
}

/**
 * {@link ToDataURI} for the optional, nullable image fields of an edit.
 *
 * Discord's image fields distinguish three states: absent leaves the image alone, `null` clears it,
 * and a data URI replaces it. Only the last is a file, so the other two pass straight through.
 *
 * @param file The file to encode, an already-encoded data URI, `null` to clear, or `undefined`.
 * @returns The encoded image, or `file` unchanged when it is `null` or `undefined`.
 * @throws {Error} When the file type cannot be determined, see {@link DetectMimeType}.
 */
export function EncodeImage<T extends ImageInput | null | undefined>(
	file: T,
): T extends ImageInput ? string : T {
	type Result = T extends ImageInput ? string : T;
	if (file === null || file === undefined) return file as Result;
	return ToDataURI(file) as Result;
}
/**
 * Normalizes a color into the decimal integer Discord expects.
 *
 * Shared by the two places a color is accepted - an embed's `color` and a container's
 * `accent_color` - so both take the same inputs and reject the same way.
 *
 * @param value A decimal color, or a `#RRGGBB` hex string.
 * @returns The color as a decimal integer.
 * @throws {Error} When a string is not a 6-digit hex color code.
 */
export function ResolveColor(value: number | string): number {
	if (typeof value === "number") return value;

	const hexRegex = /^#[0-9a-fA-F]{6}$/;
	if (!hexRegex.test(value)) throw new Error("Must be a hex color code (#123456)");

	return parseInt(value.slice(1), 16);
}
