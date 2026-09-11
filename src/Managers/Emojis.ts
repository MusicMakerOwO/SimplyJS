import { Emoji } from "../Structures/Emoji.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordEmoji } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { ImageInput, JSONObject } from "../Types/Internal.js";
import { ToDataURI } from "../Utils.js";

/** Cache of a single guild's custom {@link Emoji}s. */
export class EmojiCache extends GuildScopedCache<string, Emoji, DiscordEmoji> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordEmoji): Emoji {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Emoji(this.client, this.guild, data));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Emoji> {
		const fetched = await this.client.rest.get<DiscordEmoji>(`/guilds/${this.guild.id}/emojis/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Uploads a new custom emoji to the guild.
	 *
	 * @param options.name Name of the emoji, as typed between colons.
	 * @param options.image The image to upload, as raw bytes or a data URI if you already encoded one
	 * yourself. The MIME type is read from the contents, see {@link ToDataURI}.
	 * @param options.roles Roles allowed to use the emoji. Omit to allow everyone.
	 * @returns The created emoji, cached.
	 * @throws {Error} When the image type cannot be determined, or the API rejects the upload
	 * (missing `MANAGE_GUILD_EXPRESSIONS`, emoji slots full, or an image over 256 KiB).
	 */
	async create(options: {
		name: string;
		image: ImageInput;
		roles?: (string | { id: string })[];
	}): Promise<Emoji> {
		const body: JSONObject = { name: options.name, image: ToDataURI(options.image) };
		if (options.roles) body.roles = options.roles.map(role => typeof role === "string" ? role : role.id);

		const created = await this.client.rest.post<DiscordEmoji>(`/guilds/${this.guild.id}/emojis`, body);
		return this.upsert(created);
	}
}