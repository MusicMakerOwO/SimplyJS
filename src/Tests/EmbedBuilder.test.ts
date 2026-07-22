import { describe, expect, it } from "vitest";
import { EmbedBuilder } from "../Builders/EmbedBuilder.js";
import { EmbedTypes } from "../Types/MessageComponents.js";

describe("EmbedBuilder", () => {
	it("defaults type to rich", () => {
		const builder = new EmbedBuilder();

		expect(builder.type).toBe(EmbedTypes.RICH);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload = {
			title: "hello",
			description: "world",
			fields: [{ name: "name", value: "value" }]
		};

		const builder = EmbedBuilder.from(payload);

		expect(builder.title).toBe("hello");
		expect(builder.description).toBe("world");
		expect(builder.fields).toEqual([{ name: "name", value: "value" }]);
	});

	it("throws from static from when provided invalid field values", () => {
		expect(() => EmbedBuilder.from({ fields: [{ name: "name", value: "v".repeat(1025) }] })).toThrow(
			/Field value must be 1024 characters or fewer/
		);
	});

	it("stores title when within the allowed length", () => {
		const builder = new EmbedBuilder().setTitle("a".repeat(256));

		expect(builder.title).toBe("a".repeat(256));
	});

	it("throws when title exceeds 256 characters", () => {
		expect(() => new EmbedBuilder().setTitle("a".repeat(257))).toThrow(/Title must be 256 characters or fewer/);
	});

	it("stores description at boundary lengths 1 and 4096", () => {
		const builder = new EmbedBuilder().setDescription("a").setDescription("b".repeat(4096));

		expect(builder.description).toBe("b".repeat(4096));
	});

	it("throws when description is empty or exceeds 4096 characters", () => {
		expect(() => new EmbedBuilder().setDescription("")).toThrow(/Description must be between 1 and 4,096 characters long/);
		expect(() => new EmbedBuilder().setDescription("a".repeat(4097))).toThrow(/Description must be between 1 and 4,096 characters long/);
	});

	it("converts a hex color string into a number", () => {
		const builder = new EmbedBuilder().setColor("#123456");

		expect(builder.color).toBe(0x123456);
	});

	it("accepts numeric color values", () => {
		const builder = new EmbedBuilder().setColor(0xabcdef);

		expect(builder.color).toBe(0xabcdef);
	});

	it("throws when color string is not a 6-digit hex code", () => {
		expect(() => new EmbedBuilder().setColor("#12345")).toThrow(/Must be a hex color code/);
	});

	it("stores timestamp as an ISO string", () => {
		const date = new Date("2025-01-01T00:00:00.000Z");
		const builder = new EmbedBuilder().setTimestamp(date);

		expect(builder.timestamp).toBe("2025-01-01T00:00:00.000Z");
	});

	it("adds fields up to the maximum of 25", () => {
		const fields = Array.from({ length: 25 }, (_, index) => ({ name: `Field ${index}`, value: "value" }));
		const builder = new EmbedBuilder().addFields(fields);

		expect(builder.fields).toHaveLength(25);
	});

	it("throws when adding fields beyond 25 total", () => {
		const baseFields = Array.from({ length: 24 }, (_, index) => ({ name: `Field ${index}`, value: "value" }));
		const builder = new EmbedBuilder().addFields(baseFields);

		expect(() => builder.addFields([{ name: "25", value: "value" }, { name: "26", value: "value" }])).toThrow(
			/Embeds cannot have more than 25 fields/
		);
	});

	it("throws when setFields receives more than 25 fields", () => {
		const fields = Array.from({ length: 26 }, (_, index) => ({ name: `Field ${index}`, value: "value" }));

		expect(() => new EmbedBuilder().setFields(fields)).toThrow(/Embeds cannot have more than 25 fields/);
	});

	it("throws when field name or value exceeds field limits", () => {
		expect(() => new EmbedBuilder().setFields([{ name: "n".repeat(257), value: "value" }])).toThrow(
			/Field name must be 256 characters or fewer/
		);
		expect(() => new EmbedBuilder().addFields([{ name: "name", value: "v".repeat(1025) }])).toThrow(
			/Field value must be 1024 characters or fewer/
		);
	});

	it("throws when static validate is called on an embed without content", () => {
		expect(() => EmbedBuilder.validate({ type: EmbedTypes.RICH })).toThrow(/Embed cannot be empty/);
	});

	it("passes static validate at exactly 6000 total characters", () => {
		const embed = EmbedBuilder.from({
			type: EmbedTypes.RICH,
			description: "d".repeat(4096),
			footer: { text: "f".repeat(1024) },
			author: { name: "a".repeat(256) },
			fields: [{ name: "n".repeat(256), value: "v".repeat(368) }]
		});

		expect(() => EmbedBuilder.validate(embed)).not.toThrow();
	});

	it("throws when static validate exceeds the 6000 character limit", () => {
		const embed = EmbedBuilder.from({
			type: EmbedTypes.RICH,
			description: "d".repeat(4096),
			footer: { text: "f".repeat(1024) },
			author: { name: "a".repeat(256) },
			fields: [{ name: "n".repeat(256), value: "v".repeat(369) }]
		});

		expect(() => EmbedBuilder.validate(embed)).toThrow(/Embed content exceeds the maximum allowed character count of 6000/);
	});
});