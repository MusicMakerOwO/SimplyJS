import { Rest, RestOptions } from "./Rest.js";
import { WSClient, WSOptions, WSEvents } from "./WSClient.js";
import { ResolveIntents } from "./Intents.js";
import { ObjectValues } from "./Types/HelperTypes.js";
import { GatewayBotResponse, GatewayIntents, GatewayOpCodes } from "./Types/DiscordGateway.js";
import { GuildCache } from "./Managers/Guilds.js";
import { EventEmitter } from "node:events";
import { ClientEventMap, ClientEvents } from "./Types/SimplyJSTypes.js";
import { User } from "./Structures/User.js";
import { UserCache } from "./Managers/Users.js";
import { CollectorDefaults, CollectorManager } from "./Managers/Collectors.js";
import { ActivityType, ClientActivity, PresenceStatus, Status } from "./Types/DiscordAPITypes.js";
import { ApplicationCommand, JSONArray } from "./Types/index.js";
import { awaitEventInternal } from "./Collector.js";
import { CheckListenerIntents, IsInternalListener, MarkInternalListener } from "./Warnings.js";
import { ApplicationIdFromToken, ShardIdFor } from "./Utils.js";
import { IdentifyQueue } from "./IdentifyQueue.js";

/** How long `login()` waits for every shard's `READY`, on top of however long the identify queue holds the last one back */
const LOGIN_TIMEOUT = 10_000;

/** See {@link ClientOptions.shards} */
type ShardsOption =
	| { count: number; ids?: number[] }
	| { count: "auto"; ids?: never };

type ClientOptions = {
	/** Bot token used to authenticate both the REST client and the gateway websocket */
	token: string;
	/**
	 * Dictates what events your bot is subscribed to
	 *
	 * @example
	 * ```ts
	 * intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers | GatewayIntents.GuildModeration
	 * intents: [GatewayIntents.Guilds, GatewayIntents.GuildMembers, GatewayIntents.GuildModeration]
	 * intents: ["Guilds", "GuildMembers", "GuildModeration"]
	 * ```
	 *
	 * @see {GatewayIntents}
	 */
	intents:
		| number
		| ObjectValues<typeof GatewayIntents>[]
		| (keyof typeof GatewayIntents)[];

	/** Options forwarded to the underlying {@link WSClient} (jitter, event overrides, etc) */
	ws?: WSOptions

	/**
	 * Options forwarded to the underlying {@link Rest} client: rate limit behavior, and `baseUrl`
	 * for a REST proxy.
	 *
	 * @example
	 * ```ts
	 * rest: { rateLimitDurationMultiplier: 1.5, baseUrl: "http://rest-proxy:8080/api/v10" }
	 * ```
	 */
	rest?: RestOptions

	/**
	 * Bounds applied to every collector created on this client, underneath whatever that
	 * collector passes itself. Omitted entirely by default, so collectors are unbounded unless
	 * they say otherwise.
	 *
	 * Useful as a single place to put a policy like "no collector on this bot should outlive
	 * fifteen minutes" instead of repeating `time:` at every call site.
	 *
	 * @example
	 * ```ts
	 * collectorDefaults: { time: 15 * 60 * 1000 }
	 * ```
	 */
	collectorDefaults?: CollectorDefaults

	/**
	 * Milliseconds after receipt at which an interaction that still has no initial response raises
	 * a `WarningCodes.SlowAcknowledgement` warning (see `ClientEvents.Warn`), or `false` to turn the
	 * check off.
	 *
	 * Discord rejects an initial response that arrives more than 3 seconds after the interaction,
	 * so the default leaves half a second to notice. The warning also says how much of the delay
	 * was spent inside the library, waiting on asynchronous collector filters, before any handler
	 * saw the interaction.
	 *
	 * @default 2500
	 */
	slowAcknowledgementWarning?: number | false

	/**
	 * Which shards this process runs, out of how many the bot runs in total. Omit it for an
	 * unsharded bot, which is fine below Discord's limit of 2,500 guilds per connection; past
	 * that, Discord closes the connection with `4011 Sharding required`.
	 *
	 * One option covers every layout:
	 * - `{ count: "auto" }` runs every shard in this process, as many as Discord recommends.
	 *   `login()` reads the count from `GET /gateway/bot` and refuses to start when the daily
	 *   session start limit cannot cover it. `ids` cannot be given, since processes resolving the
	 *   count separately could disagree on it.
	 * - `{ count: 4 }` runs all four shards in this process; `ids` defaults to every id below `count`.
	 * - `{ count: 4, ids: [2] }` runs one shard per process: start four processes, each with the
	 *   same `count` and its own id.
	 * - `{ count: 8, ids: [0, 1, 2, 3] }` mixes the two: this process runs half the shards, and
	 *   another runs `[4, 5, 6, 7]`.
	 *
	 * **`client.socket` throws while this process runs more than one shard**, since there is no one
	 * connection for it to return. Use `client.shards` (keyed by shard id), `client.shardFor(guildId)`,
	 * and `client.ping` instead; the `Shard*` events in `ClientEvents` say which shard they are about.
	 *
	 * Things that follow from sharding:
	 * - Each guild's events arrive on one shard only - `ShardIdFor(guildId, count)` or
	 *   `guild.shardId` says which, so work for a guild can be routed to the process that owns it.
	 * - Direct messages only arrive on shard 0.
	 * - REST rate limits, the global one included, are per bot, not per process. A fleet that
	 *   outgrows that wants a shared REST proxy, see `RestOptions.baseUrl`.
	 * - Discord allows one `IDENTIFY` per 5 seconds per `max_concurrency` bucket, within a daily
	 *   session start limit. The shards of one process are queued for you, so logging in four
	 *   shards takes about 15 seconds; processes started together have to stagger themselves.
	 *
	 * @example
	 * ```ts
	 * // every shard, in this process
	 * shards: { count: "auto" }
	 * // process 2 of a bot running four shards, one per process
	 * shards: { count: 4, ids: [2] }
	 * ```
	 */
	shards?: ShardsOption
}

