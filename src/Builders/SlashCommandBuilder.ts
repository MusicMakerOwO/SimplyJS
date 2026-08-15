import {
	ApplicationCommand,
	ApplicationCommandOption,
	ApplicationCommandOptionChoice,
	ApplicationCommandOptionTypes,
	InteractionContextType,
	LeafOption,
	LeafOptionType,
	LocalizationDict,
	SubCommandGroupOption,
	SubCommandOption
} from "../Types/ApplicationCommand.js";
import { DiscordApplicationIntegrationTypes } from "../Types/DiscordAPITypes.js";
import { ObjectValues, Prettify } from "../Types/HelperTypes.js";
import { omitUndefined } from "./BaseSelectBuilder.js";

// ^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$ per Discord's naming rules
const NAME_PATTERN = /^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;
const MAX_OPTIONS_PER_LEVEL = 25;
const MAX_CHOICES = 25;

/** Config accepted by `addOption`/the `addXOption` helpers, everything but the positional `type`/`name`/`description` */
type OptionConfig<T extends LeafOptionType> = Prettify<Omit<Extract<LeafOption, { type: T }>, "type" | "name" | "description">>;

function assertName(name: string, path: string): void {
	if (!NAME_PATTERN.test(name)) {
		throw new Error(`${path} name "${name}" doesn't match Discord's naming pattern (1-32 characters, no spaces)`);
	}
	if (name !== name.toLowerCase()) {
		throw new Error(`${path} name "${name}" must be lowercase`);
	}
}

function assertDescription(description: string, path: string): void {
	if (description.length < 1 || description.length > 100) {
		throw new Error(`${path} description must be between 1 and 100 characters - received ${description.length} characters`);
	}
}

function assertChoices(choices: ApplicationCommandOptionChoice[] | undefined, path: string): void {
	if (choices && choices.length > MAX_CHOICES) {
		throw new Error(`${path}: cannot have more than ${MAX_CHOICES} choices`);
	}
}

function isStructuralOption(option: ApplicationCommandOption): boolean {
	return (
		option.type === ApplicationCommandOptionTypes.SUB_COMMAND ||
		option.type === ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
	);
}

/** Runtime bound checks that a config object built by hand (rather than through the setters) can still bypass at compile time */
function validateLeafOption(option: LeafOption): void {
	assertName(option.name, "Option");
	assertDescription(option.description, "Option");

	if (option.type === ApplicationCommandOptionTypes.STRING) {
		assertChoices(option.choices, `Option "${option.name}"`);
		if (option.min_length !== undefined && (option.min_length < 0 || option.min_length > 6000)) {
			throw new Error(`Option "${option.name}": min_length must be between 0 and 6000`);
		}
		if (option.max_length !== undefined && (option.max_length < 1 || option.max_length > 6000)) {
			throw new Error(`Option "${option.name}": max_length must be between 1 and 6000`);
		}
		if (
			option.min_length !== undefined &&
			option.max_length !== undefined &&
			option.min_length > option.max_length
		) {
			throw new Error(`Option "${option.name}": min_length cannot exceed max_length`);
		}
	}

	if (option.type === ApplicationCommandOptionTypes.INTEGER || option.type === ApplicationCommandOptionTypes.NUMBER) {
		assertChoices(option.choices, `Option "${option.name}"`);
		if (
			option.min_value !== undefined &&
			option.max_value !== undefined &&
			option.min_value > option.max_value
		) {
			throw new Error(`Option "${option.name}": min_value cannot exceed max_value`);
		}
		if (option.type === ApplicationCommandOptionTypes.INTEGER) {
			if (option.min_value !== undefined && !Number.isInteger(option.min_value)) {
				throw new Error(`Option "${option.name}": min_value must be an integer`);
			}
			if (option.max_value !== undefined && !Number.isInteger(option.max_value)) {
				throw new Error(`Option "${option.name}": max_value must be an integer`);
			}
		}
	}
}

