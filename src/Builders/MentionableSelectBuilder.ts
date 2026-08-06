import { ComponentTypes, MentionableSelect } from "../Types/Components.js";
import { EntitySelectBuilder, validateEntitySelectShape } from "./EntitySelectBuilder.js";

/** Fluent builder for a select menu that picks from a server's users and roles, validating limits as they're set. */
export class MentionableSelectBuilder extends EntitySelectBuilder<typeof ComponentTypes.MENTIONABLE_SELECT> implements MentionableSelect {
	/**
	 * Creates a builder from an existing mentionable select payload
	 */
	static from(value: MentionableSelect): MentionableSelectBuilder {
		const select = new MentionableSelectBuilder();

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
	 * Validates a mentionable select payload against Discord's constraints
	 */
	static validate(select: MentionableSelect): void {
		validateEntitySelectShape(select, "Mentionable select");
	}

	readonly type = ComponentTypes.MENTIONABLE_SELECT;
	protected readonly selectLabel = "Mentionable select";

	/**
	 * Appends pre-filled users by id
	 */
	addDefaultUsers(...userIds: string[]): this {
		return this.addDefaultValues(...userIds.map(id => ({ id, type: "user" as const })));
	}

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