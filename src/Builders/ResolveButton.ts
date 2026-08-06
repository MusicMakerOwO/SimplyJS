import { Button, ButtonStyles } from "../Types/Components.js";
import { ButtonBuilder } from "./ButtonBuilder.js";
import { LinkButtonBuilder } from "./LinkButtonBuilder.js";
import { SKUButtonBuilder } from "./SKUButtonBuilder.js";

/** Any of the three button builders, one per style family */
export type AnyButtonBuilder = ButtonBuilder | LinkButtonBuilder | SKUButtonBuilder;

/**
 * Builds the right button builder for a payload of unknown style - the counterpart to each
 * builder's own `from`, for when you don't know up front which of the three you're holding.
 */
export function ResolveButton(button: Button): AnyButtonBuilder {
	switch (button.style) {
		case ButtonStyles.LINK: return LinkButtonBuilder.from(button);
		case ButtonStyles.PREMIUM: return SKUButtonBuilder.from(button);
		default: return ButtonBuilder.from(button);
	}
}

/**
 * Validates a button payload of unknown style against Discord's constraints, dispatching to the
 * matching builder's static `validate`. Works on builders and plain objects alike.
 */
export function ValidateButton(button: Button): void {
	switch (button.style) {
		case ButtonStyles.LINK: return LinkButtonBuilder.validate(button);
		case ButtonStyles.PREMIUM: return SKUButtonBuilder.validate(button);
		default: return ButtonBuilder.validate(button);
	}
}
