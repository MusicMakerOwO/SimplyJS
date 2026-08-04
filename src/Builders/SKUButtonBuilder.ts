import { ButtonStyles, ComponentTypes, PremiumButton } from "../Types/Components.js";

/** Runtime checks shared by `SKUButtonBuilder#validate` and the static `SKUButtonBuilder.validate` */
function validateSKUButtonShape(button: { sku_id?: string }): void {
	if (!button.sku_id || button.sku_id.length === 0) throw new Error("SKU button must have a sku_id");
}

/**
 * Fluent builder for premium (SKU) buttons - purchases a SKU and does not send an
 * interaction when clicked. Discord fills in the label/emoji itself, so unlike
 * `ButtonBuilder` there's no `label`, `emoji`, `custom_id`, or `url` to set.
 */
export class SKUButtonBuilder {
	/**
	 * Creates a builder from an existing SKU button payload
	 */
	static from(value: PremiumButton): SKUButtonBuilder {
		const button = new SKUButtonBuilder();

		button.setSkuID(value.sku_id);
		if (value.disabled !== undefined) button.setDisabled(value.disabled);

		return button;
	}

	/**
	 * Validates a SKU button payload against Discord's constraints
	 */
	static validate(button: PremiumButton): void {
		validateSKUButtonShape(button);
	}

	readonly type = ComponentTypes.BUTTON;
	readonly style = ButtonStyles.PREMIUM;
	/** Id of the SKU the button purchases */
	sku_id?: string;
	/** Whether the button is disabled, defaults to false */
	disabled?: boolean;

	/**
	 * Sets the id of the SKU the button purchases
	 */
	setSkuID(skuId: string): this {
		if (skuId.length === 0) throw new Error("SKU button's sku_id cannot be empty");
		this.sku_id = skuId;
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
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateSKUButtonShape(this);
	}
}