type TTLCacheEntry<V> = {
	value: V;
	expiresAt: number | null;
}

// Internal use only
/**
 * Small map-like cache with per-entry TTL support and lazy expiration
 *
 * Useful when you want `Map` ergonomics but automatic expiry without a full scheduler layer
 *
 * @example
 * ```ts
 * const cache = new TTLCache<string, number>({ ttl: 5_000 })
 * cache.set("count", 1)
 * cache.get("count") // 1 (until it expires)
 * ```
 */
export class TTLCache<K, V> implements Iterable<[K, V]> {
	readonly #entries = new Map<K, TTLCacheEntry<V>>();
	readonly #defaultTTL: number;
	readonly #onExpire: ((value: V, key: K) => void) | undefined = undefined;
	#cleanupTimer: NodeJS.Timeout | null = null;

	constructor(options: {
		/**
		 * Default lifetime for newly inserted values, in milliseconds.
		 * Use `Infinity` to disable expiry for entries that do not pass a custom TTL.
		 *
		 * @default Infinity
		 */
		ttl?: number;
		/**
		 * Called when an entry expires naturally.
		 * Manual `delete()` and `clear()` calls do not invoke this callback.
		 */
		onExpire?: (value: V, key: K) => void;
	}) {
		this.#defaultTTL = TTLCache.#normalizeTTL(options.ttl ?? Infinity);
		this.#onExpire = options.onExpire ?? undefined;
	}

	/**
	 * Number of currently live entries after expired values are purged
	 */
	get size(): number {
		this.#purgeExpired();
		return this.#entries.size;
	}

	/**
	 * Stores or replaces a value with an optional TTL override
	 *
	 * @param key The entry key
	 * @param value The entry value
	 * @param ttl TTL in milliseconds, or `Infinity` to keep the value until manual removal
	 * @returns The cache instance for chaining
	 *
	 * @example
	 * ```ts
	 * cache.set("token", "abc", 60_000).set("always", "keep", Infinity)
	 * ```
	 */
	set(key: K, value: V, ttl = this.#defaultTTL): this {
		const normalizedTTL = TTLCache.#normalizeTTL(ttl);
		this.#entries.set(key, {
			value,
			expiresAt: this.#resolveExpiresAt(normalizedTTL)
		});
		this.#purgeExpired();
		this.#scheduleCleanup();
		return this;
	}

	/**
	 * Gets a value if it exists and has not expired
	 */
	get(key: K): V | undefined {
		return this.#getEntry(key)?.value;
	}

	/**
	 * Checks whether a key exists and has not expired
	 */
	has(key: K): boolean {
		return this.#getEntry(key) !== undefined;
	}

	/**
	 * Deletes a key manually
	 *
	 * Returns `true` if an entry was removed
	 */
	delete(key: K): boolean {
		const deleted = this.#entries.delete(key);
		if (deleted) this.#scheduleCleanup();
		return deleted;
	}

	/**
	 * Clears every entry and stops the active cleanup timer
	 */
	clear(): void {
		this.#entries.clear();
		this.#clearCleanupTimer();
	}

	/**
	 * Returns remaining TTL for a key in milliseconds
	 *
	 * Returns `undefined` when the key does not exist, `Infinity` for non-expiring entries, or `0+` for expiring ones
	 *
	 * @example
	 * ```ts
	 * const left = cache.remainingTTL("session")
	 * if (left === Infinity) {
	 * 	// non-expiring entry
	 * }
	 * ```
	 */
	remainingTTL(key: K): number | undefined {
		const entry = this.#getEntry(key);
		if (!entry) return undefined;
		if (entry.expiresAt === null) return Infinity;
		return Math.max(0, entry.expiresAt - Date.now());
	}

	/**
	 * Refreshes an existing key with a new TTL
	 *
	 * Returns `false` if the key does not exist (or already expired)
	 *
	 * @example
	 * ```ts
	 * if (!cache.touch("session", 30_000)) {
	 * 	cache.set("session", value, 30_000)
	 * }
	 * ```
	 */
	touch(key: K, ttl = this.#defaultTTL): boolean {
		const entry = this.#getEntry(key);
		if (!entry) return false;

		entry.expiresAt = this.#resolveExpiresAt(TTLCache.#normalizeTTL(ttl));
		this.#purgeExpired();
		this.#scheduleCleanup();
		return true;
	}

	/**
	 * Iterates live `[key, value]` pairs
	 */
	*entries(): IterableIterator<[K, V]> {
		this.#purgeExpired();
		for (const [key, entry] of this.#entries) {
			yield [key, entry.value];
		}
	}

	/**
	 * Iterates live keys
	 */
	*keys(): IterableIterator<K> {
		for (const [key] of this.entries()) {
			yield key;
		}
	}

	/**
	 * Iterates live values
	 */
	*values(): IterableIterator<V> {
		for (const [, value] of this.entries()) {
			yield value;
		}
	}

	/**
	 * Default iterator for `for...of`, yields live `[key, value]` pairs
	 *
	 * @example
	 * ```ts
	 * for (const [key, value] of cache) {
	 * 	console.log(key, value)
	 * }
	 * ```
	 */
	[Symbol.iterator](): IterableIterator<[K, V]> {
		return this.entries();
	}

	#resolveExpiresAt(ttl: number): number | null {
		if (ttl === Infinity) return null;
		return Date.now() + ttl;
	}

	#getEntry(key: K): TTLCacheEntry<V> | undefined {
		const entry = this.#entries.get(key);
		if (!entry) return undefined;

		if (!this.#isExpired(entry)) return entry;

		this.#entries.delete(key);
		this.#onExpire?.(entry.value, key);
		this.#scheduleCleanup();
		return undefined;
	}

	#purgeExpired(now = Date.now()): void {
		let purgedAny = false;

		for (const [key, entry] of this.#entries) {
			if (!this.#isExpired(entry, now)) continue;

			this.#entries.delete(key);
			this.#onExpire?.(entry.value, key);
			purgedAny = true;
		}

		if (purgedAny) this.#scheduleCleanup();
	}

	#isExpired(entry: TTLCacheEntry<V>, now = Date.now()): boolean {
		return entry.expiresAt !== null && entry.expiresAt <= now;
	}

	#scheduleCleanup(): void {
		this.#clearCleanupTimer();

		let nextExpiration: number | null = null;
		for (const { expiresAt } of this.#entries.values()) {
			if (expiresAt === null) continue;
			if (nextExpiration === null || expiresAt < nextExpiration) {
				nextExpiration = expiresAt;
			}
		}

		if (nextExpiration === null) return;

		this.#cleanupTimer = setTimeout(() => {
			this.#cleanupTimer = null;
			this.#purgeExpired();
			this.#scheduleCleanup();
		}, Math.max(0, nextExpiration - Date.now())).unref();
	}

	#clearCleanupTimer(): void {
		if (this.#cleanupTimer === null) return;
		clearTimeout(this.#cleanupTimer);
		this.#cleanupTimer = null;
	}

	static #normalizeTTL(ttl: number): number {
		if (ttl === Infinity) return ttl;
		if (!Number.isFinite(ttl) || ttl < 0) {
			throw new RangeError("TTL must be a finite number greater than or equal to 0, or Infinity");
		}
		return ttl;
	}
}