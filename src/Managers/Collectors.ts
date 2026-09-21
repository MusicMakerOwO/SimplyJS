import { EventEmitter } from "node:events";
import { Collector, CollectorOptions, CollectorSource } from "../Collector.js";
import { ClientEvents, InteractionEvents } from "../Types/SimplyJSTypes.js";
import { GatewayEvents } from "../Types/DiscordGateway.js";
import { Awaitable } from "../Types/HelperTypes.js";
import type { Client } from "../Client.js";

type AnyEmitter = EventEmitter<Record<string, unknown[]>>;
type AnyCollector = Collector<unknown[]>;

/**
 * The client events that carry a single interaction, which exactly one collector may claim.
 *
 * Derived from `InteractionEvents` rather than listed again here, so the set cannot drift from
 * `EventFor` in `src/Events/Interactions.ts` - the other half of the pairing, which maps an
 * interaction *instance* to its concrete event. That half needs `instanceof` and so has to live
 * next to the interaction classes; importing them into this file would close a
 * `Collectors -> BaseInteraction -> Client -> Collectors` import cycle, the same one
 * `Collector.ts` duck-types around. Both halves now read the one list in `SimplyJSTypes`.
 *
 * `InteractionCreate` is added on top because the hub listener below arbitrates it directly - a
 * `client.emit(ClientEvents.InteractionCreate, interaction)` has the same one-response
 * exclusivity as the concrete events do.
 */
const ClaimableEvents: ReadonlySet<string> = new Set<string>([
	ClientEvents.InteractionCreate,
	...InteractionEvents,
]);

/**
 * Records the outcome of arbitration on an interaction.
 *
 * Structural rather than typed against `BaseInteraction` for the import-cycle reason in
 * {@link ClaimableEvents}; the only values that reach it are the interactions this manager was
 * just asked to arbitrate.
 */
function MarkClaimed(value: unknown, claimed: boolean): void {
	if (typeof value !== "object" || value === null) return;

	(value as { claimed: boolean }).claimed = claimed;
}

/** Defaults applied to every collector created on this client, under any explicitly passed options */
export type CollectorDefaults = {
	/** Default `time` bound in ms */
	time?: number;
	/** Default `idle` bound in ms */
	idle?: number;
	/** Default `max` collected count */
	max?: number;
};

/** The library's own frames between `createCollector` and whoever actually called it */
const InternalFrames =
	/^\s*at (?:CreationSite|CollectorHub\.add|new Collector|CreateCollectorWith|AwaitEventWith|createCollector|createInternalCollector|awaitEvent|awaitEventInternal)\b/;

/**
 * Captures where a collector was created, with the library's own frames trimmed off the top so
 * the first line of the accumulation warning is the caller's code rather than this file.
 */
function CreationSite(): string {
	const frames = (new Error().stack ?? "").split("\n").slice(1);

	// only the leading run is dropped - a later frame that happens to match is still the caller's
	while (frames.length > 0 && InternalFrames.test(frames[0]!)) frames.shift();

	return frames.length > 0 ? frames.join("\n") : "<no stack available>";
}

/**
 * Fans a single emitter listener out to every collector on one `(emitter, event)` pair.
 *
 * This is what keeps a bot that creates a collector per command invocation from tripping
 * node's `MaxListenersExceededWarning` at eleven: the emitter sees one listener no matter how
 * many collectors are alive behind it.
 */
class CollectorHub implements CollectorSource<unknown[]> {
	readonly #manager: CollectorManager;
	readonly #emitter: AnyEmitter;
	readonly #event: string;
	readonly #collectors = new Set<AnyCollector>();
	readonly #listener: (...args: unknown[]) => void;
	/**
	 * Whether this hub's event carries an interaction only one collector may claim.
	 *
	 * Also requires the emitter to be the manager's own client, since arbitration is defined
	 * across that client's hubs - a hub on some other emitter that happens to share an event name
	 * has nothing to arbitrate against and takes the plain fan-out path.
	 */
	readonly #arbitrated: boolean;

