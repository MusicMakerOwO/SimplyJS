import { ObjectValues } from "./HelperTypes.js";
import {
	ApplicationCommandOptionChoice,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionContextType
} from "./ApplicationCommand.js";
import { DiscordChannel, DiscordGuild, DiscordMember, DiscordUser } from "./DiscordAPITypes.js";
import { AllowedMentions, Attachment, DiscordMessage, Embed, PollLayoutTypes, PollMedia, ResolvedData } from "./MessageComponents.js";
import { ComponentType, MessageComponent, ModalComponent } from "./Components.js";
import { JSONObject } from "./Internal.js";

/**
 * The kind of interaction being received, determining the shape of its `data` payload.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-interaction-type
 */
export const InteractionTypes = {
	/** initial handshake sent when validating an interactions endpoint URL */
	PING: 1,
	/** a slash, user, or message command invocation */
	APPLICATION_COMMAND: 2,
	/** a button click or select menu choice */
	MESSAGE_COMPONENT: 3,
	/** a request for autocomplete suggestions while filling out a command */
	APPLICATION_COMMAND_AUTOCOMPLETE: 4,
	/** a modal form submission */
	MODAL_SUBMIT: 5
} as const;
export type InteractionType = ObjectValues<typeof InteractionTypes>;

/**
 * A single resolved parameter passed by the user for an application command, or the option
 * currently focused during autocomplete.
 */
export type ApplicationCommandInteractionDataOption = {
	/** name of the parameter */
	name: string;
	/** value of the {@link ApplicationCommandOptionType} */
	type: ApplicationCommandOptionType;
	/** value of the option, mutually exclusive with `options` */
	value?: string | number | boolean;
	/** present if this option is a group or subcommand, mutually exclusive with `value` */
	options?: ApplicationCommandInteractionDataOption[];
	/** `true` if this option is the currently focused option for autocomplete */
	focused?: boolean;
};

/**
 * Data payload for `APPLICATION_COMMAND` and `APPLICATION_COMMAND_AUTOCOMPLETE` interactions.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-application-command-data-structure
 */
export type ApplicationCommandData = {
	/** id of the invoked command */
	id: string;
	/** name of the invoked command */
	name: string;
	/** type of the invoked command */
	type: ApplicationCommandType;
	/** converted users, roles, channels, and attachments */
	resolved?: ResolvedData;
	/** params and values from the user, partial for autocomplete requests */
	options?: ApplicationCommandInteractionDataOption[];
	/** id of the guild the command is registered to */
	guild_id?: string;
	/** id of the user or message targeted by a user or message command */
	target_id?: string;
};

/**
 * Data payload for `MESSAGE_COMPONENT` interactions.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-message-component-data-structure
 */
export type MessageComponentData = {
	/** custom id of the component */
	custom_id: string;
	/** type of the component */
	component_type: ComponentType;
	/** values chosen by the user, always present for select menu components */
	values?: string[];
	/** resolved entities from the selected options, select menu components only */
	resolved?: ResolvedData;
};

/**
 * Data payload for `MODAL_SUBMIT` interactions.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-modal-submit-data-structure
 */
export type ModalSubmitData = {
	/** custom id of the modal */
	custom_id: string;
	/** values submitted by the user */
	components: ModalComponent[];
	/** resolved entities from selected options within the modal */
	resolved?: ResolvedData;
};

/**
 * Mapping of installation context (stringified {@link DiscordApplicationIntegrationTypes} value)
 * to the guild or user id the app is authorized for in that context.
 */
export type AuthorizingIntegrationOwners = Record<string, string>;

