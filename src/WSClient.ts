import { EventEmitter } from "node:events";
import { platform } from "node:os";
import WebSocket from "ws";
import { GatewayCloseCodes, GatewayOpCodes, GatewayPayload } from "./Types/DiscordGateway.js";
import { Client } from "./Client.js";
import { CreateDispatch, DispatchFunction, EventCallback } from "./EventDispatcher.js";
import { GatewayEventName, JSONObject } from "./Types/Internal.js";

/**
 * Events emitted by {@link WSClient}, separate from the Discord gateway events dispatched via `dispatch()`.
 * These mirror {@link GatewayOpCodes} rather than the higher-level `t` dispatch names.
 */
export const WSEvents = {
	/** Fired for every raw gateway payload received, before any op-specific handling */
	Raw: "Raw",
	/** Mirrors op `Heartbeat` (1) - fired each time a heartbeat is sent to the gateway, whether scheduled or server-requested */
	Heartbeat: "Heartbeat",
	/** Mirrors op `Reconnect` (7) - the gateway is asking the client to reconnect and resume */
	Reconnect: "Reconnect",
	/** Mirrors op `InvalidSession` (9) - `resumable` reflects whether the session can be resumed instead of re-identified */
	InvalidSession: "InvalidSession",
	/** Mirrors op `Hello` (10) - fired once per connection with the heartbeat interval to use */
	Hello: "Hello",
	/** Mirrors op `HeartbeatACK` (11) - fired when the gateway acknowledges a heartbeat */
	HeartbeatAck: "HeartbeatAck",
	/** Fired when the gateway sends the `READY` dispatch, indicating successful authentication */
	Ready: "Ready",
	/** Fired when the gateway sends the `RESUMED` dispatch, indicating a successful session resume */
	Resumed: "Resumed",
	/** Fired when the underlying `ws` socket emits an `error` (ECONNRESET, TLS failure, bad handshake, etc) */
	Error: "Error",
	/**
	 * Fired when the client stops reconnecting for good - either Discord rejected the connection in a
	 * way retrying cannot fix (bad token, disallowed intents) or every reconnect attempt was used up.
	 * The socket is dead at this point and will not come back without another `initialize()`.
	 */
	Disconnect: "Disconnect",
} as const;

export type WSEventMap = {
	[WSEvents.Raw]: [data: unknown];
	[WSEvents.Heartbeat]: [];
	[WSEvents.Reconnect]: [];
	[WSEvents.InvalidSession]: [resumable: boolean];
	[WSEvents.Hello]: [heartbeatInterval: number];
	[WSEvents.HeartbeatAck]: [];
	[WSEvents.Ready]: [];
	[WSEvents.Resumed]: [];
	[WSEvents.Error]: [error: Error];
	[WSEvents.Disconnect]: [reason: string, code: number | null];
};

/**
 * Close codes where reconnecting is pointless - the `IDENTIFY` payload itself is the problem, so
 * every retry fails identically while eating into the daily session start limit.
 */
const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set([
	GatewayCloseCodes.AuthenticationFailed,
	GatewayCloseCodes.InvalidShard,
	GatewayCloseCodes.ShardingRequired,
	GatewayCloseCodes.InvalidAPIVersion,
	GatewayCloseCodes.InvalidIntents,
	GatewayCloseCodes.DisallowedIntents
]);

/** Close codes that kill the session but not the credentials - reconnect, but `IDENTIFY` instead of `RESUME` */
const NON_RESUMABLE_CLOSE_CODES: ReadonlySet<number> = new Set([
	GatewayCloseCodes.InvalidSeq,
	GatewayCloseCodes.SessionTimedOut
]);

/** Delay before the second reconnect attempt; each further attempt doubles it up to `RECONNECT_MAX_DELAY` */
const RECONNECT_BASE_DELAY = 1_000;
/** Ceiling for a single reconnect delay, no matter how many attempts have failed */
const RECONNECT_MAX_DELAY = 60_000;
/**
 * Discord requires a randomized 1-5 second wait after an `INVALID_SESSION` before re-identifying,
 * so that a mass invalidation does not turn into a synchronized stampede of `IDENTIFY`s.
 */
const INVALID_SESSION_MIN_DELAY = 1_000;
const INVALID_SESSION_MAX_DELAY = 5_000;

