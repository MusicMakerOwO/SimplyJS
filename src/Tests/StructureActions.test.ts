import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { DiscordPermissions } from "../Constants.js";
import { Guild } from "../Structures/Guild.js";
import { Channel } from "../Structures/Channel.js";
import { Role } from "../Structures/Role.js";
import { Emoji } from "../Structures/Emoji.js";
import { Sticker } from "../Structures/Sticker.js";
import { Member } from "../Structures/Member.js";
import { Message } from "../Structures/Message.js";
import { User } from "../Structures/User.js";
import {
	DiscordChannelTypes,
	DiscordEmoji,
	DiscordGuild,
	DiscordMember,
	DiscordRole,
	DiscordSticker,
	DiscordStickerFormatTypes,
	DiscordStickerTypes,
	DiscordUser
} from "../Types/DiscordAPITypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";

// ---------------------------------------------------------------------------
// Minimal fixture helpers (mirrors GatewayEvents.cache-mutations.test.ts style)
// ---------------------------------------------------------------------------

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
}

function userData(id = "user-1"): DiscordUser {
	return { id, username: "tester", discriminator: "0001", global_name: "Tester", avatar: null };
}

function guildData(id = "guild-1"): DiscordGuild {
	return {
		id,
		name: "Test Guild",
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
		premium_progress_bar_enabled: false,
	};
}

function roleData(id = "role-1"): DiscordRole {
	return {
		id,
		name: "Test Role",
		color: 0,
		colors: { primary_color: 0, secondary_color: null, tertiary_color: null },
		hoist: false,
		position: 1,
		permissions: "0",
		managed: false,
		mentionable: false,
		flags: 0,
	};
}

function emojiData(id = "emoji-1"): DiscordEmoji {
	return { id, name: "test_emoji", animated: false, available: true };
}

function stickerData(id = "sticker-1"): DiscordSticker {
	return {
		id,
		name: "test_sticker",
		tags: "test",
		type: DiscordStickerTypes.GUILD,
		format_type: DiscordStickerFormatTypes.PNG,
	};
}

function memberData(userId = "user-1"): DiscordMember {
	return {
		user: userData(userId),
		roles: ["role-1"],
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: false,
		mute: false,
		flags: 0,
	};
}

function messageData(id = "msg-1", authorId = "user-1"): DiscordMessage & { guild_id: string } {
	return {
		id,
		channel_id: "channel-1",
		guild_id: "guild-1",
		author: userData(authorId),
		content: "hello",
		timestamp: "2024-01-01T00:00:00.000Z",
		edited_timestamp: null,
		tts: false,
		mention_everyone: false,
		mentions: [],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: MessageTypes.DEFAULT,
	};
}

// ---------------------------------------------------------------------------
// Shared structure factory helpers
// ---------------------------------------------------------------------------

function makeGuildStructure(client: Client, id = "guild-1"): Guild {
	return new Guild(client, guildData(id));
}

function makeRole(client: Client, guild: Guild, id = "role-1"): Role {
	return new Role(client, roleData(id), guild);
}

function makeEmoji(client: Client, guild: Guild, id = "emoji-1"): Emoji {
	return new Emoji(client, guild, emojiData(id));
}

function makeSticker(client: Client, guild: Guild, id = "sticker-1"): Sticker {
	return new Sticker(client, guild, stickerData(id));
}

function makeChannel(client: Client, guild: Guild, id = "channel-1"): Channel {
	return new Channel(client, guild, { id, type: DiscordChannelTypes.GUILD_TEXT, name: "general" });
}

function makeMember(client: Client, guild: Guild, userId = "user-1"): Member {
	return new Member(client, guild, memberData(userId));
}

function makeMessage(client: Client, authorId = "user-1"): Message {
	return new Message(client, messageData("msg-1", authorId));
}

function makeUser(client: Client, id = "user-1"): User {
	return new User(client, userData(id));
}

