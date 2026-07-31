import { Client } from "../Client.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { DiscordRole } from "../Types/DiscordAPITypes.js";
import { Guild } from "./Guild.js";
import { BitField, BitFieldValue } from "../DataStructures/BitField.js";
import { DiscordPermissions } from "../Constants.js";
import { JSONObject } from "../Types/index.js";
import { SerializeBitFieldValue } from "../Utils.js";

/**
 * A guild role, granting permissions and cosmetic styling (color, icon, hoisting) to its members.
 *
 * @see https://docs.discord.com/developers/topics/permissions#role-object
 */
export class Role extends APIGuildStructure<DiscordRole> {
	id!: string
	name!: string
	/**
	 * Legacy single integer color. Superseded by `colors`, which supports gradients; kept in
	 * sync by Discord but not itself deprecated on this field
	 */
	color!: number
	/** Gradient role color, with `secondary_color`/`tertiary_color` `null` when the role uses fewer than 3 colors */
	colors!: {
		primary_color: number
		secondary_color: number | null
		tertiary_color: number | null
	}
	/** Whether the role is displayed separately from online members in the member list */
	hoist!: boolean
	/** Role icon hash, mutually exclusive with `unicode_emoji` */
	icon?: string | null
	/** Standard Unicode emoji shown as the role icon, mutually exclusive with `icon` */
	unicode_emoji?: string | null
	position!: number
	permissions!: BitField<typeof DiscordPermissions>
	/** Whether this role is managed by an integration (bot role, boost role, linked role, etc.) and cannot be manually assigned or deleted */
	managed!: boolean
	/** Whether members may `@mention` this role */
	mentionable!: boolean
	/**
	 * Metadata describing what manages this role. Each boolean-like field is present and `null`
	 * to mean "true" and absent to mean "false" — a marker-field pattern used because these
	 * fields carry no extra data of their own.
	 */
	tags!: {
		/** Id of the bot this role belongs to, if it's a bot integration role */
		bot_id?: string
		integration_id?: string
		/** Present (and `null`) when this is the guild's Nitro Booster role */
		premium_subscriber?: null
		/** Id of this role's subscription SKU and listing, if it's a subscriber-only role */
		subscription_listing_id?: string
		/** Present (and `null`) when this role is available for purchase */
		available_for_purchase?: null
		/** Present (and `null`) when this is the guild's linked role (granted via a connected external account) */
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
		/** Gradient role color, with `secondary_color`/`tertiary_color` left `null` for a solid color */
		colors?: {
			primary_color?: number
			secondary_color?: number | null
			tertiary_color?: number | null
		}
		/** Whether to display the role separately from online members in the member list */
		hoist?: boolean
		/** New role icon, or `null` to remove it; mutually exclusive with `unicode_emoji` */
		icon?: string | null
		/** New Unicode emoji for the role icon, or `null` to remove it; mutually exclusive with `icon` */
		unicode_emoji?: string | null
		/** Whether members may `@mention` this role */
		mentionable?: boolean
	}): Promise<void> {
		const payload = { ...options };

		if (payload.permissions !== undefined) {
			payload.permissions = SerializeBitFieldValue(DiscordPermissions, payload.permissions);
		}

		await this.client.rest.patch(`/guilds/${this.guild.id}/roles/${this.id}`, payload as unknown as JSONObject);
	}
}