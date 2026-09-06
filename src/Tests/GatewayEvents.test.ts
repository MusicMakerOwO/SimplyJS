import { describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import {
	DiscordAutoModerationActionExecution,
	DiscordAutoModerationActionType,
	DiscordAutoModerationRule,
	DiscordAutoModerationRuleEventType,
	DiscordAutoModerationRuleTriggerType,
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordMember,
	DiscordRole,
	DiscordUser
} from "../Types/DiscordAPITypes.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { ChannelCreate, ChannelDelete, ChannelUpdate } from "../Events/Channels.js";
import { ThreadCreate, ThreadDelete, ThreadUpdate } from "../Events/Threads.js";
import { GuildCreate, GuildDelete } from "../Events/Guilds.js";
import { MemberCreate, MemberDelete, MemberUpdate } from "../Events/Members.js";
import { MessageCreate, MessageDelete, MessageUpdate } from "../Events/Messages.js";
import { Ready } from "../Events/Ready.js";
import { RoleCreate, RoleDelete, RoleUpdate } from "../Events/Roles.js";
import { GuildBanAdd, GuildBanRemove } from "../Events/Bans.js";
import { AuditLogEntryCreate } from "../Events/AuditLogs.js";
import { DiscordAuditLogEvent } from "../Types/DiscordAPITypes.js";
import { AutoModerationActionExecutionPayload, ClientEvents } from "../Types/SimplyJSTypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";
import { Message } from "../Structures/Message.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import {
	AutoModerationActionExecution,
	AutoModerationRuleCreate,
	AutoModerationRuleDelete,
	AutoModerationRuleUpdate
} from "../Events/AutoModeration.js";
import { AutoModerationRule } from "../Structures/AutoModerationRule.js";
import { ReactionRemoveAll, ReactionRemoveEmoji } from "../Events/Reactions.js";

function createUser(id = "user-1"): DiscordUser {
	return {
		id,
		username: "tester",
		discriminator: "0001",
		global_name: "tester",
		avatar: null
	};
}

function createRole(id = "role-1"): DiscordRole {
	return {
		id,
		name: "Role",
		color: 0,
		colors: {
			primary_color: 0,
			secondary_color: null,
			tertiary_color: null
		},
		hoist: false,
		position: 1,
		permissions: "0",
		managed: false,
		mentionable: false,
		flags: 0
	};
}

function createGuild(id = "guild-1"): DiscordGuild {
	return {
		id,
		name: "Guild",
		owner_id: "owner-1",
		afk_timeout: 60,
		verification_level: 0,
		default_message_notifications: 0,
		explicit_content_filter: 0,
		roles: [createRole()],
		emojis: [],
		features: [],
		mfa_level: 0,
		system_channel_flags: 0,
		premium_tier: 0,
		preferred_locale: "en-US",
		nsfw_level: 0,
		premium_progress_bar_enabled: false
	};
}

function createChannel(id = "channel-1", guildId = "guild-1"): DiscordChannel {
	return {
		id,
		type: DiscordChannelTypes.GUILD_TEXT,
		guild_id: guildId,
		name: "general",
		permission_overwrites: []
	};
}

function createMember(id = "member-1"): DiscordMember & { guild_id: string } {
	return {
		guild_id: "guild-1",
		user: createUser(id),
		roles: ["role-1"],
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: false,
		mute: false,
		flags: 0
	};
}

function createMessage(id = "message-1", content = "hello"): DiscordMessage & { guild_id: string | null } {
	return {
		id,
		channel_id: "channel-1",
		guild_id: "guild-1",
		author: createUser("author-1"),
		content,
		timestamp: "2024-01-01T00:00:00.000Z",
		edited_timestamp: null,
		tts: false,
		mention_everyone: false,
		mentions: [createUser("mentioned-1")],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: MessageTypes.DEFAULT
	};
}

