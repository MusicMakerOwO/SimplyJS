import { ComponentTypes, Thumbnail, UnfurledMediaItem } from "../Types/Components.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";
import { MediaInput, ResolveMedia, ValidateMedia, ValidateMediaDescription } from "./UnfurledMedia.js";

/** Runtime checks shared by `ThumbnailBuilder#validate` and the static `ThumbnailBuilder.validate` */
function validateThumbnailShape(thumbnail: { media?: UnfurledMediaItem | undefined; description?: string | undefined; id?: number | undefined }): void {
	ValidateMedia("Thumbnail", thumbnail.media);
	ValidateMediaDescription("Thumbnail", thumbnail.description);
	validateComponentId(thumbnail);
}

/**
 * Fluent builder for a Components V2 thumbnail - a small image accessory. The builder *is* a
 * {@link Thumbnail} payload, so it can be sent as-is.
 *
 * A thumbnail is only valid in a {@link SectionBuilder}'s `accessory` slot; a builder on its own
 * cannot tell where it will be placed, so that check lives in `SectionBuilder` instead.
 *
 * Discord only renders image, gif, and animated webp media here. That is a property of the bytes
 * behind the url rather than of the url itself, so it is not validated - an extension is only a
 * claim, and nothing in this library reads the file.
 */
export class ThumbnailBuilder extends ComponentBuilder<typeof ComponentTypes.THUMBNAIL> implements Thumbnail {
	/**
	 * Creates a builder from an existing thumbnail payload
	 */
	static from(value: Thumbnail): ThumbnailBuilder {
		const thumbnail = new ThumbnailBuilder();

		thumbnail.setMedia(value.media);
		if (value.description !== undefined) thumbnail.setDescription(value.description);
		if (value.spoiler !== undefined) thumbnail.setSpoiler(value.spoiler);
		if (value.id !== undefined) thumbnail.setId(value.id);

		return thumbnail;
	}

	/**
	 * Validates a thumbnail payload against Discord's constraints
	 */
	static validate(thumbnail: Thumbnail): void {
		validateThumbnailShape(thumbnail);
	}

	readonly type = ComponentTypes.THUMBNAIL;
	/** The thumbnail's image - only populated once set, see {@link ThumbnailBuilder#validate} */
	media!: UnfurledMediaItem;
	/** Alt text for the media, max 1024 characters */
	description?: string;
	/** Whether the thumbnail is blurred until clicked, defaults to false */
	spoiler?: boolean;

	/**
	 * Sets the thumbnail's image, from a media item or a bare url
	 */
	setMedia(media: MediaInput): this {
		this.media = ResolveMedia(media);
		return this;
	}

	/**
	 * Sets the alt text describing the image
	 */
	setDescription(description: string): this {
		ValidateMediaDescription("Thumbnail", description);
		this.description = description;
		return this;
	}

	/**
	 * Sets whether the thumbnail is blurred until clicked
	 */
	setSpoiler(spoiler = true): this {
		this.spoiler = spoiler;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateThumbnailShape(this);
	}
}