export type WSOptions = {
	/**
	 * Manual override for `jitter`, a value between 0 and 1.
	 * This is used in conjunction with `heartbeatInterval`.
	 * A small value will send heartbeats faster but too low may result in rate limits.
	 *
	 * @default Math.random()
	 */
	jitterOverride?: number;
	/**
	 * A bitfield of desired gateway intents.
	 * Some may require special access from Discord.
	 *
	 * These intents dictate what events you are able to receive.
	 *
	 * @see {GatewayIntents}
	 */
	intents?: number;

	/**
	 * Per-event handler overrides, keyed by gateway event name, used in place of the library's
	 * built-in handler for that event. Passed straight through to {@link CreateDispatch}.
	 */
	eventOverrides?: Partial<Record<GatewayEventName, EventCallback>>

	/**
	 * How many times to retry a dropped connection before giving up and emitting
	 * {@link WSEvents.Disconnect}. The counter resets on every successful `READY`/`RESUMED`,
	 * so this is a cap on consecutive failures, not on reconnects over the client's lifetime.
	 *
	 * Retries use exponential backoff with jitter, starting at one second and capping at one minute.
	 *
	 * @default 10
	 */
	maxReconnectAttempts?: number;
}

/**
 * Manages the raw Discord gateway websocket connection: identifying, heartbeating, and
 * dispatching incoming payloads to event handlers. One `WSClient` backs each {@link Client}.
 */
export class WSClient extends EventEmitter<WSEventMap> {
	#token: string | null = null;
	#socket: WebSocket | null;
	#sequence: number | null;
	#heartbeatTimer: NodeJS.Timeout | null = null;
	#heartbeatAcked: boolean = true;
	#sessionId: string | null = null;
	#resumeGatewayUrl: string | null = null;
	#destroyed: boolean = false;
	#reconnectTimer: NodeJS.Timeout | null = null;
	#reconnectAttempts: number = 0;

	/** Interval in milliseconds between heartbeats, set from the gateway's `HELLO` payload; `-1` until connected */
	heartbeatInterval: number;
	/** Randomization factor (0–1) applied to `heartbeatInterval` for the first heartbeat delay */
	jitter: number;
	/** Gateway intents bitfield sent on `IDENTIFY`, controlling which events Discord sends */
	intents: number;
	/** Consecutive reconnect attempts allowed before the client gives up, see {@link WSOptions.maxReconnectAttempts} */
	maxReconnectAttempts: number;

	/** Whether Discord authentication has completed */
	ready: boolean;

	/** The {@link Client} this websocket belongs to, passed to dispatched event handlers */
	client: Client;
	/** Handler that routes incoming gateway events to their registered callbacks */
	dispatch: DispatchFunction;

	constructor(client: Client, options: WSOptions) {
		super();

		this.#token = null;
		this.#socket = null;
		this.#sequence = null;

		this.heartbeatInterval = -1;
		this.jitter = options.jitterOverride ?? Math.random();
		this.intents = options.intents ?? 0;
		this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;

		this.ready = false;

		this.client = client;
		this.dispatch = CreateDispatch(options.eventOverrides);
	}

	/**
	 * Sets the token for internal use. Set automatically with `client.login()`, not intended for public use.
	 * Changing the token during runtime has no effect due to the nature of websocket connections.
	 */
	setToken(token: string): void {
		this.#token = token;
	}

