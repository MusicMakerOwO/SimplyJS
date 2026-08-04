import { ObjectValues, Prettify } from "./HelperTypes.js";
import { DiscordChannelTypes } from "./DiscordAPITypes.js";

/**
 * The full set of message and modal component types.
 *
 * @see https://docs.discord.com/developers/components/reference#anatomy-of-a-component
 */
export const ComponentTypes = {
	/** container to display a row of interactive components */
	ACTION_ROW: 1,
	/** interactive button */
	BUTTON: 2,
	/** select menu for picking from user-defined text options */
	STRING_SELECT: 3,
	/** input field for short or paragraph text (modal-only) */
	TEXT_INPUT: 4,
	/** select menu for picking from a server's users */
	USER_SELECT: 5,
	/** select menu for picking from a server's roles */
	ROLE_SELECT: 6,
	/** select menu for picking from a server's users and roles */
	MENTIONABLE_SELECT: 7,
	/** select menu for picking from a server's channels */
	CHANNEL_SELECT: 8,
	/** container to display text alongside an accessory component (message-only) */
	SECTION: 9,
	/** markdown text (message-only) */
	TEXT_DISPLAY: 10,
	/** small image that can be used as an accessory (message-only) */
	THUMBNAIL: 11,
	/** display images and other media (message-only) */
	MEDIA_GALLERY: 12,
	/** displays an attached file (message-only) */
	FILE: 13,
	/** adds vertical padding between other components (message-only) */
	SEPARATOR: 14,
	/** container that visually groups a set of components (message-only) */
	CONTAINER: 17,
	/** associates a label and optional description with a component (modal-only) */
	LABEL: 18
} as const;
export type ComponentType = ObjectValues<typeof ComponentTypes>;

/**
 * A minimal emoji reference used by buttons and select options.
 *
 * `name` holds the unicode character for default emojis, or the custom emoji's name.
 */
export type ComponentEmoji = {
	/** id of the custom emoji */
	id?: string;
	/** name of the emoji, or the unicode character for default emojis */
	name?: string;
	/** whether the custom emoji is animated */
	animated?: boolean;
};

/**
 * A media reference used by components that display an image, video, or file, such as
 * {@link Thumbnail}, {@link MediaGalleryItem}, and {@link FileComponent}.
 *
 * Only supports normal URLs and `attachment://<filename>` references to files uploaded
 * alongside the current message/modal.
 */
export type UnfurledMediaItem = {
	/** supports arbitrary urls and `attachment://<filename>` references */
	url: string;
};

export const ButtonStyles = {
	/** the most important or recommended action in a group of options */
	PRIMARY: 1,
	/** alternative or supporting actions */
	SECONDARY: 2,
	/** confirms a positive action */
	SUCCESS: 3,
	/** confirms a negative or destructive action */
	DANGER: 4,
	/** navigates to a URL, does not send an interaction when clicked */
	LINK: 5,
	/** purchases a SKU, does not send an interaction when clicked */
	PREMIUM: 6
} as const;

type BaseComponent<TType extends ComponentType> = {
	type: TType;
	/** 32-bit integer identifier, unique per message/modal; sending `0` is treated as empty and auto-populated */
	id?: number;
};

/** Non-interactive button styles, which require `custom_id` and receive an interaction when clicked */
type BaseButton = {
	type: typeof ComponentTypes.BUTTON;
	/** text that appears on the button, max 80 characters */
	label: string;
	/** emoji displayed on the button */
	emoji?: ComponentEmoji;
	/** whether the button is disabled, defaults to false */
	disabled?: boolean;
};

export type InteractiveButton = Prettify< BaseButton & {
	style: typeof ButtonStyles.PRIMARY | typeof ButtonStyles.SECONDARY | typeof ButtonStyles.SUCCESS | typeof ButtonStyles.DANGER;
	/** developer-defined identifier, max 100 characters, must be unique per message/modal */
	custom_id: string;
} >;

export type LinkButton = Prettify< BaseButton & {
	style: typeof ButtonStyles.LINK;
	/** url the button opens, max 512 characters; no interaction is sent when clicked */
	url: string;
} >;

export type PremiumButton = {
	type: typeof ComponentTypes.BUTTON
	style: typeof ButtonStyles.PREMIUM;
	/** id of the SKU the button purchases; no interaction is sent when clicked */
	sku_id: string;
	disabled?: boolean;
};

/**
 * Interactive button component.
 *
 * @see https://docs.discord.com/developers/components/reference#button
 */
export type Button = InteractiveButton | LinkButton | PremiumButton;

/**
 * A single choice within a {@link StringSelect}.
 */
