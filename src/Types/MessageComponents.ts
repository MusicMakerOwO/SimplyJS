import { ObjectValues } from "./HelperTypes.js";
import {
	DiscordApplication, DiscordChannel,
	DiscordEmoji,
	DiscordMember,
	DiscordRole,
	DiscordSticker,
	DiscordUser
} from "./DiscordAPITypes.js";
import { JSONObject } from "./Internal.js";

export const EmbedTypes = {
	/** generic embed rendered from embed attributes */
	RICH: "rich",
	/** image embed */
	IMAGE: "image",
	/** video embed */
	VIDEO: "video",
	/** animated gif image embed rendered as a video embed */
	GIFV: "gifv",
	/** article embed */
	ARTICLE: "article",
	/** link embed */
	LINK: "link",
	/** poll result embed */
	POLL_RESULT: "poll_result"
} as const;

export const EmbedFlags = {
	/** this embed is a fallback for a reply to an activity card */
	IS_CONTENT_INVENTORY_ENTRY: 1 << 5
} as const;

export const EmbedMediaFlags = {
	/** this image is animated */
	IS_ANIMATED: 1 << 5
} as const;

export type EmbedVideo = {
	/** source url of video */
	url?: string;
	/** a proxied url of the video */
	proxy_url?: string;
	/** height of video */
	height?: number;
	/** width of video */
	width?: number;
	/** the video’s media type */
	content_type?: string;
	/** thumbhash placeholder of the video */
	placeholder?: string;
	/** version of the placeholder */
	placeholder_version?: number;
	/** description (alt text) for the video */
	description?: string;
	/**
	 * embed media flags combined as a bitfield
	 * @see {EmbedMediaFlags}
	 */
	flags?: number;
};

export type EmbedImage = {
	/** source url of image (only supports http(s) and attachments) */
	url: string;
	/** a proxied url of the image */
	proxy_url?: string;
	/** height of image */
	height?: number;
	/** width of image */
	width?: number;
	/** the image’s media type */
	content_type?: string;
	/** thumbhash placeholder of the image */
	placeholder?: string;
	/** version of the placeholder */
	placeholder_version?: number;
	/** description (alt text) for the image */
	description?: string;
	/**
	 * embed media flags combined as a bitfield
	 * @see {EmbedMediaFlags}
	 */
	flags?: number;
};

export type EmbedProvider = {
	/** name of provider */
	name?: string;
	/** url of provider */
	url?: string;
};

export type EmbedAuthor = {
	/** name of author */
	name: string;
	/** url of author (only supports http(s)) */
	url?: string;
	/** url of author icon (only supports http(s) and attachments) */
	icon_url?: string;
	/** a proxied url of author icon */
	proxy_icon_url?: string;
};

export type EmbedFooter = {
	/** footer text */
	text: string;
	/** url of footer icon (only supports http(s) and attachments) */
	icon_url?: string;
	/** a proxied url of footer icon */
	proxy_icon_url?: string;
};

export type EmbedField = {
	/** name of the field */
	name: string;
	/** value of the field */
	value: string;
	/** whether this field should display inline */
	inline?: boolean;
};

export type Embed = {
	/** title of embed */
	title?: string;
	/** type of embed (always "rich" for webhook embeds) */
	type?: ObjectValues<typeof EmbedTypes>;
	/** description of embed */
	description?: string;
	/** url of embed title */
	url?: string;
	/** unix timestamp of embed content */
	timestamp?: string;
	/** 24-bit color code of the embed */
	color?: number;
	/** footer information */
	footer?: EmbedFooter;
	/** image information */
	image?: EmbedImage;
	/** thumbnail information */
	thumbnail?: EmbedImage;
	/** video information */
	video?: EmbedVideo;
	/** provider information */
	provider?: EmbedProvider;
	/** author information */
	author?: EmbedAuthor;
	/** fields information, max of 25 */
	fields?: EmbedField[];
	/**
	 * embed flags combined as a bitfield
	 * @see {EmbedFlags}
	 */
	flags?: number;
}

