import type {
	DiscordChannel,
	DiscordEmoji,
	DiscordGuild,
	DiscordRole,
	DiscordSticker, DiscordUser
} from "./DiscordAPITypes.js";
import type { Guild } from "../Structures/Guild.js";
import type { Member } from "../Structures/Member.js";
import type { Message } from "../Structures/Message.js";
import type { Role } from "../Structures/Role.js";
import type { Sticker } from "../Structures/Sticker.js";
import type { User } from "../Structures/User.js";
import { Emoji } from "../Structures/Emoji.js";
import { BaseChannel } from "../Structures/BaseChannel.js";
import { GuildTextChannel } from "../Structures/GuildTextChannel.js";
import { GuildVoiceChannel } from "../Structures/GuildVoiceChannel.js";
import { GuildAnnouncementChannel } from "../Structures/GuildAnnouncementChannel.js";
import { GuildCategoryChannel } from "../Structures/GuildCategoryChannel.js";
import { GuildForumChannel } from "../Structures/GuildForumChannel.js";
import { GuildThreadChannel } from "../Structures/GuildThreadChannel.js";
import { GuildStageChannel } from "../Structures/GuildStageChannel.js";

export type Channel =
	| GuildAnnouncementChannel
	| GuildTextChannel
	| GuildVoiceChannel
	| GuildCategoryChannel
	| GuildForumChannel
	| GuildStageChannel
	| GuildThreadChannel
	| BaseChannel

export type MessageDeletePayload = {
	id: string;
	channel_id: string;
	guild_id: string | null;
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
	MemberCreate: "GuildMemberAdd",
	/**
	 * Fired when guild member data changes.
	 * Listener arguments: `oldMember` ({@link Member} | `undefined`), `newMember` ({@link Member}).
	 */
	MemberUpdate: "GuildMemberUpdate",
	/**
	 * Fired when a member leaves or is removed from a guild.
	 * Listener arguments: `member` ({@link Member} | {@link DiscordUser}).
	 */
	MemberDelete: "GuildMemberRemove",

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
	StickerUpdate: "StickersUpdate",
	/**
	 * Fired when a guild sticker sync removes stickers.
	 * Listener arguments: `guild` ({@link Guild}), `sticker` ({@link Sticker} | {@link DiscordSticker}).
	 */
	StickerDelete: "StickerDelete",

	/**
	 * Fired when a role is created in a guild.
	 * Listener arguments: `role` ({@link Role}).
	 */
	RoleCreate: "GuildRoleCreate",
	/**
	 * Fired when role data changes.
	 * Listener arguments: `oldRole` ({@link Role} | `undefined`), `newRole` ({@link Role}).
	 */
	RoleUpdate: "GuildRoleUpdate",
	/**
	 * Fired when a role is deleted from a guild.
	 * Listener arguments: `role` ({@link Role} | {@link DiscordRole}).
	 */
	RoleDelete: "GuildRoleDelete",

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

	ReactionAdd: "ReactionAdd",
	ReactionRemove: "ReactionRemove",
} as const;

export type ClientEventMap = {
	[ClientEvents.Ready]: [user: User];

	[ClientEvents.GuildCreate]: [guild: Guild];
	[ClientEvents.GuildUpdate]: [oldGuild: Guild | undefined, newGuild: Guild];
	[ClientEvents.GuildDelete]: [guild: Guild | DiscordGuild];

	[ClientEvents.ChannelCreate]: [channel: BaseChannel];
	[ClientEvents.ChannelUpdate]: [oldChannel: BaseChannel | undefined, newChannel: BaseChannel];
	[ClientEvents.ChannelDelete]: [channel: BaseChannel | DiscordChannel];

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

	[ClientEvents.ReactionAdd]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		message_id: string,
		member: Member | null,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		message_user_id?: string | null
		super_reaction: boolean
	}];

	[ClientEvents.ReactionRemove]: [payload: {
		guild: Guild | { id: string } | null,
		channel: Channel | { id: string },
		user: User | { id: string },
		message_id: string,
		member: Member | null,
		emoji: Pick<DiscordEmoji, 'id' | 'name' | 'animated'>,
		message_user_id?: string | null
		super_reaction: boolean
	}];
};