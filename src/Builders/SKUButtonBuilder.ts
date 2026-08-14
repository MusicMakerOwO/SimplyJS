import { ButtonStyles, ComponentTypes, PremiumButton } from "../Types/Components.js";
import { omitUndefined } from "./BaseSelectBuilder.js";

/** Runtime checks shared by `SKUButtonBuilder#validate` and the static `SKUButtonBuilder.validate` */
function validateSKUButtonShape(button: { skuId?: string | undefined }): void {
	if (!button.skuId || button.skuId.length === 0) throw new Error("SKU button must have a skuId");
}

/**
 * Fluent builder for premium (SKU) buttons - purchases a SKU and does not send an
 * interaction when clicked. Discord fills in the label/emoji itself, so unlike
 * `ButtonBuilder` there's no `label`, `emoji`, `customId`, or `url` to set.
 */
export class SKUButtonBuilder {
	/**
	 * Creates a builder from an existing SKU button payload
	 */
	static from(value: PremiumButton): SKUButtonBuilder {
		const button = new SKUButtonBuilder();

		button.setSkuId(value.sku_id);
		if (value.disabled !== undefined) button.setDisabled(value.disabled);

		return button;
	}

	/**
	 * Validates a SKU button payload against Discord's constraints
	 */
	static validate(button: PremiumButton): void {
		validateSKUButtonShape({ skuId: button.sku_id });
	}

	readonly type = ComponentTypes.BUTTON;
	readonly style = ButtonStyles.PREMIUM;
	/** Id of the SKU the button purchases - only populated once set, see {@link SKUButtonBuilder#validate} */
	skuId!: string;
	/** Whether the button is disabled, defaults to false */
	disabled?: boolean;

	/**
	 * Sets the id of the SKU the button purchases
	 */
	setSkuId(skuId: string): this {
		if (skuId.length === 0) throw new Error("SKU button's skuId cannot be empty");
		this.skuId = skuId;
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

	/**
	 * Serializes this builder into the raw {@link PremiumButton} payload Discord expects
	 */
	toJSON(): PremiumButton {
		return omitUndefined<PremiumButton>({
			type: this.type,
			style: this.style,
			sku_id: this.skuId,
			disabled: this.disabled
		});
	}
}