/**
 * @note For the attachments array in Message Create/Edit requests, only the id is required.
 */
export type Attachment = {
	/** attachment id */
	id: string;
	/** name of file attached */
	filename: string;
	/** the title of the file */
	title?: string;
	/** description (alt text) for the file (max 1024 characters) */
	description?: string;
	/** the attachment’s media type */
	content_type?: string;
	/** size of file in bytes */
	size: number;
	/** source url of file */
	url: string;
	/** a proxied url of file */
	proxy_url: string;
	/** height of file (if image or video) */
	height?: number | null;
	/** width of file (if image or video) */
	width?: number | null;
	/** thumbhash placeholder (if image or video) */
	placeholder?: string;
	/** version of the placeholder (if image or video) */
	placeholder_version?: number;
	/** whether this attachment is ephemeral */
	ephemeral?: boolean;
	/** the duration of the audio file (currently for voice messages) */
	duration_secs?: number;
	/** base64 encoded bytearray representing a sampled waveform (currently for voice messages) */
	waveform?: string;
	/**
	 * attachment flags combined as a bitfield
	 * @see {AttachmentFlags}
	 */
	flags?: number;
	/** for Clips, array of users who were in the stream */
	clip_participants?: DiscordUser[];
	/** ISO8601 - for Clips, when the clip was created */
	clip_created_at?: string;
	/** for Clips, the application in the stream, if recognized */
	application?: DiscordApplication;
};

export const AttachmentFlags = {
	/** this attachment is a Clip from a stream */
	IS_CLIP: 1 << 0,
	/** this attachment is the thumbnail of a thread in a media channel, displayed in the grid but not on the message */
	IS_THUMBNAIL: 1 << 1,
	/** this attachment has been edited using the remix feature on mobile (deprecated) */
	IS_REMIX: 1 << 2,
	/** this attachment was marked as a spoiler and is blurred until clicked */
	IS_SPOILER: 1 << 3,
	/** this attachment is an animated image */
	IS_ANIMATED: 1 << 5
} as const;

/**
 * Setting the allowed_mentions field lets you determine whether users will receive notifications when you include
 * mentions in the message content, or the content of components attached to that message. This field is always
 * validated against your permissions and the presence of said mentions in the message, to avoid “phantom” pings where
 * users receive a notification without a visible mention in the message. For example, if you want to ping everyone,
 * including it in the allowed_mentions field is not enough, the mention format (@everyone) must also be present in the
 * content of the message or its components. It is important to note that setting this field does not guarantee a push
 * notification will be sent, as additional factors can influence this:
 *
 * - To mention roles and notify their members, the role’s mentionable field must be set to true, or the bot must have
 * the `MENTION_EVERYONE` permission
 * - To mention `@everyone` and `@here`, the bot must have the `MENTION_EVERYONE` permission
 * - Setting the `SUPPRESS_NOTIFICATIONS` flag when sending a message will disable push notifications and only cause a
 * notification badge
 * - Users can customize their notification settings through the Discord app, which might cause them to only receive a
 * notification badge and no push notification
 *
 * Allowed Mention Types:
 * - "roles": Controls role mentions
 * - "users": Controls user mentions
 * - "everyone": Controls @everyone and @here mentions
 *
 * Default Settings for Allowed Mentions:
 * The default value for the allowed_mentions field, used when it is not passed in the body, varies depending on the
 * context:
 *
 * In regular messages, all mention types are parsed, which is equivalent to sending the following data:
 * ```json
 * { "parse": ["users", "roles", "everyone"] }
 * ```
 *
 * In interactions and webhooks, only user mentions are parsed, which corresponds to the following:
 * ```json
 * { "parse": ["users"] }
 * ```
 */
export type AllowedMentions = {
	/** An array of allowed mention types to parse from the content */
	parse?: ("roles" | "users" | "everyone")[];
	/** Array of role ids to mention, max 100 */
	roles?: string[];
	/** Array of user ids to mention, max 100 */
	users?: string[];
	/** For replies, whether to mention the author of the message being replied to, defaults to false */
	replied_user?: boolean;
};

