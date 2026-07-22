import { Role } from "../Structures/Role.js";
import { GuildCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordRole } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { BitFieldValue } from "../DataStructures/BitField.js";
import { DiscordPermissions } from "../Constants.js";
import { JSONObject } from "../Types/index.js";
import { SerializeBitFieldValue } from "../Utils.js";

export class RoleCache extends GuildCache<string, Role, DiscordRole> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	/**
	 * Gets the guild @everyone role
	 */
	get everyone(): Role {
		return this.get(this.guild.id)!;
	}

	/**
	 * Gets the highest role based on Discord's role sort rules
	 */
	highest(): Role {
		return this.toSorted()[0];
	}

	/**
	 * Gets the lowest role based on Discord's role sort rules
	 */
	lowest(): Role {
		return this.toSorted()[this.size - 1];
	}

	upsert(data: DiscordRole): Role {
		if (this.has(data.id)) {
			this.get(data.id)!.patch(data);
		} else {
			this.set(data.id, new Role(this.client, data, this.guild));
		}
		return this.get(data.id)!;
	}

	async fetch(id: string): Promise<Role> {
		const fetched = await this.client.rest.get<DiscordRole>(`/guilds/${this.guild.id}/roles/${id}`);
		return this.upsert(fetched);
	}

	/**
	 * Returns roles sorted by position, then id, and normalizes each role position to its sorted index
	 */
	toSorted(): Role[] {
		const sorted = Array.from(this.values())
		.sort((a, b) => a.position - b.position || (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
		// set each `position` equal to the role's index
		for (let i = 0; i < sorted.length; i++) {
			sorted[i].position = i;
		}
		return sorted;
	}

	/**
	 * Creates a role in this guild
	 * @param data The role data to send to Discord
	 * @see https://docs.discord.com/developers/resources/guild#create-guild-role
	 */
	async create(data: {
		/** The display name for the role */
		name: string
		/** The role permissions as a bitfield or permission inputs */
		permissions: BitFieldValue<typeof DiscordPermissions>
		/** Optional role color payload */
		colors?: DiscordRole["colors"]
		/** Whether this role is shown separately in the member list */
		hoist?: boolean
		/** Optional role icon data */
		icon?: string | null
		/** Optional Unicode emoji shown as the role icon */
		unicode_emoji?: string | null
		/** Whether this role can be mentioned by anyone */
		mentionable?: boolean
	}): Promise<Role> {
		const payload = { ...data };
		payload.permissions = SerializeBitFieldValue(DiscordPermissions, payload.permissions);

		const roleData = await this.client.rest.post<DiscordRole>(`/guilds/${this.guild.id}/roles`, payload as unknown as JSONObject);
		return this.upsert(roleData);
	}

	/**
	 * Reorders roles to specific positions.
	 * @param updates Record mapping role IDs to their target positions.
	 *                Each position must be unique; duplicate positions will throw.
	 * @throws If two or more roles have the same position.
	 * @example
	 * // Move roleA to position 5, roleB to position 10
	 * await guild.roles.setPositions({
	 *   [roleA.id]: 5,
	 *   [roleB.id]: 10
	 * });
	 */
	async setPositions(updates: Record<string, number>): Promise<void> {
		const positions = Object.values(updates);
		const duplicates = positions.filter((p, i) => positions.indexOf(p) !== i);

		if (duplicates.length > 0) {
			throw new Error(
				`Duplicate positions in role update: ${[...new Set(duplicates)].join(", ")}. ` +
				`Each role must have a unique position.`
			);
		}

		const payload = Object.entries(updates).map(([id, position]) => ({ id, position }));
		await this.client.rest.patch(`/guilds/${this.guild.id}/roles`, payload);
	}
}