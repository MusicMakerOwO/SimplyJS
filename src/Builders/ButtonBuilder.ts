import { ButtonStyles, ComponentEmoji, ComponentTypes, InteractiveButton } from "../Types/Components.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { omitUndefined } from "./BaseSelectBuilder.js";

/** Style of a button that sends an interaction when clicked, ie. every non-premium style except LINK */
export type InteractiveButtonStyle = Exclude<ObjectValues<typeof ButtonStyles>, typeof ButtonStyles.LINK | typeof ButtonStyles.PREMIUM>;

/** Label check shared by every button builder - every button style but PREMIUM carries a label */
export function validateButtonLabel(label: string | undefined): void {
	if (!label || label.length === 0) throw new Error("Button must have a label");
	if (label.length > 80) throw new Error(`Button label must be 80 characters or fewer - Received ${label.length} characters`);
}

/** Runtime checks shared by `ButtonBuilder#validate` and the static `ButtonBuilder.validate` */
function validateInteractiveButtonShape(button: { label?: string | undefined; customId?: string | undefined; url?: string | undefined }): void {
	validateButtonLabel(button.label);

	if (!button.customId) throw new Error("Non-link buttons must have a customId");
	if (button.customId.length > 100) throw new Error(`Button customId must be 100 characters or fewer - Received ${button.customId.length} characters`);
	if (button.url) throw new Error("Non-link buttons cannot have a url");
}

/**
 * Fluent builder for an interactive button - one of the four styled buttons that sends an
 * interaction when clicked. For the other two kinds see `LinkButtonBuilder` (opens a url) and
 * `SKUButtonBuilder` (purchases a SKU).
 *
 * The builder's `toJSON()` produces an {@link InteractiveButton} payload, so anywhere a button
 * object is expected, `builder.toJSON()` (or the builder itself, wherever serialization is
 * handled automatically) can be used - use whichever reads better:
 *
 * ```ts
 * new ButtonBuilder().setStyle(ButtonStyles.DANGER).setLabel("Delete").setCustomId("delete");
 * // serializes to the same thing as
 * { type: ComponentTypes.BUTTON, style: ButtonStyles.DANGER, label: "Delete", custom_id: "delete" };
 * ```
 *
 * @note Fields are typed as always-present so the builder lines up with the payload type, but
 * they're only populated once you set them - call {@link ButtonBuilder#validate} to check.
 */
export class ButtonBuilder {
	/**
	 * Creates a builder from an existing interactive button payload
	 */
	static from(value: InteractiveButton): ButtonBuilder {
		const button = new ButtonBuilder(value.style);

		button.setLabel(value.label);
		button.setCustomId(value.custom_id);
		if (value.emoji) button.setEmoji(value.emoji);
		if (value.disabled !== undefined) button.setDisabled(value.disabled);

		return button;
	}

	/**
	 * Validates an interactive button payload against Discord's constraints
	 */
	static validate(button: InteractiveButton): void {
		validateInteractiveButtonShape({
			label: button.label,
			customId: button.custom_id,
			url: (button as { url?: string }).url
		});
	}

	readonly type = ComponentTypes.BUTTON;
	/** The button's style, defaults to PRIMARY */
	style: InteractiveButtonStyle;
	/** Text that appears on the button, max 80 characters - only populated once set, see {@link ButtonBuilder#validate} */
	label!: string;
	/** Emoji displayed on the button */
	emoji?: ComponentEmoji;
	/** Whether the button is disabled, defaults to false */
	disabled?: boolean;
	/** Developer-defined identifier, max 100 characters, must be unique per message - only populated once set, see {@link ButtonBuilder#validate} */
	customId!: string;

	constructor(style: InteractiveButtonStyle = ButtonStyles.PRIMARY) {
		this.style = style;
	}

	/**
	 * Sets the button's style. LINK and PREMIUM aren't accepted here - they have their own
	 * builders, since they carry a `url`/`skuId` instead of a `customId`.
	 */
	setStyle(style: InteractiveButtonStyle): this {
		this.style = style;
		return this;
	}

	/**
	 * Sets the button's label
	 */
	setLabel(label: string): this {
		if (label.length === 0 || label.length > 80) {
			throw new Error(`Button label must be between 1 and 80 characters long - Received ${label.length} characters`);
		}
		this.label = label;
		return this;
	}

	/**
	 * Sets the button's emoji
	 */
	setEmoji(emoji: ComponentEmoji): this {
		this.emoji = emoji;
		return this;
	}

	/**
	 * Sets whether the button is disabled
	 */
	setDisabled(disabled = true): this {
		this.disabled = disabled;
		return this;
	}

	/**
	 * Sets the button's customId
	 */
	setCustomId(customId: string): this {
		if (customId.length === 0 || customId.length > 100) {
			throw new Error(`Button customId must be between 1 and 100 characters long - Received ${customId.length} characters`);
		}
		this.customId = customId;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateInteractiveButtonShape(this);
	}

	/**
	 * Serializes this builder into the raw {@link InteractiveButton} payload Discord expects
	 */
	toJSON(): InteractiveButton {
		return omitUndefined<InteractiveButton>({
			type: this.type,
			style: this.style,
			label: this.label,
			emoji: this.emoji,
			disabled: this.disabled,
			custom_id: this.customId
		});
	}
}