export type Reaction = {
	/** Total number of times this emoji has been used to react (including super reacts) */
	count: number;
	/** Reaction count details object */
	count_details: {
		/** Count of super reactions */
		burst: number;
		/** Count of normal reactions */
		normal: number;
	};
	/** Whether the current user reacted using this emoji */
	me: boolean;
	/** Whether the current user super-reacted using this emoji */
	me_burst: boolean;
	/** Emoji information (partial emoji object) */
	emoji: Partial<DiscordEmoji>; // Replace 'any' with a PartialEmoji type if available
	/** HEX colors used for super reaction */
	burst_colors: string[];
};

export const MessageTypes = {
	DEFAULT                                     : 0,
	RECIPIENT_ADD                               : 1,
	RECIPIENT_REMOVE                            : 2,
	CALL                                        : 3,
	CHANNEL_NAME_CHANGE                         : 4,
	CHANNEL_ICON_CHANGE                         : 5,
	CHANNEL_PINNED_MESSAGE                      : 6,
	USER_JOIN                                   : 7,
	GUILD_BOOST                                 : 8,
	GUILD_BOOST_TIER_1                          : 9,
	GUILD_BOOST_TIER_2                          : 10,
	GUILD_BOOST_TIER_3                          : 11,
	CHANNEL_FOLLOW_ADD                          : 12,
	GUILD_DISCOVERY_DISQUALIFIED                : 14,
	GUILD_DISCOVERY_REQUALIFIED                 : 15,
	GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING: 16,
	GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING  : 17,
	THREAD_CREATED                              : 18,
	/** Only available in API v8 and newer */
	REPLY: 19,
	/** Only available in API v8 and newer */
	CHAT_INPUT_COMMAND: 20,
	/** Only available in API v9 and newer */
	THREAD_STARTER_MESSAGE                : 21,
	GUILD_INVITE_REMINDER                 : 22,
	CONTEXT_MENU_COMMAND                  : 23,
	AUTO_MODERATION_ACTION                : 24,
	ROLE_SUBSCRIPTION_PURCHASE            : 25,
	INTERACTION_PREMIUM_UPSELL            : 26,
	STAGE_START                           : 27,
	STAGE_END                             : 28,
	STAGE_SPEAKER                         : 29,
	STAGE_TOPIC                           : 31,
	GUILD_APPLICATION_PREMIUM_SUBSCRIPTION: 32,
	GUILD_INCIDENT_ALERT_MODE_ENABLED     : 36,
	GUILD_INCIDENT_ALERT_MODE_DISABLED    : 37,
	GUILD_INCIDENT_REPORT_RAID            : 38,
	GUILD_INCIDENT_REPORT_FALSE_ALARM     : 39,
	PURCHASE_NOTIFICATION                 : 44,
	POLL_RESULT                           : 46
} as const;

export const MessageActivityTypes = {
	JOIN        : 1,
	SPECTATE    : 2,
	LISTEN      : 3,
	JOIN_REQUEST: 5
} as const;

export type MessageActivity = {
	/** type of message activity */
	type: ObjectValues<typeof MessageActivityTypes>;
	/** party_id from a Rich Presence event */
	party_id?: string;
};

/**
 * @note `FORWARD` can only be used for basic messages;
 * i.e. messages which do not have strong bindings to a non-global entity.
 * Thus Discord supports only messages with type `DEFAULT`, `REPLY`, `CHAT_INPUT_COMMAND`, or `CONTEXT_MENU_COMMAND`,
 *     and don’t support messages with a poll, call, or activity. This is subject to change in the future.
 */
export const MessageReferenceTypes = {
	DEFAULT: 0,
	FORWARD: 1
} as const;

export type MessageReference = {
	/**
	 * type of reference.
	 *
	 * If unset, `DEFAULT` can be assumed in order to match the behavior before message reference had types.
	 * In future API versions this will become a required field.
	 */
	type?: ObjectValues<typeof MessageReferenceTypes>;
	/** id of the originating message */
	message_id?: string;
	/** id of the originating message’s channel (optional when creating a reply, always present when receiving an event/response, required for forwards) */
	channel_id?: string;
	/** id of the originating message’s guild */
	guild_id?: string;
	/**
	 * when sending, whether to error if the referenced message doesn’t exist instead of sending as a normal
	 * (non-reply) message
	 * @default true
	 */
	fail_if_not_exists?: boolean;
};