	/** The live unbounded collectors, counted against `maxUnbounded` */
	readonly #unbounded = new Set<AnyCollector>();
	/** Where the most recent unbounded collector was created, captured only while it can still be printed */
	#lastSite: string | null = null;
	#warned = false;

	constructor(manager: CollectorManager, emitter: AnyEmitter, event: string) {
		this.#manager = manager;
		this.#emitter = emitter;
		this.#event = event;
		this.#arbitrated = ClaimableEvents.has(event) && emitter === (manager.client as unknown as AnyEmitter);

		this.#listener = (...args: unknown[]): void => this.#onEvent(args);
		this.#emitter.on(this.#event, this.#listener);
	}

	/** Whether any collector is still attached to this hub */
	get empty(): boolean {
		return this.#collectors.size === 0;
	}

	/** The live collectors behind this hub, as a snapshot safe to iterate while stopping them */
	get collectors(): AnyCollector[] {
		return [...this.#collectors];
	}

	add(collector: AnyCollector): void {
		this.#collectors.add(collector);

		if (collector.bounded) return;
		this.#unbounded.add(collector);

		// capturing a stack is the most expensive thing in the creation path, so it happens only
		// when there is still a warning left to print it in. Raising `maxUnbounded` off `0` at
		// runtime therefore has no site to show until the next unbounded collector is created.
		if (this.#warned || this.#manager.maxUnbounded <= 0) return;

		this.#lastSite = CreationSite();
		this.#checkAccumulation();
	}

	remove(collector: AnyCollector): void {
		this.#collectors.delete(collector);
		this.#unbounded.delete(collector);

		if (this.empty) this.#destroy();
	}

	/**
	 * Offers `args` to each collector in registration order, stopping at the first that takes
	 * them. Reports whether any did.
	 *
	 * Sequential rather than parallel on purpose: "first acceptor wins" is only meaningful if
	 * later filters don't run once an earlier one has claimed the event.
	 *
	 * Returns a plain boolean while every filter it has consulted was synchronous, and a promise
	 * only once one actually suspends - the same contract {@link Collector.offer} keeps, for the
	 * same reason. A bot whose filters are all synchronous never leaves the `emit` that triggered
	 * it, which is what lets {@link CollectorManager.dispatchInteraction} keep its fast path.
	 */
	offer(args: unknown[]): Awaitable<boolean> {
		return this.#offerFrom(this.#collectors[Symbol.iterator](), args);
	}

	/**
	 * {@link offer} from wherever `collectors` has reached, resuming here when a filter suspended.
	 *
	 * The iterator is the live one over `#collectors` rather than a snapshot, which costs nothing
	 * per event and stays correct across a suspension: a collector stopped while an earlier filter
	 * was awaiting is skipped rather than offered. The other side of that coin is that a collector
	 * *created* during the await is consulted too - a collector created from inside another
	 * collector's filter can therefore see the event that created it.
	 */
	#offerFrom(collectors: Iterator<AnyCollector>, args: unknown[]): Awaitable<boolean> {
		for (let next = collectors.next(); next.done !== true; next = collectors.next()) {
			const taken = this.#offerTo(next.value, args);

			// the first filter that suspends puts the rest of the walk on a continuation, so the
			// collectors behind it are still consulted in order, just a microtask later
			if (taken instanceof Promise) {
				return taken.then((claimed) => claimed || this.#offerFrom(collectors, args));
			}
			if (taken) return true;
		}

		return false;
	}

	/**
	 * Offers `args` to one collector, absorbing anything it throws.
	 *
	 * The dispatcher settles arbitration *before* emitting an interaction, so without this a
	 * throwing filter or `collect` handler takes the whole interaction down with it - no
	 * `InteractionCreate`, no type-specific event, no response, and the user sees "This
	 * interaction failed". A broken collector declines instead, and everyone behind it still runs.
	 */
	#offerTo(collector: AnyCollector, args: unknown[]): Awaitable<boolean> {
		try {
			const taken = collector.offer(args);
			return taken instanceof Promise ? taken.catch((error) => this.#decline(error)) : taken;
		} catch (error) {
			return this.#decline(error);
		}
	}

	/** Reports a collector that threw and declines on its behalf */
	#decline(error: unknown): false {
		console.error(`Error in collector for event "${this.#event}":`, error);
		return false;
	}

	#onEvent(args: unknown[]): void {
		const interaction = args[0];

		// claimable events are offered by the dispatcher before the client emits them, so the
		// listener must not collect them a second time on the way back through
		if (this.#manager.wasOffered(interaction)) return;

		// nothing to arbitrate over a `MessageCreate` - every collector that wants the message
		// gets it. The same goes for a claimable event emitted with something that is not an
		// interaction, which has nothing to mark or flag. `#offerTo` never rejects, so voiding it
		// here cannot leave an unhandled rejection behind, and a synchronous filter still collects
		// during this emit.
		if (!this.#arbitrated || typeof interaction !== "object" || interaction === null) {
			for (const collector of this.#collectors) void this.#offerTo(collector, args);
			return;
		}

		// an interaction that reached a hub without passing through the dispatcher - a direct
		// `client.emit(ClientEvents.ButtonUsed, interaction)`. It still gets exactly one claimer,
		// because two collectors both replying is a `40060` either way, and it goes through the
		// manager rather than straight to this hub's collectors so that the priority is the same
		// one the dispatcher applies: `InteractionCreate` collectors first, this event's second.
		// `offerInteraction` also marks it offered, so a second emit for the same object stands
		// down rather than arbitrating it again.
		//
		// The generic hub passes `null`, because resolving an interaction's concrete event needs
		// `instanceof` and so cannot happen here - a raw `emit(InteractionCreate, interaction)`
		// reaches generic collectors only.
		//
		// What this path cannot give is the dispatcher's ordering guarantee: the emit is already
		// under way, so handlers registered ahead of this listener have run before `claimed` is
		// assigned. Only the dispatcher can settle ownership before anything is emitted.
		const claimed = this.#manager.offerInteraction(
			interaction,
			this.#event === ClientEvents.InteractionCreate ? null : this.#event
		);
		if (claimed instanceof Promise) void claimed.then((taken) => MarkClaimed(interaction, taken));
		else MarkClaimed(interaction, claimed);
	}

	#checkAccumulation(): void {
		// `resetTimer` can bound a collector after `add` classified it, so this set is a candidate
		// list rather than an answer - without the prune, ten collectors given a `time` right after
		// construction still trip a warning that says none of them will ever stop. Bounded is
		// one-way (`resetTimer` only ever sets `time`/`idle`, `max` is readonly), so pruning is the
		// only correction ever needed.
		for (const collector of this.#unbounded) {
			if (collector.bounded) this.#unbounded.delete(collector);
		}

		if (this.#unbounded.size <= this.#manager.maxUnbounded) return;

		this.#warned = true;
		console.warn(
			`${this.#unbounded.size} collectors on "${this.#event}" have no \`time\`, \`idle\` or \`max\`, ` +
			`so none of them will ever stop on their own. If these are created per command or per ` +
			`message, they are accumulating - give them a bound, or call \`.stop()\` when the flow they ` +
			`belong to ends. Set \`client.collectors.maxUnbounded = 0\` to silence this.\n` +
			`Most recent one created at:\n${this.#lastSite ?? "<no stack available>"}`
		);
	}

	#destroy(): void {
		this.#emitter.off(this.#event, this.#listener);
		this.#manager.releaseHub(this.#emitter, this.#event);
	}
}

