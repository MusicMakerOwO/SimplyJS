import { describe, expect, it } from "vitest";
import { ContainerBuilder } from "../Builders/ContainerBuilder.js";
import { FileBuilder } from "../Builders/FileBuilder.js";
import { MediaGalleryBuilder } from "../Builders/MediaGalleryBuilder.js";
import { SeparatorBuilder } from "../Builders/SeparatorBuilder.js";
import { TextDisplayBuilder } from "../Builders/TextDisplayBuilder.js";
import { MAX_V2_COMPONENTS, MAX_V2_CONTENT_LENGTH, SummarizeComponents } from "../Builders/ComponentsV2.js";
import { PreparePayload } from "../Structures/Message.js";
import { ActionRow, ButtonStyles, ComponentTypes, MessageComponent } from "../Types/Components.js";
import { MessageFlags } from "../Types/DiscordAPITypes.js";
import { MessagePayload } from "../Types/Internal.js";

const text = (content = "hello") => new TextDisplayBuilder().setContent(content);

/** An action row, the one component type valid on both a v1 and a v2 message */
const actionRow = (): ActionRow => ({
	type: ComponentTypes.ACTION_ROW,
	components: [{ type: ComponentTypes.BUTTON, style: ButtonStyles.PRIMARY, label: "Go", custom_id: "go" }]
});

describe("SummarizeComponents", () => {
	it("returns a zeroed summary for no components", () => {
		expect(SummarizeComponents(undefined)).toEqual({ count: 0, contentLength: 0, usesV2: false, references: [] });
	});

	it("does not flag an action row as v2, since it is valid on both", () => {
		expect(SummarizeComponents([actionRow()]).usesV2).toBe(false);
	});

	it("flags a v2-only component", () => {
		expect(SummarizeComponents([text()]).usesV2).toBe(true);
	});

	it("counts nested components, not just the top level", () => {
		const container = new ContainerBuilder().addComponents(text(), new SeparatorBuilder(), actionRow());

		// container + text + separator + action row + button
		expect(SummarizeComponents([container]).count).toBe(5);
	});

	it("sums text display content across nesting levels", () => {
		const container = new ContainerBuilder().addComponents(text("abc"), text("de"));

		expect(SummarizeComponents([text("f"), container]).contentLength).toBe(6);
	});

	it("counts a section's components and accessory", () => {
		const section: MessageComponent = {
			type: ComponentTypes.SECTION,
			components: [{ type: ComponentTypes.TEXT_DISPLAY, content: "hi" }],
			accessory: { type: ComponentTypes.THUMBNAIL, media: { url: "https://example.com/a.png" } }
		};

		expect(SummarizeComponents([section]).count).toBe(3);
	});

	it("collects attachment references from files and gallery items, ignoring plain urls", () => {
		const components = [
			new FileBuilder().setFile("attachment://report.pdf"),
			new MediaGalleryBuilder().addItems("attachment://a.png", "https://example.com/b.png")
		];

		expect(SummarizeComponents(components).references).toEqual([
			{ label: "File component", filename: "report.pdf" },
			{ label: "Media gallery item", filename: "a.png" }
		]);
	});

	it("collects a reference from a section's thumbnail accessory", () => {
		const section: MessageComponent = {
			type: ComponentTypes.SECTION,
			components: [{ type: ComponentTypes.TEXT_DISPLAY, content: "hi" }],
			accessory: { type: ComponentTypes.THUMBNAIL, media: { url: "attachment://icon.png" } }
		};

		expect(SummarizeComponents([section]).references).toEqual([{ label: "Thumbnail", filename: "icon.png" }]);
	});

	it("finds references nested inside a container", () => {
		const container = new ContainerBuilder().addComponents(new FileBuilder().setFile("attachment://deep.txt"));

		expect(SummarizeComponents([container]).references).toEqual([{ label: "File component", filename: "deep.txt" }]);
	});
});

