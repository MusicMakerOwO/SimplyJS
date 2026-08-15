import type {
	DiscordAuditLogEntry,
	DiscordChannel,
	DiscordEmoji,
	DiscordGuild,
	DiscordRole,
	DiscordSticker, DiscordUser
} from "./DiscordAPITypes.js";
import type { Guild } from "../Structures/Guild.js";
import type { Invite } from "../Structures/Invite.js";
import type { Member } from "../Structures/Member.js";
import type { Message } from "../Structures/Message.js";
import type { Role } from "../Structures/Role.js";
import type { Sticker } from "../Structures/Sticker.js";
import type { User } from "../Structures/User.js";
import { Emoji } from "../Structures/Emoji.js";
import { BaseChannel } from "../Structures/Channels/BaseChannel.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { GuildVoiceChannel } from "../Structures/Channels/GuildVoiceChannel.js";
import { GuildAnnouncementChannel } from "../Structures/Channels/GuildAnnouncementChannel.js";
import { GuildCategoryChannel } from "../Structures/Channels/GuildCategoryChannel.js";
import { GuildForumChannel } from "../Structures/Channels/GuildForumChannel.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import { GuildStageChannel } from "../Structures/Channels/GuildStageChannel.js";
import {
	AutocompleteInteraction,
	ButtonInteraction,
	MessageContextMenuInteraction,
	ModalInteraction,
	SelectMenuInteraction,
	SlashCommandInteraction,
	UserContextMenuInteraction
} from "../Structures/index.js";

/** Every concrete channel structure the library can produce, falling back to `BaseChannel` for unhandled types */
export type Channel =
	| GuildAnnouncementChannel
	| GuildTextChannel
	| GuildVoiceChannel
	| GuildCategoryChannel
	| GuildForumChannel
	| GuildStageChannel
	| GuildThreadChannel
	| BaseChannel

/** The channels a message can actually live in - i.e. every channel exposing `send()` */
export type MessageableChannel =
	| GuildAnnouncementChannel
	| GuildTextChannel
	| GuildVoiceChannel
	| GuildStageChannel
	| GuildThreadChannel

/**
 * Every concrete interaction structure the library can produce for a gateway `INTERACTION_CREATE`
 * dispatch. Excludes `PingInteraction` - that variant only occurs over an HTTP interactions
 * endpoint, never on the gateway.
 */
export type AnyInteraction =
	| SlashCommandInteraction
	| UserContextMenuInteraction
	| MessageContextMenuInteraction
	| ButtonInteraction
	| SelectMenuInteraction
	| AutocompleteInteraction
	| ModalInteraction

/** Payload for `MessageDelete`; Discord only sends identifiers, never the deleted message itself */
export type MessageDeletePayload = {
	/** ID of the deleted message */
	id: string;
	/** Channel the message was deleted from */
	channelId: string;
	/** Guild the channel belongs to, or `null` for DM channels */
	guildId: string | null;
};

/** Payload for `MessageDeleteBulk`; Discord only sends identifiers, never the deleted messages themselves */
export type MessageDeleteBulkPayload = {
	/** IDs of the deleted messages */
	ids: string[];
	/** Channel the messages were deleted from */
	channelId: string;
	/** Guild the channel belongs to, or `null` for DM channels */
	guildId: string | null;
};

/** Payload for `InviteDelete`; Discord only sends the invite's location and code, never the invite itself */
export type InviteDeletePayload = {
	/** Channel the invite pointed to */
	channelId: string;
	/** Guild the invite belonged to, omitted for group DM invites */
	guildId?: string;
	/** The invite code that was deleted */
	code: string;
};