	/** Start the websocket connection, not intended for public use */
	initialize(): void {
		if (this.#token === null) throw new Error("No token provided - Did you add one via setToken()?");
		if (this.#socket) return; // already connected / connecting

		this.#destroyed = false;
		// connecting now supersedes any reconnect that was still waiting out its backoff
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}

		const baseUrl = this.#resumeGatewayUrl ?? "wss://gateway.discord.gg";
		const socket = new WebSocket(`${baseUrl}?v=10&encoding=json`);
		this.#socket = socket;

		socket.on("message", (raw) => this.#handleMessage(raw.toString()));
		socket.on("error", (err) => this.emit(WSEvents.Error, err));
		socket.on("close", (code?: number) => this.#handleClose(code));
	}

	/**
	 * Handles an unexpected close (network drop, Discord-initiated close, etc). Paths that close the
	 * socket deliberately (`#reconnect`, op 7/9) call `removeAllListeners()` first, so they never
	 * reach here - anything that does was not our doing, and the close code decides what happens next.
	 */
	#handleClose(code?: number): void {
		this.#teardownConnection();

		// closed by destroy() - stay down
		if (this.#destroyed) return;

		if (typeof code === "number" && FATAL_CLOSE_CODES.has(code)) {
			// Discord rejected the IDENTIFY itself; retrying sends the same bad payload forever
			// and burns the session start limit doing it, so stop here.
			this.#giveUp(`Gateway closed with code ${code}, which cannot be recovered by reconnecting`, code);
			return;
		}

		if (typeof code === "number" && NON_RESUMABLE_CLOSE_CODES.has(code)) this.#invalidateSession();

		this.#reconnect();
	}

	/**
	 * Closes the current socket and schedules a new one, resuming the session if one is available.
	 *
	 * Each consecutive attempt waits longer than the last (exponential backoff with jitter, capped at
	 * {@link RECONNECT_MAX_DELAY}) so a gateway that keeps hanging up is not hammered, and the client
	 * gives up entirely after {@link maxReconnectAttempts}. The counter resets once a connection
	 * succeeds, see {@link #connectionSucceeded}.
	 *
	 * @param minimumDelay Floor for the wait, used where the protocol mandates one (op 9 -> 1-5s)
	 */
	#reconnect(minimumDelay: number = 0): void {
		this.#teardownConnection();

		if (this.#reconnectAttempts >= this.maxReconnectAttempts) {
			this.#giveUp(`Failed to reconnect to the gateway after ${this.#reconnectAttempts} attempts`, null);
			return;
		}

		// full jitter: attempt 0 reconnects immediately, later ones spread out over their window so
		// a fleet of clients dropped by the same outage does not come back in lockstep
		const backoff = this.#reconnectAttempts === 0
			? 0
			: Math.min(RECONNECT_BASE_DELAY * 2 ** (this.#reconnectAttempts - 1), RECONNECT_MAX_DELAY) * Math.random();

		this.#reconnectAttempts++;

		this.#reconnectTimer = setTimeout(() => {
			this.#reconnectTimer = null;
			if (this.#destroyed) return;
			this.initialize();
		}, Math.max(minimumDelay, backoff)).unref();
	}

	/** Clears everything tied to the current connection, leaving the session (if any) intact for a resume */
	#teardownConnection(): void {
		if (this.#socket) {
			this.#socket.removeAllListeners();
			this.#socket.close();
			this.#socket = null;
		}
		if (this.#heartbeatTimer) {
			clearInterval(this.#heartbeatTimer);
			this.#heartbeatTimer = null;
		}
		this.ready = false;
		this.heartbeatInterval = -1;
	}

	/** Drops the resume state so the next `HELLO` sends a fresh `IDENTIFY` instead of a `RESUME` */
	#invalidateSession(): void {
		this.#sessionId = null;
		this.#resumeGatewayUrl = null;
		this.#sequence = null;
	}

	/** Stops reconnecting for good and tells listeners why */
	#giveUp(reason: string, code: number | null): void {
		this.#destroyed = true;
		this.#invalidateSession();
		this.#reconnectAttempts = 0;
		this.emit(WSEvents.Disconnect, reason, code);
	}

	/** Marks the connection as authenticated, clearing the backoff so the next drop retries promptly */
	#connectionSucceeded(): void {
		this.ready = true;
		this.#reconnectAttempts = 0;
	}

	/** Send a message to discord via gateway */
	send(msg: GatewayPayload): void {
		this.#checkInitialization();
		this.#socket!.send(JSON.stringify(msg));
	}

	/**
	 * Parses an incoming gateway frame, tracks the sequence number, handles `HELLO` locally, and
	 * otherwise forwards named dispatch events to {@link dispatch}.
	 */
	#handleMessage(rawData: string): void {
		let data: GatewayPayload;
		try {
			data = JSON.parse(rawData) as GatewayPayload;
		} catch {
			// malformed frame - not a protocol violation worth reconnecting over, just drop it
			return;
		}
		this.emit(WSEvents.Raw, data);

		if (typeof data.s === "number") this.#sequence = data.s;

