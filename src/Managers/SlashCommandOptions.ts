import { Client } from "../Client.js";
import { Guild } from "../Structures/Guild.js";
import { Member } from "../Structures/Member.js";
import { User } from "../Structures/User.js";
import { Role } from "../Structures/Role.js";
import type { Channel } from "../Types/index.js";
import { CreateChannel } from "../Factory/CreateChannel.js";
import { Attachment, ResolvedData } from "../Types/MessageComponents.js";
import { ApplicationCommandInteractionDataOption } from "../Types/Interactions.js";
import { ApplicationCommandOptionType, ApplicationCommandOptionTypes } from "../Types/ApplicationCommand.js";
import { DiscordChannel, DiscordMember, DiscordRole } from "../Types/DiscordAPITypes.js";

/** Either side of a resolved `MENTIONABLE` option. */
export type Mentionable = User | Role;

/**
 * Typed accessor for a {@link SlashCommandInteraction}'s options.
 *
 * Unwraps subcommand/subcommand group nesting up front, so every `get*` method reads from the
 * leaf option list regardless of how deeply the invoked option is nested. `USER`, `CHANNEL`,
 * `ROLE`, `MENTIONABLE`, and `ATTACHMENT` options only carry an id on the option itself - those
 * accessors look the id up in the interaction's resolved data and hand back the corresponding
 * structure instead. Every accessor returns `null` when the option wasn't provided.
 */
export class SlashCommandOptions {
	#client: Client;
	#guild: Guild | undefined;
	#resolved: ResolvedData;
	#options: ApplicationCommandInteractionDataOption[];
	#subcommandGroup: string | undefined;
	#subcommand: string | undefined;

	constructor(client: Client, guild: Guild | undefined, options: ApplicationCommandInteractionDataOption[], resolved: ResolvedData = {}) {
		this.#client = client;
		this.#guild = guild;
		this.#resolved = resolved;

		let leaves = options;
		const [first] = options;
		if (first?.type === ApplicationCommandOptionTypes.SUB_COMMAND_GROUP) {
			this.#subcommandGroup = first.name;
			const [subcommand] = first.options ?? [];
			this.#subcommand = subcommand?.name;
			leaves = subcommand?.options ?? [];
		} else if (first?.type === ApplicationCommandOptionTypes.SUB_COMMAND) {
			this.#subcommand = first.name;
			leaves = first.options ?? [];
		}
		this.#options = leaves;
	}

	#find(name: string, type: ApplicationCommandOptionType): ApplicationCommandInteractionDataOption | undefined {
		const option = this.#options.find(option => option.name === name);
		if (option === undefined) return undefined;
		if (option.type !== type) {
			throw new TypeError(`Option "${name}" was requested as type ${type}, but is type ${option.type}`);
		}
		return option;
	}

	#resolveEntity<T>(id: string, table: Record<string, T> | undefined, name: string, kind: string): T {
		const entity = table?.[id];
		if (entity === undefined) throw new Error(`Missing resolved ${kind} data for option "${name}"`);
		return entity;
	}

	/** The invoked subcommand group's name, or `null` if the command doesn't use one. */
	getSubcommandGroup(): string | null {
		return this.#subcommandGroup ?? null;
	}

	/** The invoked subcommand's name, or `null` if the command doesn't use one. */
	getSubcommand(): string | null {
		return this.#subcommand ?? null;
	}

	/** The `STRING` value of an option by name. */
	getString(name: string): string | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.STRING);
		return option === undefined ? null : option.value as string;
	}

	/** The `INTEGER` value of an option by name. Not to be confused with `NUMBER`. */
	getInteger(name: string): number | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.INTEGER);
		return option === undefined ? null : option.value as number;
	}

	/** The `NUMBER` value of an option by name. Not to be confused with `INTEGER`. */
	getNumber(name: string): number | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.NUMBER);
		return option === undefined ? null : option.value as number;
	}

	/** The `BOOLEAN` value of an option by name. */
	getBoolean(name: string): boolean | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.BOOLEAN);
		return option === undefined ? null : option.value as boolean;
	}

	/** The user behind a `USER` option by name. */
	getUser(name: string): User | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.USER);
		if (option === undefined) return null;

		const id = option.value as string;
		const data = this.#resolveEntity(id, this.#resolved.users, name, "user");
		return this.#client.users.upsert(data);
	}

	/**
	 * The guild member behind a `USER` option by name, present when the interaction was used in
	 * a guild the client has cached and the resolved user is a member of it.
	 */
	getMember(name: string): Member | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.USER);
		if (option === undefined || this.#guild === undefined) return null;

		const id = option.value as string;
		const memberData = this.#resolved.members?.[id];
		const userData = this.#resolved.users?.[id];
		if (memberData === undefined || userData === undefined) return null;

		return this.#guild.members.upsert({ ...memberData, user: userData } as DiscordMember);
	}

	/** The role behind a `ROLE` option by name. */
	getRole(name: string): Role | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.ROLE);
		if (option === undefined) return null;
		if (this.#guild === undefined) throw new Error(`Cannot resolve role option "${name}" outside of a guild`);

		const id = option.value as string;
		const data = this.#resolveEntity(id, this.#resolved.roles, name, "role");
		return this.#guild.roles.upsert(data as DiscordRole);
	}

	/** The channel behind a `CHANNEL` option by name. */
	getChannel(name: string): Channel | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.CHANNEL);
		if (option === undefined) return null;
		if (this.#guild === undefined) throw new Error(`Cannot resolve channel option "${name}" outside of a guild`);

		const id = option.value as string;
		const cached = this.#guild.channels.get(id);
		if (cached !== undefined) return cached;

		// Resolved channel data only guarantees a partial field set (id, name, type, permissions, plus thread metadata for threads)
		// Enough to build a usable structure, but some fields stay unset until the channel is fetched or seen over the gateway.
		const data = this.#resolveEntity(id, this.#resolved.channels, name, "channel");
		return CreateChannel(this.#client, this.#guild, data as DiscordChannel);
	}

	/** The user or role behind a `MENTIONABLE` option by name. */
	getMentionable(name: string): Mentionable | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.MENTIONABLE);
		if (option === undefined) return null;

		const id = option.value as string;
		const roleData = this.#resolved.roles?.[id];
		if (roleData !== undefined) {
			if (this.#guild === undefined) throw new Error(`Cannot resolve role option "${name}" outside of a guild`);
			return this.#guild.roles.upsert(roleData as DiscordRole);
		}

		const userData = this.#resolveEntity(id, this.#resolved.users, name, "user");
		return this.#client.users.upsert(userData);
	}

	/** The attachment behind an `ATTACHMENT` option by name. */
	getAttachment(name: string): Attachment | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.ATTACHMENT);
		if (option === undefined) return null;

		const id = option.value as string;
		return this.#resolveEntity(id, this.#resolved.attachments, name, "attachment");
	}
}