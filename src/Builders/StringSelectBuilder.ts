import { ComponentTypes, SelectOption, StringSelect } from "../Types/Components.js";
import { BaseSelectBuilder, validateBaseSelectShape } from "./BaseSelectBuilder.js";

const MAX_OPTIONS = 25;

/** Runtime checks specific to string select's `options`, layered on top of the shared select checks */
function validateStringSelectOptions(options: SelectOption[] | undefined, label: string): void {
	if (!options || options.length === 0) throw new Error(`${label} must have at least 1 option`);
	if (options.length > MAX_OPTIONS) throw new Error(`${label} cannot have more than ${MAX_OPTIONS} options`);

	for (const option of options) {
		if (!option.label || option.label.length === 0) throw new Error(`${label} option must have a label`);
		if (option.label.length > 100) throw new Error(`${label} option label must be 100 characters or fewer - Received ${option.label.length} characters`);
		if (option.value.length === 0) throw new Error(`${label} option must have a value`);
		if (option.value.length > 100) throw new Error(`${label} option value must be 100 characters or fewer - Received ${option.value.length} characters`);
		if (option.description && option.description.length > 100) {
			throw new Error(`${label} option description must be 100 characters or fewer - Received ${option.description.length} characters`);
		}
	}
}

/** Fluent builder for a string select menu, validating limits as they're set. */
export class StringSelectBuilder extends BaseSelectBuilder<typeof ComponentTypes.STRING_SELECT> {
	/**
	 * Creates a builder from an existing string select payload
	 */
	static from(value: StringSelect): StringSelectBuilder {
		const select = new StringSelectBuilder();

		select.setCustomID(value.custom_id);
		if (value.placeholder !== undefined) select.setPlaceholder(value.placeholder);
		if (value.min_values !== undefined) select.setMinValues(value.min_values);
		if (value.max_values !== undefined) select.setMaxValues(value.max_values);
		if (value.required !== undefined) select.setRequired(value.required);
		if (value.disabled !== undefined) select.setDisabled(value.disabled);
		if (value.options) select.setOptions(value.options);

		return select;
	}

	/**
	 * Validates a string select payload against Discord's constraints
	 */
	static validate(select: StringSelect): void {
		validateBaseSelectShape(select, "String select");
		validateStringSelectOptions(select.options, "String select");
	}

	readonly type = ComponentTypes.STRING_SELECT;
	protected readonly selectLabel = "String select";
	/** Choices in the select, max 25 */
	options?: SelectOption[];

	/**
	 * Replaces the select's option list
	 */
	setOptions(options: SelectOption[]): this {
		if (options.length > MAX_OPTIONS) throw new Error(`String select cannot have more than ${MAX_OPTIONS} options`);
		this.options = options;
		return this;
	}

	/**
	 * Appends options to the existing option list
	 */
	addOptions(options: SelectOption[]): this {
		this.options ??= [];
		if (this.options.length + options.length > MAX_OPTIONS) {
			throw new Error(`String select cannot have more than ${MAX_OPTIONS} options`);
		}
		this.options.push(...options);
		return this;
	}

	/**
	 * Appends a single option, built via `label`/`value` plus optional config
	 */
	addOption(label: string, value: string, config?: Omit<SelectOption, "label" | "value">): this {
		return this.addOptions([{ label, value, ...config }]);
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateBaseSelectShape(this, this.selectLabel);
		validateStringSelectOptions(this.options, this.selectLabel);
	}
}
