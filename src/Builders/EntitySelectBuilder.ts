import { ComponentType, SelectDefaultValue } from "../Types/Components.js";
import { BaseSelectBuilder, validateBaseSelectShape } from "./BaseSelectBuilder.js";

/** Runtime checks shared by every entity select builder's `validate`/static `validate` */
export function validateEntitySelectShape(
	select: {
		customId?: string | undefined;
		placeholder?: string | undefined;
		minValues?: number | undefined;
		maxValues?: number | undefined;
		defaultValues?: SelectDefaultValue[] | undefined;
	},
	label: string
): void {
	validateBaseSelectShape(select, label);

	const maxValues = select.maxValues ?? 1;
	if (select.defaultValues && select.defaultValues.length > maxValues) {
		throw new Error(`${label} cannot have more defaultValues than maxValues`);
	}
}

/**
 * Shared fields/setters for select menus that pick from server-provided entities
 * (user/role/mentionable/channel select) - string select is excluded since it has
 * developer-defined `options` instead of `defaultValues`.
 */
export abstract class EntitySelectBuilder<TType extends ComponentType> extends BaseSelectBuilder<TType> {
	/** Pre-filled entries, count must fall within minValues/maxValues */
	defaultValues?: SelectDefaultValue[];

	/**
	 * Replaces the select's pre-filled default entries
	 */
	setDefaultValues(values: SelectDefaultValue[]): this {
		this.defaultValues = values;
		return this;
	}

	/**
	 * Appends pre-filled default entries to the existing list
	 */
	addDefaultValues(...values: SelectDefaultValue[]): this {
		this.defaultValues ??= [];
		this.defaultValues.push(...values);
		return this;
	}
}