export type StickerItem = Pick<DiscordSticker, 'id' | 'name' | 'format_type'>;

export type RoleSubscriptionData = {
	/** the id of the sku and listing that the user is subscribed to */
	role_subscription_listing_id: string;
	/** the name of the tier that the user is subscribed to */
	tier_name: string;
	/** the cumulative number of months that the user has been subscribed for */
	total_months_subscribed: number;
	/** whether this notification is for a renewal rather than a new purchase */
	is_renewal: boolean;
};

/**
 * @note We might have different layouts for polls in the future. For now though, this number will be 1.
 */
export const PollLayoutTypes = {
	DEFAULT: 1
} as const;

export type PollAnswerCount = {
	/** The answer_id */
	id: number;
	/** The number of votes for this answer */
	count: number;
	/** Whether the current user voted for this answer */
	me_voted: boolean;
};

/**
 * The `results` field may be not present in certain responses where, as an implementation detail, we do not fetch the
 * poll results in our backend.
 *
 * This should be treated as “unknown results”, as opposed to “no results”.
 * You can keep using the results if you have previously received them through other means.
 *
 * Also, due to the intricacies of counting at scale, while a poll is in progress the results may not be perfectly
 * accurate. They are  usually accurate, and shouldn’t deviate significantly — it’s just difficult to make guarantees.
 *
 * To compensate for this, after a poll is finished there is a background job which performs a final, accurate tally of
 * votes. This tally concludes once `is_finalized` is `true`. Polls that have ended will also always contain results.
 *
 * If `answer_counts` does not contain an entry for a particular answer, then there are no votes for that answer.
 */
export type PollResults = {
	/** Whether the votes have been precisely counted */
	is_finalized: boolean;
	/** The counts for each answer */
	answer_counts: PollAnswerCount[];
};

export type MessageCall = {
	/** array of user ids that participated in the call */
	participants: string[];
	/** time when call ended (ISO8601 timestamp, optional) */
	ended_timestamp?: string | null;
};

export const BaseThemeTypes = {
	/** equivalent to DARK */
	UNSET   : 0,
	DARK    : 1,
	LIGHT   : 2,
	DARKER  : 3,
	MIDNIGHT: 4
} as const;

export type SharedClientTheme = {
	/** the hexadecimal-encoded colors of the theme (max of 5) */
	colors: string[];
	/** the direction of the theme’s colors (max of 360) */
	gradient_angle: number;
	/** the intensity of the theme’s colors (max of 100) */
	base_mix: number;
	/** the mode of the theme (optional) */
	base_theme?: ObjectValues<typeof BaseThemeTypes>;
};


/**
 * @see https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-resolved-data-structure
 */
export type ResolvedData = {
	/** IDs and User objects */
	users?: Record<string, DiscordUser>;
	/** IDs and partial Member objects */
	members?: Record<string, Partial<DiscordMember>>;
	/** IDs and Role objects */
	roles?: Record<string, Partial<DiscordRole>>;
	/** IDs and partial Channel objects */
	channels?: Record<string, Partial<DiscordChannel>>;
	/** IDs and partial Message objects */
	messages?: Record<string, Partial<DiscordMessage>>;
	/** IDs and attachment objects */
	attachments?: Record<string, Attachment>;
};

