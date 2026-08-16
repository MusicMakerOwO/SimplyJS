import { ComponentType } from "../Types/Components.js";

/** Runtime checks shared by every select builder's `validate`/static `validate` */
export function validateBaseSelectShape(
	select: {
		custom_id?: string | undefined;
		placeholder?: string | undefined;
		min_values?: number | undefined;
		max_values?: number | undefined;
	},
	label: string
): void {
	if (!select.custom_id || select.custom_id.length === 0) throw new Error(`${label} must have a customId`);
	if (select.custom_id.length > 100) {
		throw new Error(`${label} customId must be 100 characters or fewer - Received ${select.custom_id.length} characters`);
	}

	if (select.placeholder && select.placeholder.length > 150) {
		throw new Error(`${label} placeholder must be 150 characters or fewer - Received ${select.placeholder.length} characters`);
	}

	const minValues = select.min_values ?? 1;
	const maxValues = select.max_values ?? 1;

	if (minValues < 0 || minValues > 25) throw new Error(`${label} minValues must be between 0 and 25`);
	if (maxValues < 1 || maxValues > 25) throw new Error(`${label} maxValues must be between 1 and 25`);
	if (minValues > maxValues) throw new Error(`${label} minValues cannot exceed maxValues`);
}

/**
 * Shared fields/setters for every select menu component (string/user/role/mentionable/channel select).
 *
 * Fields carry their wire names (`custom_id`, `min_values`, ...) so every select builder *is* its
 * payload type - see {@link StringSelectBuilder} and friends.
 *
 * @note Entity selects (user/role/mentionable/channel) also carry `default_values` - see
 * {@link EntitySelectBuilder}, which extends this with that field rather than putting it here,
 * since string select has developer-defined `options` instead.
 */
export abstract class BaseSelectBuilder<TType extends ComponentType> {
	abstract readonly type: TType;
	/** Developer-defined identifier, max 100 characters, must be unique per message/modal - only populated once set, see `validate` */
	custom_id!: string;
	/** Placeholder text shown when nothing is selected, max 150 characters */
	placeholder?: string;
	/** Minimum number of items that must be chosen, 0-25, defaults to 1 */
	min_values?: number;
	/** Maximum number of items that can be chosen, max 25, defaults to 1 */
	max_values?: number;
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
		this.custom_id = customId;
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
		this.min_values = minValues;
		return this;
	}

	/**
	 * Sets the maximum number of items that can be chosen
	 */
	setMaxValues(maxValues: number): this {
		if (maxValues < 1 || maxValues > 25) throw new Error(`${this.selectLabel} maxValues must be between 1 and 25`);
		this.max_values = maxValues;
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
