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
	 * Fetches the key from the Discord API, which may incur rate limits, and upserts the result
	 * into this cache, so a later `get(key)` is served locally. An entry that was already cached is
	 * patched in place, keeping earlier references to it current.
	 *
	 * Every cache follows this unless its own `fetch` documents otherwise.
	 */
	abstract fetch(key: K): Promise<V>;
}

/**
 * Cache structure that lives on a Guild.
 * This helps to maintain ownership and ties the object lifetime to the parent guild.
 */
export abstract class GuildScopedCache<K, V, API> extends Map<K, V> {
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
	 * Fetches the key from the Discord API, which may incur rate limits, and upserts the result
	 * into this cache, so a later `get(key)` is served locally. An entry that was already cached is
	 * patched in place, keeping earlier references to it current.
	 *
	 * Every cache follows this unless its own `fetch` documents otherwise.
	 */
	abstract fetch(key: K): Promise<V>;
}