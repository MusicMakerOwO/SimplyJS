import { ButtonStyles, ComponentEmoji, ComponentTypes, InteractiveButton } from "../Types/Components.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";

/** Style of a button that sends an interaction when clicked, ie. every non-premium style except LINK */
export type InteractiveButtonStyle = Exclude<ObjectValues<typeof ButtonStyles>, typeof ButtonStyles.LINK | typeof ButtonStyles.PREMIUM>;

/**
 * Whether an emoji reference actually identifies an emoji.
 *
 * Every field of {@link ComponentEmoji} is optional, so the object being present proves nothing -
 * a custom emoji is identified by `id` and a unicode one by `name`, and either alone is enough.
 * `{}` and `{ animated: true }` identify nothing.
 */
export function hasEmoji(emoji: ComponentEmoji | undefined): boolean {
	if (!emoji) return false;
	return (emoji.id?.length ?? 0) > 0 || (emoji.name?.length ?? 0) > 0;
}

/**
 * Content check shared by every button builder that has a face - ie. every style but PREMIUM,
 * which shows Discord's own purchase text.
 *
 * Discord requires *at least one of* `label` and `emoji`: a button with an emoji and no label is
 * an ordinary icon button, and only one showing neither is rejected.
 * @param button The button payload to check.
 * @throws {Error} When the button has neither a label nor an emoji, or its label is too long.
 */
export function validateButtonContent(button: { label?: string | undefined; emoji?: ComponentEmoji | undefined }): void {
	const hasLabel = (button.label?.length ?? 0) > 0;

	if (!hasLabel && !hasEmoji(button.emoji)) throw new Error("Button must have a label or an emoji");
	if (button.label && button.label.length > 80) {
		throw new Error(`Button label must be 80 characters or fewer - Received ${button.label.length} characters`);
	}
}

/** Runtime checks shared by `ButtonBuilder#validate` and the static `ButtonBuilder.validate` */
function validateInteractiveButtonShape(button: { label?: string | undefined; emoji?: ComponentEmoji | undefined; custom_id?: string | undefined; url?: string | undefined; id?: number | undefined }): void {
	validateButtonContent(button);

	if (!button.custom_id) throw new Error("Non-link buttons must have a customId");
	if (button.custom_id.length > 100) throw new Error(`Button customId must be 100 characters or fewer - Received ${button.custom_id.length} characters`);
	if (button.url) throw new Error("Non-link buttons cannot have a url");

	validateComponentId(button);
}

/**
 * Fluent builder for an interactive button - one of the four styled buttons that sends an
 * interaction when clicked. For the other two kinds see `LinkButtonBuilder` (opens a url) and
 * `SKUButtonBuilder` (purchases a SKU).
 *
 * The builder *is* an {@link InteractiveButton} payload - its fields carry their wire names - so
 * it can be used interchangeably with a plain object anywhere a button is accepted:
 *
 * ```ts
 * new ButtonBuilder().setStyle(ButtonStyles.DANGER).setLabel("Delete").setCustomId("delete");
 * // is the same payload as
 * { type: ComponentTypes.BUTTON, style: ButtonStyles.DANGER, label: "Delete", custom_id: "delete" };
 * ```
 *
 * @note Fields are typed as always-present so the builder lines up with the payload type, but
 * they're only populated once you set them - call {@link ButtonBuilder#validate} to check.
 */
export class ButtonBuilder extends ComponentBuilder<typeof ComponentTypes.BUTTON> implements InteractiveButton {
	/**
	 * Creates a builder from an existing interactive button payload
	 */
	static from(value: InteractiveButton): ButtonBuilder {
		const button = new ButtonBuilder(value.style);

		if (value.label) button.setLabel(value.label);
		button.setCustomId(value.custom_id);
		if (value.emoji) button.setEmoji(value.emoji);
		if (value.disabled !== undefined) button.setDisabled(value.disabled);
		if (value.id !== undefined) button.setId(value.id);

		return button;
	}

	/**
	 * Validates an interactive button payload against Discord's constraints
	 */
	static validate(button: InteractiveButton): void {
		validateInteractiveButtonShape(button);
	}

	readonly type = ComponentTypes.BUTTON;
	/** The button's style, defaults to PRIMARY */
	style: InteractiveButtonStyle;
	/** Text that appears on the button, max 80 characters. Optional when an {@link emoji} is set */
	label?: string;
	/** Emoji displayed on the button */
	emoji?: ComponentEmoji;
	/** Whether the button is disabled, defaults to false */
	disabled?: boolean;
	/** Developer-defined identifier, max 100 characters, must be unique per message - only populated once set, see {@link ButtonBuilder#validate} */
	custom_id!: string;

	constructor(style: InteractiveButtonStyle = ButtonStyles.PRIMARY) {
		super();
		this.style = style;
	}

	/**
	 * Sets the button's style. LINK and PREMIUM aren't accepted here - they have their own
	 * builders, since they carry a `url`/`sku_id` instead of a `custom_id`.
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
	 * Sets the button's emoji, which can stand in for the label on its own
	 * @throws {Error} When the emoji identifies nothing - it needs an `id` or a `name`
	 */
	setEmoji(emoji: ComponentEmoji): this {
		if (!hasEmoji(emoji)) throw new Error("Button emoji must have an id or a name");
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
		this.custom_id = customId;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateInteractiveButtonShape(this);
	}
}
