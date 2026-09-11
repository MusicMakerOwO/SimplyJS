import { GuildScheduledEvent } from "../Structures/GuildScheduledEvent.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import {
	DiscordGuildScheduledEvent,
	DiscordGuildScheduledEventEntityMetadata,
	DiscordGuildScheduledEventEntityTypes,
	DiscordGuildScheduledEventPrivacyLevel,
	DiscordGuildScheduledEventRecurrenceRule
} from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { ImageInput, JSONObject } from "../Types/index.js";
import { EncodeImage } from "../Utils.js";

/**
 * Cache of a single guild's {@link GuildScheduledEvent}s.
 *
 * Discord sends the guild's existing scheduled events in the `GUILD_CREATE` payload, so this cache
 * is populated on connect and then kept current by gateway events. {@link GuildScheduledEventCache.fetchAll}
 * is only needed to pick up user counts or to refresh after a gap in the gateway connection.
 */
export class GuildScheduledEventCache extends GuildScopedCache<string, GuildScheduledEvent, DiscordGuildScheduledEvent> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordGuildScheduledEvent): GuildScheduledEvent {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new GuildScheduledEvent(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<GuildScheduledEvent> {
		const fetched = await this.client.rest.get<DiscordGuildScheduledEvent>(`/guilds/${this.guild.id}/scheduled-events/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Fetches every scheduled event in this guild and caches them.
	 * @see https://docs.discord.com/developers/resources/guild-scheduled-event#list-scheduled-events-for-guild
	 */
	async fetchAll(): Promise<GuildScheduledEvent[]> {
		const fetched = await this.client.rest.get<DiscordGuildScheduledEvent[]>(`/guilds/${this.guild.id}/scheduled-events`);
		return fetched.map(event => this.upsert(event));
	}

	/**
	 * Creates a scheduled event in this guild.
	 * Requires the `MANAGE_EVENTS` permission and will error otherwise.
	 *
	 * `EXTERNAL` events take no `channelId` and require both `entityMetadata.location` and
	 * `scheduledEndTime`; `STAGE_INSTANCE` and `VOICE` events require `channelId` instead.
	 * @param data The event data to send to Discord
	 * @see https://docs.discord.com/developers/resources/guild-scheduled-event#create-guild-scheduled-event
	 */
	async create(data: {
		/** The event name */
		name: string
		/** Channel the event will be hosted in, omitted for `EXTERNAL` events */
		channelId?: string
		/** Extra data for the event, carrying the `location` of `EXTERNAL` events */
		entityMetadata?: DiscordGuildScheduledEventEntityMetadata
		/** Who can see the event */
		privacyLevel: ObjectValues<typeof DiscordGuildScheduledEventPrivacyLevel>
		/** When the event will start */
		scheduledStartTime: string
		/** When the event will end, required for `EXTERNAL` events */
		scheduledEndTime?: string
		/** The event description */
		description?: string
		/** Where the event is hosted */
		entityType: ObjectValues<typeof DiscordGuildScheduledEventEntityTypes>
		/** Cover image for the event, as file bytes or a data URI */
		image?: ImageInput
		/** How often the event should repeat */
		recurrenceRule?: DiscordGuildScheduledEventRecurrenceRule
	}): Promise<GuildScheduledEvent> {
		const { channelId, entityMetadata, privacyLevel, scheduledStartTime, scheduledEndTime, entityType, recurrenceRule, image, ...rest } = data;
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

		const eventData = await this.client.rest.post<DiscordGuildScheduledEvent>(`/guilds/${this.guild.id}/scheduled-events`, payload as unknown as JSONObject);
		return this.upsert(eventData);
	}
}