/** Recursively re-validates an option tree - counts, duplicate names, structural consistency, ordering, and per-option bounds */
function validateOptionList(options: ApplicationCommandOption[], path: string): void {
	if (options.length > MAX_OPTIONS_PER_LEVEL) {
		throw new Error(`${path}: cannot exceed ${MAX_OPTIONS_PER_LEVEL} options`);
	}

	const seenNames = new Set<string>();
	const structural = options.length > 0 && isStructuralOption(options[0]);
	let seenOptional = false;

	for (const option of options) {
		if (seenNames.has(option.name)) {
			throw new Error(`${path}: duplicate option name "${option.name}"`);
		}
		seenNames.add(option.name);

		if (isStructuralOption(option) !== structural) {
			throw new Error(`${path}: cannot mix subcommands/subcommand groups with regular options at the same level (near "${option.name}")`);
		}

		if (option.type === ApplicationCommandOptionTypes.SUB_COMMAND_GROUP) {
			assertName(option.name, "Subcommand group");
			assertDescription(option.description, "Subcommand group");
			if (!option.options || option.options.length === 0) {
				throw new Error(`Subcommand group "${option.name}" must contain at least one subcommand`);
			}
			validateOptionList(option.options, `Subcommand group "${option.name}"`);
		} else if (option.type === ApplicationCommandOptionTypes.SUB_COMMAND) {
			assertName(option.name, "Subcommand");
			assertDescription(option.description, "Subcommand");
			if (option.options) validateOptionList(option.options, `Subcommand "${option.name}"`);
		} else {
			validateLeafOption(option);
			if ("required" in option && option.required) {
				if (seenOptional) throw new Error(`Required option "${option.name}" must be added before any optional options`);
			} else {
				seenOptional = true;
			}
		}
	}
}

/** Shared option list plumbing used by both the top-level command builder and subcommand builders */
abstract class OptionsHolder<TOption extends ApplicationCommandOption> {
	options?: TOption[];

	protected appendOption(option: TOption): void {
		this.options ??= [];

		if (this.options.length >= MAX_OPTIONS_PER_LEVEL) {
			throw new Error(`Cannot add option "${option.name}": a command level cannot exceed ${MAX_OPTIONS_PER_LEVEL} options`);
		}
		if (this.options.some(existing => existing.name === option.name)) {
			throw new Error(`Duplicate option name "${option.name}"`);
		}
		if (this.options.length > 0 && isStructuralOption(this.options[0]) !== isStructuralOption(option)) {
			throw new Error(`Cannot mix subcommands/subcommand groups with regular options at the same level (near "${option.name}")`);
		}
		if ("required" in option && option.required) {
			const hasOptionalBefore = this.options.some(existing => !("required" in existing && existing.required));
			if (hasOptionalBefore) {
				throw new Error(`Required option "${option.name}" must be added before any optional options`);
			}
		}

		this.options.push(option);
	}

	/**
	 * Adds an option of the given type. Prefer the `addXOption` helpers below for
	 * autocomplete on the type-specific config fields - this exists for callers that
	 * already have a `type` value on hand.
	 */
	addOption<T extends LeafOptionType>(type: T, name: string, description: string, config?: OptionConfig<T>): this {
		assertName(name, "Option");
		assertDescription(description, "Option");
		const option = { type, name, description, ...(config ?? {}) } as LeafOption;
		validateLeafOption(option);
		this.appendOption(option as TOption);
		return this;
	}

	addStringOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.STRING>): this {
		return this.addOption(ApplicationCommandOptionTypes.STRING, name, description, config);
	}

	addIntegerOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.INTEGER>): this {
		return this.addOption(ApplicationCommandOptionTypes.INTEGER, name, description, config);
	}

	addNumberOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.NUMBER>): this {
		return this.addOption(ApplicationCommandOptionTypes.NUMBER, name, description, config);
	}

	addBooleanOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.BOOLEAN>): this {
		return this.addOption(ApplicationCommandOptionTypes.BOOLEAN, name, description, config);
	}

	addUserOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.USER>): this {
		return this.addOption(ApplicationCommandOptionTypes.USER, name, description, config);
	}

	addChannelOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.CHANNEL>): this {
		return this.addOption(ApplicationCommandOptionTypes.CHANNEL, name, description, config);
	}

	addRoleOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.ROLE>): this {
		return this.addOption(ApplicationCommandOptionTypes.ROLE, name, description, config);
	}

	addMentionableOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.MENTIONABLE>): this {
		return this.addOption(ApplicationCommandOptionTypes.MENTIONABLE, name, description, config);
	}

	addAttachmentOption(name: string, description: string, config?: OptionConfig<typeof ApplicationCommandOptionTypes.ATTACHMENT>): this {
		return this.addOption(ApplicationCommandOptionTypes.ATTACHMENT, name, description, config);
	}
}

