import { ComponentTypes, RoleSelect } from "../Types/Components.js";
import { EntitySelectBuilder, validateEntitySelectShape } from "./EntitySelectBuilder.js";

/**
 * Fluent builder for a select menu that picks from a server's roles, validating limits as they're
 * set. The builder *is* a {@link RoleSelect} payload, so it can be sent as-is.
 */
export class RoleSelectBuilder extends EntitySelectBuilder<typeof ComponentTypes.ROLE_SELECT> implements RoleSelect {
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
		validateEntitySelectShape(select, "Role select");
	}

	readonly type = ComponentTypes.ROLE_SELECT;
	protected get selectLabel(): string { return "Role select"; }

	/**
	 * Appends pre-filled roles by id
	 */
	addDefaultRoles(...roleIds: string[]): this {
		return this.addDefaultValues(...roleIds.map(id => ({ id, type: "role" as const })));
	}

	validate(): void {
		validateEntitySelectShape(this, this.selectLabel);
	}
}
