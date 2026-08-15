import { Rest } from "./Rest.js";
import { WSClient, WSOptions } from "./WSClient.js";
import { ResolveIntents } from "./Intents.js";
import { ObjectValues } from "./Types/HelperTypes.js";
import { GatewayIntents, GatewayOpCodes } from "./Types/DiscordGateway.js";
import { GuildCache } from "./Managers/Guilds.js";
import { EventEmitter } from "node:events";
import type { ClientEventMap } from "./Types/SimplyJSTypes.js";
import { User } from "./Structures/User.js";
import { UserCache } from "./Managers/Users.js";
import { ActivityType, ClientActivity, Status } from "./Types/DiscordAPITypes.js";
import { ApplicationCommand, JSONArray } from "./Types/index.js";

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

	/** The client's current status, this is only intended for internal use via state tracking */
	status: ObjectValues<typeof Status>;
	/** The client's current activity, this is only intended for internal use via state tracking */
	activity: ClientActivity | null;

	/** User ID resolved from the provided token */
	id: string;

	constructor(options: ClientOptions) {
		super();

		this.socket = new WSClient(this, {
			... options.ws,
			intents: ResolveIntents(options.intents),
		});
		this.rest = new Rest();

		this.socket.setToken(options.token);
		this.rest.setToken(options.token);

		this.user = null;

		this.guilds = new GuildCache(this);
		this.users = new UserCache(this);

		this.status = Status.ONLINE;
		this.activity = null;

		this.id = Buffer.from(options.token.split('.')[0], 'base64').toString('ascii');
	}

	/** Start the WebSocket connection, promise resolves when authorization finishes */
	async login(): Promise<void> {
		this.socket.initialize();
		while(true) {
			if (this.socket.ready) return;
			await new Promise(r => setTimeout(r, 1).unref() );
		}
	}

	/** Logs the bot out and clears cache. Promise resolves after WebSocket fully closes */
	async destroy(): Promise<void> {
		this.guilds.clear();
		this.users.clear();
		this.socket.destroy();
		while(true) {
			if (!this.socket.ready) return;
			await new Promise(r => setTimeout(r, 1).unref() );
		}
	}

	/** Sets the client's status: online, offline, idle, or dnd */
	setStatus(status: ObjectValues<typeof Status>): void {
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