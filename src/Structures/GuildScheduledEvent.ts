import { Client } from "../Client.js";
import {
	DiscordGuildScheduledEvent,
	DiscordGuildScheduledEventEntityMetadata,
	DiscordGuildScheduledEventEntityTypes,
	DiscordGuildScheduledEventPrivacyLevel,
	DiscordGuildScheduledEventRecurrenceRule,
	DiscordGuildScheduledEventStatus,
	DiscordUser
} from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { ImageInput, JSONObject } from "../Types/index.js";
import { EncodeImage } from "../Utils.js";

/**
 * An event scheduled in a guild, such as a stage, voice, or external meetup.
 */
export class GuildScheduledEvent extends APIGuildStructure<DiscordGuildScheduledEvent> {
	id!: string
	/** Id of the guild this event belongs to */
	guildId!: string
	/** Channel the event will be hosted in, `null` when `entityType` is `EXTERNAL` */
	channelId!: string | null
	/** The event name */
	name!: string
	/** When the event will start */
	scheduledStartTime!: string
	/** When the event will end, `null` unless the event is `EXTERNAL` or has ended */
	scheduledEndTime!: string | null
	/** Who can see the event; Discord only supports guild members today */
	privacyLevel!: ObjectValues<typeof DiscordGuildScheduledEventPrivacyLevel>
	/** Where the event is hosted, and therefore which of `channelId` / `entityMetadata` applies */
	entityType!: ObjectValues<typeof DiscordGuildScheduledEventEntityTypes>
	/** Current lifecycle state of the event */
	status!: ObjectValues<typeof DiscordGuildScheduledEventStatus>
	/** Id of the stage instance or other entity backing the event */
	entityId!: string | null
	/** Extra data for the event, carrying the `location` of `EXTERNAL` events */
	entityMetadata!: DiscordGuildScheduledEventEntityMetadata | null
	/** How often the event repeats, `null` for one-off events */
	recurrenceRule!: DiscordGuildScheduledEventRecurrenceRule | null
	/** Id of the user who created the event, `null` for events made before October 25th 2021 */
	creatorId?: string | null
	/** The user who created the event, absent for events made before October 25th 2021 */
	creator?: DiscordUser
	/** The event description */
	description?: string | null
	/** Cover image hash for the event */
	image?: string | null
	/** Number of users subscribed to the event, only present when fetched with `with_user_count` */
	userCount?: number

	constructor(client: Client, guild: Guild, data: DiscordGuildScheduledEvent) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordGuildScheduledEvent): void {
		this.id = data.id;
		this.guildId = data.guild_id;
		this.channelId = data.channel_id;
		this.name = data.name;
		this.scheduledStartTime = data.scheduled_start_time;
		this.scheduledEndTime = data.scheduled_end_time;
		this.privacyLevel = data.privacy_level;
		this.entityType = data.entity_type;
		this.status = data.status;
		this.entityId = data.entity_id;
		this.entityMetadata = data.entity_metadata;
		this.recurrenceRule = data.recurrence_rule;

		if ("creator_id" in data && data.creator_id !== undefined) this.creatorId = data.creator_id;
		if ("creator" in data && data.creator !== undefined) this.creator = data.creator;
		if ("description" in data && data.description !== undefined) this.description = data.description;
		if ("image" in data && data.image !== undefined) this.image = data.image;
		if ("user_count" in data && data.user_count !== undefined) this.userCount = data.user_count;
	}

	/**
	 * Modifies this scheduled event. Requires the `MANAGE_EVENTS` permission and will error otherwise.
	 *
	 * Changing `entityType` to `EXTERNAL` requires `channelId` to be sent as `null`, and both
	 * `entityMetadata` (with a `location`) and `scheduledEndTime` to be set. Starting or cancelling
	 * an event is done through `status`, which can only move forwards through the lifecycle.
	 * @param changes The fields to update; any omitted field is left untouched.
	 * @see https://docs.discord.com/developers/resources/guild-scheduled-event#modify-guild-scheduled-event
	 */
	async modify(changes: {
		/** Channel the event should be hosted in, or `null` when moving the event to `EXTERNAL` */
		channelId?: string | null
		/** Extra data for the event, carrying the `location` of `EXTERNAL` events */
		entityMetadata?: DiscordGuildScheduledEventEntityMetadata | null
		/** New name for the event */
		name?: string
		/** Who can see the event */
		privacyLevel?: ObjectValues<typeof DiscordGuildScheduledEventPrivacyLevel>
		/** When the event should start */
		scheduledStartTime?: string
		/** When the event should end, required when moving the event to `EXTERNAL` */
		scheduledEndTime?: string
		/** New description for the event */
		description?: string | null
		/** Where the event is hosted */
		entityType?: ObjectValues<typeof DiscordGuildScheduledEventEntityTypes>
		/** Lifecycle state to move the event to, used to start, complete, or cancel it */
		status?: ObjectValues<typeof DiscordGuildScheduledEventStatus>
		/** Cover image for the event, as file bytes or a data URI */
		image?: ImageInput
		/** How often the event should repeat, or `null` to make it one-off */
		recurrenceRule?: DiscordGuildScheduledEventRecurrenceRule | null
	}): Promise<void> {
		const { channelId, entityMetadata, privacyLevel, scheduledStartTime, scheduledEndTime, entityType, recurrenceRule, image, ...rest } = changes;
		const payload = {
			...rest,
			image: EncodeImage(image),
			channel_id: channelId,
			entity_metadata: entityMetadata,
			privacy_level: privacyLevel,
			scheduled_start_time: scheduledStartTime,
			scheduled_end_time: scheduledEndTime,
			entity_type: entityType,
			recurrence_rule: recurrenceRule
		};
		await this.client.rest.patch(`/guilds/${this.guildId}/scheduled-events/${this.id}`, payload as unknown as JSONObject);
	}

	/**
	 * Deletes this scheduled event. Requires the `MANAGE_EVENTS` permission and will error otherwise.
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guildId}/scheduled-events/${this.id}`);
	}
}
