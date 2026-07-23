import { ObjectValues } from "../Types/index.js";

type FlagInput<FlagMap extends Record<string, bigint>> = Array<keyof FlagMap | ObjectValues<FlagMap>>;
type FlagValue = string | number | bigint;
export type BitFieldValue<FlagMap extends Record<string, bigint>> = string | number | bigint | FlagInput<FlagMap>;

/**
 * Generic bigint-backed bitfield helper.
 *
 * @example
 * const perms = new BitField(Permissions, "0");
 * perms.set(true, "SEND_MESSAGES", "VIEW_CHANNEL");
 * perms.has(Permissions.SEND_MESSAGES); // true
 * perms.toString(); // "3072"
 */
export class BitField<TFlags extends Record<string, bigint>> {
	/**
	 * Source flag map used to resolve string keys into bigint values
	 */
	public readonly flags: TFlags;
	/**
	 * Current bigint bitfield value
	 */
	public value: bigint;

	constructor(flags: TFlags, startValue: bigint | number | string = 0n) {
		this.flags = flags;
		this.value = this.parseBit(startValue);
	}

	/**
	 * Returns true when every provided flag is set.
	 *
	 * @example
	 * ```ts
	 * const bitfield = new BitField(permissions, 42069);
	 *
	 * // returns `true` if all the provided bits are enabled
	 * bitfield.has("VIEW_CHANNEL", "SEND_MESSAGES");
	 * bitfield.has(Permissions.VIEW_CHANNEL, Permissions.SEND_MESSAGES);
	 * ```
	 */
	has(...flags: FlagInput<TFlags>): boolean {
		if (flags.length === 0) return true;
		const resolved = this.resolve(...flags);
		return (this.value & resolved) === resolved;
	}

	/**
	 * Sets or unsets all provided flags.
	 * Defaults to setting/enabling flags.
	 *
	 * @notes This does not trigger an API event, it is only used for cache replication
	 *
	 * @example
	 * ```ts
	 * const bitfield = new BitField(permissions, 0);
	 *
	 * // enables the provided bits
	 * bitfield.set(true, "VIEW_CHANNEL", "SEND_MESSAGES");
	 * bitfield.set(true, Permissions.VIEW_CHANNEL, Permissions.SEND_MESSAGES);
	 *
	 * // disables the provided bits
	 * bitfield.set(false, "VIEW_CHANNEL", "SEND_MESSAGES");
	 * bitfield.set(false, Permissions.VIEW_CHANNEL, Permissions.SEND_MESSAGES);
	 * ```
	 */
	public set(enabled: boolean, ...flags: FlagInput<TFlags>): this {
		if (flags.length === 0) return this;
		const resolved = this.resolve(...flags);
		this.value = enabled ? this.value | resolved : this.value & ~resolved;
		return this;
	}

	/**
	 * Serializes the bitfield to a decimal string, matching Discord payload style.
	 */
	public toString(): string {
		return this.value.toString();
	}

	/**
	 * Resolves a mixed list of flag names and/or raw values into a single combined bitmask.
	 *
	 * Each provided flag is either looked up by name in `this.flags`, or parsed directly
	 * as a raw bigint/number/string value, then OR'd together into one bigint result.
	 *
	 * @notes This does not read or return `this.value`; it only computes a mask from the given arguments.
	 *
	 * @example
	 * ```ts
	 * const bitfield = new BitField(permissions, 0);
	 *
	 * // returns the combined bitmask for both flags, e.g. 1024n | 2048n = 3072n
	 * bitfield.resolve("VIEW_CHANNEL", "SEND_MESSAGES");
	 * ```
	 */
	private resolve(...flags: FlagInput<TFlags>): bigint {
		let bits = 0n;
		for (const flag of flags) {
			bits |= typeof flag === "string" && flag in this.flags
				? this.flags[flag as keyof TFlags]
				: this.parseBit(flag as FlagValue);
		}
		return bits;
	}

	/**
	 * Replaces the current bitfield with a new raw value
	 */
	override(value: string | number | bigint): void {
		this.value = this.parseBit(value);
	}

	private parseBit(value: FlagValue | number): bigint {
		return typeof value === "bigint"
			? value
			: typeof value === "number"
				? BigInt(value)
				: BigInt(value.trim() || "0");
	}
}