/** Fluent builder for a single subcommand, added via `SlashCommandBuilder#addSubcommand` or `SlashCommandSubcommandGroupBuilder#addSubcommand` */
export class SlashCommandSubcommandBuilder extends OptionsHolder<LeafOption> {
	type = ApplicationCommandOptionTypes.SUB_COMMAND;

	name: string = 'command';
	description: string = 'No description';
	nameLocalizations?: LocalizationDict;
	descriptionLocalizations?: LocalizationDict;

	/** Sets the subcommand name */
	setName(name: string): this {
		assertName(name, "Subcommand");
		this.name = name;
		return this;
	}

	/** Sets the subcommand description */
	setDescription(description: string): this {
		assertDescription(description, "Subcommand");
		this.description = description;
		return this;
	}

	/** Sets per-locale translations of the subcommand name */
	setNameLocalizations(localizations: LocalizationDict): this {
		this.nameLocalizations = localizations;
		return this;
	}

	/** Sets per-locale translations of the subcommand description */
	setDescriptionLocalizations(localizations: LocalizationDict): this {
		this.descriptionLocalizations = localizations;
		return this;
	}

	/**
	 * Serializes this builder into the raw {@link SubCommandOption} payload Discord expects
	 */
	toJSON(): SubCommandOption {
		return omitUndefined<SubCommandOption>({
			type: this.type,
			name: this.name,
			description: this.description,
			name_localizations: this.nameLocalizations,
			description_localizations: this.descriptionLocalizations,
			options: this.options
		});
	}
}

/** Fluent builder for a subcommand group, added via `SlashCommandBuilder#addSubcommandGroup` */
export class SlashCommandSubcommandGroupBuilder {
	type = ApplicationCommandOptionTypes.SUB_COMMAND_GROUP;

	name: string = 'group';
	description: string = 'No description';
	nameLocalizations?: LocalizationDict;
	descriptionLocalizations?: LocalizationDict;
	options?: SubCommandOption[];

	/** Sets the subcommand group name */
	setName(name: string): this {
		assertName(name, "Subcommand group");
		this.name = name;
		return this;
	}

	/** Sets the subcommand group description */
	setDescription(description: string): this {
		assertDescription(description, "Subcommand group");
		this.description = description;
		return this;
	}

	/** Sets per-locale translations of the subcommand group name */
	setNameLocalizations(localizations: LocalizationDict): this {
		this.nameLocalizations = localizations;
		return this;
	}

	/** Sets per-locale translations of the subcommand group description */
	setDescriptionLocalizations(localizations: LocalizationDict): this {
		this.descriptionLocalizations = localizations;
		return this;
	}

	/**
	 * Adds a subcommand to this group, either as a pre-built `SlashCommandSubcommandBuilder`
	 * or via a callback - use a pre-built instance to avoid deep indentation on complex subcommands.
	 */
	addSubcommand(
		input: SlashCommandSubcommandBuilder | ((subcommand: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder)
	): this {
		const builder = typeof input === "function" ? input(new SlashCommandSubcommandBuilder()) : input;

		this.options ??= [];
		if (this.options.length >= MAX_OPTIONS_PER_LEVEL) {
			throw new Error(`Subcommand group "${this.name}" cannot exceed ${MAX_OPTIONS_PER_LEVEL} subcommands`);
		}
		if (this.options.some(existing => existing.name === builder.name)) {
			throw new Error(`Duplicate subcommand name "${builder.name}"`);
		}

		this.options.push(builder);
		return this;
	}

	/**
	 * Serializes this builder into the raw {@link SubCommandGroupOption} payload Discord expects
	 */
	toJSON(): SubCommandGroupOption {
		return omitUndefined<SubCommandGroupOption>({
			type: this.type,
			name: this.name,
			description: this.description,
			name_localizations: this.nameLocalizations,
			description_localizations: this.descriptionLocalizations,
			options: this.options
		});
	}
}

/** Fluent builder for a `CHAT_INPUT` (slash) application command */
export class SlashCommandBuilder extends OptionsHolder<ApplicationCommandOption> {
	name: string = 'command';
	description: string = 'No description';
	nameLocalizations?: LocalizationDict;
	descriptionLocalizations?: LocalizationDict;
	defaultMemberPermissions?: string | null;
	integrationTypes?: ObjectValues<typeof DiscordApplicationIntegrationTypes>[];
	contexts?: InteractionContextType[];
	nsfw?: boolean;