/** Every shard id below `count`, in order */
function AllShardIds(count: number): number[] {
	return Array.from({ length: count }, (_, id) => id);
}

/**
 * Validates `ClientOptions.shards` and returns the shard count and the ids this process runs, in
 * ascending order: `null` for an unsharded client, and `ids: null` for a `count: "auto"` that
 * `login()` has yet to resolve.
 * @throws {RangeError} When `count` is neither a positive integer nor `"auto"`, or `ids` is empty
 * or holds an id that is not an integer from `0` to `count - 1`.
 * @throws {Error} When `ids` repeats an id, or is given alongside `count: "auto"`.
 */
function ResolveShards(shards: ClientOptions["shards"]): { count: number; ids: number[] } | { count: "auto"; ids: null } | null {
	if (shards === undefined) return null;

	const { count, ids } = shards;
	if (count === "auto") {
		if (ids !== undefined) {
			throw new Error(
				"shards.ids cannot be combined with count: \"auto\", which runs every shard in this process. " +
				"To split shards across processes, give every process the same numeric count."
			);
		}
		return { count, ids: null };
	}
	if (!Number.isInteger(count) || count < 1) {
		throw new RangeError(`shards.count must be a positive integer or "auto", received ${count}`);
	}
	if (ids === undefined) return { count, ids: AllShardIds(count) };
	if (ids.length === 0) {
		throw new RangeError("shards.ids must hold at least one shard id - omit it to run every shard in this process");
	}

	const seen = new Set<number>();
	for (const id of ids) {
		if (!Number.isInteger(id) || id < 0 || id >= count) {
			throw new RangeError(`Shard id ${id} is out of range: shard ids run from 0 to ${count - 1} for a count of ${count}`);
		}
		if (seen.has(id)) throw new Error(`shards.ids lists shard ${id} more than once`);
		seen.add(id);
	}

	return { count, ids: [...seen].sort((a, b) => a - b) };
}

/**
 * The entry point for interacting with Discord: owns the REST client, the gateway websocket,
 * and the top-level caches. Extends `EventEmitter` to surface gateway events by name.
 */
export class Client extends EventEmitter<ClientEventMap> {
	/** Exposed for interacting directly with Discord's REST. Authorization is handled automatically for you */
	rest: Rest;

	/** The user of the bot, only set after websocket authorization */
	user: User | null;

	/** Global guild cache */
	guilds: GuildCache;
	/** Global user cache */
	users: UserCache;
	/**
	 * Every live {@link Collector} on this client. Owns the shared per-event listeners collectors
	 * run on, and decides which collector gets an interaction before handlers see it.
	 */
	collectors: CollectorManager;

