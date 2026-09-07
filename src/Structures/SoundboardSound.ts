import { Client } from "../Client.js";
import { DiscordSoundboardSound } from "../Types/DiscordAPITypes.js";
import { User } from "./User.js";
import { Emoji } from "./Emoji.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { JSONObject } from "../Types/Internal.js";

/**
 * A sound in a guild's soundboard, playable by members sitting in a voice channel.
 *
 * Unlike every other guild expression, the primary key here is {@link SoundboardSound.soundId}
 * rather than `id`, mirroring Discord's `sound_id` wire field.
 *
 * A sound's icon is either a custom emoji ({@link SoundboardSound.emojiId} set) or a standard
 * unicode one ({@link SoundboardSound.emojiName} set); both are `null` when the sound has no icon.
 *
 * @see https://docs.discord.com/developers/resources/soundboard#soundboard-sound-object
 */
export class SoundboardSound extends APIGuildStructure<DiscordSoundboardSound> {
	/** Id of this sound */
	soundId!: string;
	/** The sound's name */
	name!: string;
	/** Playback volume, from 0 to 1 */
	volume!: number;
	/** Id of this sound's custom emoji, `null` when it uses a standard emoji or none at all */
	emojiId!: string | null;
	/** The unicode character of this sound's standard emoji, `null` when it uses a custom emoji or none at all */
	emojiName!: string | null;
	/** Whether this sound can be used, may be false after a loss of Server Boosts */
	available!: boolean;
	/** Id of the guild this sound belongs to */
	guildId!: string;
	/** The user who created this sound, only sent with the `MANAGE_GUILD_EXPRESSIONS` permission */
	user?: User;

	constructor(client: Client, guild: Guild, data: DiscordSoundboardSound) {
		super(client, guild);
		this.guildId = guild.id;
		this.patch(data);
	}

	patch(data: DiscordSoundboardSound): void {
		this.soundId = data.sound_id;
		this.name = data.name;
		this.volume = data.volume;
		this.emojiId = data.emoji_id;
		this.emojiName = data.emoji_name;
		this.available = data.available;

		if ("user" in data && data.user !== undefined) {
			this.user = this.client.users.upsert(data.user);
		}
	}

	/**
	 * This sound's custom emoji, `undefined` when the sound uses a standard unicode emoji (read
	 * {@link SoundboardSound.emojiName} instead), has no emoji at all, or the emoji is not cached.
	 */
	get emoji(): Emoji | undefined {
		if (this.emojiId === null) return undefined;
		return this.guild.emojis.get(this.emojiId);
	}

	/**
	 * Modifies this sound. Requires the `MANAGE_GUILD_EXPRESSIONS` permission, or
	 * `CREATE_GUILD_EXPRESSIONS` when the bot created the sound itself.
	 *
	 * Only the fields you pass are sent. Pass `null` for `emojiId` or `emojiName` to clear the
	 * sound's icon.
	 *
	 * @param changes The fields to update; all are optional.
	 * @see https://docs.discord.com/developers/resources/soundboard#modify-guild-soundboard-sound
	 */
	async modify(changes: {
		/** New name for the sound */
		name?: string;
		/** New playback volume, from 0 to 1 */
		volume?: number | null;
		/** Id of a custom emoji to use as the icon, or `null` to clear it */
		emojiId?: string | null;
		/** Unicode character of a standard emoji to use as the icon, or `null` to clear it */
		emojiName?: string | null;
	}): Promise<void> {
		const body: JSONObject = {};

		if ("name" in changes && changes.name !== undefined) body.name = changes.name;
		if ("volume" in changes && changes.volume !== undefined) body.volume = changes.volume;
		if ("emojiId" in changes && changes.emojiId !== undefined) body.emoji_id = changes.emojiId;
		if ("emojiName" in changes && changes.emojiName !== undefined) body.emoji_name = changes.emojiName;

		await this.client.rest.patch(`/guilds/${this.guildId}/soundboard-sounds/${this.soundId}`, body);
	}

	/**
	 * Deletes this sound. Requires the `MANAGE_GUILD_EXPRESSIONS` permission, or
	 * `CREATE_GUILD_EXPRESSIONS` when the bot created the sound itself.
	 *
	 * @see https://docs.discord.com/developers/resources/soundboard#delete-guild-soundboard-sound
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guildId}/soundboard-sounds/${this.soundId}`);
	}
}
