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
 * structure instead. Every accessor returns `null` when the option wasn't provided, unless it is
 * called with `required: true`, in which case it throws instead and its type drops the `null`.
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

	/**
	 * Looks up a leaf option by name, checking it is the requested type.
	 * @throws {Error} When the option is absent and `required` is set.
	 * @throws {TypeError} When the option exists but is a different type.
	 */
	#find(name: string, type: ApplicationCommandOptionType, required = false): ApplicationCommandInteractionDataOption | undefined {
		const option = this.#options.find(option => option.name === name);
		if (option === undefined) {
			if (required) throw new Error(`Required option "${name}" was not provided`);
			return undefined;
		}
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

	/**
	 * The `STRING` value of an option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getString(name: string, required: true): string;
	getString(name: string, required?: boolean): string | null;
	getString(name: string, required = false): string | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.STRING, required);
		return option === undefined ? null : option.value as string;
	}

	/**
	 * The `INTEGER` value of an option by name. Not to be confused with `NUMBER`.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getInteger(name: string, required: true): number;
	getInteger(name: string, required?: boolean): number | null;
	getInteger(name: string, required = false): number | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.INTEGER, required);
		return option === undefined ? null : option.value as number;
	}

	/**
	 * The `NUMBER` value of an option by name. Not to be confused with `INTEGER`.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getNumber(name: string, required: true): number;
	getNumber(name: string, required?: boolean): number | null;
	getNumber(name: string, required = false): number | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.NUMBER, required);
		return option === undefined ? null : option.value as number;
	}

	/**
	 * The `BOOLEAN` value of an option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getBoolean(name: string, required: true): boolean;
	getBoolean(name: string, required?: boolean): boolean | null;
	getBoolean(name: string, required = false): boolean | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.BOOLEAN, required);
		return option === undefined ? null : option.value as boolean;
	}

	/**
	 * The user behind a `USER` option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getUser(name: string, required: true): User;
	getUser(name: string, required?: boolean): User | null;
	getUser(name: string, required = false): User | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.USER, required);
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

	/**
	 * The role behind a `ROLE` option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getRole(name: string, required: true): Role;
	getRole(name: string, required?: boolean): Role | null;
	getRole(name: string, required = false): Role | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.ROLE, required);
		if (option === undefined) return null;
		if (this.#guild === undefined) throw new Error(`Cannot resolve role option "${name}" outside of a guild`);

		const id = option.value as string;
		const data = this.#resolveEntity(id, this.#resolved.roles, name, "role");
		return this.#guild.roles.upsert(data as DiscordRole);
	}

	/**
	 * The channel behind a `CHANNEL` option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getChannel(name: string, required: true): Channel;
	getChannel(name: string, required?: boolean): Channel | null;
	getChannel(name: string, required = false): Channel | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.CHANNEL, required);
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

	/**
	 * The user or role behind a `MENTIONABLE` option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getMentionable(name: string, required: true): Mentionable;
	getMentionable(name: string, required?: boolean): Mentionable | null;
	getMentionable(name: string, required = false): Mentionable | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.MENTIONABLE, required);
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

	/**
	 * The attachment behind an `ATTACHMENT` option by name.
	 *
	 * Pass `required: true` for an option the command marks as required: the return type drops
	 * `null`, and an absent option throws instead.
	 */
	getAttachment(name: string, required: true): Attachment;
	getAttachment(name: string, required?: boolean): Attachment | null;
	getAttachment(name: string, required = false): Attachment | null {
		const option = this.#find(name, ApplicationCommandOptionTypes.ATTACHMENT, required);
		if (option === undefined) return null;

		const id = option.value as string;
		return this.#resolveEntity(id, this.#resolved.attachments, name, "attachment");
	}
}