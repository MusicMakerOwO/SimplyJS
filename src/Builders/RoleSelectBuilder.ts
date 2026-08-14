import { ComponentTypes, RoleSelect } from "../Types/Components.js";
import { omitUndefined } from "./BaseSelectBuilder.js";
import { EntitySelectBuilder, validateEntitySelectShape } from "./EntitySelectBuilder.js";

/** Fluent builder for a select menu that picks from a server's roles, validating limits as they're set. */
export class RoleSelectBuilder extends EntitySelectBuilder<typeof ComponentTypes.ROLE_SELECT> {
	/**
	 * Creates a builder from an existing role select payload
	 */
	static from(value: RoleSelect): RoleSelectBuilder {
		const select = new RoleSelectBuilder();

		select.setCustomId(value.custom_id);
		if (value.placeholder !== undefined) select.setPlaceholder(value.placeholder);
		if (value.min_values !== undefined) select.setMinValues(value.min_values);
		if (value.max_values !== undefined) select.setMaxValues(value.max_values);
		if (value.required !== undefined) select.setRequired(value.required);
		if (value.disabled !== undefined) select.setDisabled(value.disabled);
		if (value.default_values) select.setDefaultValues(value.default_values);

		return select;
	}

	/**
	 * Validates a role select payload against Discord's constraints
	 */
	static validate(select: RoleSelect): void {
		validateEntitySelectShape(
			{
				customId: select.custom_id,
				placeholder: select.placeholder,
				minValues: select.min_values,
				maxValues: select.max_values,
				defaultValues: select.default_values
			},
			"Role select"
		);
	}

	readonly type = ComponentTypes.ROLE_SELECT;
	protected readonly selectLabel = "Role select";

	/**
	 * Appends pre-filled roles by id
	 */
	addDefaultRoles(...roleIds: string[]): this {
		return this.addDefaultValues(...roleIds.map(id => ({ id, type: "role" as const })));
	}

	validate(): void {
		validateEntitySelectShape(this, this.selectLabel);
	}

	/**
	 * Serializes this builder into the raw {@link RoleSelect} payload Discord expects
	 */
	toJSON(): RoleSelect {
		return omitUndefined<RoleSelect>({
			type: this.type,
			custom_id: this.customId,
			placeholder: this.placeholder,
			min_values: this.minValues,
			max_values: this.maxValues,
			required: this.required,
			disabled: this.disabled,
			default_values: this.defaultValues
		});
	}
}