		switch (data.op) {
			case GatewayOpCodes.Hello:
				return this.#handleHello(data.d);
			case GatewayOpCodes.Heartbeat:
				// gateway is asking for an out-of-cycle heartbeat
				this.#sendHeartbeat();
				return;
			case GatewayOpCodes.HeartbeatACK:
				this.#heartbeatAcked = true;
				this.emit(WSEvents.HeartbeatAck);
				return;
			case GatewayOpCodes.Reconnect:
				this.emit(WSEvents.Reconnect);
				this.#reconnect();
				return;
			case GatewayOpCodes.InvalidSession:
				// d indicates whether the session is resumable; if not, drop it and re-identify
				this.emit(WSEvents.InvalidSession, data.d === true);
				if (data.d !== true) this.#invalidateSession();
				// Discord mandates a randomized 1-5s wait here before reconnecting, otherwise the
				// re-IDENTIFY counts against the session start limit as an abusive burst
				this.#reconnect(
					INVALID_SESSION_MIN_DELAY + Math.random() * (INVALID_SESSION_MAX_DELAY - INVALID_SESSION_MIN_DELAY)
				);
				return;
		}

		if (!data.t) {
			return;
		}

		if (data.t === "RESUMED") {
			this.#connectionSucceeded();
			this.emit(WSEvents.Resumed);
			return;
		}

		if (!data.d || typeof data.d !== "object") {
			return;
		}

		if (data.t === "READY") {
			this.#connectionSucceeded();
			this.emit(WSEvents.Ready);
			const readyData = data.d as JSONObject;
			if (typeof readyData.session_id === "string") this.#sessionId = readyData.session_id;
			if (typeof readyData.resume_gateway_url === "string") this.#resumeGatewayUrl = readyData.resume_gateway_url;
		}

		this.dispatch(this.client, data.t, data.d as JSONObject);
	}

	/**
	 * Handles the gateway's `HELLO` payload: starts the heartbeat interval (scaled by `jitter`)
	 * and sends the `IDENTIFY` payload to begin authentication.
	 */
	#handleHello(data: unknown): void {
		if (!this.#isHelloPayload(data)) return;

		this.heartbeatInterval = data.heartbeat_interval;
		this.#heartbeatAcked = true;
		this.emit(WSEvents.Hello, data.heartbeat_interval);

		const beat = () => {
			if (!this.#heartbeatAcked) {
				// gateway never acked the last heartbeat - connection is dead, reconnect
				this.#reconnect();
				return;
			}
			this.#sendHeartbeat();
		};

		// gateway contract: first heartbeat after interval * jitter, then every interval after that
		this.#heartbeatTimer = setTimeout(() => {
			beat();
			this.#heartbeatTimer = setInterval(beat, this.heartbeatInterval).unref();
		}, this.heartbeatInterval * this.jitter).unref();

		if (this.#sessionId) {
			this.send({
				op: GatewayOpCodes.Resume,
				d: {
					token: this.#token,
					session_id: this.#sessionId,
					seq: this.#sequence
				},
				t: null,
				s: null
			});
			return;
		}

		this.send({
			op: GatewayOpCodes.Identify,
			d: {
				token: this.#token,
				properties: {
					os: platform(),
					browser: "Node.js",
					device: process.env.npm_package_name ?? "SimplyJS",
				},
				intents: this.intents
			},
			t: null,
			s: null
		});
	}

	/** Sends a heartbeat payload and marks the current one as unacknowledged until `HeartbeatACK` arrives */
	#sendHeartbeat(): void {
		this.#heartbeatAcked = false;
		this.send({
			op: GatewayOpCodes.Heartbeat,
			d: this.#sequence,
			t: null,
			s: null
		});
		this.emit(WSEvents.Heartbeat);
	}

	/** Type guard confirming a `HELLO` payload carries a numeric `heartbeat_interval` */
	#isHelloPayload(data: unknown): data is { heartbeat_interval: number } {
		if (typeof data !== "object" || data === null) return false;
		if (!("heartbeat_interval" in data)) return false;
		return typeof data.heartbeat_interval === "number";
	}

	/** Guards against sending before {@link setToken} and {@link initialize} have both run */
	#checkInitialization(): void {
		if (!this.#token) throw new Error("Token not provided");
		if (!this.#socket) throw new Error("Websocket client not initialized");
	}

	/** Kills the websocket connection and logs out */
	destroy(): void {
		this.#destroyed = true;
		if (this.#heartbeatTimer) {
			clearInterval(this.#heartbeatTimer);
			this.#heartbeatTimer = null;
		}
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}
		this.#reconnectAttempts = 0;
		this.#sessionId = null;
		this.#resumeGatewayUrl = null;
		if (this.#socket) this.#socket.close()
	}
}