import { Client } from "../Client.js";
import { Guild } from "../Structures/index.js";
import { SnowflakeTimestamp } from "../Utils.js";

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
	/**
	 * Id of the guild that owns this structure. Taken from the owning guild rather than the
	 * payload, since Discord omits `guild_id` on objects nested inside a guild (every channel in a
	 * `GUILD_CREATE`, every role, every member).
	 *
	 * Subclasses must not redeclare this field: under `useDefineForClassFields` a redeclaration
	 * re-initializes it to `undefined` after this constructor has run.
	 */
	readonly guildId: string;

	protected constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
		this.guildId = guild.id;
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

/**
 * {@link APIClientStructure} for structures identified by a snowflake `id`, which therefore know
 * when they were created without a request: users, guilds, messages, webhooks, interactions.
 *
 * Structures keyed by something else extend {@link APIClientStructure} directly - an invite is
 * keyed by its code, and a structure whose `id` is borrowed from another object (a thread member's
 * is the thread's) would report the wrong thing's creation time.
 */
export abstract class APIClientSnowflakeStructure<T extends object> extends APIClientStructure<T> {
	/** The snowflake id this structure is keyed by, which {@link createdTimestamp} is read from */
	abstract id: string;

	/** When this was created, in milliseconds since the Unix epoch, read from its snowflake id */
	get createdTimestamp(): number {
		return SnowflakeTimestamp(this.id);
	}

	/** When this was created, read from its snowflake id */
	get createdAt(): Date {
		return new Date(this.createdTimestamp);
	}
}

/**
 * {@link APIGuildStructure} for structures identified by a snowflake `id`, which therefore know
 * when they were created without a request: channels, roles, emojis, stickers, integrations,
 * scheduled events, auto moderation rules.
 *
 * The getters repeat {@link APIClientSnowflakeStructure}'s, since the two bases share no
 * ancestor to hang them on. Structures keyed by something else extend {@link APIGuildStructure}
 * directly - a member is keyed by its user, whose creation is not the member's.
 */
export abstract class APIGuildSnowflakeStructure<T extends object> extends APIGuildStructure<T> {
	/** The snowflake id this structure is keyed by, which {@link createdTimestamp} is read from */
	abstract id: string;

	/** When this was created, in milliseconds since the Unix epoch, read from its snowflake id */
	get createdTimestamp(): number {
		return SnowflakeTimestamp(this.id);
	}

	/** When this was created, read from its snowflake id */
	get createdAt(): Date {
		return new Date(this.createdTimestamp);
	}
}
