import { Client } from "../Client.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { DiscordRole } from "../Types/DiscordAPITypes.js";
import { Guild } from "./Guild.js";
import { BitField, BitFieldValue } from "../DataStructures/BitField.js";
import { DiscordPermissions } from "../Constants.js";
import { JSONObject } from "../Types/index.js";
import { SerializeBitFieldValue } from "../Utils.js";

export class Role extends APIGuildStructure<DiscordRole> {
	id!: string
	name!: string
	color!: number
	colors!: {
		primary_color: number
		secondary_color: number | null
		tertiary_color: number | null
	}
	hoist!: boolean
	icon?: string | null
	unicode_emoji?: string | null
	position!: number
	permissions!: BitField<typeof DiscordPermissions>
	managed!: boolean
	mentionable!: boolean
	tags!: {
		bot_id?: string
		integration_id?: string
		premium_subscriber?: null
		subscription_listing_id?: string
		available_for_purchase?: null
		guild_connections?: null
	}
	flags!: number

	constructor(client: Client, data: DiscordRole, guild: Guild) {
		super(client, guild);
		this.permissions = new BitField(DiscordPermissions, data.permissions);
		this.patch(data);
	}

	patch(data: DiscordRole): void {
		this.id = data.id;
		this.name = data.name;
		this.color = data.color;
		this.colors = data.colors;
		this.hoist = data.hoist;
		this.position = data.position;
		this.permissions.override(data.permissions);
		this.managed = data.managed;
		this.mentionable = data.mentionable;
		this.flags = data.flags;

		if ('icon' in data && data.icon !== undefined) {
			this.icon = data.icon;
		}

		if ('unicode_emoji' in data && data.unicode_emoji !== undefined) {
			this.unicode_emoji = data.unicode_emoji;
		}

		this.tags = data.tags ?? {};
	}

	/** Asks the API to delete the current role, might fail due to permissions or role order (can't delete roles above your own) */
	async delete(): Promise<void> {
		await this.client.rest.delete(`/guilds/${this.guild.id}/roles/${this.id}`);
	}

	/** Attempt to modify the current role, might fail due to permissions or role order (can't edit roles above your own) */
	async modify(options: {
		name?: string
		permissions?: BitFieldValue<typeof DiscordPermissions>
		/** @deprecated Use `colors` instead */
		color?: number
		colors?: {
			primary_color?: number
			secondary_color?: number | null
			tertiary_color?: number | null
		}
		hoist?: boolean
		icon?: string | null
		unicode_emoji?: string | null
		mentionable?: boolean
	}): Promise<void> {
		const payload = { ...options };

		if (payload.permissions !== undefined) {
			payload.permissions = SerializeBitFieldValue(DiscordPermissions, payload.permissions);
		}

		await this.client.rest.patch(`/guilds/${this.guild.id}/roles/${this.id}`, payload as unknown as JSONObject);
	}
}