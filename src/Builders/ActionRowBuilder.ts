import { ComponentTypes } from "../Types/Components.js";
import { ButtonBuilder } from "./ButtonBuilder.js";
import { ChannelSelectBuilder } from "./ChannelSelectBuilder.js";
import { MentionableSelectBuilder } from "./MentionableSelectBuilder.js";
import { RoleSelectBuilder } from "./RoleSelectBuilder.js";
import { SKUButtonBuilder } from "./SKUButtonBuilder.js";
import { StringSelectBuilder } from "./StringSelectBuilder.js";
import { UserSelectBuilder } from "./UserSelectBuilder.js";

const MAX_BUTTONS = 5;

/** Any builder that can be nested inside an {@link ActionRowBuilder}. */
export type ActionRowComponent =
	| ButtonBuilder
	| SKUButtonBuilder
	| StringSelectBuilder
	| UserSelectBuilder
	| RoleSelectBuilder
	| MentionableSelectBuilder
	| ChannelSelectBuilder;

function isSelectComponent(component: ActionRowComponent): boolean {
	return component.type !== ComponentTypes.BUTTON;
}

/** Runtime checks shared by `ActionRowBuilder#validate` and the static `ActionRowBuilder.validate` */
function validateActionRowShape(components: ActionRowComponent[]): void {
	if (components.length === 0) throw new Error("Action row must have at least 1 component");

	const selects = components.filter(isSelectComponent);
	const buttons = components.filter(component => !isSelectComponent(component));

	if (selects.length > 0 && buttons.length > 0) {
		throw new Error("Action row cannot mix a select menu with buttons");
	}

	if (selects.length > 1) {
		throw new Error("Action row can only contain 1 select menu");
	}

	if (buttons.length > MAX_BUTTONS) {
		throw new Error(`Action row cannot have more than ${MAX_BUTTONS} buttons`);
	}

	for (const component of components) component.validate();
}

/**
 * Fluent builder for an action row - a container holding up to 5 buttons, or a single select
 * menu. Type the row with the generic to restrict `addComponents` to one kind of component
 * (e.g. `new ActionRowBuilder<ButtonBuilder>()`); mixing is also rejected at runtime by `validate()`.
 */
export class ActionRowBuilder<T extends ActionRowComponent = ActionRowComponent> {
	/**
	 * Creates a builder from an existing list of component builders
	 */
	static from<T extends ActionRowComponent = ActionRowComponent>(components: T[]): ActionRowBuilder<T> {
		return new ActionRowBuilder<T>().setComponents(components);
	}

	/**
	 * Validates an action row's components against Discord's constraints
	 */
	static validate(components: ActionRowComponent[]): void {
		validateActionRowShape(components);
	}

	readonly type = ComponentTypes.ACTION_ROW;
	/** Up to 5 buttons, or a single select menu */
	components: T[] = [];

	/**
	 * Appends components to the row
	 */
	addComponents(...components: T[]): this {
		this.components.push(...components);
		return this;
	}

	/**
	 * Replaces the row's component list
	 */
	setComponents(components: T[]): this {
		this.components = components;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateActionRowShape(this.components);
	}
}
