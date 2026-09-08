import { Sticker } from "../Structures/Sticker.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordSticker } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { JSONObject, UploadInput } from "../Types/Internal.js";
import { DetectMimeType, ResolveUpload } from "../Utils.js";

/**
 * File types Discord accepts for a guild sticker - PNG, GIF, or a Lottie animation.
 *
 * APNG is not listed separately because it is a PNG with an extra chunk, so it detects as
 * `image/png` and Discord picks the animation up from the file itself.
 */
const STICKER_MIME_TYPES = new Set(["image/png", "image/gif", "application/json"]);

/** Cache of a single guild's custom {@link Sticker}s. */
export class StickerCache extends GuildScopedCache<string, Sticker, DiscordSticker> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordSticker): Sticker {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Sticker(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Sticker> {
		const fetched = await this.client.rest.get<DiscordSticker>(`/guilds/${this.guild.id}/stickers/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Uploads a new sticker to the guild.
	 *
	 * Unlike every other upload endpoint, this one takes its fields as plain form fields rather than
	 * a `payload_json` part, so the request is sent with the `fields` multipart layout.
	 *
	 * @param options.name Name of the sticker.
	 * @param options.description Description shown in the sticker picker.
	 * @param options.tags Autocomplete suggestions - the unicode emoji the sticker relates to. A list
	 * is joined with commas for you.
	 * @param options.file The sticker image, as the bytes of a PNG, APNG, GIF, or Lottie JSON file -
	 * identified by its contents, not an extension. A Lottie animation may also be given as the
	 * object itself, which is serialized for you. Discord ignores the filename, so the form is sent
	 * with `options.name` plus the extension of the detected type.
	 * @returns The created sticker, cached.
	 * @throws {Error} When the file is not a supported sticker format, or the API rejects the upload
	 * (missing `MANAGE_GUILD_EXPRESSIONS`, sticker slots full, or a file over 512 KiB).
	 */
	async create(options: {
		name: string;
		description: string;
		tags: string | string[];
		file: UploadInput | JSONObject;
	}): Promise<Sticker> {
		// a Lottie animation is the one sticker format that is plausibly built in code rather than
		// read as a file, so the object is accepted directly instead of making callers stringify it
		const bytes = ArrayBuffer.isView(options.file)
			? options.file
			: Buffer.from(JSON.stringify(options.file));

		const mimeType = DetectMimeType(bytes);
		if (!STICKER_MIME_TYPES.has(mimeType)) {
			throw new Error(`Stickers must be a PNG, APNG, GIF, or Lottie JSON file, received ${mimeType}`);
		}

		const file = ResolveUpload(bytes, options.name);

		const body: JSONObject = {
			name: options.name,
			description: options.description,
			tags: Array.isArray(options.tags) ? options.tags.join(",") : options.tags
		};

		const created = await this.client.rest.post<DiscordSticker>(
			`/guilds/${this.guild.id}/stickers`,
			body,
			undefined,
			{ files: [file], multipart: "fields" }
		);
		return this.upsert(created);
	}
}