export type SelectOption = {
	/** user-facing name of the option, max 100 characters */
	label: string;
	/** developer-defined value of the option, max 100 characters */
	value: string;
	/** additional description of the option, max 100 characters */
	description?: string;
	/** emoji displayed with the option */
	emoji?: ComponentEmoji;
	/** whether this option should be pre-selected by default */
	default?: boolean;
};

/**
 * A pre-filled entry for {@link UserSelect}, {@link RoleSelect}, {@link MentionableSelect}, and
 * {@link ChannelSelect}.
 */
export type SelectDefaultValue = {
	/** id of the user, role, or channel */
	id: string;
	/** type of value that `id` represents */
	type: "user" | "role" | "channel";
};

type BaseSelect<TType extends ComponentType> = BaseComponent<TType> & {
	/** developer-defined identifier, max 100 characters, must be unique per message/modal */
	custom_id: string;
	/** placeholder text shown when nothing is selected, max 150 characters */
	placeholder?: string;
	/** minimum number of items that must be chosen, 0-25, defaults to 1 */
	min_values?: number;
	/** maximum number of items that can be chosen, max 25, defaults to 1 */
	max_values?: number;
	/** whether the select is required to be answered, modal-only, defaults to true */
	required?: boolean;
	/** whether the select is disabled, message-only, defaults to false */
	disabled?: boolean;
};

/**
 * Select menu for choosing from developer-defined text options.
 *
 * @see https://docs.discord.com/developers/components/reference#string-select
 */
export type StringSelect = BaseSelect<typeof ComponentTypes.STRING_SELECT> & {
	/** choices in the select, max 25 */
	options: SelectOption[];
};

/**
 * Select menu for choosing from a server's users.
 *
 * @see https://docs.discord.com/developers/components/reference#user-select
 */
export type UserSelect = BaseSelect<typeof ComponentTypes.USER_SELECT> & {
	/** pre-filled users, count must fall within min_values/max_values */
	default_values?: SelectDefaultValue[];
};

/**
 * Select menu for choosing from a server's roles.
 *
 * @see https://docs.discord.com/developers/components/reference#role-select
 */
export type RoleSelect = BaseSelect<typeof ComponentTypes.ROLE_SELECT> & {
	/** pre-filled roles, count must fall within min_values/max_values */
	default_values?: SelectDefaultValue[];
};

/**
 * Select menu for choosing from a server's users and roles.
 *
 * @see https://docs.discord.com/developers/components/reference#mentionable-select
 */
export type MentionableSelect = BaseSelect<typeof ComponentTypes.MENTIONABLE_SELECT> & {
	/** pre-filled users/roles, count must fall within min_values/max_values */
	default_values?: SelectDefaultValue[];
};

/**
 * Select menu for choosing from a server's channels.
 *
 * @see https://docs.discord.com/developers/components/reference#channel-select
 */
export type ChannelSelect = BaseSelect<typeof ComponentTypes.CHANNEL_SELECT> & {
	/** restricts the channel types shown in the picker */
	channel_types?: ObjectValues<typeof DiscordChannelTypes>[];
	/** pre-filled channels, count must fall within min_values/max_values */
	default_values?: SelectDefaultValue[];
};

/** Any select menu component */
export type SelectMenu = StringSelect | UserSelect | RoleSelect | MentionableSelect | ChannelSelect;

export const TextInputStyles = {
	/** single-line input */
	SHORT: 1,
	/** multi-line input */
	PARAGRAPH: 2
} as const;

/**
 * Free-form text field, modal-only. Must be nested inside a {@link Label}.
 *
 * @see https://docs.discord.com/developers/components/reference#text-input
 */
export type TextInput = BaseComponent<typeof ComponentTypes.TEXT_INPUT> & {
	/** developer-defined identifier, max 100 characters, must be unique per modal */
	custom_id: string;
	/** whether the input is single-line or multi-line */
	style: typeof TextInputStyles.SHORT | typeof TextInputStyles.PARAGRAPH;
	/** minimum input length, 0-4000 */
	min_length?: number;
	/** maximum input length, 1-4000 */
	max_length?: number;
	/** whether the input is required to be filled, defaults to true */
	required?: boolean;
	/** pre-filled value, max 4000 characters */
	value?: string;
	/** placeholder text shown when the input is empty, max 100 characters */
	placeholder?: string;
};

/**
 * Interactive component that can be nested inside an {@link ActionRow}.
 */
export type ActionRowChild = Button | SelectMenu;

/**
 * Container for interactive components, rendered as a row.
 *
 * @see https://docs.discord.com/developers/components/reference#action-row
 */
export type ActionRow = BaseComponent<typeof ComponentTypes.ACTION_ROW> & {
	/** up to 5 buttons, or a single select menu */
	components: ActionRowChild[];
};

/**
 * Markdown text, rendered similarly to message content. Respects the message's
 * `allowed_mentions`.
 *
 * @see https://docs.discord.com/developers/components/reference#text-display
 */
