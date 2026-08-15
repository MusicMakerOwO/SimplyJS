import {
	DiscordSticker,
	DiscordStickerFormatTypes,
	DiscordStickerTypes
} from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import { User } from "./User.js";
import { Client } from "../Client.js";
import { Guild } from "./Guild.js";

/** A custom guild sticker, or a standard sticker from a purchasable sticker pack. */
export class Sticker extends APIGuildStructure<DiscordSticker> {
	id!: string
	/** Sticker pack id for standard stickers, when present */
	packId?: string
	/** Sticker display name */
	name!: string
	/** Sticker description, or `null` when omitted */
	description?: string | null
	/** Comma-separated autocomplete tags used for discovery */
	tags!: string
	/** Sticker type (standard or guild) */
	type!: ObjectValues<typeof DiscordStickerTypes>
	/** Sticker file format type */
	formatType!: ObjectValues<typeof DiscordStickerFormatTypes>
	/** Whether this sticker is currently available for use */
	available?: boolean
	/** Guild id that owns this sticker */
	guildId?: string
	/** User who uploaded the sticker, when included by the API */
	user?: User
	/** Sorting hint value used by Discord clients */
	sortValue?: number

	constructor(client: Client, guild: Guild, data: DiscordSticker) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordSticker): void {
		this.id = data.id;
		this.name = data.name;
		this.tags = data.tags;
		this.type = data.type;
		this.formatType = data.format_type;

		if ('pack_id' in data && data.pack_id !== undefined) {
			this.packId = data.pack_id;
		}

		if ('description' in data && data.description !== undefined) {
			this.description = data.description;
		}

		if ('available' in data && data.available !== undefined) {
			this.available = data.available;
		}

		if ('guild_id' in data && data.guild_id !== undefined) {
			this.guildId = data.guild_id;
		}

		if ('user' in data && data.user !== undefined) {
			this.user = this.client.users.upsert(data.user);
		}

		if ('sort_value' in data && data.sort_value !== undefined) {
			this.sortValue = data.sort_value;
		}
	}

	/** Attempt to delete the sticker, might fail due to permissions */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/stickers/${this.id}`);
	}

	/** Attempt to modify the sticker, might fail due to permissions */
	async modify(options: {
		name?: string,
		description?: string,
		/**
		 * Related tags for the sticker. Can be supplied as a `string[]` for convenience;
		 * the array will be joined into a comma-separated string before being sent to the API.
		 */
		tags?: string | string[]
	}): Promise<void> {
		const payload: typeof options = { ...options };
		if (Array.isArray(payload.tags)) payload.tags = payload.tags.join(',');
		await this.client.rest.patch(`/guilds/${this.guild.id}/stickers/${this.id}`, payload)
	}
}