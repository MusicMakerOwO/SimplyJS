import { describe, expect, it } from "vitest";
import { BitField } from "../DataStructures/BitField.js";
import { CreateBitField, SerializeBitFieldValue } from "../Utils.js";

const TestFlags = {
	VIEW_CHANNEL   : 1n << 0n,
	SEND_MESSAGES  : 1n << 1n,
	MANAGE_MESSAGES: 1n << 2n
} as const;

describe("BitField", () => {
	it("initializes with a default value of zero and serializes to decimal string", () => {
		const bitfield = new BitField(TestFlags);

		expect(bitfield.value)
		.toBe(0n);
		expect(bitfield.toString())
		.toBe("0");
	});

	it("initializes from number and string values", () => {
		const fromNumber = new BitField(TestFlags, 3);
		const fromString = new BitField(TestFlags, "3");

		expect(fromNumber.value)
		.toBe(3n);
		expect(fromString.value)
		.toBe(3n);
		expect(fromNumber.toString())
		.toBe("3");
		expect(fromString.toString())
		.toBe("3");
	});

	it("treats empty string start value as zero", () => {
		const bitfield = new BitField(TestFlags, "   ");

		expect(bitfield.value)
		.toBe(0n);
		expect(bitfield.toString())
		.toBe("0");
	});

	it("returns true for has() with no flags", () => {
		const bitfield = new BitField(TestFlags, 0);

		expect(bitfield.has())
		.toBe(true);
	});

	it("returns true when all requested named flags are enabled", () => {
		const bitfield = new BitField(
			TestFlags,
			TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES
		);

		expect(bitfield.has("VIEW_CHANNEL"))
		.toBe(true);
		expect(bitfield.has("VIEW_CHANNEL", "SEND_MESSAGES"))
		.toBe(true);
	});

	it("returns false when any requested named flag is missing", () => {
		const bitfield = new BitField(TestFlags, TestFlags.VIEW_CHANNEL);

		expect(bitfield.has("SEND_MESSAGES"))
		.toBe(false);
		expect(bitfield.has("VIEW_CHANNEL", "SEND_MESSAGES"))
		.toBe(false);
	});

	it("supports checking raw bigint flags", () => {
		const bitfield = new BitField(TestFlags, TestFlags.MANAGE_MESSAGES);

		expect(bitfield.has(TestFlags.MANAGE_MESSAGES))
		.toBe(true);
		expect(bitfield.has(TestFlags.SEND_MESSAGES))
		.toBe(false);
	});

	it("supports enabling flags by name", () => {
		const bitfield = new BitField(TestFlags, 0);

		bitfield.set(true, "VIEW_CHANNEL", "SEND_MESSAGES");

		expect(bitfield.has("VIEW_CHANNEL"))
		.toBe(true);
		expect(bitfield.has("SEND_MESSAGES"))
		.toBe(true);
		expect(bitfield.value)
		.toBe(TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES);
	});

	it("supports enabling flags by bigint value", () => {
		const bitfield = new BitField(TestFlags, 0);

		bitfield.set(true, TestFlags.MANAGE_MESSAGES);

		expect(bitfield.has("MANAGE_MESSAGES"))
		.toBe(true);
		expect(bitfield.value)
		.toBe(TestFlags.MANAGE_MESSAGES);
	});

	it("supports disabling enabled flags", () => {
		const all =
			TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES | TestFlags.MANAGE_MESSAGES;
		const bitfield = new BitField(TestFlags, all);

		bitfield.set(false, "SEND_MESSAGES");

		expect(bitfield.has("VIEW_CHANNEL"))
		.toBe(true);
		expect(bitfield.has("SEND_MESSAGES"))
		.toBe(false);
		expect(bitfield.has("MANAGE_MESSAGES"))
		.toBe(true);
	});

	it("keeps value unchanged when set is called with no flags", () => {
		const initial = TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES;
		const bitfield = new BitField(TestFlags, initial);

		bitfield.set(true);

		expect(bitfield.value)
		.toBe(initial);
	});

	it("supports chaining set calls", () => {
		const bitfield = new BitField(TestFlags, 0);

		bitfield
		.set(true, "VIEW_CHANNEL")
		.set(true, "SEND_MESSAGES")
		.set(false, "VIEW_CHANNEL");

		expect(bitfield.has("VIEW_CHANNEL"))
		.toBe(false);
		expect(bitfield.has("SEND_MESSAGES"))
		.toBe(true);
	});

	it("replaces the current bitfield value when override is called", () => {
		const bitfield = new BitField(TestFlags, TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES);

		bitfield.override(TestFlags.MANAGE_MESSAGES);

		expect(bitfield.value)
		.toBe(TestFlags.MANAGE_MESSAGES);
		expect(bitfield.has("VIEW_CHANNEL"))
		.toBe(false);
		expect(bitfield.has("SEND_MESSAGES"))
		.toBe(false);
		expect(bitfield.has("MANAGE_MESSAGES"))
		.toBe(true);
		expect(bitfield.toString())
		.toBe(TestFlags.MANAGE_MESSAGES.toString());
	});

	it("throws when given an unknown flag name", () => {
		const bitfield = new BitField(TestFlags, 0);

		expect(() => bitfield.has("NOT_A_REAL_FLAG" as keyof typeof TestFlags))
		.toThrow(
			'Cannot convert NOT_A_REAL_FLAG to a BigInt'
		);
	});

	it("throws when start value string is not a valid integer", () => {
		expect(() => new BitField(TestFlags, "abc"))
		.toThrow(
			"Cannot convert abc to a BigInt"
		);
	});
});

describe('BitField utils', () => {
	it("CreateBitField() resolves array input into a populated BitField", () => {
		const bitfield = CreateBitField(TestFlags, ["VIEW_CHANNEL", "SEND_MESSAGES"]);

		expect(bitfield)
		.toBeInstanceOf(BitField);
		expect(bitfield.has("VIEW_CHANNEL", "SEND_MESSAGES"))
		.toBe(true);
	});

	it("SerializeBitFieldValue() converts array and bigint inputs to decimal strings", () => {
		expect(SerializeBitFieldValue(TestFlags, ["VIEW_CHANNEL", "SEND_MESSAGES"]))
		.toBe((TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES).toString());
		expect(SerializeBitFieldValue(TestFlags, [TestFlags.VIEW_CHANNEL, TestFlags.SEND_MESSAGES]))
		.toBe((TestFlags.VIEW_CHANNEL | TestFlags.SEND_MESSAGES).toString());
		expect(SerializeBitFieldValue(TestFlags, 7n))
		.toBe("7");
	});

	it("SerializeBitFieldValue() keeps string and number inputs unchanged", () => {
		expect(SerializeBitFieldValue(TestFlags, "7"))
		.toBe("7");
		expect(SerializeBitFieldValue(TestFlags, 7))
		.toBe(7);
	});
});