export const ClientEvents = {
	/**
	 * Fired once the client is ready for normal use.
	 *
	 * Listener arguments: `user` ({@link User}).
	 *
	 * Note: this is emitted after the raw `READY` payload is processed and after the
	 * initial required guilds from that payload have been received, or when the ready
	 * fallback timeout completes.
	 */
	Ready: "Ready",

	/**
	 * Fired when a guild becomes available to the client.
	 * Listener arguments: `guild` ({@link Guild}).
	 */
	GuildCreate: "GuildCreate",
	/**
	 * Fired when guild metadata changes.
	 * Listener arguments: `oldGuild` ({@link Guild} | `undefined`), `newGuild` ({@link Guild}).
	 */
	GuildUpdate: "GuildUpdate",
	/**
	 * Fired when a guild is removed, deleted, or becomes unavailable.
	 * Listener arguments: `guild` ({@link Guild} | {@link DiscordGuild}).
	 */
	GuildDelete: "GuildDelete",

	/**
	 * Fired when a guild channel is created.
	 * Listener arguments: `channel` ({@link Channel}).
	 */
	ChannelCreate: "ChannelCreate",
	/**
	 * Fired when a guild channel changes.
	 * Listener arguments: `oldChannel` ({@link Channel} | `undefined`), `newChannel` ({@link Channel}).
	 */
	ChannelUpdate: "ChannelUpdate",
	/**
	 * Fired when a guild channel is deleted.
	 * Listener arguments: `channel` ({@link Channel} | {@link DiscordChannel}).
	 */
	ChannelDelete: "ChannelDelete",

	/**
	 * Fired when a member joins a guild.
	 * Listener arguments: `member` ({@link Member}).
	 */
	MemberCreate: "MemberCreate",
	/**
	 * Fired when guild member data changes.
	 * Listener arguments: `oldMember` ({@link Member} | `undefined`), `newMember` ({@link Member}).
	 */
	MemberUpdate: "MemberUpdate",
	/**
	 * Fired when a member leaves or is removed from a guild.
	 * Listener arguments: `member` ({@link Member} | {@link DiscordUser}).
	 */
	MemberDelete: "MemberDelete",

	/**
	 * Fired when a guild emoji sync contains newly added emojis.
	 * Listener arguments: `guild` ({@link Guild}), `emoji` ({@link Emoji}).
	 */
	EmojiCreate: "EmojiCreate",
	/**
	 * Fired when a guild emoji sync contains changed emojis.
	 * Listener arguments: `guild` ({@link Guild}), `oldEmoji` ({@link Emoji} | `undefined`), `newEmoji` ({@link Emoji}).
	 */
	EmojiUpdate: "EmojiUpdate",
	/**
	 * Fired when a guild emoji sync removes emojis.
	 * Listener arguments: `guild` ({@link Guild}), `emoji` ({@link Emoji} | {@link DiscordEmoji}).
	 */
	EmojiDelete: "EmojiDelete",

	/**
	 * Fired when a guild sticker sync contains newly added stickers.
	 * Listener arguments: `guild` ({@link Guild}), `sticker` ({@link Sticker}).
	 */
	StickerCreate: "StickerCreate",
	/**
	 * Fired when a guild sticker sync contains changed stickers.
	 * Listener arguments: `guild` ({@link Guild}), `oldSticker` ({@link Sticker} | `undefined`), `newSticker` ({@link Sticker}).
	 */
	StickerUpdate: "StickerUpdate",
	/**
	 * Fired when a guild sticker sync removes stickers.
	 * Listener arguments: `guild` ({@link Guild}), `sticker` ({@link Sticker} | {@link DiscordSticker}).
	 */
	StickerDelete: "StickerDelete",

	/**
	 * Fired when a role is created in a guild.
	 * Listener arguments: `role` ({@link Role}).
	 */
	RoleCreate: "RoleCreate",
	/**
	 * Fired when role data changes.
	 * Listener arguments: `oldRole` ({@link Role} | `undefined`), `newRole` ({@link Role}).
	 */
	RoleUpdate: "RoleUpdate",
	/**
	 * Fired when a role is deleted from a guild.
	 * Listener arguments: `role` ({@link Role} | {@link DiscordRole}).
	 */
	RoleDelete: "RoleDelete",

	/**
	 * Fired when a message is created.
	 * Listener arguments: `message` ({@link Message}).
	 */
	MessageCreate: "MessageCreate",
	/**
	 * Fired when a message is updated.
	 * Listener arguments: `message` ({@link Message}).
	 */
	MessageUpdate: "MessageUpdate",
	/**
	 * Fired when a message is deleted.
	 * Listener arguments: `payload` ({@link MessageDeletePayload}).
	 */
	MessageDelete: "MessageDelete",
	/**
	 * Fired when multiple messages are deleted at once.
	 * Listener arguments: `payload` ({@link MessageDeleteBulkPayload}).
	 */
	MessageDeleteBulk: "MessageDeleteBulk",

	ReactionAdd: "ReactionAdd",
	ReactionRemove: "ReactionRemove",

	/**
	 * Fired when an invite is created.
	 * Listener arguments: `invite` ({@link Invite}).
	 */
	InviteCreate: "InviteCreate",
	/**
	 * Fired when an invite is deleted. Discord does not send the invite itself.
	 * Listener arguments: `payload` ({@link InviteDeletePayload}).
	 */
	InviteDelete: "InviteDelete",

	/**
	 * Fired when a user is banned from a guild.
	 * Listener arguments: `guild` ({@link Guild}), `user` ({@link User}).
	 */
	GuildBanAdd: "GuildBanAdd",
	/**
	 * Fired when a user ban is removed from a guild.
	 * Listener arguments: `guild` ({@link Guild}), `user` ({@link User}).
	 */
	GuildBanRemove: "GuildBanRemove",

	/**
	 * Fired when an audit log entry is created in a guild.
	 * Listener arguments: `guild` ({@link Guild}), `entry` ({@link DiscordAuditLogEntry}).
	 */
	AuditLogEntryCreate: "AuditLogEntryCreate",

	/**
	 * Fired when an interaction is created (slash command, button, select menu, modal, etc.).
	 * Also emitted, alongside `InteractionCreate`, is one of `SlashCommandUsed`,
	 * `UserContextMenuUsed`, `MessageContextMenuUsed`, `ButtonUsed`, `SelectMenuUsed`,
	 * `AutocompleteUsed`, or `ModalSubmitted` - whichever matches the interaction's concrete
	 * type - so consumers don't have to discriminate the union themselves.
	 * Listener arguments: `interaction` ({@link AnyInteraction}).
	 */
	InteractionCreate: "InteractionCreate",

	/**
	 * Fired when a slash (chat input) command is used.
	 * Listener arguments: `interaction` ({@link SlashCommandInteraction}).
	 */
	SlashCommandUsed: "SlashCommandUsed",
	/**
	 * Fired when a user context menu command is used.
	 * Listener arguments: `interaction` ({@link UserContextMenuInteraction}).
	 */
	UserContextMenuUsed: "UserContextMenuUsed",
	/**
	 * Fired when a message context menu command is used.
	 * Listener arguments: `interaction` ({@link MessageContextMenuInteraction}).
	 */
	MessageContextMenuUsed: "MessageContextMenuUsed",
	/**
	 * Fired when a button is clicked.
	 * Listener arguments: `interaction` ({@link ButtonInteraction}).
	 */
	ButtonUsed: "ButtonUsed",
	/**
	 * Fired when a select menu is used.
	 * Listener arguments: `interaction` ({@link SelectMenuInteraction}).
	 */
	SelectMenuUsed: "SelectMenuUsed",
	/**
	 * Fired when a command's autocomplete input is focused and needs suggestions.
	 * Listener arguments: `interaction` ({@link AutocompleteInteraction}).
	 */
	AutocompleteUsed: "AutocompleteUsed",
	/**
	 * Fired when a modal form is submitted.
	 * Listener arguments: `interaction` ({@link ModalInteraction}).
	 */
	ModalSubmitted: "ModalSubmitted",

} as const;

