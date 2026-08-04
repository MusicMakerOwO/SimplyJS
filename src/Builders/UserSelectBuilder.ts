import { ComponentTypes, UserSelect } from "../Types/Components.js";
import { EntitySelectBuilder, validateEntitySelectShape } from "./EntitySelectBuilder.js";

/** Fluent builder for a select menu that picks from a server's users, validating limits as they're set. */
export class UserSelectBuilder extends EntitySelectBuilder<typeof ComponentTypes.USER_SELECT> {
	/**
	 * Creates a builder from an existing user select payload
	 */
	static from(value: UserSelect): UserSelectBuilder {
		const select = new UserSelectBuilder();

		select.setCustomID(value.custom_id);
		if (value.placeholder !== undefined) select.setPlaceholder(value.placeholder);
		if (value.min_values !== undefined) select.setMinValues(value.min_values);
		if (value.max_values !== undefined) select.setMaxValues(value.max_values);
		if (value.required !== undefined) select.setRequired(value.required);
		if (value.disabled !== undefined) select.setDisabled(value.disabled);
		if (value.default_values) select.setDefaultValues(value.default_values);

		return select;
	}

	/**
	 * Validates a user select payload against Discord's constraints
	 */
	static validate(select: UserSelect): void {
		validateEntitySelectShape(select, "User select");
	}

	readonly type = ComponentTypes.USER_SELECT;
	protected readonly selectLabel = "User select";

	/**
	 * Appends pre-filled users by id
	 */
	addDefaultUsers(...userIds: string[]): this {
		return this.addDefaultValues(...userIds.map(id => ({ id, type: "user" as const })));
	}

	validate(): void {
		validateEntitySelectShape(this, this.selectLabel);
	}
}