// ---------------------------------------------------------------------------
// Guild
// ---------------------------------------------------------------------------

describe("Guild action methods", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuildStructure(client);
		vi.restoreAllMocks();
	});

	it("leave() calls DELETE /users/@me/guilds/:id", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await guild.leave();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(`/users/@me/guilds/${guild.id}`);
	});

	it("modify() sends PATCH /guilds/:id with exact API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await guild.modify({ name: "Renamed Guild", description: "new desc" });

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}`, {
			name: "Renamed Guild",
			description: "new desc",
		});
	});

	it("modify() with no fields sends PATCH with empty body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await guild.modify({});

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}`, {});
	});
});

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

describe("Channel action methods", () => {
	let client: Client;
	let guild: Guild;
	let channel: Channel;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuildStructure(client);
		channel = makeChannel(client, guild);
		vi.restoreAllMocks();
	});

	it("delete() calls DELETE /channels/:id", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await channel.delete();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(`/channels/${channel.id}`);
	});

	it("modify() sends PATCH with exact API field names in body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await channel.modify({ name: "new-name", topic: "great topic", nsfw: true, rate_limit_per_user: 5 });

		const [route, body] = spy.mock.calls[0]!;
		expect(route).toContain(`/channels/${channel.id}`);
		expect(body).toEqual({
			name: "new-name",
			topic: "great topic",
			nsfw: true,
			rate_limit_per_user: 5,
		});
	});

	it("send() calls POST /channels/:id/messages and returns a Message instance", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		const result = await channel.send("hello world");

		expect(spy).toHaveBeenCalledWith(`/channels/${channel.id}/messages`, { content: "hello world" });
		expect(result).toBeInstanceOf(Message);
		expect(result.content).toBe("hello");
	});

	it("send() wraps a MessagePayload and sends exact API body", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		await channel.send({ content: "payload text", tts: true });

		const [route, body] = spy.mock.calls[0]!;
		expect(route).toBe(`/channels/${channel.id}/messages`);
		expect(body).toEqual({ content: "payload text", tts: true });
	});

	it("send() throws when content is empty", async () => {
		await expect(channel.send({ content: "" })).rejects.toThrow("Cannot send an empty message");
	});
});

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

