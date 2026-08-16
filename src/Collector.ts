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
 * Listens for a single event on any typed `EventEmitter`, collecting every occurrence that
 * passes an optional filter until it is stopped by `time`, `idle`, `max`, or a manual `.stop()` call.
 *
 * Prefer {@link createCollector} over calling this constructor directly - it infers `TArgs` from
 * the emitter's event map instead of requiring it to be written out by hand.
 */
export class Collector<TArgs extends unknown[] = unknown[]> extends EventEmitter<CollectorEvents<TArgs>> {
	readonly #emitter: EventEmitter<Record<string, unknown[]>>;
	readonly #event: string;
	readonly #filter: CollectorFilter<TArgs> | undefined;
	readonly #max: number | undefined;
	readonly #collected: TArgs[] = [];

	#time: number | undefined;
	#idle: number | undefined;
	#timeTimer: NodeJS.Timeout | null = null;
	#idleTimer: NodeJS.Timeout | null = null;
	#ended = false;

	readonly #handleEvent: (...args: TArgs) => void;

	constructor(emitter: EventEmitter<Record<string, unknown[]>>, event: string, options: CollectorOptions<TArgs> = {}) {
		super();

		this.#emitter = emitter;
		this.#event = event;
		this.#filter = options.filter;
		this.#max = options.max;
		this.#time = options.time;
		this.#idle = options.idle;

		this.#handleEvent = (...args: TArgs) => this.#onEvent(args);
		this.#emitter.on(this.#event, this.#handleEvent as (...args: unknown[]) => void);

		this.#setTimers();
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

	/** Stops collecting, detaches the underlying listener, and emits `"end"`. Safe to call more than once. */
	stop(reason: CollectorEndReason = "user"): void {
		if (this.#ended) return;
		this.#ended = true;

		this.#emitter.off(this.#event, this.#handleEvent as (...args: unknown[]) => void);
		this.#clearTimers();

		this.emit("end", [...this.#collected], reason);
	}

	/** Re-arms the `time`/`idle` timers, optionally replacing their durations */
	resetTimer(options: { time?: number; idle?: number } = {}): void {
		if (this.#ended) return;

		if (options.time !== undefined) this.#time = options.time;
		if (options.idle !== undefined) this.#idle = options.idle;

		this.#setTimers();
	}

	#onEvent(args: TArgs): void {
		if (this.#ended) return;

		if (!this.#filter) {
			this.#collect(args);
			return;
		}

		const result = this.#filter(...args);
		if (result instanceof Promise) {
			void result.then((passed) => passed && this.#collect(args));
		} else if (result) {
			this.#collect(args);
		}
	}

	#collect(args: TArgs): void {
		if (this.#ended) return;

		this.#collected.push(args);
		this.emit("collect", ...args);

		if (this.#idle !== undefined) this.#setIdleTimer();
		if (this.#max !== undefined && this.#collected.length >= this.#max) {
			this.stop("limit");
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
	options?: CollectorOptions<TMap[TEvent]>
): Collector<TMap[TEvent]> {
	return new Collector<TMap[TEvent]>(emitter as unknown as EventEmitter<Record<string, unknown[]>>, event, options);
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
export async function awaitEvent<TMap extends Record<string, unknown[]>, TEvent extends keyof TMap & string>(
	emitter: EventEmitter<TMap>,
	event: TEvent,
	options: Omit<CollectorOptions<TMap[TEvent]>, "max"> = {}
): Promise<TMap[TEvent]> {
	const collector = createCollector<TMap, TEvent>(emitter, event, { ...options, max: 1 });
	try {
		return await collector.next;
	} finally {
		collector.stop();
	}
}