type BaseInteraction<TType extends InteractionType> = {
	/** id of the interaction */
	id: string;
	/** id of the application this interaction is for */
	application_id: string;
	/** type of interaction */
	type: TType;
	/** guild that the interaction was sent from */
	guild_id?: string;
	/** partial guild that the interaction was sent from */
	guild?: Partial<DiscordGuild>;
	/** channel that the interaction was sent from */
	channel_id?: string;
	/** partial channel that the interaction was sent from */
	channel?: Partial<DiscordChannel>;
	/** guild member data for the invoking user, including permissions, present in guilds */
	member?: DiscordMember;
	/** user object for the invoking user, present when invoked in a DM */
	user?: DiscordUser;
	/** continuation token for responding to the interaction, valid for 15 minutes */
	token: string;
	/** read-only property, always `1` */
	version: 1;
	/** for components/modals, the message they were attached to */
	message?: DiscordMessage;
	/** bitwise set of permissions the app has in the source location of the interaction */
	app_permissions: string;
	/** selected language of the invoking user, not present on PING */
	locale?: string;
	/** guild's preferred locale, present if invoked in a guild */
	guild_locale?: string;
	/**
	 * for monetized apps, any entitlements for the invoking user, representing access to SKUs
	 * @todo replace with a typed `Entitlement` once monetization support lands
	 */
	entitlements: JSONObject[];
	/** mapping of installation contexts that the interaction was authorized for to related user/guild ids */
	authorizing_integration_owners: AuthorizingIntegrationOwners;
	/** context where the interaction was triggered from */
	context?: InteractionContextType;
	/** attachment size limit in bytes for this interaction */
	attachment_size_limit: number;
};

/** Initial handshake sent when Discord validates an interactions endpoint URL */
export type PingInteraction = BaseInteraction<typeof InteractionTypes.PING>;

/** A slash, user, or message command invocation */
export type ApplicationCommandInteraction = BaseInteraction<typeof InteractionTypes.APPLICATION_COMMAND> & {
	data: ApplicationCommandData;
};

/** A button click or select menu choice on a message */
export type MessageComponentInteraction = BaseInteraction<typeof InteractionTypes.MESSAGE_COMPONENT> & {
	data: MessageComponentData;
	message: DiscordMessage;
};

/** A request for autocomplete suggestions while the user is filling out a command */
export type ApplicationCommandAutocompleteInteraction = BaseInteraction<typeof InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE> & {
	data: ApplicationCommandData;
};

/** A modal form submission */
export type ModalSubmitInteraction = BaseInteraction<typeof InteractionTypes.MODAL_SUBMIT> & {
	data: ModalSubmitData;
};

/**
 * An interaction received over the gateway or an interactions endpoint.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object
 */
export type Interaction =
	| PingInteraction
	| ApplicationCommandInteraction
	| MessageComponentInteraction
	| ApplicationCommandAutocompleteInteraction
	| ModalSubmitInteraction;

/**
 * The deprecated summary of an interaction attached to a message created as a direct response
 * to it. Superseded by `message.interaction_metadata`, but still sent for backwards
 * compatibility.
 */
export type MessageInteraction = {
	/** id of the interaction */
	id: string;
	/** type of interaction */
	type: InteractionType;
	/** name of the command, including subcommands and subcommand groups */
	name: string;
	/** user who invoked the interaction */
	user: DiscordUser;
	/** member who invoked the interaction, present in guilds */
	member?: Partial<DiscordMember>;
};

/**
 * The type of payload Discord expects back when responding to an interaction, determining the
 * shape of the response's `data` field.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
 */
export const InteractionCallbackTypes = {
	/** ACK a `PING` */
	PONG: 1,
	/** respond to an interaction with a message */
	CHANNEL_MESSAGE_WITH_SOURCE: 4,
	/** ACK an interaction and edit a response later, the user sees a loading state */
	DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
	/** for components, ACK an interaction and edit the original message later; no loading state */
	DEFERRED_UPDATE_MESSAGE: 6,
	/** for components, edit the message the component was attached to */
	UPDATE_MESSAGE: 7,
	/** respond to an autocomplete interaction with suggested choices */
	APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
	/** respond to an interaction with a popup modal */
	MODAL: 9,
	/** @deprecated respond with an upgrade button, only available for apps with monetization enabled */
	PREMIUM_REQUIRED: 10,
	/** launch the Activity associated with the app, only available for apps with Activities enabled */
	LAUNCH_ACTIVITY: 12
} as const;
export type InteractionCallbackType = ObjectValues<typeof InteractionCallbackTypes>;

/**
 * The poll to create when responding with a message, as opposed to the `Poll` shape returned by
 * the API once a poll exists.
 */
