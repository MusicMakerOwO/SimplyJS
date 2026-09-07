import { describe, expect, expectTypeOf, it } from "vitest";
import { SeparatorBuilder } from "../Builders/SeparatorBuilder.js";
import { TextDisplayBuilder } from "../Builders/TextDisplayBuilder.js";
import { ComponentTypes, Separator, SeparatorSpacingSizes, TextDisplay } from "../Types/Components.js";

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
