import { ComponentTypes, Label, LabelChild } from "../Types/Components.js";
import { ChannelSelectBuilder } from "./ChannelSelectBuilder.js";
import { MentionableSelectBuilder } from "./MentionableSelectBuilder.js";
import { RoleSelectBuilder } from "./RoleSelectBuilder.js";
import { StringSelectBuilder } from "./StringSelectBuilder.js";
import { TextInputBuilder } from "./TextInputBuilder.js";
import { UserSelectBuilder } from "./UserSelectBuilder.js";

/**
 * Anything that can be wrapped by a {@link LabelBuilder}, modal-only - a raw {@link LabelChild}
 * payload, or any of the matching component builders (which serialize to one via `toJSON()`).
 */
export type LabelChildBuilder =
	| LabelChild
	| TextInputBuilder
	| StringSelectBuilder
	| UserSelectBuilder
	| RoleSelectBuilder
	| MentionableSelectBuilder
	| ChannelSelectBuilder;

/** Resolves a {@link LabelChildBuilder} (raw payload or builder) down to its raw wire payload */
function resolveLabelChild(component: LabelChildBuilder): LabelChild {
	return "toJSON" in component && typeof component.toJSON === "function"
		? component.toJSON() as LabelChild
		: component as LabelChild;
}

/** Runtime checks of the label/description text, shared by both the raw-payload and builder validation paths */
function validateLabelText(label: { label?: string; description?: string }): void {
	if (!label.label || label.label.length === 0) throw new Error("Label must have a label");
	if (label.label.length > 45) throw new Error(`Label text must be 45 characters or fewer - Received ${label.label.length} characters`);

	if (label.description && label.description.length > 100) {
		throw new Error(`Label description must be 100 characters or fewer - Received ${label.description.length} characters`);
	}
}

/** Builds the appropriate builder for a raw {@link Label}'s `component`, based on its type */
function buildLabelChild(component: LabelChild): LabelChildBuilder {
	switch (component.type) {
		case ComponentTypes.TEXT_INPUT: return TextInputBuilder.from(component);
		case ComponentTypes.STRING_SELECT: return StringSelectBuilder.from(component);
		case ComponentTypes.USER_SELECT: return UserSelectBuilder.from(component);
		case ComponentTypes.ROLE_SELECT: return RoleSelectBuilder.from(component);
		case ComponentTypes.MENTIONABLE_SELECT: return MentionableSelectBuilder.from(component);
		case ComponentTypes.CHANNEL_SELECT: return ChannelSelectBuilder.from(component);
	}
}

/** Validates a raw {@link Label}'s `component` using the appropriate builder's static `validate` */
function validateLabelChild(component: LabelChild): void {
	switch (component.type) {
		case ComponentTypes.TEXT_INPUT: return TextInputBuilder.validate(component);
		case ComponentTypes.STRING_SELECT: return StringSelectBuilder.validate(component);
		case ComponentTypes.USER_SELECT: return UserSelectBuilder.validate(component);
		case ComponentTypes.ROLE_SELECT: return RoleSelectBuilder.validate(component);
		case ComponentTypes.MENTIONABLE_SELECT: return MentionableSelectBuilder.validate(component);
		case ComponentTypes.CHANNEL_SELECT: return ChannelSelectBuilder.validate(component);
	}
}

/**
 * Fluent builder for a modal-only label - associates a label (and optional description) with a
 * single interactive component (text input or select menu). The builder *is* a {@link Label}
 * payload, and `component` is typed as a payload too, so a builder or a plain object both work.
 */
export class LabelBuilder<T extends LabelChildBuilder = LabelChildBuilder> {
	/**
	 * Creates a builder from an existing label payload, inferring the right builder for `component`
	 */
	static from(value: Label): LabelBuilder {
		const label = new LabelBuilder();

		label.setLabel(value.label);
		if (value.description !== undefined) label.setDescription(value.description);
		label.setComponent(buildLabelChild(value.component));

		return label;
	}

	/**
	 * Validates a raw label payload against Discord's constraints
	 */
	static validate(label: Label): void {
		validateLabelText(label);
		validateLabelChild(label.component);
	}

	readonly type = ComponentTypes.LABEL;
	/** Label text, max 45 characters - only populated once set, see {@link LabelBuilder#validate} */
	label!: string;
	/** Additional description text, max 100 characters */
	description?: string;
	/** The component this label describes - only populated once set, see {@link LabelBuilder#validate} */
	component!: T;

	/**
	 * Sets the label's text
	 */
	setLabel(label: string): this {
		if (label.length === 0 || label.length > 45) {
			throw new Error(`Label text must be between 1 and 45 characters long - Received ${label.length} characters`);
		}
		this.label = label;
		return this;
	}

	/**
	 * Sets the label's description
	 */
	setDescription(description: string): this {
		if (description.length > 100) {
			throw new Error(`Label description must be 100 characters or fewer - Received ${description.length} characters`);
		}
		this.description = description;
		return this;
	}

	/**
	 * Sets the component this label describes
	 */
	setComponent(component: T): this {
		this.component = component;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateLabelText(this);
		if (!this.component) throw new Error("Label must have a component");
		validateLabelChild(resolveLabelChild(this.component));
	}

	/**
	 * Serializes this builder to the raw {@link Label} payload sent to Discord
	 */
	toJSON(): Label {
		const payload: Label = {
			type: this.type,
			label: this.label,
			component: resolveLabelChild(this.component),
		};
		if (this.description !== undefined) payload.description = this.description;
		return payload;
	}
}