export type DiscordMessage = {
	/** id of the message */
	id: string;
	/** id of the channel the message was sent in */
	channel_id: string;
	/** the author of this message (not guaranteed to be a valid user, see below) */
	author: DiscordUser;
	/** contents of the message */
	content: string;
	/** when this message was sent */
	timestamp: string;
	/** when this message was edited (or null if never) */
	edited_timestamp: string | null;
	/** whether this was a TTS message */
	tts: boolean;
	/** whether this message mentions everyone */
	mention_everyone: boolean;
	/** users specifically mentioned in the message */
	mentions: DiscordUser[];
	/** roles specifically mentioned in this message */
	mention_roles: string[];
	/** channels specifically mentioned in this message */
	mention_channels?: ChannelMention[];
	/** any attached files that are not referenced in embeds or components */
	attachments: Attachment[];
	/** any embedded content */
	embeds: Embed[];
	/** reactions to the message */
	reactions?: Reaction[];
	/** used for validating a message was sent */
	nonce?: number | string;
	/** whether this message is pinned */
	pinned: boolean;
	/** if the message is generated by a webhook, this is the webhook's id */
	webhook_id?: string;
	/** type of message */
	type: ObjectValues<typeof MessageTypes>;
	/** sent with Rich Presence-related chat embeds */
	activity?: MessageActivity;
	/** sent with Rich Presence-related chat embeds */
	application?: Partial<DiscordApplication>;
	/** if the message is an Interaction or application-owned webhook, this is the id of the application */
	application_id?: string;
	/** message flags combined as a bitfield */
	flags?: number;
	/** data showing the source of a crosspost, channel follow add, pin, or reply message */
	message_reference?: MessageReference;
	/** the message associated with the message_reference. This is a minimal subset of fields in a message (e.g. author is excluded.) */
	message_snapshots?: { message: Partial<DiscordMessage> }[];
	/** the message associated with the message_reference */
	referenced_message?: DiscordMessage | null;
	/** Sent if the message is sent as a result of an interaction */
	// TODO Interactions coming in a later update
	interaction_metadata?: JSONObject;
	/** Deprecated in favor of interaction_metadata; sent if the message is a response to an interaction */
	// TODO Interactions coming in a later update
	interaction?: JSONObject;
	/** the thread that was started from this message, includes thread member object */
	thread?: DiscordChannel;
	/** sent if the message contains components like buttons, action rows, or other interactive components */
	// TODO Components coming in a later update
	components?: JSONObject[];
	/** sent if the message contains stickers */
	sticker_items?: StickerItem[];
	/** Deprecated the stickers sent with the message */
	stickers?: DiscordSticker[];
	/** A generally increasing integer (there may be gaps or duplicates) that represents the approximate position of the message in a thread. It can be used to estimate the relative position of the message in a thread in company with total_message_sent on parent thread */
	position?: number;
	/** data of the role subscription purchase or renewal that prompted this ROLE_SUBSCRIPTION_PURCHASE message */
	role_subscription_data?: RoleSubscriptionData;
	/** data for users, members, channels, and roles referenced in this message */
	resolved?: ResolvedData;
	/** A poll! */
	poll?: Poll;
	/** the call associated with the message */
	call?: MessageCall;
	/** the custom client-side theme shared via the message */
	shared_client_theme?: SharedClientTheme;
};

export type Poll = {
	/** The question of the poll. Only text is supported. */
	question: PollMedia;
	/** Each of the answers available in the poll. */
	answers: PollAnswer[];
	/** The time when the poll ends. */
	expiry?: string | null;
	/** Whether a user can select multiple answers */
	allow_multiselect: boolean;
	/** The layout type of the poll */
	layout_type: ObjectValues<typeof PollLayoutTypes>;
	/** The results of the poll */
	results?: PollResults;
};

export type ChannelMention = {
	/** id of the channel */
	id: string;
	/** id of the guild containing the channel */
	guild_id: string;
	/** the type of channel */
	type: number;
	/** the name of the channel */
	name: string;
};


export type PollAnswer = {
	/** The ID of the answer */
	answer_id: number;
	/** The data of the answer */
	poll_media: PollMedia;
};

export type PollMedia = {
	// Why does discord not give us the actual question? They only return the emoji for some strange reason
	// Additionally, it is called a "Poll Media Object" but there is no media, and it is only ever used in Poll.question and PollAnswer.poll_media
	// Terrible naming convention if you ask me >:/
	emoji?: Partial<DiscordEmoji>;
}