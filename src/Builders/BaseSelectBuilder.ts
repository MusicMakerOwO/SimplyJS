import { ComponentType } from "../Types/Components.js";

/**
 * Drops `undefined`-valued keys from a `toJSON()` result so the returned object satisfies raw
 * wire-format types under `exactOptionalPropertyTypes` (which treats `{ key: undefined }` as
 * distinct from an omitted key).
 */
export function omitUndefined<T>(obj: Record<string, unknown>): T {
	const out: Record<string, unknown> = {};
	for (const key in obj) {
		if (obj[key] !== undefined) out[key] = obj[key];
	}
	return out as T;
}

/** Runtime checks shared by every select builder's `validate`/static `validate` */
export function validateBaseSelectShape(
	select: {
		customId?: string | undefined;
		placeholder?: string | undefined;
		minValues?: number | undefined;
		maxValues?: number | undefined;
	},
	label: string
): void {
	if (!select.customId || select.customId.length === 0) throw new Error(`${label} must have a customId`);
	if (select.customId.length > 100) {
		throw new Error(`${label} customId must be 100 characters or fewer - Received ${select.customId.length} characters`);
	}

	if (select.placeholder && select.placeholder.length > 150) {
		throw new Error(`${label} placeholder must be 150 characters or fewer - Received ${select.placeholder.length} characters`);
	}

	const minValues = select.minValues ?? 1;
	const maxValues = select.maxValues ?? 1;

	if (minValues < 0 || minValues > 25) throw new Error(`${label} minValues must be between 0 and 25`);
	if (maxValues < 1 || maxValues > 25) throw new Error(`${label} maxValues must be between 1 and 25`);
	if (minValues > maxValues) throw new Error(`${label} minValues cannot exceed maxValues`);
}

/**
 * Shared fields/setters for every select menu component (string/user/role/mentionable/channel select).
 *
 * @note Entity selects (user/role/mentionable/channel) also carry `defaultValues` - see
 * {@link EntitySelectBuilder}, which extends this with that field rather than putting it here,
 * since string select has developer-defined `options` instead.
 */
export abstract class BaseSelectBuilder<TType extends ComponentType> {
	abstract readonly type: TType;
	/** Developer-defined identifier, max 100 characters, must be unique per message/modal - only populated once set, see `validate` */
	customId!: string;
	/** Placeholder text shown when nothing is selected, max 150 characters */
	placeholder?: string;
	/** Minimum number of items that must be chosen, 0-25, defaults to 1 */
	minValues?: number;
	/** Maximum number of items that can be chosen, max 25, defaults to 1 */
	maxValues?: number;
	/** Whether the select is required to be answered, modal-only, defaults to true */
	required?: boolean;
	/** Whether the select is disabled, message-only, defaults to false */
	disabled?: boolean;

	/** Human-readable name used in validation error messages, e.g. "User select" */
	protected abstract readonly selectLabel: string;

	/**
	 * Sets the select's customId
	 */
	setCustomId(customId: string): this {
		if (customId.length === 0 || customId.length > 100) {
			throw new Error(`${this.selectLabel} customId must be between 1 and 100 characters long - Received ${customId.length} characters`);
		}
		this.customId = customId;
		return this;
	}

	/**
	 * Sets the select's placeholder text
	 */
	setPlaceholder(placeholder: string): this {
		if (placeholder.length > 150) {
			throw new Error(`${this.selectLabel} placeholder must be 150 characters or fewer - Received ${placeholder.length} characters`);
		}
		this.placeholder = placeholder;
		return this;
	}

	/**
	 * Sets the minimum number of items that must be chosen
	 */
	setMinValues(minValues: number): this {
		if (minValues < 0 || minValues > 25) throw new Error(`${this.selectLabel} minValues must be between 0 and 25`);
		this.minValues = minValues;
		return this;
	}

	/**
	 * Sets the maximum number of items that can be chosen
	 */
	setMaxValues(maxValues: number): this {
		if (maxValues < 1 || maxValues > 25) throw new Error(`${this.selectLabel} maxValues must be between 1 and 25`);
		this.maxValues = maxValues;
		return this;
	}

	/**
	 * Sets whether the select is required to be answered, modal-only
	 */
	setRequired(required = true): this {
		this.required = required;
		return this;
	}

	/**
	 * Sets whether the select is disabled
	 */
	setDisabled(disabled = true): this {
		this.disabled = disabled;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	abstract validate(): void;
}
