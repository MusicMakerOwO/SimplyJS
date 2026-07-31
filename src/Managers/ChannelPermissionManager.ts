import { Client } from "../Client.js";
import { DiscordOverwrite } from "../Types/index.js";
import { BaseChannel } from "../Structures/Channels/BaseChannel.js";

/**
 * Manages the permission overwrites (`@everyone`, role, and member overwrites) for a single
 * channel. `id` on each overwrite is either a role id or a member id, disambiguated by its `type`.
 *
 * @see https://docs.discord.com/developers/topics/permissions#permission-overwrites
 */
export class ChannelPermissionManager {
	#client: Client;
	#channel: BaseChannel;

	/** Local cache of overwrites, keyed by role/member id, kept in sync from `patch()` (gateway/REST channel payloads) */
	cache: Map<string, DiscordOverwrite>;

	constructor(client: Client, channel: BaseChannel, overwrites: DiscordOverwrite[]) {
		this.#client = client;
		this.#channel = channel;
		this.cache = new Map();
		this.patch(overwrites);
	}

	/**
	 * Replaces the entire local cache with the overwrites from a fresh channel payload.
	 * @param overwrites The full overwrite list from the channel object.
	 */
	patch(overwrites: DiscordOverwrite[]): void {
		this.cache.clear();
		for (const overwrite of overwrites) {
			this.cache.set(overwrite.id, overwrite);
		}
	}

	/**
	 * Reads a cached overwrite by role or member id.
	 * @param id The role or member id to look up.
	 */
	get(id: string): DiscordOverwrite | undefined {
		return this.cache.get(id);
	}

	/**
	 * Tests whether an overwrite is cached for the given role or member id.
	 * @param id The role or member id to check.
	 */
	has(id: string): boolean {
		return this.cache.has(id);
	}

	/**
	 * Creates or replaces a permission overwrite for a role or member. Requires the
	 * `MANAGE_ROLES` permission.
	 *
	 * **Naming note:** unlike every other `upsert()` in this codebase, this method does *not*
	 * insert the result into `cache` — it only fires the REST `PUT` request. The local cache is
	 * only updated later, if a channel update event/refetch calls `patch()`. Callers that need
	 * the cache to reflect the change immediately must do so themselves.
	 * @param overwrite The overwrite to create or replace.
	 */
	async upsert(overwrite: DiscordOverwrite): Promise<void> {
		await this.#client.rest.put(`/channels/${this.#channel.id}/permissions/${overwrite.id}`, {
			allow: overwrite.allow,
			deny: overwrite.deny,
			type: overwrite.type
		});
	}

	/**
	 * Deletes a permission overwrite. Requires the `MANAGE_ROLES` permission.
	 * @param id The role or member id whose overwrite should be removed.
	 */
	async delete(id: string): Promise<void> {
		await this.#client.rest.delete(`/channels/${this.#channel.id}/permissions/${id}`);
	}

	/**
	 * Iterates the cached overwrites.
	 */
	[Symbol.iterator](): MapIterator<DiscordOverwrite> {
		return this.cache.values();
	}
}