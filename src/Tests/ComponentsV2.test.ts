import { describe, expect, expectTypeOf, it } from "vitest";
import { ActionRowBuilder } from "../Builders/ActionRowBuilder.js";
import { ButtonBuilder } from "../Builders/ButtonBuilder.js";
import { ContainerBuilder } from "../Builders/ContainerBuilder.js";
import { FileBuilder } from "../Builders/FileBuilder.js";
import { LinkButtonBuilder } from "../Builders/LinkButtonBuilder.js";
import { MediaGalleryBuilder } from "../Builders/MediaGalleryBuilder.js";
import { SectionBuilder } from "../Builders/SectionBuilder.js";
import { SeparatorBuilder } from "../Builders/SeparatorBuilder.js";
import { TextDisplayBuilder } from "../Builders/TextDisplayBuilder.js";
import { ThumbnailBuilder } from "../Builders/ThumbnailBuilder.js";
import {
	ButtonStyles,
	ComponentTypes,
	Container,
	FileComponent,
	MediaGallery,
	Section,
	Separator,
	SeparatorSpacingSizes,
	TextDisplay,
	Thumbnail
} from "../Types/Components.js";

describe("TextDisplayBuilder", () => {
	it("is assignable to a TextDisplay payload", () => {
		expectTypeOf<TextDisplayBuilder>().toMatchTypeOf<TextDisplay>();
	});

	it("sets its type and stores content", () => {
		const builder = new TextDisplayBuilder().setContent("**hello**");

		expect(builder.type).toBe(ComponentTypes.TEXT_DISPLAY);
		expect(builder.content).toBe("**hello**");
	});

	it("throws when content is empty", () => {
		expect(() => new TextDisplayBuilder().setContent("")).toThrow(/at least 1 character/);
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = TextDisplayBuilder.from({ type: ComponentTypes.TEXT_DISPLAY, content: "hello", id: 7 });

		expect(builder).toBeInstanceOf(TextDisplayBuilder);
		expect(builder.content).toBe("hello");
		expect(builder.id).toBe(7);
	});

	it("leaves id unset when the payload omits it", () => {
		const builder = TextDisplayBuilder.from({ type: ComponentTypes.TEXT_DISPLAY, content: "hello" });

		expect(builder.id).toBeUndefined();
		expect(JSON.parse(JSON.stringify(builder))).toEqual({ type: ComponentTypes.TEXT_DISPLAY, content: "hello" });
	});

	it("throws from static from when the payload has empty content", () => {
		expect(() => TextDisplayBuilder.from({ type: ComponentTypes.TEXT_DISPLAY, content: "" })).toThrow(/at least 1 character/);
	});

	it("validates a complete builder without throwing", () => {
		expect(() => new TextDisplayBuilder().setContent("hello").validate()).not.toThrow();
	});

	it("throws from validate when content was never set", () => {
		expect(() => new TextDisplayBuilder().validate()).toThrow(/Text display must have content/);
	});

	it("throws from static validate when content is missing", () => {
		expect(() => TextDisplayBuilder.validate({ type: ComponentTypes.TEXT_DISPLAY } as TextDisplay)).toThrow(/Text display must have content/);
	});
});

