import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { GatewayOpCodes, GatewayPayload } from "./Types/DiscordGateway.js";
import { Client } from "./Client.js";
import { CreateDispatch, DispatchFunction, EventCallback } from "./EventDispatcher.js";
import { GatewayEventName, JSONObject } from "./Types/Internal.js";

/** Events emitted by {@link WSClient}, separate from the Discord gateway events dispatched via `dispatch()`. */
export type WSEvents = {
	/** Fired for every raw gateway payload received, before any dispatch handling */
	"RAW": [data: unknown];
	/** Fired each time a heartbeat is sent to the gateway */
	"HEARTBEAT": [];
	/** Fired when the gateway acknowledges a heartbeat */
	"HEARTBEAT_ACK": [];
}

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
	 * A bitfield of desiree gateway intents.
	 * Some may require special access from Discord.
	 *
	 * These intents dictate what events you are able to recieve.
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
export class WSClient extends EventEmitter<WSEvents> {
	#token: string | null = null;
	#socket: WebSocket | null;
	#sequence: number | null;

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

		const socket = new WebSocket("wss://gateway.discord.gg");
		this.#socket = socket;

		socket.on("message", (raw) => this.#handleMessage(raw.toString()));
		socket.on("close", () => {
			this.ready = false;
			this.heartbeatInterval = -1;
		});
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
		this.emit("RAW", data);

		if (typeof data.s === "number") this.#sequence = data.s;
		if (data.op === GatewayOpCodes.Hello) return this.#handleHello(data.d);

		if (!data.t) {
			// not sure if I need to do anything here lol
			return;
		}
		if (!data.d || typeof data.d !== "object") {
			// not sure if I need to do anything here lol
			return;
		}

		if (data.t === "READY") {
			this.ready = true;
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

		setInterval(() => {
			this.send({
				op: GatewayOpCodes.Heartbeat,
				d: this.#sequence,
				t: null,
				s: null
			});
			this.emit("HEARTBEAT");
		}, this.heartbeatInterval * this.jitter).unref();

		this.send({
			op: GatewayOpCodes.Identify,
			d: {
				token: this.#token,
				properties: {
					os: "i use arch btw",
					browser: "python sucks",
					device: "ur mom",
				},
				intents: this.intents
			},
			t: null,
			s: null
		});
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
		if (this.#socket) this.#socket.close()
	}
}