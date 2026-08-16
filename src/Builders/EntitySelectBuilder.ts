import { ComponentType, SelectDefaultValue } from "../Types/Components.js";
import { BaseSelectBuilder, validateBaseSelectShape } from "./BaseSelectBuilder.js";

/** Runtime checks shared by every entity select builder's `validate`/static `validate` */
export function validateEntitySelectShape(
	select: {
		custom_id?: string | undefined;
		placeholder?: string | undefined;
		min_values?: number | undefined;
		max_values?: number | undefined;
		default_values?: SelectDefaultValue[] | undefined;
	},
	label: string
): void {
	validateBaseSelectShape(select, label);

	const maxValues = select.max_values ?? 1;
	if (select.default_values && select.default_values.length > maxValues) {
		throw new Error(`${label} cannot have more defaultValues than maxValues`);
	}
}

/**
 * Shared fields/setters for select menus that pick from server-provided entities
 * (user/role/mentionable/channel select) - string select is excluded since it has
 * developer-defined `options` instead of `default_values`.
 */
export abstract class EntitySelectBuilder<TType extends ComponentType> extends BaseSelectBuilder<TType> {
	/** Pre-filled entries, count must fall within min_values/max_values */
	default_values?: SelectDefaultValue[];

	/**
	 * Replaces the select's pre-filled default entries
	 */
	setDefaultValues(values: SelectDefaultValue[]): this {
		this.default_values = values;
		return this;
	}

	/**
	 * Appends pre-filled default entries to the existing list
	 */
	addDefaultValues(...values: SelectDefaultValue[]): this {
		this.default_values ??= [];
		this.default_values.push(...values);
		return this;
	}
}