	/** The client's current status, this is only intended for internal use via state tracking */
	status: ObjectValues<typeof PresenceStatus>;
	/** The client's current activity, this is only intended for internal use via state tracking */
	activity: ClientActivity | null;

	/** User ID resolved from the provided token */
	id: string;

	/**
	 * The gateway intents this client identifies with, resolved from `ClientOptions.intents` to a
	 * bitfield. Fixed at construction.
	 *
	 * Read this rather than `client.socket.intents`: intents belong to the client, not to a
	 * connection, and `client.socket` throws once a process runs more than one shard.
	 */
	readonly intents: number;

	/** See {@link ClientOptions.slowAcknowledgementWarning} */
	slowAcknowledgementWarning: number | false;

	/** This process's shards, keyed by shard id, see {@link shards} */
	#shards = new Map<number, WSClient>();
	/** See {@link shardCount} */
	#shardCount: number;
	/** Whether `IDENTIFY` carries a `shard` field, i.e. whether `ClientOptions.shards` was given at all */
	#sharded: boolean;
	/** Paces this process's identifies; `null` while it runs a single shard, which has nothing to queue behind */
	#identifyQueue: IdentifyQueue | null = null;
	/** `ClientOptions.ws`, kept for shards created after construction by `count: "auto"` */
	#wsOptions: WSOptions;
	/** Kept for shards created after construction by `count: "auto"` */
	#token: string;
	/** Turns this login's `ShardReady`s into one `Ready`, see {@link #armReady} */
	#readyListener: ((shardId: number) => void) | null = null;

	constructor(options: ClientOptions) {
		super();

		const layout = ResolveShards(options.shards);
		this.intents = ResolveIntents(options.intents);
		this.#token = options.token;
		// the client owns the shard layout and the identify pacing; values passed through `ws` would contradict both
		this.#wsOptions = { ...options.ws };
		delete this.#wsOptions.shard;
		delete this.#wsOptions.beforeIdentify;

		this.#sharded = layout !== null;
		if (layout === null) {
			this.#shardCount = 1;
			this.#createShards([0], 1);
		} else if (layout.count === "auto") {
			// login() asks Discord how many, and creates them then
			this.#shardCount = 0;
		} else {
			this.#shardCount = layout.count;
			this.#createShards(layout.ids, 1);
		}

		this.rest = new Rest(options.rest);
		this.rest.setToken(options.token);

		// Checked per registration rather than once at login(), so handlers loaded late are covered.
		// `newListener` is not in ClientEventMap, hence the cast to a plain emitter.
		(this as EventEmitter).on("newListener", (event: string | symbol, listener: unknown) => {
			if (!IsInternalListener(listener)) CheckListenerIntents(this, event);
		});

		this.user = null;

		this.guilds = new GuildCache(this);
		this.users = new UserCache(this);
		this.collectors = new CollectorManager(this, options.collectorDefaults);

		this.status = Status.ONLINE;
		this.activity = null;

		this.slowAcknowledgementWarning = options.slowAcknowledgementWarning ?? 2_500;

		this.id = ApplicationIdFromToken(options.token);
	}

	/**
	 * The gateway connections this process runs, keyed by shard id. An unsharded bot has one, as
	 * shard `0`. Empty before `login()` when `ClientOptions.shards` is `{ count: "auto" }`, since
	 * the count is only known once Discord has been asked.
	 */
	get shards(): ReadonlyMap<number, WSClient> {
		return this.#shards;
	}

