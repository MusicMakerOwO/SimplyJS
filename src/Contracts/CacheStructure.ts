import { Client } from "../Client.js";
import { Guild } from "../Structures/Guild.js";

/**
 * Designed for the top level client caches. Namely, `Client.guilds` and `Client.users`.
 */
export abstract class GlobalCache<K, V, API> extends Map<K, V> {
	protected constructor(protected readonly client: Client) {
		super();
	}

	/**
	 * Inserts data into the cache and returns the resulting instance.
	 * If an item with the same key already exists, implementations should update
	 * that existing instance by calling its internal `patch(data)` method.
	 * @param data Discord API payload used to create or update the cached value.
	 */
	abstract upsert(data: API): V;

	/**
	 * Fetches the key from discord API, may incur rate limits
	 */
	abstract fetch(key: K): Promise<V>;
}

/**
 * Cache structure that lives on a Guild.
 * This helps to maintain ownership and ties the object lifetime to the parent guild.
 */
export abstract class GuildCache<K, V, API> extends Map<K, V> {
	protected constructor(protected readonly client: Client, protected readonly guild: Guild) {
		super();
	}

	/**
	 * Inserts data into the cache and returns the resulting instance.
	 * If an item with the same key already exists, implementations should update
	 * that existing instance by calling its internal `patch(data)` method.
	 * @param data Discord API payload used to create or update the cached value.
	 */
	abstract upsert(data: API): V;

	/**
	 * Fetches the key from discord API, may incur rate limits
	 */
	abstract fetch(key: K): Promise<V>;
}