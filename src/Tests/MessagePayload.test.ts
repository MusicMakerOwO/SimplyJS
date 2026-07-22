import { describe, expect, it } from "vitest";
import { CreateMessagePayload } from "../Structures/Message.js";

describe("CreateMessagePayload", () => {
	it("converts a plain string into a payload with that content", () => {
		const payload = CreateMessagePayload("hello");

		expect(payload.content).toBe("hello");
	});

	it("returns a payload object unchanged when one is provided", () => {
		const input = { content: "hello" };
		const payload = CreateMessagePayload(input);

		expect(payload).toBe(input);
	});

	it("throws when an empty string is provided", () => {
		expect(() => CreateMessagePayload("")).toThrow("Cannot send an empty message");
	});

	it("throws when a payload has no content-bearing fields", () => {
		expect(() => CreateMessagePayload({})).toThrow("Cannot send an empty message");
	});

	it("throws when content is an empty string on a payload object", () => {
		expect(() => CreateMessagePayload({ content: "" })).toThrow("Cannot send an empty message");
	});

	it("accepts a payload with only embeds", () => {
		const payload = CreateMessagePayload({ embeds: [{ type: "rich" }] });

		expect(payload.embeds).toHaveLength(1);
	});

	it("accepts a payload with only components", () => {
		const payload = CreateMessagePayload({ components: [{ type: 1 }] });

		expect(payload.components).toHaveLength(1);
	});

	it("accepts a payload with only sticker_ids", () => {
		const payload = CreateMessagePayload({ sticker_ids: ["sticker-1"] });

		expect(payload.sticker_ids).toHaveLength(1);
	});

	it("throws when embeds, components, and sticker_ids are all empty arrays", () => {
		expect(() => CreateMessagePayload({ embeds: [], components: [], sticker_ids: [] })).toThrow(
			"Cannot send an empty message"
		);
	});

	it("preserves optional fields like allowed_mentions on the returned payload", () => {
		const input = { content: "hi", allowed_mentions: { replied_user: false } };
		const payload = CreateMessagePayload(input);

		expect(payload.allowed_mentions?.replied_user).toBe(false);
	});
});