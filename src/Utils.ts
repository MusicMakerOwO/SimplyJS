import { BitField, BitFieldValue } from "./DataStructures/BitField.js";

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