import { ButtonStyles, ComponentEmoji, ComponentTypes, LinkButton } from "../Types/Components.js";
import { validateButtonLabel } from "./ButtonBuilder.js";

/** Runtime checks shared by `LinkButtonBuilder#validate` and the static `LinkButtonBuilder.validate` */
function validateLinkButtonShape(button: { label?: string; url?: string; custom_id?: string }): void {
	validateButtonLabel(button.label);

	if (!button.url) throw new Error("Link buttons must have a url");
	if (button.url.length > 512) throw new Error(`Button url must be 512 characters or fewer - Received ${button.url.length} characters`);
	if (button.custom_id) throw new Error("Link buttons cannot have a custom_id");
}

/**
 * Fluent builder for a link button - opens a url and does not send an interaction when clicked,
 * so it carries a `url` where {@link ButtonBuilder} carries a `custom_id`. The style is fixed to
 * LINK and can't be changed; pick the builder that matches the button you want.
 *
 * The builder *is* a {@link LinkButton} payload, so it can be used interchangeably with a plain
 * object anywhere a button is accepted.
 *
 * @note Fields are typed as always-present so the builder lines up with the payload type, but
 * they're only populated once you set them - call {@link LinkButtonBuilder#validate} to check.
 */
export class LinkButtonBuilder implements LinkButton {
	/**
	 * Creates a builder from an existing link button payload
	 */
	static from(value: LinkButton): LinkButtonBuilder {
		const button = new LinkButtonBuilder();

		if (value.label) button.setLabel(value.label);
		button.setURL(value.url);
		if (value.emoji) button.setEmoji(value.emoji);
		if (value.disabled !== undefined) button.setDisabled(value.disabled);

		return button;
	}

	/**
	 * Validates a link button payload against Discord's constraints
	 */
	static validate(button: LinkButton): void {
		validateLinkButtonShape(button);
	}

	readonly type = ComponentTypes.BUTTON;
	readonly style = ButtonStyles.LINK;
	/** Text that appears on the button, max 80 characters - only populated once set, see {@link LinkButtonBuilder#validate} */
	label!: string;
	/** Emoji displayed on the button */
	emoji?: ComponentEmoji;
	/** Whether the button is disabled, defaults to false */
	disabled?: boolean;
	/** Url the button opens, max 512 characters - only populated once set, see {@link LinkButtonBuilder#validate} */
	url!: string;

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
	 * Sets the url the button opens
	 */
	setURL(url: string): this {
		if (url.length === 0 || url.length > 512) {
			throw new Error(`Button url must be between 1 and 512 characters long - Received ${url.length} characters`);
		}
		this.url = url;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateLinkButtonShape(this);
	}
}
