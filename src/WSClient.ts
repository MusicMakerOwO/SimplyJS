import { EventEmitter } from "node:events";
import { platform } from "node:os";
import WebSocket from "ws";
import { GatewayOpCodes, GatewayPayload } from "./Types/DiscordGateway.js";
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
} as const;

export type WSEventMap = {
	[WSEvents.Raw]: [data: unknown];
	[WSEvents.Heartbeat]: [];
	[WSEvents.Reconnect]: [];
	[WSEvents.InvalidSession]: [resumable: boolean];
	[WSEvents.Hello]: [heartbeatInterval: number];
	[WSEvents.HeartbeatAck]: [];
	[WSEvents.Ready]: [];
};

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

	/** Interval in milliseconds between heartbeats, set from the gateway's `HELLO` payload; `-1` until connected */
	heartbeatInterval: number;
	/** Randomization factor (0–1) applied to `heartbeatInterval` for the first heartbeat delay */
	jitter: number;
	/** Gateway intents bitfield sent on `IDENTIFY`, controlling which events Discord sends */
	intents: number;

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

		const socket = new WebSocket(this.#resumeGatewayUrl ?? "wss://gateway.discord.gg");
		this.#socket = socket;

		socket.on("message", (raw) => this.#handleMessage(raw.toString()));
		socket.on("close", () => {
			this.ready = false;
			this.heartbeatInterval = -1;
			this.#socket = null;
			if (this.#heartbeatTimer) {
				clearInterval(this.#heartbeatTimer);
				this.#heartbeatTimer = null;
			}
		});
	}

	/** Closes the current socket and opens a new one, resuming the session if one is available */
	#reconnect(): void {
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
		this.initialize();
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
		const data = JSON.parse(rawData) as GatewayPayload;
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
				if (data.d !== true) {
					this.#sessionId = null;
					this.#resumeGatewayUrl = null;
				}
				this.#reconnect();
				return;
		}

		if (!data.t) {
			return;
		}
		if (!data.d || typeof data.d !== "object") {
			return;
		}

		if (data.t === "READY") {
			this.ready = true;
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

		this.#heartbeatTimer = setInterval(() => {
			if (!this.#heartbeatAcked) {
				// gateway never acked the last heartbeat - connection is dead, reconnect
				this.#reconnect();
				return;
			}
			this.#sendHeartbeat();
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
		if (!this.#socket) throw new Error("Rest client not initialized");
	}

	/** Kills the websocket connection and logs out */
	destroy(): void {
		if (this.#heartbeatTimer) {
			clearInterval(this.#heartbeatTimer);
			this.#heartbeatTimer = null;
		}
		this.#sessionId = null;
		this.#resumeGatewayUrl = null;
		if (this.#socket) this.#socket.close()
	}
}