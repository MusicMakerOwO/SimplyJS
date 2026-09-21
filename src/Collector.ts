import { EventEmitter } from "node:events";
import { Awaitable } from "./Types/HelperTypes.js";
import type { Client } from "./Client.js";
import type { WSClient, WSEventMap } from "./WSClient.js";
import type { ClientEventMap } from "./Types/SimplyJSTypes.js";

/** Predicate deciding whether an emitted event's arguments should be collected */
export type CollectorFilter<TArgs extends unknown[]> = (...args: TArgs) => Awaitable<boolean>;

/** Why a {@link Collector} stopped collecting */
export type CollectorEndReason = "time" | "idle" | "limit" | "user";

export type CollectorOptions<TArgs extends unknown[]> = {
	/** Only events for which this returns `true` are collected. Runs before the `max` check. */
	filter?: CollectorFilter<TArgs>;
	/** Max lifetime in ms from creation; the collector auto-stops with reason `"time"`. Omit for no limit. */
	time?: number;
	/** Max ms of inactivity since the last collected item; auto-stops with reason `"idle"`. Omit for no limit. */
	idle?: number;
	/** Auto-stops with reason `"limit"` once this many items have been collected. Omit for no limit. */
	max?: number;
};

type CollectorEvents<TArgs extends unknown[]> = {
	collect: TArgs;
	end: [collected: TArgs[], reason: CollectorEndReason];
};

/**
 * Where a {@link Collector} gets its events from. The library ships two implementations: a
 * direct listener on an `EventEmitter` ({@link EmitterSource}), and `CollectorManager`'s
 * per-event hub, which holds a *single* listener and fans out to every collector on that
 * event - so a bot with a hundred live button collectors still costs the client one listener.
 */
export type CollectorSource<TArgs extends unknown[]> = {
	/** Registers a collector to start receiving events */
	add(collector: Collector<TArgs>): void;
	/** Deregisters a collector; the source is free to release its own resources once empty */
	remove(collector: Collector<TArgs>): void;
};

/** A {@link CollectorSource} that puts one real listener on an emitter per collector */
class EmitterSource<TArgs extends unknown[]> implements CollectorSource<TArgs> {
	readonly #emitter: EventEmitter<Record<string, unknown[]>>;
	readonly #event: string;
	// one source is constructed per collector, so this only ever describes that one collector
	#handler: ((...args: unknown[]) => void) | null = null;

	constructor(emitter: EventEmitter<Record<string, unknown[]>>, event: string) {
		this.#emitter = emitter;
		this.#event = event;
	}

	add(collector: Collector<TArgs>): void {
		this.#handler = (...args: unknown[]): void => void collector.offer(args as TArgs);
		this.#emitter.on(this.#event, this.#handler);
	}

	remove(): void {
		if (!this.#handler) return;

		this.#emitter.off(this.#event, this.#handler);
		this.#handler = null;
	}
}

/**
 * Listens for a single event on any typed `EventEmitter`, collecting every occurrence that
 * passes an optional filter until it is stopped by `time`, `idle`, `max`, or a manual `.stop()` call.
 *
 * Prefer {@link createCollector} over calling this constructor directly - it infers `TArgs` from
 * the emitter's event map instead of requiring it to be written out by hand, and routes the
 * collector through {@link Client.collectors} so it shares a listener with its siblings.
 */
export class Collector<TArgs extends unknown[] = unknown[]> extends EventEmitter<CollectorEvents<TArgs>> {
	readonly #source: CollectorSource<TArgs>;
	/** Only used to name the event in listener error reports */
	readonly #event: string;
	readonly #filter: CollectorFilter<TArgs> | undefined;
	readonly #max: number | undefined;
	readonly #collected: TArgs[] = [];

	#time: number | undefined;
	#idle: number | undefined;
	#timeTimer: NodeJS.Timeout | null = null;
	#idleTimer: NodeJS.Timeout | null = null;
	#ended = false;

	constructor(
		source: EventEmitter<Record<string, unknown[]>> | CollectorSource<TArgs>,
		event: string,
		options: CollectorOptions<TArgs> = {}
	) {
		super();

		this.#source = source instanceof EventEmitter ? new EmitterSource<TArgs>(source, event) : source;
		this.#event = event;
		this.#filter = options.filter;
		this.#max = options.max;
		this.#time = options.time;
		this.#idle = options.idle;

		this.#source.add(this);

		this.#setTimers();
	}

	/**
	 * Whether this collector will stop on its own. An unbounded collector (no `time`, no `idle`
	 * and no `max`) lives until `.stop()` is called or the process exits, which is what makes a
	 * collector created per command invocation accumulate - see `CollectorManager.maxUnbounded`.
	 */
	get bounded(): boolean {
		return this.#time !== undefined || this.#idle !== undefined || this.#max !== undefined;
	}