/**
 * Owns every {@link Collector} created against this client, and arbitrates which one gets an
 * interaction.
 *
 * Two problems live here. The first is listener accumulation: collectors share one emitter
 * listener per event via {@link CollectorHub} instead of attaching their own. The second is
 * response arbitration - a component interaction can only be acknowledged once, so when a
 * collector is waiting for a button click *and* a registered `ButtonUsed` handler would reply
 * to it, exactly one of them has to win. Collectors get first refusal (see
 * {@link offerInteraction}) and the interaction is flagged `claimed` for everyone downstream.
 *
 * Arbitration has to be able to suspend, since a filter may be async, which is why
 * {@link dispatchInteraction} also owns the emit: the gateway does not await dispatches, so
 * without it two interactions a millisecond apart could be emitted in either order.
 */
export class CollectorManager {
	client: Client;

	/**
	 * How many unbounded collectors (no `time`, no `idle`, no `max`) may share one event before the
	 * manager warns that they are accumulating. Set to `0` to disable the warning entirely.
	 *
	 * Defaults to 10, matching node's own `MaxListenersExceededWarning` threshold - but unlike
	 * that warning this one only counts collectors that can never stop on their own, so a bot
	 * with a dozen deliberately long-lived collectors stays quiet.
	 */
	maxUnbounded = 10;

