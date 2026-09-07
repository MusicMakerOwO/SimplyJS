import { ComponentType } from "../Types/Components.js";

/** Runtime checks of a component's optional `id`, shared by every component builder's validation paths */
export function validateComponentId(component: { id?: number | undefined }): void {
	if (component.id === undefined) return;

	if (!Number.isInteger(component.id)) throw new Error(`Component id must be an integer - Received ${component.id}`);
	if (component.id < 0 || component.id > 0xffffffff) throw new Error(`Component id must be a 32-bit integer - Received ${component.id}`);
}

/**
 * Base class for component builders, carrying the optional `id` every component shares. Subclasses
 * declare their own `type` and are themselves valid payloads, so they can be sent as-is.
 */
export abstract class ComponentBuilder<TType extends ComponentType> {
	abstract readonly type: TType;
	/** 32-bit integer identifier, unique per message/modal - sending `0` is treated as empty and auto-populated by Discord */
	id?: number;

	/**
	 * Sets the component's id, used to target the component when editing a message
	 */
	setId(id: number): this {
		validateComponentId({ id });
		this.id = id;
		return this;
	}
}
