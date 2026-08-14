import { ActionRow, ActionRowChild, ComponentTypes } from "../Types/Components.js";
import { ChannelSelectBuilder } from "./ChannelSelectBuilder.js";
import { MentionableSelectBuilder } from "./MentionableSelectBuilder.js";
import { ValidateButton } from "./ResolveButton.js";
import { RoleSelectBuilder } from "./RoleSelectBuilder.js";
import { StringSelectBuilder } from "./StringSelectBuilder.js";
import { UserSelectBuilder } from "./UserSelectBuilder.js";

const MAX_BUTTONS = 5;

/**
 * Anything that can be nested inside an {@link ActionRowBuilder} - a raw {@link ActionRowChild}
 * payload or any of the matching builders, which are assignable to it.
 *
 * @deprecated Prefer {@link ActionRowChild} directly - this alias only exists for the previous
 * builder-only spelling and resolves to the same type.
 */
export type ActionRowComponent = ActionRowChild;

/** Dispatches a child to the right static `validate`, which works for builders and raw payloads alike */
function validateActionRowChild(component: ActionRowChild): void {
	switch (component.type) {
		case ComponentTypes.BUTTON: return ValidateButton(component);
		case ComponentTypes.STRING_SELECT: return StringSelectBuilder.validate(component);
		case ComponentTypes.USER_SELECT: return UserSelectBuilder.validate(component);
		case ComponentTypes.ROLE_SELECT: return RoleSelectBuilder.validate(component);
		case ComponentTypes.MENTIONABLE_SELECT: return MentionableSelectBuilder.validate(component);
		case ComponentTypes.CHANNEL_SELECT: return ChannelSelectBuilder.validate(component);
	}
}

function isSelectComponent(component: ActionRowChild): boolean {
	return component.type !== ComponentTypes.BUTTON;
}

/** Runtime checks shared by `ActionRowBuilder#validate` and the static `ActionRowBuilder.validate` */
function validateActionRowShape(components: ActionRowChild[]): void {
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

	for (const component of components) validateActionRowChild(component);
}

/**
 * Fluent builder for an action row - a container holding up to 5 buttons, or a single select
 * menu. The builder *is* an {@link ActionRow} payload, and its children are typed as payloads
 * too, so builders and plain objects can be mixed freely:
 *
 * ```ts
 * new ActionRowBuilder().addComponents(
 *     new ButtonBuilder().setStyle(ButtonStyles.DANGER).setLabel("Red").setCustomId("red"),
 *     { type: ComponentTypes.BUTTON, style: ButtonStyles.PRIMARY, label: "Blue", custom_id: "blue" }
 * );
 * ```
 *
 * Narrow the generic to restrict `addComponents` to one kind of component (e.g.
 * `new ActionRowBuilder<Button>()`); mixing is also rejected at runtime by `validate()`.
 */
export class ActionRowBuilder<T extends ActionRowChild = ActionRowChild> implements ActionRow {
	/**
	 * Creates a builder from an existing list of components
	 */
	static from<T extends ActionRowChild = ActionRowChild>(components: T[]): ActionRowBuilder<T> {
		return new ActionRowBuilder<T>().setComponents(components);
	}

	/**
	 * Validates an action row's components against Discord's constraints
	 */
	static validate(row: ActionRow | ActionRowChild[]): void {
		validateActionRowShape(Array.isArray(row) ? row : row.components);
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
