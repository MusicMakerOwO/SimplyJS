import { Rest, RestOptions } from "./Rest.js";
import { WSClient, WSOptions, WSEvents } from "./WSClient.js";
import { ResolveIntents } from "./Intents.js";
import { ObjectValues } from "./Types/HelperTypes.js";
import { GatewayIntents, GatewayOpCodes } from "./Types/DiscordGateway.js";
import { GuildCache } from "./Managers/Guilds.js";
import { EventEmitter } from "node:events";
import { ClientEventMap } from "./Types/SimplyJSTypes.js";
import { User } from "./Structures/User.js";
import { UserCache } from "./Managers/Users.js";
import { CollectorDefaults, CollectorManager } from "./Managers/Collectors.js";
import { ActivityType, ClientActivity, PresenceStatus, Status } from "./Types/DiscordAPITypes.js";
import { ApplicationCommand, JSONArray } from "./Types/index.js";
import { awaitEventInternal } from "./Collector.js";
import { CheckListenerIntents, IsInternalListener } from "./Warnings.js";
import { ApplicationIdFromToken } from "./Utils.js";

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
}

/**
 * The entry point for interacting with Discord: owns the REST client, the gateway websocket,
 * and the top-level caches. Extends `EventEmitter` to surface gateway events by name.
 */
export class Client extends EventEmitter<ClientEventMap> {
	/** Exposed for interacting directly with Discord's WebSocket. Authorization is handled automatically for you */
	socket: WSClient;
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
	 * connection, and `client.socket` stops being a single connection once a process runs more
	 * than one shard.
	 */
	readonly intents: number;

	constructor(options: ClientOptions) {
		super();

		this.intents = ResolveIntents(options.intents);

		this.socket = new WSClient(this, {
			... options.ws,
			intents: this.intents,
		});
		this.rest = new Rest(options.rest);

		this.socket.setToken(options.token);
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

		this.id = ApplicationIdFromToken(options.token);
	}

	/** Start the WebSocket connection, promise resolves when authorization finishes */
	async login(): Promise<void> {
		this.socket.initialize();

		// pause execution until a ready event is recieved
		const ready = awaitEventInternal(this.socket, WSEvents.Ready, { time: 10_000 })
			.catch(() => {
				throw new Error("No ready event recieved within 10 seconds - Discord may be having an outage");
			});

		// a rejected connection (bad token, disallowed intents) will never produce a ready event, so
		// report what Discord actually said instead of blaming an outage ten seconds later
		const rejected = awaitEventInternal(this.socket, WSEvents.Disconnect, { time: 10_000 })
			.then(
				([reason]) => { throw new Error(`Failed to connect to the gateway - ${reason}`); },
				() => new Promise<never>(() => {}) // timed out waiting for a rejection, let `ready` decide
			);

		await Promise.race([ready, rejected]);
		if (this.status || this.activity) return this.#updatePresence();
	}

	/**
	 * Logs the bot out and clears cache.
	 *
	 * The socket is torn down synchronously, so the client is already disconnected (`socket.ready`
	 * is `false`) when the returned promise resolves - it never waits on a close frame from a peer
	 * that may not send one. Still `async` so callers can `await` it as before.
	 */
	async destroy(): Promise<void> {
		this.guilds.clear();
		this.users.clear();
		this.collectors.clear();
		this.socket.destroy();
	}

	/** Sets the client's status: online, idle, dnd, invisible, or offline. Other users see `invisible` as `offline` */
	setStatus(status: ObjectValues<typeof PresenceStatus>): void {
		this.status = status;
		if (this.socket.ready) this.#updatePresence();
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
		if (this.socket.ready) this.#updatePresence();
	}

	/** Sends the current `status`/`activity` to Discord via a gateway `Presence Update` payload */
	#updatePresence() {
		const payload = {
			op: GatewayOpCodes.PresenceUpdate,
			d: {
				status: this.status,
				since: null,
				afk: false,
				activities: this.activity ? [this.activity] : []
			}
		}
		this.socket.send(payload);
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