describe("SeparatorBuilder", () => {
	it("is assignable to a Separator payload", () => {
		expectTypeOf<SeparatorBuilder>().toMatchTypeOf<Separator>();
	});

	it("sets its type and leaves both fields defaulted to Discord's behaviour", () => {
		const builder = new SeparatorBuilder();

		expect(builder.type).toBe(ComponentTypes.SEPARATOR);
		expect(builder.divider).toBeUndefined();
		expect(builder.spacing).toBeUndefined();
	});

	it("defaults setDivider to true", () => {
		expect(new SeparatorBuilder().setDivider().divider).toBe(true);
		expect(new SeparatorBuilder().setDivider(false).divider).toBe(false);
	});

	it("stores both spacing sizes", () => {
		expect(new SeparatorBuilder().setSpacing(SeparatorSpacingSizes.SMALL).spacing).toBe(1);
		expect(new SeparatorBuilder().setSpacing(SeparatorSpacingSizes.LARGE).spacing).toBe(2);
	});

	it("throws when spacing is not a known size", () => {
		expect(() => new SeparatorBuilder().setSpacing(3 as never)).toThrow(/must be SMALL \(1\) or LARGE \(2\)/);
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = SeparatorBuilder.from({
			type: ComponentTypes.SEPARATOR,
			divider: false,
			spacing: SeparatorSpacingSizes.LARGE,
			id: 3
		});

		expect(builder).toBeInstanceOf(SeparatorBuilder);
		expect(builder.divider).toBe(false);
		expect(builder.spacing).toBe(SeparatorSpacingSizes.LARGE);
		expect(builder.id).toBe(3);
	});

	it("throws from static from when the payload has an unknown spacing", () => {
		expect(() => SeparatorBuilder.from({ type: ComponentTypes.SEPARATOR, spacing: 0 as never })).toThrow(/must be SMALL \(1\) or LARGE \(2\)/);
	});

	it("validates an empty builder without throwing", () => {
		expect(() => new SeparatorBuilder().validate()).not.toThrow();
	});

	it("throws from static validate when spacing is not a known size", () => {
		expect(() => SeparatorBuilder.validate({ type: ComponentTypes.SEPARATOR, spacing: 9 as never })).toThrow(/must be SMALL \(1\) or LARGE \(2\)/);
	});
});

describe("ComponentBuilder", () => {
	it("stores an id set through the shared base", () => {
		expect(new TextDisplayBuilder().setContent("hello").setId(42).id).toBe(42);
		expect(new SeparatorBuilder().setId(42).id).toBe(42);
	});

	it("returns the builder from setId for chaining", () => {
		const builder = new SeparatorBuilder();

		expect(builder.setId(1)).toBe(builder);
	});

	it("throws when an id is not an integer", () => {
		expect(() => new SeparatorBuilder().setId(1.5)).toThrow(/must be an integer/);
	});

	it("throws when an id falls outside 32 bits", () => {
		expect(() => new SeparatorBuilder().setId(-1)).toThrow(/must be a 32-bit integer/);
		expect(() => new SeparatorBuilder().setId(0x100000000)).toThrow(/must be a 32-bit integer/);
	});

	it("accepts the 32-bit boundaries", () => {
		expect(new SeparatorBuilder().setId(0).id).toBe(0);
		expect(new SeparatorBuilder().setId(0xffffffff).id).toBe(0xffffffff);
	});

	it("rejects an invalid id through a builder's static validate", () => {
		expect(() => TextDisplayBuilder.validate({ type: ComponentTypes.TEXT_DISPLAY, content: "hello", id: -1 })).toThrow(/32-bit integer/);
	});
});

describe("ThumbnailBuilder", () => {
	it("is assignable to a Thumbnail payload", () => {
		expectTypeOf<ThumbnailBuilder>().toMatchTypeOf<Thumbnail>();
	});

	it("sets its type and stores the media", () => {
		const builder = new ThumbnailBuilder().setMedia({ url: "https://example.com/a.png" });

		expect(builder.type).toBe(ComponentTypes.THUMBNAIL);
		expect(builder.media).toEqual({ url: "https://example.com/a.png" });
	});

	it("accepts a bare url as shorthand for a media item", () => {
		expect(new ThumbnailBuilder().setMedia("https://example.com/a.png").media).toEqual({ url: "https://example.com/a.png" });
	});

	it("throws when the url is empty", () => {
		expect(() => new ThumbnailBuilder().setMedia("")).toThrow(/must have a url/);
	});

	it("stores a description and spoiler", () => {
		const builder = new ThumbnailBuilder().setMedia("https://example.com/a.png").setDescription("A cat").setSpoiler();

		expect(builder.description).toBe("A cat");
		expect(builder.spoiler).toBe(true);
	});

	it("throws when the description is longer than 1024 characters", () => {
		expect(() => new ThumbnailBuilder().setDescription("a".repeat(1025))).toThrow(/1024 characters or fewer/);
	});

	it("leaves the optional fields unset so Discord applies its own defaults", () => {
		const builder = new ThumbnailBuilder().setMedia("https://example.com/a.png");

		expect(JSON.parse(JSON.stringify(builder))).toEqual({
			type: ComponentTypes.THUMBNAIL,
			media: { url: "https://example.com/a.png" }
		});
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = ThumbnailBuilder.from({
			type: ComponentTypes.THUMBNAIL,
			media: { url: "attachment://a.png" },
			description: "Alt",
			spoiler: true,
			id: 4
		});

		expect(builder).toBeInstanceOf(ThumbnailBuilder);
		expect(builder.media).toEqual({ url: "attachment://a.png" });
		expect(builder.description).toBe("Alt");
		expect(builder.spoiler).toBe(true);
		expect(builder.id).toBe(4);
	});

	it("validates a complete builder without throwing", () => {
		expect(() => new ThumbnailBuilder().setMedia("https://example.com/a.png").validate()).not.toThrow();
	});

	it("throws from validate when media was never set", () => {
		expect(() => new ThumbnailBuilder().validate()).toThrow(/must have a url/);
	});

	it("throws from static validate when media is missing", () => {
		expect(() => ThumbnailBuilder.validate({ type: ComponentTypes.THUMBNAIL } as Thumbnail)).toThrow(/must have a url/);
	});
});