export type TextDisplay = BaseComponent<typeof ComponentTypes.TEXT_DISPLAY> & {
	/** text to display, supports markdown, mentions, and emoji */
	content: string;
};

/**
 * Small image accessory, only usable inside a {@link Section}'s `accessory` field.
 *
 * @see https://docs.discord.com/developers/components/reference#thumbnail
 */
export type Thumbnail = BaseComponent<typeof ComponentTypes.THUMBNAIL> & {
	/** the thumbnail's image; only image, gif, and animated webp media is supported */
	media: UnfurledMediaItem;
	/** alt text for the media, max 1024 characters */
	description?: string;
	/** whether the thumbnail is blurred until clicked, defaults to false */
	spoiler?: boolean;
};

/** Accessory components that can be attached to a {@link Section} */
export type SectionAccessory = Button | Thumbnail;

/**
 * Displays text alongside an accessory component, such as a thumbnail or button.
 *
 * @see https://docs.discord.com/developers/components/reference#section
 */
export type Section = BaseComponent<typeof ComponentTypes.SECTION> & {
	/** 1-3 text display components making up the section's content */
	components: TextDisplay[];
	/** component contextually associated with the content, a button or thumbnail */
	accessory: SectionAccessory;
};

/**
 * A single item within a {@link MediaGallery}.
 */
export type MediaGalleryItem = {
	/** the item's image or video */
	media: UnfurledMediaItem;
	/** alt text for the media, max 1024 characters */
	description?: string;
	/** whether the media is blurred until clicked, defaults to false */
	spoiler?: boolean;
};

/**
 * Displays 1-10 media attachments in an organized gallery format.
 *
 * @see https://docs.discord.com/developers/components/reference#media-gallery
 */
export type MediaGallery = BaseComponent<typeof ComponentTypes.MEDIA_GALLERY> & {
	/** 1-10 media gallery items */
	items: MediaGalleryItem[];
};

/**
 * Displays an uploaded file as an attachment.
 *
 * @see https://docs.discord.com/developers/components/reference#file
 */
export type FileComponent = BaseComponent<typeof ComponentTypes.FILE> & {
	/** the attached file, only supports `attachment://<filename>` references */
	file: UnfurledMediaItem;
	/** whether the file is blurred until clicked, defaults to false */
	spoiler?: boolean;
	/** name of the file, populated by Discord in responses */
	name?: string;
	/** size of the file in bytes, populated by Discord in responses */
	size?: number;
};

export const SeparatorSpacingSizes = {
	/** small spacing */
	SMALL: 1,
	/** large spacing */
	LARGE: 2
} as const;
export type SeparatorSpacingSize = ObjectValues<typeof SeparatorSpacingSizes>;

/**
 * Adds vertical padding and an optional visual divider between other components.
 *
 * @see https://docs.discord.com/developers/components/reference#separator
 */
export type Separator = BaseComponent<typeof ComponentTypes.SEPARATOR> & {
	/** whether a divider line should be displayed, defaults to true */
	divider?: boolean;
	/** size of the spacing, defaults to SMALL */
	spacing?: SeparatorSpacingSize;
};

/** Components that can be nested inside a {@link Container} */
export type ContainerChild = ActionRow | TextDisplay | Section | MediaGallery | FileComponent | Separator;

/**
 * Visually groups a set of components inside a rounded rectangle with an optional accent
 * color, similar to an embed.
 *
 * @see https://docs.discord.com/developers/components/reference#container
 */
export type Container = BaseComponent<typeof ComponentTypes.CONTAINER> & {
	/** child components making up the container */
	components: ContainerChild[];
	/** color for the accent on the container, similar to an embed's color */
	accent_color?: number | null;
	/** whether the container is blurred until clicked, defaults to false */
	spoiler?: boolean;
};

/** Interactive components that can be nested inside a {@link Label}, modal-only */
export type LabelChild = TextInput | StringSelect | UserSelect | RoleSelect | MentionableSelect | ChannelSelect;

/**
 * Associates a label (and optional description) with a modal-only interactive component.
 *
 * @see https://docs.discord.com/developers/components/reference#label
 */
export type Label = BaseComponent<typeof ComponentTypes.LABEL> & {
	/** label text, max 45 characters */
	label: string;
	/** additional description text, max 100 characters */
	description?: string;
	/** the component this label describes */
	component: LabelChild;
};

/** Any top-level component that can appear in a message's `components` array */
export type MessageComponent = ActionRow | Section | TextDisplay | MediaGallery | FileComponent | Separator | Container;

/** Any top-level component that can appear in a modal's `components` array */
export type ModalComponent = Label | ActionRow;

/** Any known message or modal component */
export type AnyComponent = MessageComponent | ModalComponent | Button | SelectMenu | TextInput | Thumbnail;