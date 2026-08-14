import { Client } from "../../Client.js";
import { DiscordChannel, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { ObjectValues } from "../../Types/HelperTypes.js";
import { APIGuildStructure } from "../../Contracts/DiscordStructure.js";
import { Guild } from "../Guild.js";
import { GuildTextChannel } from "./GuildTextChannel.js";
import { GuildThreadChannel } from "./GuildThreadChannel.js";
import { GuildAnnouncementChannel } from "./GuildAnnouncementChannel.js";
import { GuildStageChannel } from "./GuildStageChannel.js";
import { GuildVoiceChannel } from "./GuildVoiceChannel.js";
import { GuildCategoryChannel } from "./GuildCategoryChannel.js";

/**
 * Base class for all guild channel types (text, voice, category, forum, thread, stage,
 * announcement). Holds the properties and behavior common to every channel; concrete
 * subclasses add their own type-specific properties and narrow `modify()`'s option shape.
 *
 * @see https://docs.discord.com/developers/resources/channel#channel-object
 */
export class BaseChannel extends APIGuildStructure<DiscordChannel> {
	id!: string
	type!: ObjectValues<typeof DiscordChannelTypes>
	name?: string | null
	/** Channel flags bitfield (e.g. `PINNED`, `REQUIRE_TAG`) */
	flags?: number
	guildId?: string

	constructor(client: Client, guild: Guild, data: DiscordChannel) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordChannel): void {
		this.id = data.id;
		this.type = data.type;
		if (data.name !== undefined) this.name = data.name;
		if (data.flags !== undefined) this.flags = data.flags;
		if (data.guild_id !== undefined) this.guildId = data.guild_id;
	}

	/**
	 * Tests if the current channel is a text or announcements channel
	 */
	isTextChannel(): this is GuildTextChannel | GuildAnnouncementChannel {
		return this.type === DiscordChannelTypes.GUILD_TEXT ||
			   this.type === DiscordChannelTypes.GUILD_ANNOUNCEMENT;
	}

	/**
	 * Tests if the current channel is a voice or stage channel
	 */
	isVoiceChannel(): this is GuildVoiceChannel | GuildStageChannel {
		return this.type === DiscordChannelTypes.GUILD_VOICE ||
			   this.type === DiscordChannelTypes.GUILD_STAGE_VOICE;
	}

	/**
	 * Tests if the current channel is a category
	 */
	isCategoryChannel(): this is GuildCategoryChannel {
		return this.type === DiscordChannelTypes.GUILD_CATEGORY;
	}

	/**
	 * Tests if the current channel is a thread (could be public, private, or announcements - check `Channel.type` for more precission)
	 */
	isThreadChannel(): this is GuildThreadChannel {
		return this.type === DiscordChannelTypes.PUBLIC_THREAD ||
			   this.type === DiscordChannelTypes.PRIVATE_THREAD ||
			   this.type === DiscordChannelTypes.ANNOUNCEMENT_THREAD;
	}

	/**
	 * Deletes this channel, or archives it if it's a thread. Requires the `MANAGE_CHANNELS`
	 * permission (`MANAGE_THREADS` for threads).
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/channels/${this.id}`);
	}

	/**
	 * Sends a `PATCH` to update this channel's settings. Requires the `MANAGE_CHANNELS`
	 * permission (`MANAGE_THREADS` for threads).
	 *
	 * This base implementation just forwards whatever payload it's given — it exists so every
	 * concrete channel's `modify()` has a single shared REST call to delegate to. Each concrete
	 * channel class (`GuildTextChannel`, `GuildVoiceChannel`, `GuildForumChannel`,
	 * `GuildThreadChannel`, `GuildCategoryChannel`, `GuildStageChannel`,
	 * `GuildAnnouncementChannel`) overrides `modify()` with a narrower, type-specific options
	 * object appropriate to that channel type, then calls this method to perform the request.
	 * @param options The fields to change; omitted fields are left untouched.
	 */
	async modify(options: Partial<DiscordChannel>): Promise<void> {
		await this.client.rest.patch(`/channels/${this.id}`, options);
	}
}