describe("SectionBuilder", () => {
	const text = (content = "hello") => new TextDisplayBuilder().setContent(content);
	const accessory = () => new ThumbnailBuilder().setMedia("https://example.com/a.png");

	it("is assignable to a Section payload", () => {
		expectTypeOf<SectionBuilder>().toMatchTypeOf<Section>();
	});

	it("sets its type and stores components and accessory", () => {
		const builder = new SectionBuilder().addComponents(text()).setAccessory(accessory());

		expect(builder.type).toBe(ComponentTypes.SECTION);
		expect(builder.components).toHaveLength(1);
		expect(builder.accessory.type).toBe(ComponentTypes.THUMBNAIL);
	});

	it("accepts a button as the accessory", () => {
		const button = new ButtonBuilder().setStyle(ButtonStyles.PRIMARY).setLabel("Go").setCustomId("go");

		expect(new SectionBuilder().setAccessory(button).accessory).toBe(button);
	});

	it("throws when the accessory is neither a button nor a thumbnail", () => {
		expect(() => new SectionBuilder().setAccessory(new SeparatorBuilder() as never)).toThrow(/must be a button or thumbnail/);
	});

	it("accepts a half-built accessory, leaving completeness to validate", () => {
		const builder = new SectionBuilder().addComponents(text()).setAccessory(new ThumbnailBuilder());

		expect(builder.accessory).toBeInstanceOf(ThumbnailBuilder);
		expect(() => builder.validate()).toThrow(/must have a url/);
	});

	it("throws from validate when there are no components", () => {
		expect(() => new SectionBuilder().setAccessory(accessory()).validate()).toThrow(/between 1 and 3 text displays/);
	});

	it("throws from validate with more than 3 components", () => {
		const builder = new SectionBuilder().addComponents(text(), text(), text(), text()).setAccessory(accessory());

		expect(() => builder.validate()).toThrow(/between 1 and 3 text displays/);
	});

	it("throws when a component is not a text display", () => {
		expect(() => new SectionBuilder().addComponents(new SeparatorBuilder() as never)).toThrow(/must all be text displays/);
		expect(() => new SectionBuilder().setComponents([new SeparatorBuilder() as never])).toThrow(/must all be text displays/);
	});

	it("names the offending component type when rejecting it", () => {
		expect(() => new SectionBuilder().addComponents(new ThumbnailBuilder() as never)).toThrow(/component type 11/);
	});

	it("accepts a half-built text display, leaving completeness to validate", () => {
		const builder = new SectionBuilder().addComponents(new TextDisplayBuilder()).setAccessory(accessory());

		expect(builder.components).toHaveLength(1);
		expect(() => builder.validate()).toThrow(/Text display must have content/);
	});

	it("throws from validate when the accessory was never set", () => {
		expect(() => new SectionBuilder().addComponents(text()).validate()).toThrow(/must have an accessory/);
	});

	it("propagates a child's validation error", () => {
		const builder = new SectionBuilder()
			.setComponents([{ type: ComponentTypes.TEXT_DISPLAY, content: "" }])
			.setAccessory(accessory());

		expect(() => builder.validate()).toThrow(/Text display must have content/);
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = SectionBuilder.from({
			type: ComponentTypes.SECTION,
			components: [{ type: ComponentTypes.TEXT_DISPLAY, content: "hello" }],
			accessory: { type: ComponentTypes.THUMBNAIL, media: { url: "https://example.com/a.png" } },
			id: 9
		});

		expect(builder).toBeInstanceOf(SectionBuilder);
		expect(builder.components[0]).toBeInstanceOf(TextDisplayBuilder);
		expect(builder.accessory).toBeInstanceOf(ThumbnailBuilder);
		expect(builder.id).toBe(9);
	});

	it("hydrates a button accessory through ResolveButton", () => {
		const builder = SectionBuilder.from({
			type: ComponentTypes.SECTION,
			components: [{ type: ComponentTypes.TEXT_DISPLAY, content: "hello" }],
			accessory: { type: ComponentTypes.BUTTON, style: ButtonStyles.LINK, label: "Docs", url: "https://example.com" }
		});

		expect(builder.accessory).toBeInstanceOf(LinkButtonBuilder);
	});

	it("validates a complete builder without throwing", () => {
		expect(() => new SectionBuilder().addComponents(text()).setAccessory(accessory()).validate()).not.toThrow();
	});
});