	/** Every item collected so far, in collection order */
	get collected(): readonly TArgs[] {
		return this.#collected;
	}

	/** Whether this collector has stopped listening */
	get ended(): boolean {
		return this.#ended;
	}

	/** Resolves with the next collected item, or rejects if the collector ends before one arrives */
	get next(): Promise<TArgs> {
		return new Promise((resolve, reject) => {
			if (this.#ended) {
				reject(new Error("Collector has already ended"));
				return;
			}

			const onCollect = (...args: TArgs) => {
				this.off("end", onEnd);
				resolve(args);
			};
			const onEnd = () => {
				this.off("collect", onCollect);
				reject(new Error("Collector ended before collecting a matching event"));
			};

			this.once("collect", onCollect);
			this.once("end", onEnd);
		});
	}

	/**
	 * Runs `args` through the filter and collects them if it passes, reporting whether this
	 * collector took them.
	 *
	 * Returns a plain boolean for a synchronous filter and a promise only for an asynchronous
	 * one, so a sync collector still collects during the `emit` that triggered it rather than a
	 * microtask later.
	 *
	 * This is the contract between a collector and its {@link CollectorSource}: a custom source
	 * calls it to deliver an event, and the answer is whether this collector took it. Rejects only
	 * if the filter itself throws - a `collect` listener that throws is reported and contained, and
	 * still counts as collected, since by then it has been.
	 * @param args The emitted event's arguments.
	 */
	offer(args: TArgs): Awaitable<boolean> {
		if (this.#ended) return false;

		if (!this.#filter) {
			this.#collect(args);
			return true;
		}

		const result = this.#filter(...args);
		if (result instanceof Promise) {
			return result.then((passed) => {
				// the filter may have taken long enough for the collector to time out mid-await
				if (!passed || this.#ended) return false;

				this.#collect(args);
				return true;
			});
		}

		if (!result) return false;

		this.#collect(args);
		return true;
	}

	/** Stops collecting, detaches the underlying listener, and emits `"end"`. Safe to call more than once. */
	stop(reason: CollectorEndReason = "user"): void {
		if (this.#ended) return;
		this.#ended = true;

		this.#source.remove(this);
		this.#clearTimers();

		this.#emitEnd(reason);
	}

	/** Re-arms the `time`/`idle` timers, optionally replacing their durations */
	resetTimer(options: { time?: number; idle?: number } = {}): void {
		if (this.#ended) return;

		if (options.time !== undefined) this.#time = options.time;
		if (options.idle !== undefined) this.#idle = options.idle;

		this.#setTimers();
	}

	#collect(args: TArgs): void {
		if (this.#ended) return;

		this.#collected.push(args);
		this.#emitCollect(args);

		// a `collect` listener is allowed to stop the collector - without this check the idle timer
		// below is re-armed on one that has already emitted `end`
		if (this.#ended) return;

		if (this.#idle !== undefined) this.#setIdleTimer();
		if (this.#max !== undefined && this.#collected.length >= this.#max) {
			this.stop("limit");
		}
	}

	/**
	 * Emits `"collect"`, absorbing anything a listener throws.
	 *
	 * The item is in `#collected` by the time listeners run, so an error escaping here would unwind
	 * {@link offer} *after* the collection happened: the source would hear "declined" and hand the
	 * same event to the next collector, and an arbitrated interaction would be emitted unclaimed
	 * even though a collector has taken it - both of them then answering the one response it gets.
	 */
	#emitCollect(args: TArgs): void {
		try {
			this.emit("collect", ...args);
		} catch (error) {
			console.error(`Error in collector "collect" handler for event "${this.#event}":`, error);
		}
	}

	/**
	 * Emits `"end"`, absorbing anything a listener throws.
	 *
	 * Contained for the same reason as {@link #emitCollect}, plus two of its own: `stop()` is called
	 * from an unref'd timer, where a throw is an uncaught exception, and from
	 * `CollectorManager.clear()`, where one throwing collector would otherwise leave the rest of
	 * them running through a `client.destroy()`.
	 */
	#emitEnd(reason: CollectorEndReason): void {
		try {
			this.emit("end", [...this.#collected], reason);
		} catch (error) {
			console.error(`Error in collector "end" handler for event "${this.#event}":`, error);
		}
	}

	#setTimers(): void {
		this.#clearTimers();

		if (this.#time !== undefined) {
			this.#timeTimer = setTimeout(() => this.stop("time"), this.#time).unref();
		}
		if (this.#idle !== undefined) {
			this.#setIdleTimer();
		}
	}

	#setIdleTimer(): void {
		if (this.#idleTimer) clearTimeout(this.#idleTimer);
		if (this.#idle === undefined) return;

		this.#idleTimer = setTimeout(() => this.stop("idle"), this.#idle).unref();
	}

	#clearTimers(): void {
		if (this.#timeTimer) {
			clearTimeout(this.#timeTimer);
			this.#timeTimer = null;
		}
		if (this.#idleTimer) {
			clearTimeout(this.#idleTimer);
			this.#idleTimer = null;
		}
	}
}

/**
 * Minimal shape of `CollectorManager` as seen from here.
 *
 * Duck-typed rather than imported: `Client` imports `awaitEvent` from this module, so a runtime
 * import of the manager (which needs `Client`) would close a cycle. Only `Client` carries a
 * `collectors` manager, and only `WSClient` carries a `client` back-reference, so the lookup
 * below can't collide with an unrelated emitter.
 */
type CollectorPreparer<TArgs extends unknown[]> = (
	emitter: EventEmitter<Record<string, unknown[]>>,
	event: string,
	options: CollectorOptions<TArgs>,
	useDefaults: boolean
) => { source: CollectorSource<TArgs>; options: CollectorOptions<TArgs> };

type CollectorHost = {
	collectors?: { prepare?: unknown };
	client?: { collectors?: { prepare?: unknown } };
};

/**
 * Finds the source a new collector should attach to, and the options it should run with: a
 * shared hub plus `ClientOptions.collectorDefaults` when the emitter is the library's own
 * `Client`/`WSClient`, or a private listener on the emitter and the caller's options untouched
 * for anything else.
 */
function Prepare<TArgs extends unknown[]>(
	emitter: EventEmitter<Record<string, unknown[]>>,
	event: string,
	options: CollectorOptions<TArgs>,
	useDefaults = true
): { source: CollectorSource<TArgs> | EventEmitter<Record<string, unknown[]>>; options: CollectorOptions<TArgs> } {
	const host = emitter as unknown as CollectorHost;
	const manager = host.collectors ?? host.client?.collectors;

	if (manager && typeof manager.prepare === "function") {
		return (manager.prepare as CollectorPreparer<TArgs>).call(manager, emitter, event, options, useDefaults);
	}

	return { source: emitter, options };
}

/**
 * The body behind {@link createCollector} and {@link createInternalCollector}, which differ only in
 * whether `collectorDefaults` applies.
 */
function CreateCollectorWith<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: CollectorOptions<TMap[TEvent]>,
	useDefaults: boolean
): Collector<TMap[TEvent]> {
	const prepared = Prepare<TMap[TEvent]>(
		emitter as unknown as EventEmitter<Record<string, unknown[]>>,
		event,
		options,
		useDefaults
	);
	return new Collector<TMap[TEvent]>(prepared.source, event, prepared.options);
}

/** The body behind {@link awaitEvent} and {@link awaitEventInternal}, see {@link CreateCollectorWith} */
async function AwaitEventWith<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: Omit<CollectorOptions<TMap[TEvent]>, "max">,
	useDefaults: boolean
): Promise<TMap[TEvent]> {
	const collector = CreateCollectorWith<TMap, TEvent>(emitter, event, { ...options, max: 1 }, useDefaults);
	try {
		return await collector.next;
	} finally {
		collector.stop();
	}
}

/**
 * Creates a {@link Collector} for a single event on any typed `EventEmitter` (eg. {@link Client}
 * or {@link WSClient}), inferring the collected argument types from the emitter's event map.
 *
 * @example
 * ```ts
 * const collector = createCollector(client, ClientEvents.MessageCreate, {
 * 	filter: (message) => message.channelId === channelId,
 * 	time: 30_000,
 * 	max: 5,
 * });
 * collector.on("collect", (message) => console.log(message.content));
 * collector.on("end", (collected, reason) => console.log(collected.length, reason));
 * ```
 */
// The `Client`/`WSClient` overloads exist because TypeScript cannot infer `TMap` from
// `EventEmitter<TMap>` when the argument is a *subclass* of `EventEmitter` - node types it as
// `EventEmitter<T extends EventMap<T>>`, an F-bounded constraint where `T` never appears in an
// inferable position, so inference silently falls back to the constraint and every collected
// argument comes out as `unknown`. Naming the two emitters the library actually ships restores
// full inference for them; the generic signature below still covers any other typed emitter,
// where the argument's type *is* the `EventEmitter<...>` reference and inference works.
export function createCollector<TEvent extends keyof ClientEventMap & string>(
	emitter: Client,
	event: TEvent,
	options?: CollectorOptions<ClientEventMap[TEvent]>
): Collector<ClientEventMap[TEvent]>;
export function createCollector<TEvent extends keyof WSEventMap & string>(
	emitter: WSClient,
	event: TEvent,
	options?: CollectorOptions<WSEventMap[TEvent]>
): Collector<WSEventMap[TEvent]>;
export function createCollector<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options?: CollectorOptions<TMap[TEvent]>
): Collector<TMap[TEvent]>;
export function createCollector<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: CollectorOptions<TMap[TEvent]> = {}
): Collector<TMap[TEvent]> {
	return CreateCollectorWith<TMap, TEvent>(emitter, event, options, true);
}

/**
 * Waits for a single occurrence of `event` that passes `options.filter`, resolving with its
 * arguments. Rejects if `options.time`/`options.idle` elapses first. Cleans up its listener in
 * every case, so a filter that never matches never leaks a dangling handler.
 *
 * @example
 * ```ts
 * const [interaction] = await awaitEvent(client, ClientEvents.ButtonUsed, {
 * 	filter: (interaction) => interaction.user.id === userId,
 * 	time: 15_000,
 * });
 * ```
 */
// Same overload set as `createCollector`, and for the same inference reason - see the comment there.
export function awaitEvent<TEvent extends keyof ClientEventMap & string>(
	emitter: Client,
	event: TEvent,
	options?: Omit<CollectorOptions<ClientEventMap[TEvent]>, "max">
): Promise<ClientEventMap[TEvent]>;
export function awaitEvent<TEvent extends keyof WSEventMap & string>(
	emitter: WSClient,
	event: TEvent,
	options?: Omit<CollectorOptions<WSEventMap[TEvent]>, "max">
): Promise<WSEventMap[TEvent]>;
export function awaitEvent<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options?: Omit<CollectorOptions<TMap[TEvent]>, "max">
): Promise<TMap[TEvent]>;
export function awaitEvent<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: Omit<CollectorOptions<TMap[TEvent]>, "max"> = {}
): Promise<TMap[TEvent]> {
	return AwaitEventWith<TMap, TEvent>(emitter, event, options, true);
}

/**
 * {@link createCollector} for the library's own collectors: still shares the per-event hub, but is
 * not subject to `ClientOptions.collectorDefaults`.
 *
 * `collectorDefaults` is a policy a bot sets over *its* collectors. Applied to the library's, a
 * `max` truncates `Members.fetchGateway`'s member list and an `idle` fails `Client.login` with a
 * bogus outage message - so internal machinery opts out and states its own bounds explicitly.
 *
 * @internal Not intended for use outside the library.
 */
// Same overload set as `createCollector`, and for the same inference reason - see the comment there.
export function createInternalCollector<TEvent extends keyof ClientEventMap & string>(
	emitter: Client,
	event: TEvent,
	options?: CollectorOptions<ClientEventMap[TEvent]>
): Collector<ClientEventMap[TEvent]>;
export function createInternalCollector<TEvent extends keyof WSEventMap & string>(
	emitter: WSClient,
	event: TEvent,
	options?: CollectorOptions<WSEventMap[TEvent]>
): Collector<WSEventMap[TEvent]>;
export function createInternalCollector<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options?: CollectorOptions<TMap[TEvent]>
): Collector<TMap[TEvent]>;
export function createInternalCollector<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: CollectorOptions<TMap[TEvent]> = {}
): Collector<TMap[TEvent]> {
	return CreateCollectorWith<TMap, TEvent>(emitter, event, options, false);
}

/**
 * {@link awaitEvent} for the library's own waits, exempt from `collectorDefaults` for the reasons
 * in {@link createInternalCollector}.
 *
 * @internal Not intended for use outside the library.
 */
// Same overload set as `awaitEvent`, and for the same inference reason - see the comment there.
export function awaitEventInternal<TEvent extends keyof ClientEventMap & string>(
	emitter: Client,
	event: TEvent,
	options?: Omit<CollectorOptions<ClientEventMap[TEvent]>, "max">
): Promise<ClientEventMap[TEvent]>;
export function awaitEventInternal<TEvent extends keyof WSEventMap & string>(
	emitter: WSClient,
	event: TEvent,
	options?: Omit<CollectorOptions<WSEventMap[TEvent]>, "max">
): Promise<WSEventMap[TEvent]>;
export function awaitEventInternal<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options?: Omit<CollectorOptions<TMap[TEvent]>, "max">
): Promise<TMap[TEvent]>;
export function awaitEventInternal<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: Omit<CollectorOptions<TMap[TEvent]>, "max"> = {}
): Promise<TMap[TEvent]> {
	return AwaitEventWith<TMap, TEvent>(emitter, event, options, false);
}
