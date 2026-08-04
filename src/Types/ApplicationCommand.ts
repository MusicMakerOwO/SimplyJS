import { ObjectValues } from "./HelperTypes.js";
import { DiscordApplicationIntegrationTypes, DiscordChannelTypes } from "./DiscordAPITypes.js";

/**
 * The behavior a slash command exposes: a chat-typed command, or a context menu
 * command attached to a user or message.
 *
 * @see https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-types
 */
export const ApplicationCommandTypes = {
	/** A text-based command that shows up when a user types `/` */
	CHAT_INPUT: 1,
	/** A UI-based command that shows up when you right click or tap on a user */
	USER: 2,
	/** A UI-based command that shows up when you right click or tap on a message */
	MESSAGE: 3
} as const;
export type ApplicationCommandType = ObjectValues<typeof ApplicationCommandTypes>;

/**
 * The type of an individual option on a `CHAT_INPUT` command, including the two
 * structural types (`SUB_COMMAND`, `SUB_COMMAND_GROUP`) used to nest options.
 *
 * @see https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
 */
export const ApplicationCommandOptionTypes = {
	SUB_COMMAND: 1,
	SUB_COMMAND_GROUP: 2,
	STRING: 3,
	INTEGER: 4,
	BOOLEAN: 5,
	USER: 6,
	CHANNEL: 7,
	ROLE: 8,
	MENTIONABLE: 9,
	NUMBER: 10,
	ATTACHMENT: 11
} as const;
export type ApplicationCommandOptionType = ObjectValues<typeof ApplicationCommandOptionTypes>;

/** Option types that can hold a value, as opposed to the two structural nesting types */
export type LeafOptionType = Exclude<
	ApplicationCommandOptionType,
	typeof ApplicationCommandOptionTypes.SUB_COMMAND | typeof ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
>;

/**
 * Where a command can be used.
 *
 * @see https://discord.com/developers/docs/interactions/application-commands#interaction-contexts
 */
export const InteractionContextTypes = {
	/** Interaction can be used within servers */
	GUILD: 0,
	/** Interaction can be used within DMs with the app's bot user */
	BOT_DM: 1,
	/** Interaction can be used within Group DMs and DMs other than the app's bot user */
	PRIVATE_CHANNEL: 2
} as const;
export type InteractionContextType = ObjectValues<typeof InteractionContextTypes>;

/** A dictionary of locale code to localized string, e.g. `{ "es-ES": "hola" }` */
export type LocalizationDict = Record<string, string> | null;

export type ApplicationCommandOptionChoice = {
	/** 1-100 character choice name */
	name: string;
	name_localizations?: LocalizationDict;
	/** Value shown to the user, matches the option's type (up to 100 characters if string) */
	value: string | number;
};

type BaseOption<TType extends ApplicationCommandOptionType> = {
	type: TType;
	/** 1-32 character name matching `^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$` */
	name: string;
	name_localizations?: LocalizationDict;
	/** 1-100 character description */
	description: string;
	description_localizations?: LocalizationDict;
};

/** Options that accept `choices`/`autocomplete` restrict them to be mutually exclusive */
type ChoiceOrAutocomplete =
	| { choices?: ApplicationCommandOptionChoice[]; autocomplete?: false }
	| { choices?: undefined; autocomplete?: true };

export type StringOption = BaseOption<typeof ApplicationCommandOptionTypes.STRING> & {
	required?: boolean;
	/** Minimum allowed length (0-6000) */
	min_length?: number;
	/** Maximum allowed length (1-6000) */
	max_length?: number;
} & ChoiceOrAutocomplete;

export type IntegerOption = BaseOption<typeof ApplicationCommandOptionTypes.INTEGER> & {
	required?: boolean;
	min_value?: number;
	max_value?: number;
} & ChoiceOrAutocomplete;

export type NumberOption = BaseOption<typeof ApplicationCommandOptionTypes.NUMBER> & {
	required?: boolean;
	min_value?: number;
	max_value?: number;
} & ChoiceOrAutocomplete;

export type BooleanOption = BaseOption<typeof ApplicationCommandOptionTypes.BOOLEAN> & {
	required?: boolean;
};

export type UserOption = BaseOption<typeof ApplicationCommandOptionTypes.USER> & {
	required?: boolean;
};

export type ChannelOption = BaseOption<typeof ApplicationCommandOptionTypes.CHANNEL> & {
	required?: boolean;
	/** Restricts the channels shown to these types */
	channel_types?: ObjectValues<typeof DiscordChannelTypes>[];
};

export type RoleOption = BaseOption<typeof ApplicationCommandOptionTypes.ROLE> & {
	required?: boolean;
};

export type MentionableOption = BaseOption<typeof ApplicationCommandOptionTypes.MENTIONABLE> & {
	required?: boolean;
};

export type AttachmentOption = BaseOption<typeof ApplicationCommandOptionTypes.ATTACHMENT> & {
	required?: boolean;
};

/** Any option type that holds a value rather than nesting further options */
export type LeafOption =
	| StringOption
	| IntegerOption
	| NumberOption
	| BooleanOption
	| UserOption
	| ChannelOption
	| RoleOption
	| MentionableOption
	| AttachmentOption;

export type SubCommandOption = BaseOption<typeof ApplicationCommandOptionTypes.SUB_COMMAND> & {
	options?: LeafOption[];
};

export type SubCommandGroupOption = BaseOption<typeof ApplicationCommandOptionTypes.SUB_COMMAND_GROUP> & {
	options?: SubCommandOption[];
};

export type ApplicationCommandOption = LeafOption | SubCommandOption | SubCommandGroupOption;

/**
 * The payload shape accepted by Discord's create/edit application command endpoints.
 *
 * @see https://discord.com/developers/docs/interactions/application-commands#create-global-application-command
 */
export type ApplicationCommand = {
	/** Defaults to `CHAT_INPUT` if not set */
	type?: ApplicationCommandType;
	name: string;
	name_localizations?: LocalizationDict;
	/** 1-100 characters, required for `CHAT_INPUT`, empty string for `USER`/`MESSAGE` */
	description: string;
	description_localizations?: LocalizationDict;
	options?: ApplicationCommandOption[];
	/** Stringified permission bitfield, sets the default required permissions to use the command */
	default_member_permissions?: string | null;
	/** Installation contexts where the command is available */
	integration_types?: ObjectValues<typeof DiscordApplicationIntegrationTypes>[];
	/** Interaction contexts where the command can be used */
	contexts?: InteractionContextType[];
	/** Whether the command is age-restricted */
	nsfw?: boolean;
};