describe("MediaGalleryBuilder", () => {
	it("is assignable to a MediaGallery payload", () => {
		expectTypeOf<MediaGalleryBuilder>().toMatchTypeOf<MediaGallery>();
	});

	it("sets its type and normalizes a bare url into an item", () => {
		const builder = new MediaGalleryBuilder().addItems("https://example.com/a.png");

		expect(builder.type).toBe(ComponentTypes.MEDIA_GALLERY);
		expect(builder.items).toEqual([{ media: { url: "https://example.com/a.png" } }]);
	});

	it("keeps description and spoiler on a full item", () => {
		const builder = new MediaGalleryBuilder().addItems({
			media: { url: "attachment://a.png" },
			description: "Alt",
			spoiler: true
		});

		expect(builder.items[0]).toEqual({ media: { url: "attachment://a.png" }, description: "Alt", spoiler: true });
	});

	it("appends rather than replacing on addItems", () => {
		const builder = new MediaGalleryBuilder().addItems("https://example.com/a.png").addItems("https://example.com/b.png");

		expect(builder.items).toHaveLength(2);
	});

	it("replaces the item list on setItems", () => {
		const builder = new MediaGalleryBuilder().addItems("https://example.com/a.png").setItems(["https://example.com/b.png"]);

		expect(builder.items).toEqual([{ media: { url: "https://example.com/b.png" } }]);
	});

	it("throws when an item has no url", () => {
		expect(() => new MediaGalleryBuilder().addItems({ media: { url: "" } })).toThrow(/must have a url/);
	});

	it("throws from validate when there are no items", () => {
		expect(() => new MediaGalleryBuilder().validate()).toThrow(/between 1 and 10 items/);
	});

	it("throws from validate with more than 10 items", () => {
		const builder = new MediaGalleryBuilder().addItems(...Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.png`));

		expect(() => builder.validate()).toThrow(/between 1 and 10 items/);
	});

	it("throws from validate when an item description is too long", () => {
		const builder = new MediaGalleryBuilder().addItems({
			media: { url: "https://example.com/a.png" },
			description: "a".repeat(1025)
		});

		expect(() => builder.validate()).toThrow(/1024 characters or fewer/);
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = MediaGalleryBuilder.from({
			type: ComponentTypes.MEDIA_GALLERY,
			items: [{ media: { url: "https://example.com/a.png" } }],
			id: 12
		});

		expect(builder).toBeInstanceOf(MediaGalleryBuilder);
		expect(builder.items).toHaveLength(1);
		expect(builder.id).toBe(12);
	});

	it("validates a complete builder without throwing", () => {
		expect(() => new MediaGalleryBuilder().addItems("https://example.com/a.png").validate()).not.toThrow();
	});
});

describe("FileBuilder", () => {
	it("is assignable to a FileComponent payload", () => {
		expectTypeOf<FileBuilder>().toMatchTypeOf<FileComponent>();
	});

	it("sets its type and stores an attachment reference", () => {
		const builder = new FileBuilder().setFile("attachment://report.pdf");

		expect(builder.type).toBe(ComponentTypes.FILE);
		expect(builder.file).toEqual({ url: "attachment://report.pdf" });
	});

	it("throws when the url is not an attachment reference", () => {
		expect(() => new FileBuilder().setFile("https://example.com/report.pdf")).toThrow(/only accepts attachment:\/\/<filename>/);
	});

	it("throws when the attachment reference has no filename", () => {
		expect(() => new FileBuilder().setFile("attachment://")).toThrow(/missing a filename/);
	});

	it("stores a spoiler flag", () => {
		expect(new FileBuilder().setFile("attachment://a.txt").setSpoiler().spoiler).toBe(true);
	});

	it("has no setter for the response-only name and size", () => {
		const builder = new FileBuilder() as unknown as Record<string, unknown>;

		expect(builder.setName).toBeUndefined();
		expect(builder.setSize).toBeUndefined();
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = FileBuilder.from({
			type: ComponentTypes.FILE,
			file: { url: "attachment://a.txt" },
			spoiler: true,
			id: 13
		});

		expect(builder).toBeInstanceOf(FileBuilder);
		expect(builder.file).toEqual({ url: "attachment://a.txt" });
		expect(builder.spoiler).toBe(true);
		expect(builder.id).toBe(13);
	});

	it("throws from validate when the file was never set", () => {
		expect(() => new FileBuilder().validate()).toThrow(/must have a url/);
	});

	it("throws from static validate on a non-attachment url", () => {
		expect(() => FileBuilder.validate({
			type: ComponentTypes.FILE,
			file: { url: "https://example.com/a.txt" }
		})).toThrow(/only accepts attachment:\/\/<filename>/);
	});

	it("validates a complete builder without throwing", () => {
		expect(() => new FileBuilder().setFile("attachment://a.txt").validate()).not.toThrow();
	});
});

describe("ContainerBuilder", () => {
	const text = (content = "hello") => new TextDisplayBuilder().setContent(content);

	it("is assignable to a Container payload", () => {
		expectTypeOf<ContainerBuilder>().toMatchTypeOf<Container>();
	});

	it("sets its type and stores components", () => {
		const builder = new ContainerBuilder().addComponents(text(), new SeparatorBuilder());

		expect(builder.type).toBe(ComponentTypes.CONTAINER);
		expect(builder.components).toHaveLength(2);
	});

	it("rejects a nested container with its own message", () => {
		expect(() => new ContainerBuilder().addComponents(new ContainerBuilder() as never)).toThrow(/cannot contain another container/);
	});

	it("rejects a component type a container cannot hold", () => {
		expect(() => new ContainerBuilder().addComponents(new ThumbnailBuilder() as never)).toThrow(/cannot contain component type 11/);
	});

	it("accepts a half-built child, leaving completeness to validate", () => {
		const builder = new ContainerBuilder().addComponents(new TextDisplayBuilder());

		expect(() => builder.validate()).toThrow(/Text display must have content/);
	});

	it("parses an accent color from hex and a number", () => {
		expect(new ContainerBuilder().setAccentColor("#ff7900").accent_color).toBe(0xff7900);
		expect(new ContainerBuilder().setAccentColor(0x00ff00).accent_color).toBe(0x00ff00);
	});

	it("distinguishes a null accent color from an unset one", () => {
		expect(new ContainerBuilder().accent_color).toBeUndefined();
		expect(new ContainerBuilder().setAccentColor(null).accent_color).toBeNull();
	});

	it("throws on a malformed hex accent color", () => {
		expect(() => new ContainerBuilder().setAccentColor("ff7900")).toThrow(/hex color code/);
	});

	it("throws from validate when there are no components", () => {
		expect(() => new ContainerBuilder().validate()).toThrow(/at least 1 component/);
	});

	it("hydrates a builder from a payload using static from", () => {
		const builder = ContainerBuilder.from({
			type: ComponentTypes.CONTAINER,
			components: [
				{ type: ComponentTypes.TEXT_DISPLAY, content: "hello" },
				{ type: ComponentTypes.SEPARATOR, spacing: SeparatorSpacingSizes.LARGE },
				{ type: ComponentTypes.FILE, file: { url: "attachment://a.txt" } }
			],
			accent_color: 0xff7900,
			spoiler: true,
			id: 17
		});

		expect(builder).toBeInstanceOf(ContainerBuilder);
		expect(builder.components[0]).toBeInstanceOf(TextDisplayBuilder);
		expect(builder.components[1]).toBeInstanceOf(SeparatorBuilder);
		expect(builder.components[2]).toBeInstanceOf(FileBuilder);
		expect(builder.accent_color).toBe(0xff7900);
		expect(builder.spoiler).toBe(true);
		expect(builder.id).toBe(17);
	});

	it("validates a complete builder without throwing", () => {
		expect(() => new ContainerBuilder().addComponents(text()).validate()).not.toThrow();
	});
});

describe("FileBuilder round-trip of response-only fields", () => {
	it("carries name and size through static from", () => {
		const builder = FileBuilder.from({
			type: ComponentTypes.FILE,
			file: { url: "attachment://a.txt" },
			name: "a.txt",
			size: 1234
		});

		expect(builder.name).toBe("a.txt");
		expect(builder.size).toBe(1234);
	});

	it("serializes the carried fields, so a round-trip is lossless", () => {
		const payload: FileComponent = {
			type: ComponentTypes.FILE,
			file: { url: "attachment://a.txt" },
			name: "a.txt",
			size: 1234
		};

		expect(JSON.parse(JSON.stringify(FileBuilder.from(payload)))).toEqual(payload);
	});

	it("leaves both unset when the payload omits them", () => {
		const builder = FileBuilder.from({ type: ComponentTypes.FILE, file: { url: "attachment://a.txt" } });

		expect(builder.name).toBeUndefined();
		expect(builder.size).toBeUndefined();
		expect(JSON.parse(JSON.stringify(builder))).toEqual({
			type: ComponentTypes.FILE,
			file: { url: "attachment://a.txt" }
		});
	});
});

describe("ActionRowBuilder id support", () => {
	const button = { type: ComponentTypes.BUTTON, style: ButtonStyles.PRIMARY, label: "Go", custom_id: "go" } as const;

	it("stores an id set through the shared base", () => {
		expect(new ActionRowBuilder().setId(5).id).toBe(5);
	});

	it("rejects an invalid id, like every other component builder", () => {
		expect(() => new ActionRowBuilder().setId(1.5)).toThrow(/must be an integer/);
	});

	it("keeps the id when built from a full action row", () => {
		const builder = ActionRowBuilder.from({ type: ComponentTypes.ACTION_ROW, components: [button], id: 8 });

		expect(builder).toBeInstanceOf(ActionRowBuilder);
		expect(builder.id).toBe(8);
		expect(builder.components).toHaveLength(1);
	});

	it("still accepts a bare components array, leaving id unset", () => {
		const builder = ActionRowBuilder.from([button]);

		expect(builder.id).toBeUndefined();
		expect(builder.components).toHaveLength(1);
	});

	it("rejects an invalid id through static validate on a full row", () => {
		expect(() => ActionRowBuilder.validate({
			type: ComponentTypes.ACTION_ROW,
			components: [button],
			id: -1
		})).toThrow(/32-bit integer/);
	});

	it("preserves a nested action row's id through a container round-trip", () => {
		const builder = ContainerBuilder.from({
			type: ComponentTypes.CONTAINER,
			components: [{ type: ComponentTypes.ACTION_ROW, components: [button], id: 8 }]
		});

		expect(builder.components[0]).toBeInstanceOf(ActionRowBuilder);
		expect((builder.components[0] as ActionRowBuilder).id).toBe(8);
	});
});
