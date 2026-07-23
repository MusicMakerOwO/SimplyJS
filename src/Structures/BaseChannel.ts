import { Client } from "../Client.js";
import { DiscordChannel, DiscordChannelTypes } from "../Types/DiscordAPITypes.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { GuildTextChannel } from "./GuildTextChannel.js";
import { GuildThreadChannel } from "./GuildThreadChannel.js";
import { GuildAnnouncementChannel } from "./GuildAnnouncementChannel.js";
import { GuildStageChannel } from "./GuildStageChannel.js";
import { GuildVoiceChannel } from "./GuildVoiceChannel.js";
import { GuildCategoryChannel } from "./GuildCategoryChannel.js";

export class BaseChannel extends APIGuildStructure<DiscordChannel> {
	id!: string
	type!: ObjectValues<typeof DiscordChannelTypes>
	name?: string | null
	flags?: number
	guild_id?: string

	constructor(client: Client, guild: Guild, data: DiscordChannel) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordChannel): void {
		this.id = data.id;
		this.type = data.type;
		if (data.name !== undefined) this.name = data.name;
		if (data.flags !== undefined) this.flags = data.flags;
		if (data.guild_id !== undefined) this.guild_id = data.guild_id;
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

	async delete(): Promise<void> {
		await this.client.rest.delete(`/channels/${this.id}`);
	}

	// shared internal - concrete classes expose their own typed modify()
	async modify(options: Partial<DiscordChannel>): Promise<void> {
		await this.client.rest.patch(`/channels/${this.id}`, options);
	}
}