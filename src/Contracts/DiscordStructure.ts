import { Client } from "../Client.js";
import { Guild } from "../Structures/index.js";

/**
 * Shallow-copies a structure onto a fresh instance of its own class, then lets the class detach
 * whatever state it mutates in place.
 *
 * `Object.create` is used rather than the constructor because no structure retains its raw API
 * payload, so there is nothing to re-run `patch()` against. Note that `#private` fields are *not*
 * carried over - a class that needs one on its clones must key it off a `WeakMap` instead.
 */
function CopyStructure<T extends APIClientStructure<object> | APIGuildStructure<object>>(source: T): T {
	const copy = Object.create(Object.getPrototypeOf(source)) as T;
	Object.assign(copy, source);
	// `detach` is protected, so it is not visible on `copy` from out here
	(copy as unknown as { detach(source: T): void }).detach(source);
	return copy;
}

/**
 * Base contract for structures that are attached to a {@link Client} but are not bound to
 * a single guild instance.
 *
 * Use this for top-level or cross-guild entities such as users, channels in DMs, or
 * any structure that only needs client services (REST, gateway state, caches).
 */
export abstract class APIClientStructure<T extends object> {
	protected readonly client: Client;

	protected constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Applies a partial or full API payload update to the current structure instance.
	 */
	abstract patch(data: T): void;

	/**
	 * Creates a detached snapshot of this structure, sharing no mutable state with the cached
	 * instance.
	 *
	 * Caches patch their entries in place, so a reference taken before an update reflects the
	 * *new* state by the time a listener sees it. The `*Update` event handlers clone the previous
	 * value before upserting so consumers get a real before/after pair to diff.
	 *
	 * The snapshot is shallow: field values are frozen at clone time, but identity and shared
	 * infrastructure (the client, the owning guild, sub-caches) stay aliased to the live instance.
	 */
	clone(): this {
		return CopyStructure(this);
	}

	/**
	 * Hook for subclasses to replace state that `patch()` mutates in place rather than
	 * reassigning, which a shallow copy would otherwise leave shared with the live instance.
	 * Runs on the freshly created clone, with the instance it was copied from.
	 */
	protected detach(_source: this): void {}
}

/**
 * Base contract for structures that are owned by a specific guild and require both
 * client context and guild context.
 *
 * Use this for guild-scoped entities such as members, roles, guild channels,
 * emojis, and stickers.
 */
export abstract class APIGuildStructure<T extends object> {
	protected readonly client: Client;
	protected readonly guild: Guild;

	protected constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
	}

	/**
	 * Applies a partial or full API payload update to the current guild-scoped structure.
	 */
	abstract patch(data: T): void;

	/**
	 * Creates a detached snapshot of this structure, sharing no mutable state with the cached
	 * instance.
	 *
	 * Caches patch their entries in place, so a reference taken before an update reflects the
	 * *new* state by the time a listener sees it. The `*Update` event handlers clone the previous
	 * value before upserting so consumers get a real before/after pair to diff.
	 *
	 * The snapshot is shallow: field values are frozen at clone time, but identity and shared
	 * infrastructure (the client, the owning guild, sub-caches) stay aliased to the live instance.
	 */
	clone(): this {
		return CopyStructure(this);
	}

	/**
	 * Hook for subclasses to replace state that `patch()` mutates in place rather than
	 * reassigning, which a shallow copy would otherwise leave shared with the live instance.
	 * Runs on the freshly created clone, with the instance it was copied from.
	 */
	protected detach(_source: this): void {}
}