function createReadyPayload(user: DiscordUser, guildIds: string[] = []): {
	v: number,
	user_settings: Record<string, never>,
	user: DiscordUser,
	session_type: "normal",
	session_id: string,
	resume_gateway_url: string,
	presences: [],
	guilds: { id: string, unavailable: true }[],
	geo_ordered_rtc_regions: [],
	auth: Record<string, never>,
	application: {
		id: string,
		flags_new: string,
		flags: number
	}
} {
	return {
		v: 10,
		user_settings: {},
		user,
		session_type: "normal",
		session_id: "session-1",
		resume_gateway_url: "wss://gateway.discord.gg",
		presences: [],
		guilds: guildIds.map(id => ({ id, unavailable: true })),
		geo_ordered_rtc_regions: [],
		auth: {},
		application: {
			id: "app-1",
			flags_new: "0",
			flags: 0
		}
	};
}

describe("Gateway event handlers mutate caches", () => {
	it("GuildCreate upserts a guild and emits the public event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);

		expect(client.guilds.has(guildPayload.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildCreate, expect.objectContaining({ id: guildPayload.id }));
	});

	it("GuildDelete removes the guild from cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);
		await GuildDelete.handler(client, guildPayload);

		expect(client.guilds.has(guildPayload.id)).toBe(false);
	});

	it("ChannelCreate stores the channel under the target guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const channelPayload = createChannel();

		await GuildCreate.handler(client, guildPayload);
		await ChannelCreate.handler(client, channelPayload);

		expect(client.guilds.get(guildPayload.id)?.channels.has(channelPayload.id)).toBe(true);
	});

	it("ChannelDelete removes channels from the guild channel cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const channelPayload = createChannel();

		await GuildCreate.handler(client, guildPayload);
		await ChannelCreate.handler(client, channelPayload);
		await ChannelDelete.handler(client, channelPayload);

		expect(client.guilds.get(guildPayload.id)?.channels.has(channelPayload.id)).toBe(false);
	});

	it("ChannelUpdate upserts and emits the client update event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const channelPayload = createChannel();

		await GuildCreate.handler(client, guildPayload);
		await ChannelUpdate.handler(client, channelPayload);

		expect(client.guilds.get(guildPayload.id)?.channels.get(channelPayload.id)?.name).toBe("general");
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ChannelUpdate, undefined, expect.objectContaining({ id: channelPayload.id }));
	});

	it("RoleCreate stores the role under the target guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const rolePayload = createRole("role-2");

		await GuildCreate.handler(client, guildPayload);
		await RoleCreate.handler(client, { guild_id: guildPayload.id, role: rolePayload });

		expect(client.guilds.get(guildPayload.id)?.roles.has(rolePayload.id)).toBe(true);
	});

	it("RoleDelete removes roles from the guild role cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const rolePayload = createRole("role-3");

		await GuildCreate.handler(client, guildPayload);
		await RoleCreate.handler(client, { guild_id: guildPayload.id, role: rolePayload });
		await RoleDelete.handler(client, { guild_id: guildPayload.id, role_id: rolePayload.id });

		expect(client.guilds.get(guildPayload.id)?.roles.has(rolePayload.id)).toBe(false);
	});

	it("RoleUpdate emits the client update event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const rolePayload = createRole("role-update");

		await GuildCreate.handler(client, guildPayload);
		await RoleUpdate.handler(client, { guild_id: guildPayload.id, role: rolePayload });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.RoleUpdate, undefined, expect.objectContaining({ id: rolePayload.id }));
	});

	it("MemberCreate adds member to cache and emits MemberCreate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const member = createMember();

		await GuildCreate.handler(client, guildPayload);
		await MemberCreate.handler(client, member);
		expect(client.guilds.get(guildPayload.id)?.members.has(member.user.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MemberCreate, expect.objectContaining({ user: expect.objectContaining({ id: member.user.id }) }));
	});

	it("MemberUpdate updates member in cache and emits MemberUpdate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const member = createMember();

		await GuildCreate.handler(client, guildPayload);
		await MemberCreate.handler(client, member);

		const updatedMember = { ...member, nick: "updated-nick" };
		await MemberUpdate.handler(client, updatedMember);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MemberUpdate, expect.anything(), expect.objectContaining({ nick: "updated-nick" }));
	});

	it("MemberDelete removes member from cache and emits MemberDelete event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const member = createMember();

		await GuildCreate.handler(client, guildPayload);
		await MemberCreate.handler(client, member);
		await MemberDelete.handler(client, { guild_id: guildPayload.id, user: member.user });
		expect(client.guilds.get(guildPayload.id)?.members.has(member.user.id)).toBe(false);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MemberDelete, expect.objectContaining({ user: expect.objectContaining({ id: member.user.id }) }));
	});

	it("MessageCreate adds message author and mentions to user cache and emits MessageCreate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createMessage();

		await MessageCreate.handler(client, payload);

		expect(client.users.has(payload.author.id)).toBe(true);
		expect(client.users.has("mentioned-1")).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageCreate, expect.any(Message));
	});

	it("MessageUpdate updates message content and emits MessageUpdate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createMessage();

		await MessageCreate.handler(client, payload);
		await MessageUpdate.handler(client, { ...payload, content: "updated" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageUpdate, expect.objectContaining({ content: "updated" }));
	});

	it("MessageDelete emits MessageDelete event and removes message from cache if present", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createMessage();

		await MessageCreate.handler(client, payload);
		const deletePayload = { id: payload.id, channel_id: payload.channel_id, guild_id: payload.guild_id };
		await MessageDelete.handler(client, deletePayload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageDelete, {
			id: deletePayload.id,
			channelId: deletePayload.channel_id,
			guildId: deletePayload.guild_id
		});
	});

	it("Ready stores client.user and emits READY", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		await Ready.handler(client, createReadyPayload(user));

		expect(client.user?.id).toBe(user.id);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.Ready, expect.objectContaining({ id: user.id }));
	});

	it("Ready waits for all expected guilds before emitting", async () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		await Ready.handler(client, createReadyPayload(user, ["guild-1", "guild-2"]));

		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await GuildCreate.handler(client, createGuild("guild-1"));
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await GuildCreate.handler(client, createGuild("guild-2"));
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(15_000);
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(1);
		vi.useRealTimers();
	});

	it("Ready emits after timeout when guilds do not arrive", async () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		await Ready.handler(client, createReadyPayload(user, ["guild-missing"]));
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(14_999);
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(1);
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(1);
		vi.useRealTimers();
	});

	it("ReactionAdd and ReactionRemove emit correct client events and update caches", async () => {
		const { Client } = await import("../Client.js");
		const { ReactionAdd, ReactionRemove } = await import("../Events/Reactions.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const { GatewayIntents } = await import("../Types/DiscordGateway.js");
		const vi = (await import("vitest")).vi;

		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMessageReactions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild and a user in cache
		const guildPayload: DiscordGuild = {
			id: "guild-1",
			name: "Guild",
			owner_id: "owner-1",
			afk_timeout: 60,
			verification_level: 0,
			default_message_notifications: 0,
			explicit_content_filter: 0,
			roles: [],
			emojis: [],
			features: [],
			mfa_level: 0,
			system_channel_flags: 0,
			premium_tier: 0,
			preferred_locale: "en-US",
			nsfw_level: 0,
			premium_progress_bar_enabled: false
		};
		await GuildCreate.handler(client, guildPayload);

		// ReactionAdd
		const reactionAddPayload = {
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji: { id: "emoji-1", name: "smile", animated: false },
			burst: false,
			type: 0
		};
		await ReactionAdd.handler(client, reactionAddPayload);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ReactionAdd,
			expect.objectContaining({
				guild: expect.objectContaining({ id: "guild-1" }),
				channel: expect.objectContaining({ id: "channel-1" }),
				user: expect.objectContaining({ id: "user-1" }),
				messageId: "message-1",
				emoji: expect.objectContaining({ id: "emoji-1" })
			})
		);

		// ReactionRemove
		const reactionRemovePayload = {
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji: { id: "emoji-1", name: "smile", animated: false }
		};
		await ReactionRemove.handler(client, reactionRemovePayload);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ReactionRemove,
			expect.objectContaining({
				guild: expect.objectContaining({ id: "guild-1" }),
				channel: expect.objectContaining({ id: "channel-1" }),
				user: expect.objectContaining({ id: "user-1" }),
				messageId: "message-1",
				emoji: expect.objectContaining({ id: "emoji-1" })
			})
		);
	});

	it("GuildUpdate emits the client update event and updates cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);

		const updatedGuildPayload = { ...guildPayload, name: "Updated Guild" };
		await (await import("../Events/Guilds.js")).GuildUpdate.handler(client, updatedGuildPayload);

		const updatedGuild = client.guilds.get(guildPayload.id);
		expect(updatedGuild?.name).toBe("Updated Guild");
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildUpdate,
			expect.objectContaining({ id: guildPayload.id }),
			expect.objectContaining({ id: guildPayload.id, name: "Updated Guild" })
		);
	});

	it("EmojiCreate adds new emoji to cache and emits EmojiCreate event", async () => {
		const { EmojisUpdate } = await import("../Events/Emojis.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);

		// EmojiCreate
		const emoji1 = { id: "emoji-1", name: "smile", animated: false, available: true };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1] });
		const emojiCreateCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.EmojiCreate);
		expect(emojiCreateCall).toBeDefined();
		expect(emojiCreateCall?.[1].id).toBe(guildPayload.id);
		expect(emojiCreateCall?.[2].id).toBe("emoji-1");
		expect(client.guilds.get(guildPayload.id)?.emojis.has("emoji-1")).toBe(true);
	});

	it("EmojiUpdate filters cached emojis and only emits changed data", async () => {
		const { EmojisUpdate } = await import("../Events/Emojis.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild and initial emoji
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		const emoji1 = { id: "emoji-1", name: "smile", animated: false, available: true };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1] });

		// EmojiUpdate
		const emoji1Updated = { ...emoji1, name: "grin" };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1Updated] });
		const emojiUpdateCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.EmojiUpdate);
		expect(emojiUpdateCall).toBeDefined();
		expect(emojiUpdateCall?.[1].id).toBe(guildPayload.id);
		expect(emojiUpdateCall?.[2].id).toBe("emoji-1");
		expect(emojiUpdateCall?.[3].id).toBe("emoji-1");
		// Only check the new name, as the old object is mutated in cache
		expect(emojiUpdateCall?.[3].name).toBe("grin");
		expect(client.guilds.get(guildPayload.id)?.emojis.get("emoji-1")?.name).toBe("grin");
	});

	it("EmojiDelete removes emoji from cache and emits EmojiDelete event", async () => {
		const { EmojisUpdate } = await import("../Events/Emojis.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild and initial emoji
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		const emoji1 = { id: "emoji-1", name: "smile", animated: false, available: true };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1] });

		// EmojiDelete
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [] });
		const emojiDeleteCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.EmojiDelete);
		expect(emojiDeleteCall).toBeDefined();
		expect(emojiDeleteCall?.[1].id).toBe(guildPayload.id);
		expect(emojiDeleteCall?.[2].id).toBe("emoji-1");
		expect(client.guilds.get(guildPayload.id)?.emojis.has("emoji-1")).toBe(false);
	});

	it("GuildBanAdd upserts user to cache and emits GuildBanAdd event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const bannedUser = createUser("banned-user-1");

		await GuildCreate.handler(client, guildPayload);
		await GuildBanAdd.handler(client, { guild_id: guildPayload.id, user: bannedUser });

		expect(client.users.has(bannedUser.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildBanAdd,
			expect.objectContaining({ id: guildPayload.id }),
			expect.objectContaining({ id: bannedUser.id })
		);
	});

	it("AuditLogEntryCreate emits the entry without the guild_id field", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);
		await AuditLogEntryCreate.handler(client, {
			guild_id: guildPayload.id,
			id: "entry-1",
			target_id: "user-1",
			user_id: "mod-1",
			action_type: DiscordAuditLogEvent.MEMBER_KICK,
			reason: "spam"
		});

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.AuditLogEntryCreate);
		expect(call?.[1].id).toBe(guildPayload.id);
		expect(call?.[2]).toEqual({
			id: "entry-1",
			target_id: "user-1",
			user_id: "mod-1",
			action_type: DiscordAuditLogEvent.MEMBER_KICK,
			reason: "spam"
		});
	});

	it("AuditLogEntryCreate ignores entries for uncached guilds", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");

		await AuditLogEntryCreate.handler(client, {
			guild_id: "unknown-guild",
			id: "entry-1",
			target_id: null,
			user_id: null,
			action_type: DiscordAuditLogEvent.MEMBER_KICK
		});

		expect(emitSpy.mock.calls.find(([event]) => event === ClientEvents.AuditLogEntryCreate)).toBeUndefined();
	});

	it("GuildBanRemove upserts user to cache and emits GuildBanRemove event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const unbannedUser = createUser("unbanned-user-1");

		await GuildCreate.handler(client, guildPayload);
		await GuildBanRemove.handler(client, { guild_id: guildPayload.id, user: unbannedUser });

		expect(client.users.has(unbannedUser.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildBanRemove,
			expect.objectContaining({ id: guildPayload.id }),
			expect.objectContaining({ id: unbannedUser.id })
		);
	});
});
describe("Thread gateway event handlers", () => {
	function createThread(id = "thread-1", guildId = "guild-1"): DiscordChannel {
		return {
			id,
			type: DiscordChannelTypes.PUBLIC_THREAD,
			guild_id: guildId,
			parent_id: "channel-1",
			name: "help-thread",
			owner_id: "user-1",
			message_count: 1,
			member_count: 1,
			thread_metadata: {
				archived: false,
				auto_archive_duration: 1440,
				archive_timestamp: "2024-01-01T00:00:00.000Z",
				locked: false
			}
		};
	}

	async function seededClient(): Promise<Client> {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("ThreadCreate caches the thread as a GuildThreadChannel and emits", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const threadPayload = createThread();

		await ThreadCreate.handler(client, threadPayload);

		const cached = client.guilds.get("guild-1")?.channels.get(threadPayload.id);
		expect(cached).toBeInstanceOf(GuildThreadChannel);
		expect(cached?.isThreadChannel()).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ThreadCreate,
			expect.objectContaining({ id: threadPayload.id })
		);
	});

	it("ThreadUpdate patches the cached instance in place and emits both states", async () => {
		const client = await seededClient();
		const threadPayload = createThread();
		await ThreadCreate.handler(client, threadPayload);

		const emitSpy = vi.spyOn(client, "emit");
		const cachedBefore = client.guilds.get("guild-1")!.channels.get(threadPayload.id);

		await ThreadUpdate.handler(client, {
			...threadPayload,
			name: "renamed-thread",
			thread_metadata: { ...threadPayload.thread_metadata!, archived: true, locked: true }
		});

		const cachedAfter = client.guilds.get("guild-1")!.channels.get(threadPayload.id);
		// upsert() patches rather than replacing, so the cached reference stays stable
		expect(cachedAfter).toBe(cachedBefore);
		expect(cachedAfter?.name).toBe("renamed-thread");
		expect((cachedAfter as GuildThreadChannel).threadMetadata?.archived).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadUpdate, cachedBefore, cachedAfter);
	});

	it("ThreadDelete emits the cached thread before evicting it", async () => {
		const client = await seededClient();
		const threadPayload = createThread();
		await ThreadCreate.handler(client, threadPayload);

		const emitSpy = vi.spyOn(client, "emit");
		// THREAD_DELETE only carries a partial channel
		await ThreadDelete.handler(client, {
			id: threadPayload.id,
			guild_id: "guild-1",
			parent_id: "channel-1",
			type: DiscordChannelTypes.PUBLIC_THREAD
		} as DiscordChannel);

		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ThreadDelete,
			expect.objectContaining({ name: "help-thread" })
		);
		expect(client.guilds.get("guild-1")?.channels.has(threadPayload.id)).toBe(false);
	});

	it("ThreadDelete emits the raw payload when the thread was never cached", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const partial = {
			id: "thread-unknown",
			guild_id: "guild-1",
			parent_id: "channel-1",
			type: DiscordChannelTypes.PUBLIC_THREAD
		} as DiscordChannel;

		await ThreadDelete.handler(client, partial);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadDelete, partial);
	});

	it("ignores thread events for uncached guilds", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const threadPayload = createThread("thread-1", "guild-missing");

		await ThreadCreate.handler(client, threadPayload);
		await ThreadUpdate.handler(client, threadPayload);
		await ThreadDelete.handler(client, threadPayload);

		expect(emitSpy).not.toHaveBeenCalled();
	});
});

