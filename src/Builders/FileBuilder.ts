import { ComponentTypes, FileComponent, UnfurledMediaItem } from "../Types/Components.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";
import { MediaInput, ResolveMedia, ValidateMedia } from "./UnfurledMedia.js";

/** Runtime checks shared by `FileBuilder#validate` and the static `FileBuilder.validate` */
function validateFileShape(file: { file?: UnfurledMediaItem | undefined; id?: number | undefined }): void {
	ValidateMedia("File component", file.file, true);
	validateComponentId(file);
}

/**
 * Fluent builder for a Components V2 file - an uploaded file rendered as an attachment card. The
 * builder *is* a {@link FileComponent} payload, so it can be sent as-is.
 *
 * Discord only accepts `attachment://<filename>` here, pointing at a file uploaded with the same
 * message. That reference is checked twice: `setFile` rejects anything that is not an attachment
 * reference, and the send path rejects a reference whose filename does not match any entry in the
 * payload's `attachments`, so a typo throws locally instead of coming back as a 400.
 *
 * ```ts
 * channel.send({
 *     components: [new FileBuilder().setFile("attachment://report.pdf")],
 *     attachments: [{ name: "report.pdf", data: bytes }]
 * });
 * ```
 */
export class FileBuilder extends ComponentBuilder<typeof ComponentTypes.FILE> implements FileComponent {
	/**
	 * Creates a builder from an existing file payload
	 */
	static from(value: FileComponent): FileBuilder {
		const file = new FileBuilder();

		file.setFile(value.file);
		if (value.spoiler !== undefined) file.setSpoiler(value.spoiler);
		if (value.id !== undefined) file.setId(value.id);

		// `from` reconstructs a component Discord sent, so it is the one place the response-only
		// fields are known - the `readonly` exists to stop callers setting them, not this
		const response = file as { -readonly [K in "name" | "size"]: FileComponent[K] };
		if (value.name !== undefined) response.name = value.name;
		if (value.size !== undefined) response.size = value.size;

		return file;
	}

	/**
	 * Validates a file payload against Discord's constraints
	 */
	static validate(file: FileComponent): void {
		validateFileShape(file);
	}

	readonly type = ComponentTypes.FILE;
	/** The attached file, always an `attachment://<filename>` reference - only populated once set, see {@link FileBuilder#validate} */
	file!: UnfurledMediaItem;
	/** Whether the file is blurred until clicked, defaults to false */
	spoiler?: boolean;
	/**
	 * Name of the file, populated by Discord in responses.
	 *
	 * Read-only by design: Discord derives it from the uploaded attachment and ignores anything sent
	 * here, so a setter would only look like it did something. `from` still carries it through a
	 * round-trip of a received component.
	 */
	readonly name?: string;
	/** Size of the file in bytes, populated by Discord in responses - read-only, see {@link FileBuilder#name} */
	readonly size?: number;

	/**
	 * Sets the file reference, from a media item or a bare `attachment://<filename>` url
	 */
	setFile(file: MediaInput): this {
		const media = ResolveMedia(file);
		ValidateMedia("File component", media, true);
		this.file = media;
		return this;
	}

	/**
	 * Sets whether the file is blurred until clicked
	 */
	setSpoiler(spoiler = true): this {
		this.spoiler = spoiler;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateFileShape(this);
	}
}
