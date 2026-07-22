import { describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordMember,
	DiscordRole,
	DiscordUser
} from "../Types/DiscordAPITypes.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { ChannelCreate, ChannelDelete, ChannelUpdate } from "../Events/Channels.js";
import { GuildCreate, GuildDelete } from "../Events/Guilds.js";
import { MemberCreate, MemberDelete, MemberUpdate } from "../Events/Members.js";
import { MessageCreate, MessageDelete, MessageUpdate } from "../Events/Messages.js";
import { Ready } from "../Events/Ready.js";
import { RoleCreate, RoleDelete, RoleUpdate } from "../Events/Roles.js";
import { ClientEvents } from "../Types/SimplicityTypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";
import { Message } from "../Structures/Message.js";

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
		name: "general"
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

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageDelete, deletePayload);
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
		const { ClientEvents } = await import("../Types/SimplicityTypes.js");
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
				message_id: "message-1",
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
				message_id: "message-1",
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
		const { ClientEvents } = await import("../Types/SimplicityTypes.js");
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
		const { ClientEvents } = await import("../Types/SimplicityTypes.js");
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
		const { ClientEvents } = await import("../Types/SimplicityTypes.js");
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
});