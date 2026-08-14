import { DiscordChannelTypes } from "../Types/DiscordAPITypes.js";
import { ChannelSelect, ComponentTypes } from "../Types/Components.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { omitUndefined } from "./BaseSelectBuilder.js";
import { EntitySelectBuilder, validateEntitySelectShape } from "./EntitySelectBuilder.js";

/** Fluent builder for a select menu that picks from a server's channels, validating limits as they're set. */
export class ChannelSelectBuilder extends EntitySelectBuilder<typeof ComponentTypes.CHANNEL_SELECT> {
	/**
	 * Creates a builder from an existing channel select payload
	 */
	static from(value: ChannelSelect): ChannelSelectBuilder {
		const select = new ChannelSelectBuilder();

		select.setCustomId(value.custom_id);
		if (value.placeholder !== undefined) select.setPlaceholder(value.placeholder);
		if (value.min_values !== undefined) select.setMinValues(value.min_values);
		if (value.max_values !== undefined) select.setMaxValues(value.max_values);
		if (value.required !== undefined) select.setRequired(value.required);
		if (value.disabled !== undefined) select.setDisabled(value.disabled);
		if (value.default_values) select.setDefaultValues(value.default_values);
		if (value.channel_types) select.setChannelTypes(...value.channel_types);

		return select;
	}

	/**
	 * Validates a channel select payload against Discord's constraints
	 */
	static validate(select: ChannelSelect): void {
		validateEntitySelectShape(
			{
				customId: select.custom_id,
				placeholder: select.placeholder,
				minValues: select.min_values,
				maxValues: select.max_values,
				defaultValues: select.default_values
			},
			"Channel select"
		);
	}

	readonly type = ComponentTypes.CHANNEL_SELECT;
	protected readonly selectLabel = "Channel select";
	/** Restricts the channel types shown in the picker */
	channelTypes?: ObjectValues<typeof DiscordChannelTypes>[];

	/**
	 * Restricts the channel types shown in the picker
	 */
	setChannelTypes(...channelTypes: ObjectValues<typeof DiscordChannelTypes>[]): this {
		this.channelTypes = channelTypes;
		return this;
	}

	/**
	 * Appends pre-filled channels by id
	 */
	addDefaultChannels(...channelIds: string[]): this {
		return this.addDefaultValues(...channelIds.map(id => ({ id, type: "channel" as const })));
	}

	validate(): void {
		validateEntitySelectShape(this, this.selectLabel);
	}

	/**
	 * Serializes this builder into the raw {@link ChannelSelect} payload Discord expects
	 */
	toJSON(): ChannelSelect {
		return omitUndefined<ChannelSelect>({
			type: this.type,
			custom_id: this.customId,
			placeholder: this.placeholder,
			min_values: this.minValues,
			max_values: this.maxValues,
			required: this.required,
			disabled: this.disabled,
			default_values: this.defaultValues,
			channel_types: this.channelTypes
		});
	}
}
