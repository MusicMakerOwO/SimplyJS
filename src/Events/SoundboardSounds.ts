import { defineEvent } from "../Types/Internal.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import {
	DiscordGuildSoundboardSoundCreate,
	DiscordGuildSoundboardSoundDelete,
	DiscordGuildSoundboardSoundsUpdate,
	DiscordGuildSoundboardSoundUpdate
} from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/**
 * Fires when a soundboard sound is added to a guild, caching it on `guild.soundboardSounds`.
 */
export const SoundboardSoundCreate = defineEvent({
	name: GatewayEvents.GuildSoundboardSoundCreate,
	handler: (client, data: DiscordGuildSoundboardSoundCreate): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const sound = guild.soundboardSounds.upsert(data);
		client.emit(ClientEvents.SoundboardSoundCreate, guild, sound);
	}
});

/**
 * Fires when a guild soundboard sound is changed. The cached structure is patched in place, so
 * `oldSound` and `newSound` are the same object when the sound was already cached - snapshot any
 * fields you need to compare before the listener returns.
 */
export const SoundboardSoundUpdate = defineEvent({
	name: GatewayEvents.GuildSoundboardSoundUpdate,
	handler: (client, data: DiscordGuildSoundboardSoundUpdate): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const oldSound = guild.soundboardSounds.get(data.sound_id)?.clone();
		const newSound = guild.soundboardSounds.upsert(data);
		client.emit(ClientEvents.SoundboardSoundUpdate, guild, oldSound, newSound);
	}
});

/**
 * Fires when a soundboard sound is removed from a guild.
 *
 * The payload carries ids only, so the cached structure is emitted when there is one and a bare
 * `{ soundId }` object otherwise. The event is emitted before the cache eviction so listeners can
 * still resolve the sound.
 */
export const SoundboardSoundDelete = defineEvent({
	name: GatewayEvents.GuildSoundboardSoundDelete,
	handler: (client, data: DiscordGuildSoundboardSoundDelete): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const saved = guild.soundboardSounds.get(data.sound_id);
		client.emit(ClientEvents.SoundboardSoundDelete, guild, saved ?? { soundId: data.sound_id });
		guild.soundboardSounds.delete(data.sound_id);
	}
});

/**
 * Fires on a bulk soundboard sync, upserting every sound in the payload and deriving individual
 * `SoundboardSoundCreate` / `SoundboardSoundUpdate` events, then emitting `SoundboardSoundsUpdate`
 * once with everything the payload carried.
 *
 * Unlike the emoji handler in `src/Events/Emojis.ts`, this deliberately does **not** evict cached
 * sounds missing from the payload. Discord does not document `GUILD_SOUNDBOARD_SOUNDS_UPDATE` as a
 * guaranteed full-list replacement, so treating an absence as a deletion risks dropping live
 * sounds; `GUILD_SOUNDBOARD_SOUND_DELETE` is the authoritative removal signal.
 */
export const SoundboardSoundsUpdate = defineEvent({
	name: GatewayEvents.GuildSoundboardSoundsUpdate,
	handler: (client, data: DiscordGuildSoundboardSoundsUpdate): void => {
		const guild = client.guilds.get(data.guild_id);
		if (!guild) return;

		const sounds = data.soundboard_sounds.map(sound => {
			const oldSound = guild.soundboardSounds.get(sound.sound_id)?.clone();
			const newSound = guild.soundboardSounds.upsert(sound);

			if (!oldSound) {
				client.emit(ClientEvents.SoundboardSoundCreate, guild, newSound);
			} else {
				client.emit(ClientEvents.SoundboardSoundUpdate, guild, oldSound, newSound);
			}

			return newSound;
		});

		client.emit(ClientEvents.SoundboardSoundsUpdate, guild, sounds);
	}
});