describe("PreparePayload", () => {
	it("sets IS_COMPONENTS_V2 when a v2-only component is present", () => {
		const { body } = PreparePayload({ components: [text()] });

		expect(body.flags! & MessageFlags.IS_COMPONENTS_V2).toBe(MessageFlags.IS_COMPONENTS_V2);
	});

	it("leaves an action row only payload as a v1 message", () => {
		const { body } = PreparePayload({ content: "hello", components: [actionRow()] });

		expect(body.flags).toBeUndefined();
	});

	it("leaves a payload with no components alone", () => {
		const { body } = PreparePayload({ content: "hello" });

		expect(body.flags).toBeUndefined();
	});

	it("preserves flags already on the payload", () => {
		const { body } = PreparePayload({ components: [text()], flags: MessageFlags.EPHEMERAL });

		expect(body.flags).toBe(MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2);
	});

	it("does not mutate the caller's payload", () => {
		const payload: MessagePayload = { components: [text()] };
		PreparePayload(payload);

		expect(payload.flags).toBeUndefined();
	});

	it("applies the v2 rules when the flag is set by hand, even without a v2 component", () => {
		expect(() => PreparePayload({
			content: "hello",
			components: [actionRow()],
			flags: MessageFlags.IS_COMPONENTS_V2
		})).toThrow(/cannot also set content/);
	});

	it("rejects content alongside v2 components", () => {
		expect(() => PreparePayload({ content: "hello", components: [text()] })).toThrow(/cannot also set content/);
	});

	it("rejects embeds alongside v2 components", () => {
		expect(() => PreparePayload({ embeds: [{ type: "rich" }], components: [text()] })).toThrow(/cannot also set embeds/);
	});

	it("rejects sticker_ids alongside v2 components", () => {
		expect(() => PreparePayload({ sticker_ids: ["1"], components: [text()] })).toThrow(/cannot also set sticker_ids/);
	});

	it("rejects a poll alongside v2 components", () => {
		const payload = { components: [text()], poll: { question: { text: "?" } } } as unknown as MessagePayload;

		expect(() => PreparePayload(payload)).toThrow(/cannot also set a poll/);
	});

	it("allows an empty content string alongside v2 components", () => {
		expect(() => PreparePayload({ content: "", components: [text()] })).not.toThrow();
	});

	it("rejects more than 40 components, counting nested ones", () => {
		const container = new ContainerBuilder().addComponents(...Array.from({ length: MAX_V2_COMPONENTS }, () => text()));

		expect(() => PreparePayload({ components: [container] })).toThrow(/more than 40 components/);
	});

	it("accepts exactly 40 components", () => {
		const container = new ContainerBuilder().addComponents(...Array.from({ length: MAX_V2_COMPONENTS - 1 }, () => text()));

		expect(() => PreparePayload({ components: [container] })).not.toThrow();
	});

	it("rejects more than 4000 characters across text displays", () => {
		const components = [text("a".repeat(MAX_V2_CONTENT_LENGTH)), text("b")];

		expect(() => PreparePayload({ components })).toThrow(/more than 4000 characters/);
	});

	it("accepts exactly 4000 characters", () => {
		expect(() => PreparePayload({ components: [text("a".repeat(MAX_V2_CONTENT_LENGTH))] })).not.toThrow();
	});

	it("accepts a file component whose reference matches an upload", () => {
		const { body, files } = PreparePayload({
			components: [new FileBuilder().setFile("attachment://report.pdf")],
			attachments: [{ name: "report.pdf", data: "bytes" }]
		});

		expect(files).toHaveLength(1);
		expect(body.attachments).toEqual([{ id: "0", filename: "report.pdf" }]);
	});

	it("throws when a file reference names an attachment that was never provided", () => {
		expect(() => PreparePayload({
			components: [new FileBuilder().setFile("attachment://report.pdf")],
			attachments: [{ name: "repot.pdf", data: "bytes" }]
		})).toThrow('File component references attachment://report.pdf, but no attachment named "report.pdf" was provided');
	});

	it("throws when a file reference is present with no attachments at all", () => {
		expect(() => PreparePayload({
			components: [new FileBuilder().setFile("attachment://report.pdf")]
		})).toThrow(/no attachment named "report.pdf"/);
	});

	it("names the media gallery when a gallery item's reference does not resolve", () => {
		expect(() => PreparePayload({
			components: [new MediaGalleryBuilder().addItems("attachment://a.png")],
			attachments: [{ name: "b.png", data: "bytes" }]
		})).toThrow(/Media gallery item references attachment:\/\/a\.png/);
	});

	it("matches a reference against a retained attachment being renamed", () => {
		expect(() => PreparePayload({
			components: [new FileBuilder().setFile("attachment://report.pdf")],
			attachments: [{ id: "123", filename: "report.pdf" }]
		})).not.toThrow();
	});

	it("steps aside when a retained attachment keeps a name it cannot know", () => {
		expect(() => PreparePayload({
			components: [new FileBuilder().setFile("attachment://report.pdf")],
			attachments: [{ id: "123" }]
		})).not.toThrow();
	});

	it("ignores plain urls, which do not resolve against attachments", () => {
		expect(() => PreparePayload({
			components: [new MediaGalleryBuilder().addItems("https://example.com/a.png")]
		})).not.toThrow();
	});

	it("throws when a section thumbnail names an attachment that was never provided", () => {
		const section: MessageComponent = {
			type: ComponentTypes.SECTION,
			components: [{ type: ComponentTypes.TEXT_DISPLAY, content: "hi" }],
			accessory: { type: ComponentTypes.THUMBNAIL, media: { url: "attachment://icon.png" } }
		};

		expect(() => PreparePayload({ components: [section] })).toThrow(/Thumbnail references attachment:\/\/icon\.png/);
	});
});

describe("PreparePayload on an edit", () => {
	it("applies the v2 rules to an action-row-only edit of a message that is already v2", () => {
		expect(() => PreparePayload(
			{ content: "hello", components: [actionRow()] },
			MessageFlags.IS_COMPONENTS_V2
		)).toThrow(/cannot also set content/);
	});

	it("enforces the message-wide limits on an edit of a v2 message", () => {
		const components = [{ type: ComponentTypes.ACTION_ROW, components: [] } as MessageComponent];

		expect(() => PreparePayload(
			{ components, attachments: [{ name: "a.png", data: "bytes" }] },
			MessageFlags.IS_COMPONENTS_V2
		)).not.toThrow();
	});

	it("cross-checks attachment references on an edit of a v2 message", () => {
		expect(() => PreparePayload(
			{ components: [new FileBuilder().setFile("attachment://gone.txt")] },
			MessageFlags.IS_COMPONENTS_V2
		)).toThrow(/no attachment named "gone.txt"/);
	});

	it("keeps the v2 flag on the edit body", () => {
		const { body } = PreparePayload({ components: [actionRow()] }, MessageFlags.IS_COMPONENTS_V2);

		expect(body.flags).toBe(MessageFlags.IS_COMPONENTS_V2);
	});

	it("leaves a v1 edit alone when the edited message is not v2", () => {
		expect(PreparePayload({ content: "hello", components: [actionRow()] }, 0).body.flags).toBeUndefined();
		expect(PreparePayload({ content: "hello", components: [actionRow()] }, undefined).body.flags).toBeUndefined();
	});

	it("does not treat an unrelated flag on the edited message as v2", () => {
		const { body } = PreparePayload({ content: "hello", components: [actionRow()] }, MessageFlags.SUPPRESS_EMBEDS);

		expect(body.flags).toBeUndefined();
	});
});
