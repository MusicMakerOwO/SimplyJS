import { ComponentTypes, Label, LabelChild, ModalComponent } from "../Types/Components.js";
import { InteractionCallbackModal } from "../Types/Interactions.js";
import { LabelBuilder } from "./LabelBuilder.js";

const MAX_COMPONENTS = 5;

/** Narrows a modal component to a `Label`, rejecting the legacy action-row wrapping this builder doesn't support */
function assertLabelComponent(component: ModalComponent): Label {
	if (component.type !== ComponentTypes.LABEL) {
		throw new Error("ModalBuilder only supports Label-wrapped fields, not action rows");
	}
	return component;
}

/** Runtime checks shared by `ModalBuilder#validate` and the static `ModalBuilder.validate` */
function validateModalShape(modal: { custom_id?: string | undefined; title?: string | undefined; components?: ModalComponent[] | undefined }): void {
	if (!modal.custom_id || modal.custom_id.length === 0) throw new Error("Modal must have a customId");
	if (modal.custom_id.length > 100) throw new Error(`Modal customId must be 100 characters or fewer - Received ${modal.custom_id.length} characters`);

	if (!modal.title || modal.title.length === 0) throw new Error("Modal must have a title");
	if (modal.title.length > 45) throw new Error(`Modal title must be 45 characters or fewer - Received ${modal.title.length} characters`);

	if (!modal.components || modal.components.length === 0) throw new Error("Modal must have at least 1 component");
	if (modal.components.length > MAX_COMPONENTS) throw new Error(`Modal cannot have more than ${MAX_COMPONENTS} components`);

	for (const component of modal.components) LabelBuilder.validate(assertLabelComponent(component));
}

/**
 * Fluent builder for a modal. Fields are automatically wrapped in a {@link LabelBuilder} - there's
 * no action row to build or manage, unlike a message's buttons/selects.
 *
 * The builder *is* an {@link InteractionCallbackModal} payload - its fields carry their wire names
 * - and its components are typed as payloads, so labels can be builders or plain objects.
 */
export class ModalBuilder implements InteractionCallbackModal {
	/**
	 * Creates a builder from an existing modal payload
	 *
	 * @throws if any top-level component is an `ActionRow` - the legacy way of wrapping modal
	 * fields, which this builder deliberately doesn't support in favor of `Label`
	 */
	static from(value: InteractionCallbackModal): ModalBuilder {
		const modal = new ModalBuilder();

		modal.setCustomId(value.custom_id);
		modal.setTitle(value.title);
		modal.setComponents(value.components.map(component => LabelBuilder.from(assertLabelComponent(component))));

		return modal;
	}

	/**
	 * Validates a modal payload against Discord's constraints
	 */
	static validate(modal: InteractionCallbackModal): void {
		validateModalShape(modal);
	}

	/** Developer-defined identifier, max 100 characters - only populated once set, see {@link ModalBuilder#validate} */
	custom_id!: string;
	/** Title of the modal, max 45 characters - only populated once set, see {@link ModalBuilder#validate} */
	title!: string;
	/** 1-5 fields making up the modal, each wrapped in a label */
	components: Label[] = [];

	/**
	 * Sets the modal's customId
	 */
	setCustomId(customId: string): this {
		if (customId.length === 0 || customId.length > 100) {
			throw new Error(`Modal customId must be between 1 and 100 characters long - Received ${customId.length} characters`);
		}
		this.custom_id = customId;
		return this;
	}

	/**
	 * Sets the modal's title
	 */
	setTitle(title: string): this {
		if (title.length === 0 || title.length > 45) {
			throw new Error(`Modal title must be between 1 and 45 characters long - Received ${title.length} characters`);
		}
		this.title = title;
		return this;
	}

	/**
	 * Replaces the modal's field list, each already wrapped in a label
	 */
	setComponents(components: Label[]): this {
		this.components = components;
		return this;
	}

	/**
	 * Appends a field, wrapping `component` in a {@link LabelBuilder} automatically
	 */
	addField(labelText: string, component: LabelChild, config?: { description?: string }): this {
		const label = new LabelBuilder().setLabel(labelText).setComponent(component);
		if (config?.description !== undefined) label.setDescription(config.description);

		this.components.push(label);
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateModalShape(this);
	}
}
