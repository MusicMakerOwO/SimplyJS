import { SoundboardSound } from "../Structures/SoundboardSound.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordSoundboardSound } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { JSONObject } from "../Types/Internal.js";

/** Cache of a single guild's {@link SoundboardSound}s, keyed by `soundId`. */
export class SoundboardSoundCache extends GuildScopedCache<string, SoundboardSound, DiscordSoundboardSound> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordSoundboardSound): SoundboardSound {
		if (this.has(data.sound_id)) {
			this.get(data.sound_id)!.patch(data);
		} else {
			this.set(data.sound_id, new SoundboardSound(this.client, this.guild, data));
		}
		return this.get(data.sound_id)!;
	}

	async fetch(id: string): Promise<SoundboardSound> {
		const fetched = await this.client.rest.get<DiscordSoundboardSound>(`/guilds/${this.guild.id}/soundboard-sounds/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Fetches every soundboard sound in the guild and caches them.
	 *
	 * Note that this endpoint wraps its response in an `items` array rather than returning a bare
	 * list like most other guild collections do.
	 *
	 * @see https://docs.discord.com/developers/resources/soundboard#list-guild-soundboard-sounds
	 */
	async fetchAll(): Promise<SoundboardSound[]> {
		const fetched = await this.client.rest.get<{ items: DiscordSoundboardSound[] }>(`/guilds/${this.guild.id}/soundboard-sounds`);
		return fetched.items.map(sound => this.upsert(sound));
	}

	/**
	 * Creates a new soundboard sound in the guild. Requires the `CREATE_GUILD_EXPRESSIONS`
	 * permission and will error otherwise.
	 *
	 * @param options The sound to create. `sound` is a base64 data URI (`data:audio/mp3;base64,...`)
	 * of an MP3 or OGG file, at most 512kb and 5.2 seconds long.
	 * @see https://docs.discord.com/developers/resources/soundboard#create-guild-soundboard-sound
	 */
	async create(options: {
		/** Name of the sound, 2-32 characters */
		name: string;
		/** The sound file as a base64 data URI */
		sound: string;
		/** Playback volume, from 0 to 1, defaults to 1 */
		volume?: number | null;
		/** Id of a custom emoji to use as the icon */
		emojiId?: string | null;
		/** Unicode character of a standard emoji to use as the icon */
		emojiName?: string | null;
	}): Promise<SoundboardSound> {
		const body: JSONObject = { name: options.name, sound: options.sound };

		if ("volume" in options && options.volume !== undefined) body.volume = options.volume;
		if ("emojiId" in options && options.emojiId !== undefined) body.emoji_id = options.emojiId;
		if ("emojiName" in options && options.emojiName !== undefined) body.emoji_name = options.emojiName;

		const created = await this.client.rest.post<DiscordSoundboardSound>(`/guilds/${this.guild.id}/soundboard-sounds`, body);
		return this.upsert(created);
	}
}
