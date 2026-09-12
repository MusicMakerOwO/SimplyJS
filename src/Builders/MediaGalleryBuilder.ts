import { ComponentTypes, MediaGallery, MediaGalleryItem } from "../Types/Components.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";
import { ResolveMedia, ValidateMedia, ValidateMediaDescription } from "./UnfurledMedia.js";

const MIN_ITEMS = 1;
const MAX_ITEMS = 10;

/**
 * Anything {@link MediaGalleryBuilder#addItems} accepts - a full item, or a bare url for the common
 * case of a gallery entry with no alt text.
 */
export type MediaGalleryItemInput = MediaGalleryItem | string;

/** Normalizes an `addItems`/`setItems` argument into a {@link MediaGalleryItem} */
function resolveItem(item: MediaGalleryItemInput): MediaGalleryItem {
	if (typeof item === "string") return { media: ResolveMedia(item) };

	if (!item) throw new Error("Media gallery item must have media");

	return { ...item, media: ResolveMedia(item.media) };
}

/** Runtime checks shared by `MediaGalleryBuilder#validate` and the static `MediaGalleryBuilder.validate` */
function validateMediaGalleryShape(gallery: { items?: MediaGalleryItem[] | undefined; id?: number | undefined }): void {
	const items = gallery.items ?? [];

	if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) {
		throw new Error(`Media gallery must have between ${MIN_ITEMS} and ${MAX_ITEMS} items - Received ${items.length}`);
	}

	for (const item of items) {
		ValidateMedia("Media gallery item", item?.media);
		ValidateMediaDescription("Media gallery item", item.description);
	}

	validateComponentId(gallery);
}

/**
 * Fluent builder for a Components V2 media gallery - 1-10 images or videos laid out as a grid. The
 * builder *is* a {@link MediaGallery} payload, so it can be sent as-is.
 *
 * Items are plain objects rather than components, so there is no item builder; a bare url string is
 * accepted as shorthand for an item with no alt text:
 *
 * ```ts
 * new MediaGalleryBuilder().addItems(
 *     "https://example.com/one.png",
 *     { media: { url: "attachment://two.png" }, description: "The second one", spoiler: true }
 * );
 * ```
 */
export class MediaGalleryBuilder extends ComponentBuilder<typeof ComponentTypes.MEDIA_GALLERY> implements MediaGallery {
	/**
	 * Creates a builder from an existing media gallery payload
	 */
	static from(value: MediaGallery): MediaGalleryBuilder {
		const gallery = new MediaGalleryBuilder();

		gallery.setItems(value.items);
		if (value.id !== undefined) gallery.setId(value.id);

		return gallery;
	}

	/**
	 * Validates a media gallery payload against Discord's constraints
	 */
	static validate(gallery: MediaGallery): void {
		validateMediaGalleryShape(gallery);
	}

	readonly type = ComponentTypes.MEDIA_GALLERY;
	/** 1-10 media gallery items */
	items: MediaGalleryItem[] = [];

	/**
	 * Appends items to the gallery, each a full item or a bare url
	 */
	addItems(...items: MediaGalleryItemInput[]): this {
		this.items.push(...items.map(item => resolveItem(item)));
		return this;
	}

	/**
	 * Replaces the gallery's items, each a full item or a bare url
	 */
	setItems(items: MediaGalleryItemInput[]): this {
		this.items = items.map(item => resolveItem(item));
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateMediaGalleryShape(this);
	}
}