	/** Options merged under every collector's own, from `ClientOptions.collectorDefaults` */
	defaults: CollectorDefaults;

	readonly #hubs = new Map<AnyEmitter, Map<string, CollectorHub>>();

	/**
	 * Interactions that have already been through arbitration, whether by the dispatcher or by a
	 * hub's own listener. Weak so a finished interaction is not retained; membership is what tells
	 * a hub's listener to stand down when the client emits an interaction already arbitrated.
	 */
	readonly #offered = new WeakSet<object>();

	/**
	 * The interaction currently being arbitrated and emitted, and everything queued behind it, per
	 * ordering scope. Entries exist only while something is actually queued in that scope - see
	 * {@link dispatchInteraction}.
	 */
	readonly #tails = new Map<string, Promise<void>>();

	/**
	 * Bumped by {@link clear}, so anything already queued behind a suspended filter can tell that
	 * the client it was going to be emitted on has been torn down since.
	 */
	#generation = 0;

	constructor(client: Client, defaults: CollectorDefaults = {}) {
		this.client = client;
		this.defaults = defaults;
	}

	/**
	 * Resolves the source and options for a new collector. Called by `createCollector`; not
	 * intended to be called directly.
	 * @param emitter The emitter the collector is being created against.
	 * @param event The event being collected.
	 * @param options The caller's options, which client-level defaults are merged underneath.
	 * @param useDefaults Whether `collectorDefaults` applies. False for the library's own
	 * collectors - `collectorDefaults` is a policy over a bot's collectors, and letting it reach
	 * `Members.fetchGateway` or `Client.login` silently truncates a member fetch or fails a login.
	 *
	 * @internal Not intended for use outside the library.
	 */
	prepare<TArgs extends unknown[]>(
		emitter: AnyEmitter,
		event: string,
		options: CollectorOptions<TArgs>,
		useDefaults = true
	): { source: CollectorSource<TArgs>; options: CollectorOptions<TArgs> } {
		return {
			source: this.hubFor(emitter, event) as unknown as CollectorSource<TArgs>,
			options: useDefaults ? { ...this.defaults, ...options } : options,
		};
	}

	/**
	 * Returns the hub for an `(emitter, event)` pair, creating it if this is the first collector.
	 * @internal Not intended for use outside the library.
	 */
	hubFor(emitter: AnyEmitter, event: string): CollectorHub {
		let events = this.#hubs.get(emitter);
		if (!events) {
			events = new Map();
			this.#hubs.set(emitter, events);
		}

		let hub = events.get(event);
		if (!hub) {
			hub = new CollectorHub(this, emitter, event);
			events.set(event, hub);
		}

		return hub;
	}

	/**
	 * Drops a hub once its last collector has stopped. Called by the hub itself.
	 * @internal Not intended for use outside the library.
	 */
	releaseHub(emitter: AnyEmitter, event: string): void {
		const events = this.#hubs.get(emitter);
		if (!events) return;

		events.delete(event);
		if (events.size === 0) this.#hubs.delete(emitter);
	}

	/**
	 * Whether this interaction has already been through arbitration.
	 * @internal Not intended for use outside the library.
	 */
	wasOffered(value: unknown): boolean {
		return typeof value === "object" && value !== null && this.#offered.has(value);
	}