describe("Auto moderation gateway event handlers", () => {
	function createAutoModerationRule(id = "rule-1", guildId = "guild-1"): DiscordAutoModerationRule {
		return {
			id,
			guild_id: guildId,
			name: "No links",
			creator_id: "user-1",
			event_type: DiscordAutoModerationRuleEventType.MESSAGE_SEND,
			trigger_type: DiscordAutoModerationRuleTriggerType.KEYWORD,
			trigger_metadata: { keyword_filter: ["discord.gg"] },
			actions: [{ type: DiscordAutoModerationActionType.BLOCK_MESSAGE }],
			enabled: true,
			exempt_roles: [],
			exempt_channels: []
		};
	}

	function createActionExecution(guildId = "guild-1"): DiscordAutoModerationActionExecution {
		return {
			guild_id: guildId,
			action: {
				type: DiscordAutoModerationActionType.SEND_ALERT_MESSAGE,
				metadata: { channel_id: "channel-log" }
			},
			rule_id: "rule-1",
			rule_trigger_type: DiscordAutoModerationRuleTriggerType.KEYWORD,
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			alert_system_message_id: "message-alert",
			content: "join discord.gg/example",
			matched_keyword: "discord.gg",
			matched_content: "discord.gg"
		};
	}

	async function seededClient(): Promise<Client> {
		const client = new Client({ token: "token", intents: GatewayIntents.AutoModerationConfiguration });
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("AutoModerationRuleCreate caches the rule and emits", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const rulePayload = createAutoModerationRule();

		await AutoModerationRuleCreate.handler(client, rulePayload);

		const cached = client.guilds.get("guild-1")?.autoModerationRules.get(rulePayload.id);
		expect(cached).toBeInstanceOf(AutoModerationRule);
		expect(cached?.name).toBe("No links");
		expect(cached?.triggerMetadata.keyword_filter).toEqual(["discord.gg"]);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.AutoModerationRuleCreate,
			expect.objectContaining({ id: rulePayload.id })
		);
	});

	it("AutoModerationRuleUpdate patches the cached instance in place and emits both states", async () => {
		const client = await seededClient();
		const rulePayload = createAutoModerationRule();
		await AutoModerationRuleCreate.handler(client, rulePayload);

		const emitSpy = vi.spyOn(client, "emit");
		const cachedBefore = client.guilds.get("guild-1")!.autoModerationRules.get(rulePayload.id);

		await AutoModerationRuleUpdate.handler(client, {
			...rulePayload,
			name: "No invites",
			enabled: false,
			exempt_roles: ["role-1"]
		});

		const cachedAfter = client.guilds.get("guild-1")!.autoModerationRules.get(rulePayload.id);
		// upsert() patches rather than replacing, so the cached reference stays stable
		expect(cachedAfter).toBe(cachedBefore);
		expect(cachedAfter?.name).toBe("No invites");
		expect(cachedAfter?.enabled).toBe(false);
		expect(cachedAfter?.exemptRoles).toEqual(["role-1"]);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.AutoModerationRuleUpdate, cachedBefore, cachedAfter);
	});

	it("AutoModerationRuleDelete emits the cached rule before evicting it", async () => {
		const client = await seededClient();
		const rulePayload = createAutoModerationRule();
		await AutoModerationRuleCreate.handler(client, rulePayload);

		const emitSpy = vi.spyOn(client, "emit");
		await AutoModerationRuleDelete.handler(client, rulePayload);

		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.AutoModerationRuleDelete,
			expect.any(AutoModerationRule)
		);
		expect(client.guilds.get("guild-1")?.autoModerationRules.has(rulePayload.id)).toBe(false);
	});

	it("AutoModerationRuleDelete emits the raw payload when the rule was never cached", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		// Rules are never sent in GUILD_CREATE, so an uncached delete is the common case
		const rulePayload = createAutoModerationRule("rule-unknown");

		await AutoModerationRuleDelete.handler(client, rulePayload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.AutoModerationRuleDelete, rulePayload);
	});

	it("ignores auto moderation events for uncached guilds", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.AutoModerationConfiguration });
		const emitSpy = vi.spyOn(client, "emit");
		const rulePayload = createAutoModerationRule("rule-1", "guild-missing");

		await AutoModerationRuleCreate.handler(client, rulePayload);
		await AutoModerationRuleUpdate.handler(client, rulePayload);
		await AutoModerationRuleDelete.handler(client, rulePayload);
		await AutoModerationActionExecution.handler(client, createActionExecution("guild-missing"));

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("AutoModerationActionExecution emits a camel cased payload", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createActionExecution();

		await AutoModerationActionExecution.handler(client, payload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.AutoModerationActionExecution, {
			guildId: "guild-1",
			action: payload.action,
			ruleId: "rule-1",
			ruleTriggerType: DiscordAutoModerationRuleTriggerType.KEYWORD,
			userId: "user-1",
			channelId: "channel-1",
			messageId: "message-1",
			alertSystemMessageId: "message-alert",
			content: "join discord.gg/example",
			matchedKeyword: "discord.gg",
			matchedContent: "discord.gg"
		});
	});

	it("AutoModerationActionExecution omits the optional fields when Discord does", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		// A blocked message never reaches a channel, so Discord sends no channel/message ids,
		// and without the MessageContent intent the content fields come back empty
		const payload: DiscordAutoModerationActionExecution = {
			guild_id: "guild-1",
			action: { type: DiscordAutoModerationActionType.BLOCK_MESSAGE },
			rule_id: "rule-1",
			rule_trigger_type: DiscordAutoModerationRuleTriggerType.SPAM,
			user_id: "user-1",
			content: "",
			matched_keyword: null,
			matched_content: null
		};

		await AutoModerationActionExecution.handler(client, payload);

		const emitted = emitSpy.mock.calls.find(
			([name]) => name === ClientEvents.AutoModerationActionExecution
		)?.[1] as AutoModerationActionExecutionPayload;
		expect(emitted).toBeDefined();
		expect("channelId" in emitted).toBe(false);
		expect("messageId" in emitted).toBe(false);
		expect("alertSystemMessageId" in emitted).toBe(false);
		expect(emitted.matchedKeyword).toBeNull();
		expect(emitted.content).toBe("");
	});

	it("AutoModerationActionExecution does not touch the rule cache", async () => {
		const client = await seededClient();
		const rules = client.guilds.get("guild-1")!.autoModerationRules;

		await AutoModerationActionExecution.handler(client, createActionExecution());

		expect(rules.size).toBe(0);
	});
});