export type ClientEventMap = {
	[ClientEvents.Ready]: [user: User];

	[ClientEvents.GuildCreate]: [guild: Guild];
	[ClientEvents.GuildUpdate]: [oldGuild: Guild | undefined, newGuild: Guild];
	[ClientEvents.GuildDelete]: [guild: Guild | DiscordGuild];

	[ClientEvents.ChannelCreate]: [channel: Channel];
	[ClientEvents.ChannelUpdate]: [oldChannel: Channel | undefined, newChannel: Channel];
	[ClientEvents.ChannelDelete]: [channel: Channel | DiscordChannel];

	[ClientEvents.MemberCreate]: [member: Member];
	[ClientEvents.MemberUpdate]: [oldMember: Member | undefined, newMember: Member];
	[ClientEvents.MemberDelete]: [member: Member | DiscordUser];

	[ClientEvents.EmojiCreate]: [guild: Guild, emoji: Emoji];
	[ClientEvents.EmojiUpdate]: [guild: Guild, oldEmoji: Emoji | undefined, newEmoji: Emoji];
	[ClientEvents.EmojiDelete]: [guild: Guild, emoji: Emoji | DiscordEmoji];

	[ClientEvents.StickerCreate]: [guild: Guild, sticker: Sticker];
	[ClientEvents.StickerUpdate]: [guild: Guild, oldSticker: Sticker | undefined, newSticker: Sticker];
	[ClientEvents.StickerDelete]: [guild: Guild, sticker: Sticker | DiscordSticker];

	[ClientEvents.RoleCreate]: [role: Role];
	[ClientEvents.RoleUpdate]: [oldRole: Role | undefined, newRole: Role];
	[ClientEvents.RoleDelete]: [role: Role | DiscordRole];

	[ClientEvents.MessageCreate]: [message: Message];
	[ClientEvents.MessageUpdate]: [message: Message];
	[ClientEvents.MessageDelete]: [payload: MessageDeletePayload];
	[ClientEvents.MessageDeleteBulk]: [payload: MessageDeleteBulkPayload];

	[ClientEvents.ReactionAdd]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		messageId: string,
		member: Member | null,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		messageUserId?: string | null
		superReaction: boolean
	}];

	[ClientEvents.ReactionRemove]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		messageId: string,
		member: Member | null,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		messageUserId?: string | null
		superReaction: boolean
	}];

	[ClientEvents.InviteCreate]: [invite: Invite];
	[ClientEvents.InviteDelete]: [payload: InviteDeletePayload];

	[ClientEvents.GuildBanAdd]: [guild: Guild, user: User];
	[ClientEvents.GuildBanRemove]: [guild: Guild, user: User];

	[ClientEvents.AuditLogEntryCreate]: [guild: Guild, entry: DiscordAuditLogEntry];

	[ClientEvents.InteractionCreate]: [interaction: AnyInteraction]
	[ClientEvents.SlashCommandUsed]: [interaction: SlashCommandInteraction];
	[ClientEvents.UserContextMenuUsed]: [interaction: UserContextMenuInteraction];
	[ClientEvents.MessageContextMenuUsed]: [interaction: MessageContextMenuInteraction];
	[ClientEvents.ButtonUsed]: [interaction: ButtonInteraction];
	[ClientEvents.SelectMenuUsed]: [interaction: SelectMenuInteraction];
	[ClientEvents.AutocompleteUsed]: [interaction: AutocompleteInteraction];
	[ClientEvents.ModalSubmitted]: [interaction: ModalInteraction];
};