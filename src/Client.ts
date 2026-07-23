import { Rest } from "./Rest.js";
import { WSClient, WSOptions } from "./WSClient.js";
import { ResolveIntents } from "./Intents.js";
import { ObjectValues } from "./Types/HelperTypes.js";
import { GatewayIntents, GatewayOpCodes } from "./Types/DiscordGateway.js";
import { GuildCache } from "./Managers/Guilds.js";
import { EventEmitter } from "node:events";
import type { ClientEventMap } from "./Types/SimplicityTypes.js";
import { User } from "./Structures/User.js";
import { UserCache } from "./Managers/Users.js";
import { ActivityType, ClientActivity, Status } from "./Types/DiscordAPITypes.js";

type ClientOptions = {
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

	ws?: WSOptions
}

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
		this.socket.destroy();
		while(true) {
			if (!this.socket.ready) return;
			await new Promise(r => setTimeout(r, 1).unref() );
		}
	}

	/** Sets the client's status: online, offline, idle, or dnd */
	setStatus(status: ObjectValues<typeof Status>): void {
		this.status = status;
		this.#updatePressence();
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
		this.#updatePressence();
	}

	#updatePressence() {
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
}