	/** Sets the command name */
	setName(name: string): this {
		assertName(name, "Command");
		this.name = name;
		return this;
	}

	/** Sets the command description */
	setDescription(description: string): this {
		assertDescription(description, "Command");
		this.description = description;
		return this;
	}

	/** Sets per-locale translations of the command name */
	setNameLocalizations(localizations: LocalizationDict): this {
		this.nameLocalizations = localizations;
		return this;
	}

	/** Sets per-locale translations of the command description */
	setDescriptionLocalizations(localizations: LocalizationDict): this {
		this.descriptionLocalizations = localizations;
		return this;
	}

	/** Sets the default permissions (as a `Permissions` bitfield) a member needs to use this command, or `null` to clear it */
	setDefaultMemberPermissions(permissions: bigint | number | string | null): this {
		this.defaultMemberPermissions = permissions === null ? null : permissions.toString();
		return this;
	}

	/** Sets which installation contexts (guild, user) the command is available in */
	setIntegrationTypes(...types: ObjectValues<typeof DiscordApplicationIntegrationTypes>[]): this {
		this.integrationTypes = types;
		return this;
	}

	/** Sets which interaction contexts (guild, bot DM, private channel) the command can be used in */
	setContexts(...contexts: InteractionContextType[]): this {
		this.contexts = contexts;
		return this;
	}

	/** Sets whether the command is age-restricted */
	setNSFW(nsfw = true): this {
		this.nsfw = nsfw;
		return this;
	}

	/**
	 * Adds a subcommand, either as a pre-built `SlashCommandSubcommandBuilder`
	 * or via a callback - use a pre-built instance to avoid deep indentation on complex subcommands.
	 */
	addSubcommand(
		input: SlashCommandSubcommandBuilder | ((subcommand: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder)
	): this {
		const builder = typeof input === "function" ? input(new SlashCommandSubcommandBuilder()) : input;
		this.appendOption(builder);
		return this;
	}

	/**
	 * Adds a subcommand group, either as a pre-built `SlashCommandSubcommandGroupBuilder`
	 * or via a callback - use a pre-built instance to avoid deep indentation on complex groups.
	 */
	addSubcommandGroup(
		input: SlashCommandSubcommandGroupBuilder | ((group: SlashCommandSubcommandGroupBuilder) => SlashCommandSubcommandGroupBuilder)
	): this {
		const builder = typeof input === "function" ? input(new SlashCommandSubcommandGroupBuilder()) : input;
		this.appendOption(builder);
		return this;
	}

	/**
	 * Validates a command - a final pass over the whole option tree, useful for
	 * catching mistakes on a payload that was built or edited by hand rather than
	 * fully through this builder's setters.
	 */
	static validate(command: ApplicationCommand): void {
		assertName(command.name, "Command");
		assertDescription(command.description, "Command");
		if (command.options) validateOptionList(command.options, `Command "${command.name}"`);
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		SlashCommandBuilder.validate(this.toJSON());
	}

	/**
	 * Serializes this builder into the raw {@link ApplicationCommand} payload Discord expects
	 */
	toJSON(): ApplicationCommand {
		return omitUndefined<ApplicationCommand>({
			name: this.name,
			description: this.description,
			name_localizations: this.nameLocalizations,
			description_localizations: this.descriptionLocalizations,
			default_member_permissions: this.defaultMemberPermissions,
			integration_types: this.integrationTypes,
			contexts: this.contexts,
			nsfw: this.nsfw,
			options: this.options
		});
	}
}