describe("Reaction removal gateway event handlers", () => {
	const emoji = { id: "emoji-1", name: "smile", animated: false };

	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildMessageReactions
		});
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		return client;
	}

	it("ReactionRemoveAll emits with the cached guild and channel", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveAll.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveAll, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			messageId: "message-1"
		});
	});

	it("ReactionRemoveEmoji passes the emoji through alongside the resolved location", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveEmoji.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveEmoji, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			messageId: "message-1",
			emoji
		});
	});

	it("falls back to bare id objects for uncached guilds instead of dropping the event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessageReactions });
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveAll.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-missing"
		});
		await ReactionRemoveEmoji.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-missing",
			emoji
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveAll, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-1" },
			messageId: "message-1"
		});
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveEmoji, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-1" },
			messageId: "message-1",
			emoji
		});
	});

	it("emits a null guild for DM channels", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveAll.handler(client, {
			channel_id: "dm-1",
			message_id: "message-1"
		});
		await ReactionRemoveEmoji.handler(client, {
			channel_id: "dm-1",
			message_id: "message-1",
			emoji
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveAll, {
			guild: null,
			channel: { id: "dm-1" },
			messageId: "message-1"
		});
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveEmoji, {
			guild: null,
			channel: { id: "dm-1" },
			messageId: "message-1",
			emoji
		});
	});

	it("does not touch any cache", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;

		await ReactionRemoveAll.handler(client, {
			channel_id: "channel-2",
			message_id: "message-1",
			guild_id: "guild-1"
		});
		await ReactionRemoveEmoji.handler(client, {
			channel_id: "channel-2",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji
		});

		expect(guild.channels.size).toBe(1);
		expect(guild.members.size).toBe(0);
		expect(client.guilds.size).toBe(1);
	});
});