export type PollCreateRequest = {
	/** the question of the poll, only text is supported */
	question: PollMedia;
	/** each of the answers available in the poll, up to 10 */
	answers: { poll_media: PollMedia }[];
	/** number of hours the poll should be open for, up to 32 days, defaults to 24 */
	duration?: number;
	/** whether a user can select multiple answers */
	allow_multiselect?: boolean;
	/** the layout type of the poll */
	layout_type?: ObjectValues<typeof PollLayoutTypes>;
};

/**
 * Message-shaped response data, used by {@link InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE}
 * and {@link InteractionCallbackTypes.UPDATE_MESSAGE}.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-response-object-messages
 */
export type InteractionCallbackMessages = {
	/** whether the response is TTS */
	tts?: boolean;
	/** message content */
	content?: string;
	/** up to 10 rich embeds */
	embeds?: Embed[];
	/** allowed mentions object */
	allowed_mentions?: AllowedMentions;
	/**
	 * message flags combined as a bitfield; only `SUPPRESS_EMBEDS`, `EPHEMERAL`, `IS_COMPONENTS_V2`,
	 * `IS_VOICE_MESSAGE`, and `SUPPRESS_NOTIFICATIONS` can be set
	 */
	flags?: number;
	/** message components */
	components?: MessageComponent[];
	/** attachment objects with filename and description, only `id` is required */
	attachments?: (Pick<Attachment, "id"> & Partial<Omit<Attachment, "id">>)[];
	/** details about the poll to include with the message */
	poll?: PollCreateRequest;
};

/**
 * Autocomplete suggestions returned for {@link InteractionCallbackTypes.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT}.
 */
export type InteractionCallbackAutocomplete = {
	/** autocomplete choices, max 25 */
	choices: ApplicationCommandOptionChoice[];
};

/**
 * Popup modal data returned for {@link InteractionCallbackTypes.MODAL}.
 */
export type InteractionCallbackModal = {
	/** developer-defined identifier, max 100 characters */
	custom_id: string;
	/** title of the modal, max 45 characters */
	title: string;
	/** 1-5 components making up the modal */
	components: ModalComponent[];
};

type BaseInteractionResponse<TType extends InteractionCallbackType> = {
	type: TType;
};

/** ACK a `PING`, valid only in response to a `PING` interaction */
export type PongResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.PONG>;

/** Respond to an interaction with a message */
export type ChannelMessageWithSourceResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE> & {
	data: InteractionCallbackMessages;
};

/** ACK an interaction, showing a loading state, and edit the response later */
export type DeferredChannelMessageWithSourceResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE> & {
	/** only the `EPHEMERAL` flag can be set here */
	data?: Pick<InteractionCallbackMessages, "flags">;
};

/** ACK a component interaction and edit the original message later, without a loading state */
export type DeferredUpdateMessageResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.DEFERRED_UPDATE_MESSAGE>;

/** Edit the message a component interaction was attached to */
export type UpdateMessageResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.UPDATE_MESSAGE> & {
	data?: InteractionCallbackMessages;
};

/** Respond to an autocomplete interaction with suggested choices */
export type AutocompleteResultResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT> & {
	data: InteractionCallbackAutocomplete;
};

/** Respond to an interaction with a popup modal, invalid in response to `MODAL_SUBMIT` or `PING` */
export type ModalResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.MODAL> & {
	data: InteractionCallbackModal;
};

/** @deprecated Respond with an upgrade button, monetized apps only */
export type PremiumRequiredResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.PREMIUM_REQUIRED>;

/** Launch the Activity associated with the app */
export type LaunchActivityResponse = BaseInteractionResponse<typeof InteractionCallbackTypes.LAUNCH_ACTIVITY>;

/**
 * The payload sent back to Discord to respond to an {@link Interaction}.
 *
 * @see https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-response-object
 */
export type InteractionResponse =
	| PongResponse
	| ChannelMessageWithSourceResponse
	| DeferredChannelMessageWithSourceResponse
	| DeferredUpdateMessageResponse
	| UpdateMessageResponse
	| AutocompleteResultResponse
	| ModalResponse
	| PremiumRequiredResponse
	| LaunchActivityResponse;
