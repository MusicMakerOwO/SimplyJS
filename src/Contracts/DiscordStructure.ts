import { Client } from "../Client.js";
import { Guild } from "../Structures/index.js";

/**
 * Base contract for structures that are attached to a {@link Client} but are not bound to
 * a single guild instance.
 *
 * Use this for top-level or cross-guild entities such as users, channels in DMs, or
 * any structure that only needs client services (REST, gateway state, caches).
 */
export abstract class APIClientStructure<T extends object> {
	protected readonly client: Client;

	protected constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Applies a partial or full API payload update to the current structure instance.
	 */
	abstract patch(data: T): void;
}

/**
 * Base contract for structures that are owned by a specific guild and require both
 * client context and guild context.
 *
 * Use this for guild-scoped entities such as members, roles, guild channels,
 * emojis, and stickers.
 */
export abstract class APIGuildStructure<T extends object> {
	protected readonly client: Client;
	protected readonly guild: Guild;

	protected constructor(client: Client, guild: Guild) {
		this.client = client;
		this.guild = guild;
	}

	/**
	 * Applies a partial or full API payload update to the current guild-scoped structure.
	 */
	abstract patch(data: T): void;
}