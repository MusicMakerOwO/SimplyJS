import { Client } from "../Client.js";
import { DiscordEmoji } from "../Types/DiscordAPITypes.js";
import { User } from "./User.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";

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
	require_colons?: boolean
	/** Whether this emoji is managed by an integration */
	managed?: boolean

	constructor(client: Client, guild: Guild, data: DiscordEmoji) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordEmoji): void {
		this.id = data.id;
		this.name = data.name;
		this.animated = data.animated;
		this.available = data.available;

		if ('roles' in data && data.roles !== undefined) {
			this.roles = data.roles;
		}

		if ('user' in data && data.user !== undefined) {
			this.user = this.client.users.upsert(data.user);
		}

		if ('require_colons' in data && data.require_colons !== undefined) {
			this.require_colons = data.require_colons;
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
	 * Modifies the emoji's name or allowed roles
	 * @param changes
	 */
	async modify(changes: {
		name: string;
		roles: string[] | {id: string}[]
	}): Promise<void> {
		const roleIDs = changes.roles.map(r => typeof r === 'string' ? r : r.id);
		await this.client.rest.patch(`/guilds/${this.guild.id}/emojis/${this.id}`, { name: changes.name, roles: roleIDs });
	}

	toString(): string {
		return `<${this.animated ? 'a' : ''}:${this.name}:${this.id}>`;
	}
}