import { Client } from "../Client.js";
import { DiscordEmoji } from "../Types/DiscordAPITypes.js";
import { User } from "./User.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";

/** A custom guild emoji, either a static image or, when `animated` is set, a GIF. */
export class Emoji extends APIGuildStructure<DiscordEmoji> {
	id!: string
	name!: string
	/** Whether this emoji is animated */
	animated!: boolean
	/** Whether this emoji is currently available for use */
	available!: boolean
	/** Role ids allowed to use this emoji when restricted */
	roles?: string[]
	/** User who created the emoji, when included in payloads */
	user?: User
	/** Whether Discord requires surrounding colons for this emoji */
	requireColons?: boolean
	/** Whether this emoji is managed by an integration */
	managed?: boolean

	constructor(client: Client, guild: Guild, data: DiscordEmoji) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordEmoji): void {
		// Discord types these as always present, but the emoji objects nested in other payloads are
		// partial - a reaction's `emoji` carries only `id`, `name`, and sometimes `animated`.
		// Assigning them unconditionally would blank an already-cached emoji, so they are guarded
		// like every optional field below. The `!` markers still hold: an emoji is only ever
		// constructed from a full payload, and a partial one can then only leave those untouched.
		if ('id' in data && data.id !== undefined) {
			this.id = data.id;
		}

		if ('name' in data && data.name !== undefined) {
			this.name = data.name;
		}

		if ('animated' in data && data.animated !== undefined) {
			this.animated = data.animated;
		}

		if ('available' in data && data.available !== undefined) {
			this.available = data.available;
		}

		if ('roles' in data && data.roles !== undefined) {
			this.roles = data.roles;
		}

		if ('user' in data && data.user !== undefined) {
			this.user = this.client.users.upsert(data.user);
		}

		if ('require_colons' in data && data.require_colons !== undefined) {
			this.requireColons = data.require_colons;
		}

		if ('managed' in data && data.managed !== undefined) {
			this.managed = data.managed;
		}
	}

	/**
	 * Deletes the emoji
	 */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/emojis/${this.id}`);
	}

	/**
	 * Modifies the emoji's name or allowed roles. Requires the `MANAGE_GUILD_EXPRESSIONS`
	 * permission and will error otherwise.
	 * @param changes The fields to update; both are required by the underlying REST call.
	 */
	async modify(changes: {
		/** New name for the emoji */
		name: string;
		/** Role ids (or role objects) allowed to use this emoji; pass an empty array to lift the restriction */
		roles: string[] | {id: string}[]
	}): Promise<void> {
		const roleIds = changes.roles.map(r => typeof r === 'string' ? r : r.id);
		await this.client.rest.patch(`/guilds/${this.guild.id}/emojis/${this.id}`, { name: changes.name, roles: roleIds });
	}

	/** Generate the emoji markup usable in message content: `Hello ${emoji.toString()}` -> `Hello <:frog:1234567890>` */
	toString(): string {
		return `<${this.animated ? 'a' : ''}:${this.name}:${this.id}>`;
	}
}