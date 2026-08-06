import { ComponentTypes, TextInput, TextInputStyles } from "../Types/Components.js";

/** Runtime checks shared by `TextInputBuilder#validate` and the static `TextInputBuilder.validate` */
function validateTextInputShape(input: {
	custom_id?: string;
	style?: typeof TextInputStyles.SHORT | typeof TextInputStyles.PARAGRAPH;
	min_length?: number;
	max_length?: number;
	value?: string;
}): void {
	if (!input.custom_id || input.custom_id.length === 0) throw new Error("Text input must have a custom_id");
	if (input.custom_id.length > 100) throw new Error(`Text input custom_id must be 100 characters or fewer - Received ${input.custom_id.length} characters`);

	if (!input.style) throw new Error("Text input must have a style");

	if (input.min_length !== undefined && (input.min_length < 0 || input.min_length > 4000)) {
		throw new Error("Text input min_length must be between 0 and 4000");
	}
	if (input.max_length !== undefined && (input.max_length < 1 || input.max_length > 4000)) {
		throw new Error("Text input max_length must be between 1 and 4000");
	}
	if (input.min_length !== undefined && input.max_length !== undefined && input.min_length > input.max_length) {
		throw new Error("Text input min_length cannot exceed max_length");
	}

	if (input.value && input.value.length > 4000) {
		throw new Error(`Text input value must be 4000 characters or fewer - Received ${input.value.length} characters`);
	}
}

/** Fluent builder for a modal text input, validating limits as they're set. */
export class TextInputBuilder implements TextInput {
	/**
	 * Creates a builder from an existing text input payload
	 */
	static from(value: TextInput): TextInputBuilder {
		const input = new TextInputBuilder();

		input.setCustomID(value.custom_id);
		input.setStyle(value.style);
		if (value.min_length !== undefined) input.setMinLength(value.min_length);
		if (value.max_length !== undefined) input.setMaxLength(value.max_length);
		if (value.required !== undefined) input.setRequired(value.required);
		if (value.value !== undefined) input.setValue(value.value);
		if (value.placeholder !== undefined) input.setPlaceholder(value.placeholder);

		return input;
	}

	/**
	 * Validates a text input payload against Discord's constraints
	 */
	static validate(input: TextInput): void {
		validateTextInputShape(input);
	}

	readonly type = ComponentTypes.TEXT_INPUT;
	/** Developer-defined identifier, max 100 characters, must be unique per modal - only populated once set, see {@link TextInputBuilder#validate} */
	custom_id!: string;
	/** Whether the input is single-line or multi-line - only populated once set, see {@link TextInputBuilder#validate} */
	style!: typeof TextInputStyles.SHORT | typeof TextInputStyles.PARAGRAPH;
	/** Minimum input length, 0-4000 */
	min_length?: number;
	/** Maximum input length, 1-4000 */
	max_length?: number;
	/** Whether the input is required to be filled, defaults to true */
	required?: boolean;
	/** Pre-filled value, max 4000 characters */
	value?: string;
	/** Placeholder text shown when the input is empty, max 100 characters */
	placeholder?: string;

	/**
	 * Sets the text input's custom_id
	 */
	setCustomID(customId: string): this {
		if (customId.length === 0 || customId.length > 100) {
			throw new Error(`Text input custom_id must be between 1 and 100 characters long - Received ${customId.length} characters`);
		}
		this.custom_id = customId;
		return this;
	}

	/**
	 * Sets whether the input is single-line (SHORT) or multi-line (PARAGRAPH)
	 */
	setStyle(style: typeof TextInputStyles.SHORT | typeof TextInputStyles.PARAGRAPH): this {
		this.style = style;
		return this;
	}

	/**
	 * Sets the minimum input length
	 */
	setMinLength(minLength: number): this {
		if (minLength < 0 || minLength > 4000) throw new Error("Text input min_length must be between 0 and 4000");
		this.min_length = minLength;
		return this;
	}

	/**
	 * Sets the maximum input length
	 */
	setMaxLength(maxLength: number): this {
		if (maxLength < 1 || maxLength > 4000) throw new Error("Text input max_length must be between 1 and 4000");
		this.max_length = maxLength;
		return this;
	}

	/**
	 * Sets whether the input is required to be filled
	 */
	setRequired(required = true): this {
		this.required = required;
		return this;
	}

	/**
	 * Sets the input's pre-filled value
	 */
	setValue(value: string): this {
		if (value.length > 4000) throw new Error(`Text input value must be 4000 characters or fewer - Received ${value.length} characters`);
		this.value = value;
		return this;
	}

	/**
	 * Sets the input's placeholder text
	 */
	setPlaceholder(placeholder: string): this {
		if (placeholder.length > 100) {
			throw new Error(`Text input placeholder must be 100 characters or fewer - Received ${placeholder.length} characters`);
		}
		this.placeholder = placeholder;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateTextInputShape(this);
	}
}
