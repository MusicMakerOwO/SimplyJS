import { ButtonStyles, ComponentEmoji, ComponentTypes, InteractiveButton, LinkButton } from "../Types/Components.js";
import { ObjectValues } from "../Types/HelperTypes.js";

/**
 * Style of a non-premium button.
 *
 * @note For SKU/premium buttons, use a dedicated SKU button builder instead - their shape (just
 * a `sku_id`, no label/emoji/custom_id/url) is different enough that it doesn't fit this builder.
 */
export type NonPremiumButtonStyle = Exclude<ObjectValues<typeof ButtonStyles>, typeof ButtonStyles.PREMIUM>;

/** Runtime checks shared by `ButtonBuilder#validate` and the static `ButtonBuilder.validate` */
function validateButtonShape(button: { style: NonPremiumButtonStyle; label?: string; custom_id?: string; url?: string }): void {
	if (!button.label || button.label.length === 0) throw new Error("Button must have a label");
	if (button.label.length > 80) throw new Error(`Button label must be 80 characters or fewer - Received ${button.label.length} characters`);

	if (button.style === ButtonStyles.LINK) {
		if (!button.url) throw new Error("Link buttons must have a url");
		if (button.url.length > 512) throw new Error(`Button url must be 512 characters or fewer - Received ${button.url.length} characters`);
		if (button.custom_id) throw new Error("Link buttons cannot have a custom_id");
	} else {
		if (!button.custom_id) throw new Error("Non-link buttons must have a custom_id");
		if (button.custom_id.length > 100) throw new Error(`Button custom_id must be 100 characters or fewer - Received ${button.custom_id.length} characters`);
		if (button.url) throw new Error("Non-link buttons cannot have a url");
	}
}

/** Fluent builder for interactive (styled) and link buttons, validating limits as they're set. */
export class ButtonBuilder {
	/**
	 * Creates a builder from an existing button payload
	 */
	static from(value: InteractiveButton | LinkButton): ButtonBuilder {
		const button = new ButtonBuilder();

		button.setStyle(value.style);
		button.setLabel(value.label);
		if (value.emoji) button.setEmoji(value.emoji);
		if (value.disabled !== undefined) button.setDisabled(value.disabled);
		if ("custom_id" in value) button.setCustomID(value.custom_id);
		if ("url" in value) button.setURL(value.url);

		return button;
	}

	/**
	 * Validates a button payload against Discord's constraints
	 */
	static validate(button: InteractiveButton | LinkButton): void {
		validateButtonShape(button);
	}

	readonly type = ComponentTypes.BUTTON;
	/** The button's style, defaults to PRIMARY */
	style: NonPremiumButtonStyle;
	/** Text that appears on the button, max 80 characters */
	label?: string;
	/** Emoji displayed on the button */
	emoji?: ComponentEmoji;
	/** Whether the button is disabled, defaults to false */
	disabled?: boolean;
	/** Developer-defined identifier, max 100 characters, must be unique per message/modal - required unless `style` is LINK */
	custom_id?: string;
	/** Url the button opens, max 512 characters - only valid when `style` is LINK */
	url?: string;

	constructor() {
		this.style = ButtonStyles.PRIMARY;
	}

	/**
	 * Sets the button's style. Switching to/from LINK does not clear a previously set
	 * `custom_id`/`url` - set the relevant one explicitly when changing styles.
	 */
	setStyle(style: NonPremiumButtonStyle): this {
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
	 * Sets the button's custom_id, used for non-link button styles
	 */
	setCustomID(customId: string): this {
		if (customId.length === 0 || customId.length > 100) {
			throw new Error(`Button custom_id must be between 1 and 100 characters long - Received ${customId.length} characters`);
		}
		this.custom_id = customId;
		return this;
	}

	/**
	 * Sets the button's url, used for the LINK style
	 */
	setURL(url: string): this {
		if (url.length === 0 || url.length > 512) {
			throw new Error(`Button url must be between 1 and 512 characters long - Received ${url.length} characters`);
		}
		if (this.style !== ButtonStyles.LINK) {
			throw new Error(`Button style must be Link (5) to add a URL`);
		}
		this.url = url;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateButtonShape(this);
	}
}