	/**
	 * The gateway connection. Only valid while this process runs exactly one shard, which is the
	 * default: with several it throws, since there is no one connection to return. Use
	 * {@link shards}, {@link shardFor}, or {@link ping} instead, which work for any number of shards.
	 * @throws {Error} When this process runs more than one shard, or none yet.
	 */
	get socket(): WSClient {
		if (this.#shards.size === 1) return this.#shards.values().next().value!;
		if (this.#shards.size === 0) {
			throw new Error(
				"client.socket is not available yet: with shards: { count: \"auto\" }, the shards are created by login(). " +
				"Use client.shards once it resolves."
			);
		}
		throw new Error(
			`client.socket is ambiguous: this process runs shards ${[...this.#shards.keys()].join(", ")}. ` +
			"Use client.shards.get(id), or client.shardFor(guildId) for a guild's shard."
		);
	}

	/**
	 * How many shards the bot runs in total, across every process - `ClientOptions.shards.count`,
	 * or `1` for an unsharded bot. What `guild.shardId` is computed against.
	 *
	 * With `count: "auto"`, this is `0` until `login()` has resolved the count.
	 */
	get shardCount(): number {
		return this.#shardCount;
	}

	/**
	 * Mean round trip of every local shard's last acknowledged heartbeat, in milliseconds, or `-1`
	 * until one has been acknowledged. Each shard's own is on `client.shards.get(id).ping`.
	 */
	get ping(): number {
		let total = 0;
		let measured = 0;
		for (const shard of this.#shards.values()) {
			if (shard.ping === -1) continue;
			total += shard.ping;
			measured++;
		}
		return measured === 0 ? -1 : Math.round(total / measured);
	}

	/**
	 * The connection a guild's events arrive on, or `undefined` when that shard runs in another
	 * process (or, with `count: "auto"`, before `login()` has created any).
	 * @param guildId The guild's id.
	 */
	shardFor(guildId: string): WSClient | undefined {
		if (this.#shardCount === 0) return undefined;
		// one shard in total owns every guild, so there is nothing to compute
		if (this.#shardCount === 1) return this.#shards.get(0);
		return this.#shards.get(ShardIdFor(guildId, this.#shardCount));
	}

	/**
	 * Creates this process's shard connections. Called once: from the constructor, or from `login()`
	 * for `count: "auto"`.
	 * @param ids The shard ids to run here, ascending.
	 * @param concurrency `max_concurrency`, the number of identify buckets.
	 */
	#createShards(ids: number[], concurrency: number): void {
		const queue = ids.length > 1 ? new IdentifyQueue(concurrency) : null;
		this.#identifyQueue = queue;

		for (const id of ids) {
			const shard = new WSClient(this, {
				...this.#wsOptions,
				intents: this.intents,
				...(this.#sharded ? { shard: [id, this.#shardCount] as const } : {}),
				...(queue ? { beforeIdentify: () => queue.wait(id) } : {}),
			});
			shard.setToken(this.#token);
			shard.on(WSEvents.Disconnect, (reason, code) => this.emit(ClientEvents.ShardDisconnect, id, reason, code));
			this.#shards.set(id, shard);
		}
	}

	/**
	 * Resolves `count: "auto"` from `GET /gateway/bot` and creates every shard.
	 * @throws {Error} When the daily session start limit has too few sessions left to start them all.
	 */
	async #createAutoShards(): Promise<void> {
		const gateway = await this.rest.get<GatewayBotResponse>("/gateway/bot");
		const { remaining, total, reset_after, max_concurrency } = gateway.session_start_limit;
		if (remaining < gateway.shards) {
			throw new Error(
				`Cannot start ${gateway.shards} shards: Discord's session start limit has ${remaining} of ${total} ` +
				`sessions left, and resets in ${Math.ceil(reset_after / 60_000)} minutes`
			);
		}

		this.#shardCount = gateway.shards;
		this.#createShards(AllShardIds(gateway.shards), max_concurrency);
	}

	/**
	 * Emits `Ready` once every shard in `shardIds` has emitted `ShardReady`, and then stops
	 * listening - so a shard that re-identifies later emits `ShardReady` alone. Replaces any
	 * previous login's wait that never completed.
	 */
	#armReady(shardIds: Iterable<number>): void {
		this.#disarmReady();
		const pending = new Set(shardIds);

		const listener = MarkInternalListener((shardId: number) => {
			pending.delete(shardId);
			if (pending.size > 0) return;
			this.#disarmReady();
			this.emit(ClientEvents.Ready, this.user!);
		});
		this.#readyListener = listener;
		this.on(ClientEvents.ShardReady, listener);
	}

	/** Drops the wait {@link #armReady} set up, if it is still pending */
	#disarmReady(): void {
		if (this.#readyListener) this.off(ClientEvents.ShardReady, this.#readyListener);
		this.#readyListener = null;
	}

	/**
	 * Connects every shard this process runs, resolving once each has received `READY`.
	 *
	 * With several shards, identifies are queued 5 seconds apart per `max_concurrency` bucket (see
	 * `ClientOptions.shards`), and the 10 second timeout is extended by however long the queue holds
	 * the last shard back. `ClientEvents.Ready` follows once every shard's guilds have arrived.
	 * @throws {Error} When a shard is rejected outright (a bad token, disallowed intents), when not
	 * every shard is ready in time, or, for `count: "auto"`, when the session start limit is too low.
	 */
	async login(): Promise<void> {
		if (this.#shards.size === 0) await this.#createAutoShards();

		const shards = [...this.#shards.values()];
		this.#armReady(this.#shards.keys());
		for (const shard of shards) shard.initialize();

		const time = LOGIN_TIMEOUT + (this.#identifyQueue?.longestWait(this.#shards.keys()) ?? 0);

		// pause execution until every shard has received a ready event
		const ready = Promise.all(shards.map((shard) => awaitEventInternal(shard, WSEvents.Ready, { time })))
			.catch(() => {
				throw new Error(`No ready event received within ${time / 1000} seconds - Discord may be having an outage`);
			});

		// a rejected connection (bad token, disallowed intents) will never produce a ready event, so
		// report what Discord actually said instead of blaming an outage ten seconds later
		const rejected = Promise.race(shards.map((shard) => awaitEventInternal(shard, WSEvents.Disconnect, { time })
			.then(
				([reason]) => {
					throw new Error(`Failed to connect to the gateway${shards.length > 1 ? ` on shard ${shard.shardId}` : ""} - ${reason}`);
				},
				() => new Promise<never>(() => {}) // timed out waiting for a rejection, let `ready` decide
			)));

		await Promise.race([ready, rejected]);
		if (this.status || this.activity) return this.#updatePresence();
	}

	/**
	 * Logs every shard out and clears cache.
	 *
	 * The shards are torn down synchronously, so the client is already disconnected (every shard's
	 * `ready` is `false`) when the returned promise resolves - it never waits on a close frame from
	 * a peer that may not send one. Still `async` so callers can `await` it as before.
	 */
	async destroy(): Promise<void> {
		this.#disarmReady();
		this.guilds.clear();
		this.users.clear();
		this.collectors.clear();
		for (const shard of this.#shards.values()) shard.destroy();
	}

	/** Sets the client's status: online, idle, dnd, invisible, or offline. Other users see `invisible` as `offline` */
	setStatus(status: ObjectValues<typeof PresenceStatus>): void {
		this.status = status;
		this.#updatePresence();
	}

	/** Sets a status message to be displayed. Activities can also be done through this */
	setStatusMessage(type: ObjectValues<typeof ActivityType>, message: string): void {
		if (type === ActivityType.CUSTOM) {
			this.activity = {
				name: 'literally any string lol',
				state: message,
				type: ActivityType.CUSTOM
			}
		} else {
			this.activity = {
				state: '\u200b',
				name: message,
				type: type
			}
		}
		this.#updatePresence();
	}

	/**
	 * Sends the current `status`/`activity` to Discord via a gateway `Presence Update` payload, on
	 * every shard that is ready. A shard still connecting picks it up when `login()` finishes.
	 */
	#updatePresence(): void {
		const payload = {
			op: GatewayOpCodes.PresenceUpdate,
			d: {
				status: this.status,
				since: null,
				afk: false,
				activities: this.activity ? [this.activity] : []
			}
		}
		for (const shard of this.#shards.values()) {
			if (shard.ready) shard.send(payload);
		}
	}

	/**
	 * Replaces all public commands with this new list. These commands are available to every guild.
	 * @note If you want to delete all commands pass an empty array `[]`
	 */
	async registerPublicCommands(commands: ApplicationCommand[]): Promise<ApplicationCommand[]> {
		return await this.rest.put<ApplicationCommand[]>(`/applications/${this.id}/commands`, commands as unknown as JSONArray);
	}

	/**
	 * Replaces all guild commands with this new list. These commands are available only to that specified guild.
	 * The bot must be in the server to manage commands.
	 * @note If you want to delete all commands pass an empty array `[]`
	 */
	async registerGuildCommands(guildId: string, commands: ApplicationCommand[]): Promise<ApplicationCommand[]> {
		return await this.rest.put<ApplicationCommand[]>(`/applications/${this.id}/guilds/${guildId}/commands`, commands as unknown as JSONArray);
	}
}