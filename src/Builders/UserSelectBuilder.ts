import { ComponentTypes, UserSelect } from "../Types/Components.js";
import { omitUndefined } from "./BaseSelectBuilder.js";
import { EntitySelectBuilder, validateEntitySelectShape } from "./EntitySelectBuilder.js";

/** Fluent builder for a select menu that picks from a server's users, validating limits as they're set. */
export class UserSelectBuilder extends EntitySelectBuilder<typeof ComponentTypes.USER_SELECT> {
	/**
	 * Creates a builder from an existing user select payload
	 */
	static from(value: UserSelect): UserSelectBuilder {
		const select = new UserSelectBuilder();

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
	 * Validates a user select payload against Discord's constraints
	 */
	static validate(select: UserSelect): void {
		validateEntitySelectShape(
			{
				customId: select.custom_id,
				placeholder: select.placeholder,
				minValues: select.min_values,
				maxValues: select.max_values,
				defaultValues: select.default_values
			},
			"User select"
		);
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

	/**
	 * Serializes this builder into the raw {@link UserSelect} payload Discord expects
	 */
	toJSON(): UserSelect {
		return omitUndefined<UserSelect>({
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
