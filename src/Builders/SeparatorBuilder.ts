import { ComponentTypes, Separator, SeparatorSpacingSize, SeparatorSpacingSizes } from "../Types/Components.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";

/** The spacing sizes Discord accepts, used to reject values from untyped JavaScript callers */
const spacingSizes: readonly number[] = Object.values(SeparatorSpacingSizes);

/** Runtime checks shared by `SeparatorBuilder#validate` and the static `SeparatorBuilder.validate` */
function validateSeparatorShape(separator: { spacing?: SeparatorSpacingSize | undefined; id?: number | undefined }): void {
	if (separator.spacing !== undefined && !spacingSizes.includes(separator.spacing)) {
		throw new Error(`Separator spacing must be SMALL (1) or LARGE (2) - Received ${separator.spacing}`);
	}
	validateComponentId(separator);
}

/**
 * Fluent builder for a Components V2 separator - vertical padding with an optional divider line
 * between other components. The builder *is* a {@link Separator} payload, so it can be sent as-is.
 */
export class SeparatorBuilder extends ComponentBuilder<typeof ComponentTypes.SEPARATOR> implements Separator {
	/**
	 * Creates a builder from an existing separator payload
	 */
	static from(value: Separator): SeparatorBuilder {
		const separator = new SeparatorBuilder();

		if (value.divider !== undefined) separator.setDivider(value.divider);
		if (value.spacing !== undefined) separator.setSpacing(value.spacing);
		if (value.id !== undefined) separator.setId(value.id);

		return separator;
	}

	/**
	 * Validates a separator payload against Discord's constraints
	 */
	static validate(separator: Separator): void {
		validateSeparatorShape(separator);
	}

	readonly type = ComponentTypes.SEPARATOR;
	/** Whether a divider line should be displayed, defaults to true */
	divider?: boolean;
	/** Size of the spacing, defaults to SMALL */
	spacing?: SeparatorSpacingSize;

	/**
	 * Sets whether a divider line is displayed
	 */
	setDivider(divider = true): this {
		this.divider = divider;
		return this;
	}

	/**
	 * Sets the size of the separator's spacing
	 */
	setSpacing(spacing: SeparatorSpacingSize): this {
		if (!spacingSizes.includes(spacing)) throw new Error(`Separator spacing must be SMALL (1) or LARGE (2) - Received ${spacing}`);
		this.spacing = spacing;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateSeparatorShape(this);
	}
}
