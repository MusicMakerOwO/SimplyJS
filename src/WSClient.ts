import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { GatewayOpCodes, GatewayPayload } from "./Types/DiscordGateway.js";
import { Client } from "./Client.js";
import { CreateDispatch, DispatchFunction, EventCallback } from "./EventDispatcher.js";
import { GatewayEventName, JSONObject } from "./Types/Internal.js";

export type WSEvents = {
	"RAW": [data: unknown];
	"HEARTBEAT": [];
	"HEARTBEAT_ACK": [];
}

export type WSOptions = {
	/**
	 * Manual override for `jitter`, a value between 0 and 1.
	 * This is used in conjunction with `heartbeat_interval`.
	 * A small value will send heartbeats faster but too low may result in rate limits.
	 *
	 * @default Math.random()
	 */
	jitter_override?: number;
	/**
	 * A bitfield of desiree gateway intents.
	 * Some may require special access from Discord.
	 *
	 * These intents dictate what events you are able to recieve.
	 *
	 * @see {GatewayIntents}
	 */
	intents?: number;

	eventOverrides?: Partial<Record<GatewayEventName, EventCallback>>
}

export class WSClient extends EventEmitter<WSEvents> {
	#token: string | null = null;
	#socket: WebSocket | null;
	#sequence: number | null;

	heartbeat_interval: number;
	jitter: number;
	intents: number;

	/** Whether Discord authentication has completed */
	ready: boolean;

	client: Client;
	dispatch: DispatchFunction;

	constructor(client: Client, options: WSOptions) {
		super();

		this.#token = null;
		this.#socket = null;
		this.#sequence = null;

		this.heartbeat_interval = -1;
		this.jitter = options.jitter_override ?? Math.random();
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
			this.heartbeat_interval = -1;
		});
	}

	/** Send a message to discord via gateway */
	send(msg: GatewayPayload): void {
		this.#checkInitialization();
		this.#socket!.send(JSON.stringify(msg));
	}

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

	#handleHello(data: unknown): void {
		if (!this.#isHelloPayload(data)) return;

		this.heartbeat_interval = data.heartbeat_interval;

		setInterval(() => {
			this.send({
				op: GatewayOpCodes.Heartbeat,
				d: this.#sequence,
				t: null,
				s: null
			});
			this.emit("HEARTBEAT");
		}, this.heartbeat_interval * this.jitter).unref();

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

	#isHelloPayload(data: unknown): data is { heartbeat_interval: number } {
		if (typeof data !== "object" || data === null) return false;
		if (!("heartbeat_interval" in data)) return false;
		return typeof data.heartbeat_interval === "number";
	}

	#checkInitialization(): void {
		if (!this.#token) throw new Error("Token not provided");
		if (!this.#socket) throw new Error("Rest client not initialized");
	}

	/** Kills the websocket connection and logs out */
	destroy(): void {
		if (this.#socket) this.#socket.close()
	}
}