describe("Role action methods", () => {
	let client: Client;
	let guild: Guild;
	let role: Role;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuildStructure(client);
		role = makeRole(client, guild);
		vi.restoreAllMocks();
	});

	it("delete() calls DELETE /guilds/:guildId/roles/:roleId", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await role.delete();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`);
	});

	it("modify() sends PATCH with exact API body for name and mentionable", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ name: "Admin", mentionable: true });

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`, {
			name: "Admin",
			mentionable: true,
		});
	});

	it("modify() sends PATCH with legacy color field", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ color: 0xff0000 });

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`, {
			color: 0xff0000,
		});
	});

	it("modify() sends PATCH with new colors object, preserving exact field names", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({
			colors: { primary_color: 0x1234ab, secondary_color: null, tertiary_color: null },
		});

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`, {
			colors: { primary_color: 0x1234ab, secondary_color: null, tertiary_color: null },
		});
	});

	it("modify() serializes bigint permissions to a decimal string in API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		// SEND_MESSAGES (1n<<11n) | VIEW_CHANNEL (1n<<10n) = 3072n => "3072"
		await role.modify({ permissions: 3072n });

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("3072");
		expect(typeof body.permissions).toBe("string");
	});

	it("modify() passes a string permissions value through unchanged", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ permissions: "8" });

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("8");
	});

	it("modify() serializes key-name array permissions to a combined decimal string", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		// KICK_MEMBERS (1n<<1n = 2n) | BAN_MEMBERS (1n<<2n = 4n) => "6"
		await role.modify({ permissions: ["KICK_MEMBERS", "BAN_MEMBERS"] });

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("6");
		expect(typeof body.permissions).toBe("string");
	});

	it("modify() serializes bigint-value array permissions to a combined decimal string", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		// ADMINISTRATOR (1n<<3n = 8n) | MANAGE_GUILD (1n<<5n = 32n) => "40"
		await role.modify({
			permissions: [DiscordPermissions.ADMINISTRATOR, DiscordPermissions.MANAGE_GUILD],
		});

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("40");
		expect(typeof body.permissions).toBe("string");
	});

	it("modify() omits permissions field entirely when not provided", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ name: "No Perms" });

		const [, body] = spy.mock.calls[0]! as [string, Record<string, unknown>];
		expect("permissions" in body).toBe(false);
	});

	it("modify() sends hoist field when provided", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ hoist: true });

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`, {
			hoist: true,
		});
	});

	it("modify() sends icon field — null clears the icon", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ icon: null });

		const [, body] = spy.mock.calls[0]! as [string, { icon: null }];
		expect(body.icon).toBeNull();
		expect("icon" in body).toBe(true);
	});

	it("modify() sends unicode_emoji field when provided", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({ unicode_emoji: "🎉" });

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`, {
			unicode_emoji: "🎉",
		});
	});

	it("modify() with no options sends PATCH with empty body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await role.modify({});

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/roles/${role.id}`, {});
	});

	it("create() serializes bigint permissions to decimal string in API body", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(roleData("role-created"));

		await guild.roles.create({
			name: "Created",
			permissions: 3072n,
		});

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("3072");
		expect(typeof body.permissions).toBe("string");
	});

	it("create() serializes key-name array permissions to combined decimal string", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(roleData("role-created"));

		await guild.roles.create({
			name: "Created",
			permissions: ["KICK_MEMBERS", "BAN_MEMBERS"],
		});

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("6");
		expect(typeof body.permissions).toBe("string");
	});

	it("create() passes string permissions through unchanged", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(roleData("role-created"));

		await guild.roles.create({
			name: "Created",
			permissions: "8",
		});

		const [, body] = spy.mock.calls[0]! as [string, { permissions: string }];
		expect(body.permissions).toBe("8");
	});

	it("setPositions() sends PATCH with roles converted to { id, position }[] array", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await guild.roles.setPositions({
			"role-1": 5,
			"role-2": 10,
		});

		expect(spy).toHaveBeenCalledOnce();
		const [route, body] = spy.mock.calls[0]!;
		expect(route).toBe(`/guilds/${guild.id}/roles`);
		expect(body).toEqual(expect.arrayContaining([
			{ id: "role-1", position: 5 },
			{ id: "role-2", position: 10 },
		]));
	});

	it("setPositions() throws when duplicate positions are provided", async () => {
		vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await expect(
			guild.roles.setPositions({
				"role-1": 5,
				"role-2": 5,
			})
		).rejects.toThrow("Duplicate positions in role update: 5");
	});

	it("setPositions() throws when multiple duplicate positions exist", async () => {
		vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await expect(
			guild.roles.setPositions({
				"role-1": 3,
				"role-2": 3,
				"role-3": 7,
				"role-4": 7,
			})
		).rejects.toThrow();
		// Error should mention both 3 and 7
	});

	it("setPositions() works with single role", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await guild.roles.setPositions({
			"role-1": 0,
		});

		const [, body] = spy.mock.calls[0]!;
		expect(body).toEqual([{ id: "role-1", position: 0 }]);
	});

	it("setPositions() sends exact role IDs and positions in payload", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await guild.roles.setPositions({
			"admin-role": 15,
			"moderator-role": 10,
			"member-role": 5,
		});

		const [, body] = spy.mock.calls[0]! as [string, { id: string; position: number }[]];
		expect(body).toEqual(expect.arrayContaining([
			{ id: "admin-role", position: 15 },
			{ id: "moderator-role", position: 10 },
			{ id: "member-role", position: 5 },
		]));
		expect(body.length).toBe(3);
	});

	it("setPositions() rejects when REST call fails", async () => {
		vi.spyOn(client.rest, "patch").mockRejectedValue(new Error("API Error"));

		await expect(
			guild.roles.setPositions({ "role-1": 5 })
		).rejects.toThrow("API Error");
	});

	it("highest() returns the role with the lowest position (highest priority)", () => {
		// Add multiple roles to the cache with different positions
		const role1 = makeRole(client, guild, "role-1");
		role1.position = 3;
		guild.roles.set("role-1", role1);

		const role2 = makeRole(client, guild, "role-2");
		role2.position = 1;
		guild.roles.set("role-2", role2);

		const role3 = makeRole(client, guild, "role-3");
		role3.position = 2;
		guild.roles.set("role-3", role3);

		const highest = guild.roles.highest();

		// The role with position 1 should be highest (Discord's role sort rules: lower position = higher priority)
		expect(highest).toBe(role2);
		expect(highest.position).toBe(0); // toSorted() normalizes positions to their index
	});

	it("lowest() returns the role with the highest position (lowest priority)", () => {
		// Add multiple roles to the cache with different positions
		const role1 = makeRole(client, guild, "role-1");
		role1.position = 3;
		guild.roles.set("role-1", role1);

		const role2 = makeRole(client, guild, "role-2");
		role2.position = 1;
		guild.roles.set("role-2", role2);

		const role3 = makeRole(client, guild, "role-3");
		role3.position = 2;
		guild.roles.set("role-3", role3);

		const lowest = guild.roles.lowest();

		// The role with highest position should be lowest (Discord's role sort rules)
		expect(lowest).toBe(role1);
		expect(lowest.position).toBe(2); // toSorted() normalizes positions, so this is index 2
	});

	it("highest() handles single role in cache", () => {
		const role = makeRole(client, guild, "role-1");
		guild.roles.set("role-1", role);

		const highest = guild.roles.highest();

		expect(highest).toBe(role);
	});

	it("lowest() handles single role in cache", () => {
		const role = makeRole(client, guild, "role-1");
		guild.roles.set("role-1", role);

		const lowest = guild.roles.lowest();

		expect(lowest).toBe(role);
	});

	it("highest() and lowest() are same when only one role exists", () => {
		const role = makeRole(client, guild, "role-1");
		guild.roles.set("role-1", role);

		const highest = guild.roles.highest();
		const lowest = guild.roles.lowest();

		expect(highest).toBe(lowest);
		expect(highest).toBe(role);
	});

	it("highest() and lowest() handle roles with equal positions by sorting by ID", () => {
		// Create roles with same position but different numeric IDs
		// Discord IDs are snowflake IDs (numeric strings)
		const role1 = makeRole(client, guild, "100");
		role1.position = 1;
		guild.roles.set("100", role1);

		const role2 = makeRole(client, guild, "999");
		role2.position = 1;
		guild.roles.set("999", role2);

		const highest = guild.roles.highest();
		const lowest = guild.roles.lowest();

		// When positions are equal, BigInt ID comparison sorts them (smaller ID first)
		expect(highest).toBe(role1); // 100n < 999n as BigInt
		expect(lowest).toBe(role2);
	});
});

// ---------------------------------------------------------------------------
// Emoji
// ---------------------------------------------------------------------------

describe("Emoji action methods", () => {
	let client: Client;
	let guild: Guild;
	let emoji: Emoji;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuildStructure(client);
		emoji = makeEmoji(client, guild);
		vi.restoreAllMocks();
	});

	it("delete() calls DELETE /guilds/:guildId/emojis/:emojiId", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await emoji.delete();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/emojis/${emoji.id}`);
	});

	it("modify() sends exact API body with role ID strings", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await emoji.modify({ name: "renamed_emoji", roles: ["role-1", "role-2"] });

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/emojis/${emoji.id}`, {
			name: "renamed_emoji",
			roles: ["role-1", "role-2"],   // string[] — already API format
		});
	});

	it("modify() normalizes {id} objects to plain ID strings in API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await emoji.modify({ name: "emoji", roles: [{ id: "role-a" }, { id: "role-b" }] });

		const [, body] = spy.mock.calls[0]! as [string, { name: string; roles: string[] }];
		// API must receive string[], not { id }[]
		expect(body.roles).toEqual(["role-a", "role-b"]);
		expect(body.roles.every((r) => typeof r === "string")).toBe(true);
	});

	it("modify() normalizes mixed string/object roles array to string[] in API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		// @ts-expect-error — intentionally testing mixed array as a defensive check
		await emoji.modify({ name: "emoji", roles: ["role-1", { id: "role-2" }] });

		const [, body] = spy.mock.calls[0]! as [string, { roles: string[] }];
		expect(body.roles).toEqual(["role-1", "role-2"]);
	});
});

// ---------------------------------------------------------------------------
// Sticker
// ---------------------------------------------------------------------------

describe("Sticker action methods", () => {
	let client: Client;
	let guild: Guild;
	let sticker: Sticker;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuildStructure(client);
		sticker = makeSticker(client, guild);
		vi.restoreAllMocks();
	});

	it("delete() calls DELETE /guilds/:guildId/stickers/:stickerId", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await sticker.delete();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/stickers/${sticker.id}`);
	});

	it("modify() sends PATCH with exact API body — tags as string passes through", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await sticker.modify({ name: "my_sticker", description: "a sticker", tags: "pepe" });

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/stickers/${sticker.id}`, {
			name: "my_sticker",
			description: "a sticker",
			tags: "pepe",                 // already a string — must reach API unchanged
		});
	});

	it("modify() serializes tags string[] to comma-separated string in API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await sticker.modify({ name: "my_sticker", tags: ["happy", "smile", "pepe"] });

		const [, body] = spy.mock.calls[0]! as [string, { name: string; tags: string }];
		// API requires comma-separated string — the array must be joined before sending
		expect(body.tags).toBe("happy,smile,pepe");
		expect(typeof body.tags).toBe("string");
	});

	it("modify() with a single-element tags array produces a bare string in API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await sticker.modify({ tags: ["solo"] });

		const [, body] = spy.mock.calls[0]! as [string, { tags: string }];
		expect(body.tags).toBe("solo");
	});

	it("modify() with partial options only sends provided fields", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await sticker.modify({ name: "only-name" });

		expect(spy.mock.calls[0]![1]).toEqual({ name: "only-name" });
	});

	it("modify() without tags omits the tags field entirely from API body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await sticker.modify({ name: "no-tags" });

		const [, body] = spy.mock.calls[0]! as [string, Record<string, unknown>];
		expect("tags" in body).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

describe("Member action methods", () => {
	let client: Client;
	let guild: Guild;
	let member: Member;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuildStructure(client);
		member = makeMember(client, guild);
		vi.restoreAllMocks();
	});

	it("addRole() calls PUT /guilds/:guildId/members/:userId/roles/:roleId with null body", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

		await member.addRole("role-2");

		expect(spy).toHaveBeenCalledWith(
			`/guilds/${guild.id}/members/${member.user.id}/roles/role-2`,
			null
		);
	});

	it("removeRole() calls DELETE /guilds/:guildId/members/:userId/roles/:roleId", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await member.removeRole("role-2");

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/members/${member.user.id}/roles/role-2`);
	});

	it("setRoles() sends PATCH with exact {roles} body — not nested or renamed", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await member.setRoles(["role-1", "role-2"]);

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/members/${member.user.id}`, {
			roles: ["role-1", "role-2"],
		});
	});

	it("kick() calls DELETE with empty headers when no reason", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await member.kick();

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/members/${member.user.id}`, {});
	});

	it("kick() sends X-Audit-Log-Reason header — not in body", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await member.kick("rule violation");

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/members/${member.user.id}`, {
			"X-Audit-Log-Reason": "rule violation",
		});
	});

	it("ban() sends exact API body: delete_message_seconds (snake_case) and no camelCase", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

		await member.ban({ deleteMessageSeconds: 86400, reason: "spam" });

		const [route, body, headers] = spy.mock.calls[0]! as [string, Record<string, unknown>, Record<string, string>];
		expect(route).toBe(`/guilds/${guild.id}/bans/${member.user.id}`);
		// API field is snake_case — camelCase input must be converted
		expect(body).toEqual({ delete_message_seconds: 86400 });
		expect("deleteMessageSeconds" in body).toBe(false);
		expect(headers).toEqual({ "X-Audit-Log-Reason": "spam" });
	});

	it("ban() defaults delete_message_seconds to 0 when not provided", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

		await member.ban();

		const [, body] = spy.mock.calls[0]! as [string, { delete_message_seconds: number }];
		expect(body.delete_message_seconds).toBe(0);
	});

	it("ban() sends empty headers object when no reason provided", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

		await member.ban({ deleteMessageSeconds: 0 });

		const [,, headers] = spy.mock.calls[0]!;
		expect(headers).toEqual({});
	});

	it("setNickname() sends PATCH with {nickname} field — not nick or username", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await member.setNickname("cool nick");

		expect(spy).toHaveBeenCalledWith(`/guilds/${guild.id}/members/${member.user.id}`, {
			nickname: "cool nick",
		});
	});

	it("setNickname() sends {nickname: null} to clear — not delete or omit the field", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await member.setNickname(null);

		const [, body] = spy.mock.calls[0]! as [string, { nickname: null }];
		expect(body).toEqual({ nickname: null });
		expect("nickname" in body).toBe(true);           // field present, value null
	});

	it("timeoutUntil() sends communications_disabled_until as ISO 8601 string in PATCH body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);
		const expires = new Date("2026-06-01T12:00:00.000Z");

		await member.timeoutUntil(expires);

		const [, body] = spy.mock.calls[0]! as [string, { communications_disabled_until: string }];
		// Must be ISO string — not a Date object, timestamp number, or other format
		expect(body.communications_disabled_until).toBe("2026-06-01T12:00:00.000Z");
		expect(typeof body.communications_disabled_until).toBe("string");
	});

	it("timeoutUntil() throws if duration exceeds 28 days", async () => {
		const tooLong = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);

		await expect(member.timeoutUntil(tooLong)).rejects.toThrow(
			"Timeout duration cannot be longer than 28 days from now"
		);
	});

	it("timeoutUntil() sends an ISO string for null (clear) — not null in the field", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);

		await member.timeoutUntil(null);

		const [, body] = spy.mock.calls[0]! as [string, { communications_disabled_until: string }];
		expect(typeof body.communications_disabled_until).toBe("string");
		expect(() => new Date(body.communications_disabled_until)).not.toThrow();
	});

	it("timeoutUntil() sends X-Audit-Log-Reason in headers — not in body", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);
		const expires = new Date(Date.now() + 60_000);

		await member.timeoutUntil(expires, "bad actor");

		const [, body, headers] = spy.mock.calls[0]! as [string, Record<string, unknown>, Record<string, string>];
		expect(headers).toEqual({ "X-Audit-Log-Reason": "bad actor" });
		expect("X-Audit-Log-Reason" in body).toBe(false);    // must NOT leak into body
	});
});

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

describe("Message action methods", () => {
	let client: Client;
	let message: Message;

	beforeEach(() => {
		client = makeClient();
		// Set client.user so update() guard has something to compare against
		client.user = new User(client, userData("bot-user"));
		message = makeMessage(client, "bot-user"); // authored by bot
		vi.restoreAllMocks();
	});

	it("delete() calls DELETE /channels/:channelId/messages/:messageId", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await message.delete();

		expect(spy).toHaveBeenCalledWith(`/channels/channel-1/messages/msg-1`);
	});

	it("pin() calls PUT /channels/:channelId/messages/pins/:messageId with null body", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

		await message.pin();

		expect(spy).toHaveBeenCalledWith(`/channels/channel-1/messages/pins/msg-1`, null);
	});

	it("unpin() calls DELETE /channels/:channelId/messages/pins/:messageId", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await message.unpin();

		expect(spy).toHaveBeenCalledWith(`/channels/channel-1/messages/pins/msg-1`);
	});

	it("reply() posts exact API body with message_reference.message_id", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		await message.reply("response text");

		const [route, body] = spy.mock.calls[0]! as [string, Record<string, unknown>];
		expect(route).toBe(`/channels/channel-1/messages`);
		expect(body).toMatchObject({
			content: "response text",
			message_reference: { message_id: "msg-1" },   // must use message_id, not id
		});
	});

	it("reply() sends allowed_mentions.replied_user=false by default to suppress ping", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		await message.reply("hi");

		const [, body] = spy.mock.calls[0]! as [string, { allowed_mentions: { replied_user: boolean } }];
		// Discord uses allowed_mentions.replied_user — not ping or mention_reply
		expect(body.allowed_mentions).toEqual({ replied_user: false });
	});

	it("reply() omits allowed_mentions when ping:true so Discord default (ping) applies", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		await message.reply("hi", { ping: true });

		const [, body] = spy.mock.calls[0]! as [string, Record<string, unknown>];
		expect(body.allowed_mentions).toBeUndefined();
	});

	it("reply() returns a Message instance", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		const result = await message.reply("hi");

		expect(result).toBeInstanceOf(Message);
	});

	it("update() sends PATCH with exact API body — content field, correct route", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData());

		await message.update("edited content");

		expect(spy).toHaveBeenCalledWith(`/channels/channel-1/messages/msg-1`, {
			content: "edited content",
		});
	});

	it("update() returns a Message instance", async () => {
		vi.spyOn(client.rest, "patch").mockResolvedValue(messageData());

		const result = await message.update("edited");

		expect(result).toBeInstanceOf(Message);
	});

	it("update() throws when message was not authored by the bot", async () => {
		const foreignMessage = makeMessage(client, "another-user");

		await expect(foreignMessage.update("edit")).rejects.toThrow(
			"Can only edit messages sent by the bot"
		);
	});

	it("react() with raw emoji string URL-encodes and hits reactions endpoint", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

		await message.react("👍");

		const [route, body] = spy.mock.calls[0]!;
		expect(route).toBe(`/channels/channel-1/messages/msg-1/reactions/${encodeURI("👍")}/@me`);
		expect(body).toBeNull();
	});

	it("react() with Emoji object encodes as name:id and hits reactions endpoint", async () => {
		const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);
		const client2 = makeClient();
		const guild2 = makeGuildStructure(client2);
		const emoji = makeEmoji(client2, guild2);    // name="test_emoji", id="emoji-1"

		await message.react(emoji);

		const [route] = spy.mock.calls[0]!;
		expect(route).toBe(
			`/channels/channel-1/messages/msg-1/reactions/${encodeURI("test_emoji:emoji-1")}/@me`
		);
	});

	// ---------------------------------------------------------------------------
	// Message smart getters
	// ---------------------------------------------------------------------------

	it("guild getter reads from cache and caches itself on first access", () => {
		const guild = makeGuildStructure(client, "guild-1");
		// Populate the guild cache
		client.guilds.set(guild.id, guild);

		// First access should read from cache and then override itself
		const result1 = message.guild;
		expect(result1).toBe(guild);

		// Verify the getter has been replaced with a data property
		const descriptor = Object.getOwnPropertyDescriptor(message, 'guild');
		expect(descriptor).toBeDefined();
		expect(descriptor?.value).toBe(guild);
		expect(descriptor?.configurable).toBe(false);

		// Second access should use the cached property, not go through cache
		client.guilds.delete(guild.id);  // Remove from cache
		const result2 = message.guild;
		expect(result2).toBe(guild);  // Still returns the cached value, not null
	});

	it("guild getter returns null when guild is not in cache", () => {
		// Make sure the guild is not in cache
		client.guilds.clear();

		const result = message.guild;
		expect(result).toBeNull();

		// Verify the getter cached null as a property
		const descriptor = Object.getOwnPropertyDescriptor(message, 'guild');
		expect(descriptor?.value).toBeNull();
	});

	it("channel getter reads from cache and caches itself on first access", () => {
		const guild = makeGuildStructure(client, "guild-1");
		const channel = makeChannel(client, guild, "channel-1");

		// Populate caches
		client.guilds.set(guild.id, guild);
		guild.channels.set(channel.id, channel);

		// First access should read from cache and then override itself
		const result1 = message.channel;
		expect(result1).toBe(channel);

		// Verify the getter has been replaced with a data property
		const descriptor = Object.getOwnPropertyDescriptor(message, 'channel');
		expect(descriptor).toBeDefined();
		expect(descriptor?.value).toBe(channel);
		expect(descriptor?.configurable).toBe(false);

		// Second access should use the cached property, not go through cache
		guild.channels.delete(channel.id);  // Remove from cache
		const result2 = message.channel;
		expect(result2).toBe(channel);  // Still returns the cached value, not null
	});

	it("channel getter returns null when guild is not in cache", () => {
		// Make sure the guild is not in cache
		client.guilds.clear();

		const result = message.channel;
		expect(result).toBeNull();

		// Verify the getter cached null as a property
		const descriptor = Object.getOwnPropertyDescriptor(message, 'channel');
		expect(descriptor?.value).toBeNull();
	});

	it("channel getter returns null when channel is not in guild cache", () => {
		const guild = makeGuildStructure(client, "guild-1");

		// Populate guild cache but leave channel cache empty
		client.guilds.set(guild.id, guild);
		guild.channels.clear();

		const result = message.channel;
		expect(result).toBeNull();

		// Verify the getter cached null as a property
		const descriptor = Object.getOwnPropertyDescriptor(message, 'channel');
		expect(descriptor?.value).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// User DM send
// ---------------------------------------------------------------------------

describe("User.send() DM flow", () => {
	let client: Client;
	let user: User;

	beforeEach(() => {
		client = makeClient();
		user = makeUser(client, "target-user");
		vi.restoreAllMocks();
	});

	it("first send calls POST /users/@me/channels with {recipient_id} then posts message", async () => {
		const dmChannel = { id: "dm-channel-1", type: 1 };
		const spy = vi.spyOn(client.rest, "post")
			.mockResolvedValueOnce(dmChannel)
			.mockResolvedValueOnce(messageData());

		await user.send("hello");

		// DM creation must use recipient_id — not user_id or target_id
		expect(spy.mock.calls[0]![0]).toBe("/users/@me/channels");
		expect(spy.mock.calls[0]![1]).toEqual({ recipient_id: "target-user" });
		// Message must go to the DM channel returned by step 1
		expect(spy.mock.calls[1]![0]).toBe(`/channels/dm-channel-1/messages`);
		expect(spy.mock.calls[1]![1]).toEqual({ content: "hello" });
	});

	it("second send reuses the cached DM channel — no second POST to /users/@me/channels", async () => {
		const dmChannel = { id: "dm-channel-1", type: 1 };
		const spy = vi.spyOn(client.rest, "post")
			.mockResolvedValueOnce(dmChannel)
			.mockResolvedValue(messageData());

		await user.send("first");
		await user.send("second");

		const dmCreationCalls = spy.mock.calls.filter(([route]) => route === "/users/@me/channels");
		expect(dmCreationCalls).toHaveLength(1);
	});
});