	/**
	 * Records that this interaction has been through arbitration, so hub listeners stand down.
	 * @internal Not intended for use outside the library.
	 */
	markOffered(value: unknown): void {
		if (typeof value !== "object" || value === null) return;

		this.#offered.add(value);
	}

	/**
	 * Arbitrates an interaction and then emits it, in the order interactions arrived.
	 *
	 * The gateway hands dispatches over without awaiting them (`WSClient` calls `dispatch()`
	 * fire-and-forget), so the moment arbitration can suspend, two interactions that arrived a
	 * millisecond apart can finish in either order - a `max: 1` collector would take whichever
	 * filter resolved first rather than whichever click happened first. Arbitration and the emit
	 * that follows it therefore run as one unit, one interaction at a time.
	 *
	 * The queue only exists once something actually suspends. While every filter is synchronous
	 * - the overwhelmingly common case, and the only case there was before arbitration existed -
	 * this stays on the fast path below and emits inside the dispatch that delivered it.
	 *
	 * Ordering is only enforced as far as it has to be, because the queue is also a stall: an
	 * interaction waiting on a slow filter holds up everything on the same queue. Two interactions
	 * can only contend for one collector if some collector could claim them both, so
	 * {@link #scopeFor} puts them on the same queue only when that is true - a four second
	 * `ButtonUsed` filter no longer delays the slash commands arriving behind it, which would blow
	 * Discord's three second deadline on commands that have nothing to do with the collector.
	 *
	 * There is deliberately no timeout on arbitration itself: one that gave up and emitted the
	 * interaction unclaimed could still have its filter resolve afterwards and collect, leaving the
	 * collector *and* the handler both replying - the `40060` this whole mechanism exists to
	 * prevent, back again and now intermittent. Filters are expected to be cheap.
	 *
	 * This is also the entry point a custom `INTERACTION_CREATE` handler (one registered through
	 * `CreateDispatch`'s overrides) has to call rather than emitting the interaction itself, or
	 * collectors never get their first refusal and `interaction.claimed` is never set.
	 * @param interaction The interaction being dispatched.
	 * @param event The concrete client event for this interaction's type, or `null` if it has none.
	 * @param emit Emits the interaction to ordinary handlers. Runs once arbitration has settled.
	 */
	dispatchInteraction(interaction: object, event: string | null, emit: () => void): Awaitable<void> {
		const scope = this.#scopeFor(event);

		// no collector can claim this one, so there is no arbitration to settle and no ordering to
		// keep. Still marked offered, so a hub created by one of the handlers below stands down on
		// the rest of this emit rather than collecting an interaction already gone out unclaimed.
		if (scope === null) {
			this.#offered.add(interaction);
			MarkClaimed(interaction, false);
			emit();
			return;
		}

		const tail = this.#tails.get(scope);
		if (tail === undefined) {
			const settling = this.#arbitrateAndEmit(interaction, event, emit);

			// nothing suspended and nothing was queued ahead of it, so this interaction cannot be
			// overtaken by a later one - there is no ordering left to enforce
			if (!(settling instanceof Promise)) return;

			return this.#extend(scope, settling);
		}

		const generation = this.#generation;
		return this.#extend(scope, tail.then(() => {
			// `clear()` ran while this was queued: the collectors are stopped and the client is
			// mid-`destroy()`, with its caches already emptied, so emitting into it now would hand
			// handlers a half-torn-down client
			if (generation !== this.#generation) return;

			return this.#arbitrateAndEmit(interaction, event, emit);
		}));
	}

	/**
	 * The queue an interaction has to stay ordered within, or `null` when no collector could claim
	 * it and it needs no queue at all.
	 *
	 * A generic `InteractionCreate` collector can claim any interaction, so once one exists every
	 * interaction shares a single order. Without one, only interactions of the same concrete type
	 * can reach the same collector, so each event orders independently.
	 */
	#scopeFor(event: string | null): string | null {
		const events = this.#hubs.get(this.client as unknown as AnyEmitter);
		if (!events) return null;

		if (events.has(ClientEvents.InteractionCreate)) return "*";

		return event !== null && events.has(event) ? event : null;
	}

	/** Settles ownership of one interaction and emits it, synchronously where it can */
	#arbitrateAndEmit(interaction: object, event: string | null, emit: () => void): Awaitable<void> {
		const claimed = this.offerInteraction(interaction, event);
		if (!(claimed instanceof Promise)) {
			MarkClaimed(interaction, claimed);
			emit();
			return;
		}

		return claimed.then((taken) => {
			MarkClaimed(interaction, taken);
			emit();
		});
	}

	/**
	 * Appends one settled-and-emitted interaction to its scope's queue.
	 *
	 * The failure is swallowed rather than propagated because the tail is what every later
	 * interaction chains onto: one handler throwing would otherwise leave a rejected tail and
	 * silently drop every interaction behind it.
	 */
	#extend(scope: string, running: Promise<void>): Promise<void> {
		const settled = running.catch((error) => {
			console.error(`Error in handler for event "${GatewayEvents.InteractionCreate}":`, error);
		});

		this.#tails.set(scope, settled);
		void settled.then(() => {
			// nothing is queued behind this one, so the scope goes back to the synchronous path and
			// its entry stops being worth holding - the same bookkeeping `Rest.#enqueue` does
			if (this.#tails.get(scope) === settled) this.#tails.delete(scope);
		});

		return settled;
	}

	/**
	 * Gives collectors first refusal on an interaction, before it is emitted to ordinary
	 * handlers.
	 *
	 * Generic `InteractionCreate` collectors are offered first, then the concrete event's, and
	 * the first collector whose filter passes takes it - so two collectors racing for the same
	 * button can no longer both reply to it either. The return value becomes
	 * `interaction.claimed`, which handlers check to decide whether the interaction is already
	 * somebody else's to answer.
	 *
	 * Only interaction events go through here; a `MessageCreate` collector has no exclusivity to
	 * arbitrate and keeps the plain listener path.
	 * @param interaction The interaction to offer.
	 * @param event The concrete client event for this interaction's type. `null` for an
	 * interaction with no type-specific event, which is still offered to `InteractionCreate`
	 * collectors rather than skipping arbitration altogether.
	 *
	 * @internal Not intended for use outside the library - {@link dispatchInteraction} is the entry
	 * point, since arbitration on its own settles ownership without emitting anything.
	 */
	offerInteraction(interaction: object, event: string | null): Awaitable<boolean> {
		this.#offered.add(interaction);

		const events = this.#hubs.get(this.client as unknown as AnyEmitter);
		if (!events) return false;

		const generic = events.get(ClientEvents.InteractionCreate);
		const concrete = event !== null ? events.get(event) : undefined;
		const args = [interaction];

		// sync-preserving in the same way `CollectorHub.offer` is: the generic hub suspending is
		// what moves the concrete event's hub onto a continuation, and a bot whose filters are all
		// synchronous never leaves the dispatch that delivered the interaction
		if (!generic) return concrete ? concrete.offer(args) : false;

		const taken = generic.offer(args);
		if (taken instanceof Promise) {
			return taken.then((claimed) => claimed || (concrete ? concrete.offer(args) : false));
		}

		return taken || (concrete ? concrete.offer(args) : false);
	}

	/**
	 * Stops every live collector on this client. Called by `client.destroy()`.
	 *
	 * Anything queued behind a suspended filter is dropped rather than emitted afterwards: by the
	 * time it would run, `destroy()` has already cleared the guild and user caches, so handlers
	 * would be handed a half-torn-down client.
	 */
	clear(): void {
		for (const events of [...this.#hubs.values()]) {
			for (const hub of [...events.values()]) {
				// stop() removes each collector from its hub, which drops the hub when it empties
				for (const collector of hub.collectors) collector.stop();
			}
		}

		this.#hubs.clear();
		this.#tails.clear();
		this.#generation++;
	}
}
