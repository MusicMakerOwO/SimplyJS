import { describe, expect, it } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordMember,
	DiscordOverwrite,
	DiscordRole,
	DiscordUser,
} from "../Types/DiscordAPITypes.js";
import { GuildTextChannel } from "../Structures/GuildTextChannel.js";
import { Guild } from "../Structures/Guild.js";
import { Member } from "../Structures/Member.js";
import { ResolvePermissions } from "../Permissions/Resolver.js";
import { DiscordPermissions } from "../Constants.js";
import { BitField } from "../DataStructures/BitField.js";

const ALL_PERMISSIONS: bigint = Object.values(DiscordPermissions).reduce((value, permission) => value | permission);

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
}

function makeRole(id: string, permissions: bigint): DiscordRole {
	return {
		id,
		name: id,
		color: 0,
		colors: { primary_color: 0, secondary_color: null, tertiary_color: null },
		hoist: false,
		position: 0,
		permissions: permissions.toString(),
		managed: false,
		mentionable: false,
		flags: 0,
	};
}

function makeGuild(client: Client, options: {
	guildID?: string;
	ownerID?: string;
	roles?: DiscordRole[];
} = {}): Guild {
	const guildID = options.guildID ?? "guild-1";
	const ownerID = options.ownerID ?? "owner-1";
	const roles = options.roles ?? [makeRole(guildID, 0n)];

	const data: DiscordGuild = {
		id: guildID,
		name: "Test Guild",
		owner_id: ownerID,
		afk_timeout: 60,
		verification_level: 0,
		default_message_notifications: 0,
		explicit_content_filter: 0,
		roles,
		emojis: [],
		features: [],
		mfa_level: 0,
		system_channel_flags: 0,
		premium_tier: 0,
		preferred_locale: "en-US",
		nsfw_level: 0,
		premium_progress_bar_enabled: false,
	};

	return new Guild(client, data);
}

function makeUser(id: string): DiscordUser {
	return {
		id,
		username: "tester",
		discriminator: "0001",
		global_name: "Tester",
		avatar: null,
	};
}

function makeMember(client: Client, guild: Guild, userID: string, roleIDs: string[]): Member {
	const data: DiscordMember = {
		user: makeUser(userID),
		roles: roleIDs,
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: false,
		mute: false,
		flags: 0,
	};

	return new Member(client, guild, data);
}

function makeChannelWithOverwrites(client: Client, guild: Guild, overwrites: DiscordOverwrite[]): GuildTextChannel {
	const data = {
		id: "channel-1",
		type: DiscordChannelTypes.GUILD_TEXT,
		name: "general",
		permission_overwrites: overwrites,
	} as DiscordChannel;
	const channel = new GuildTextChannel(client, guild, data);
	channel.patch(data);
	return channel;
}

describe("ResolvePermissions", () => {
	it("returns a BitField with guild-level permissions when channel is omitted", () => {
		const client = makeClient();
		const guild = makeGuild(client, {
			roles: [
				makeRole("guild-1", DiscordPermissions.VIEW_CHANNEL),
				makeRole("role-mod", DiscordPermissions.SEND_MESSAGES),
			],
		});
		const member = makeMember(client, guild, "user-1", ["role-mod"]);

		const resolved = ResolvePermissions(guild, member);

		expect(resolved).toBeInstanceOf(BitField);
		expect(resolved.has("VIEW_CHANNEL")).toBe(true);
		expect(resolved.has("SEND_MESSAGES")).toBe(true);
	});

	it("returns all permissions for the guild owner", () => {
		const client = makeClient();
		const guild = makeGuild(client, {
			ownerID: "owner-1",
			roles: [makeRole("guild-1", 0n)],
		});
		const member = makeMember(client, guild, "owner-1", []);
		const channel = makeChannelWithOverwrites(client, guild, [
			{ id: "guild-1", type: 0, allow: "0", deny: DiscordPermissions.SEND_MESSAGES.toString() },
		]);

		if (!channel.permission_overwrites) throw new Error("Expected permission_overwrites to exist on test channel");
		const resolved = ResolvePermissions(guild, member, channel as GuildTextChannel & { permission_overwrites: NonNullable<GuildTextChannel["permission_overwrites"]> });

		expect(resolved.value).toBe(ALL_PERMISSIONS);
		expect(resolved.has("SEND_MESSAGES")).toBe(true);
	});

	it("applies @everyone, role, and member overwrites in Discord order", () => {
		const client = makeClient();
		const guild = makeGuild(client, {
			roles: [
				makeRole("guild-1", DiscordPermissions.VIEW_CHANNEL | DiscordPermissions.SEND_MESSAGES),
				makeRole("role-a", 0n),
			],
		});
		const member = makeMember(client, guild, "user-1", ["role-a"]);
		const channel = makeChannelWithOverwrites(client, guild, [
			{ id: "guild-1", type: 0, allow: "0", deny: DiscordPermissions.SEND_MESSAGES.toString() },
			{ id: "role-a", type: 0, allow: DiscordPermissions.SEND_MESSAGES.toString(), deny: DiscordPermissions.VIEW_CHANNEL.toString() },
			{ id: "user-1", type: 1, allow: DiscordPermissions.VIEW_CHANNEL.toString(), deny: "0" },
		]);

		if (!channel.permission_overwrites) throw new Error("Expected permission_overwrites to exist on test channel");
		const resolved = ResolvePermissions(guild, member, channel as GuildTextChannel & { permission_overwrites: NonNullable<GuildTextChannel["permission_overwrites"]> });

		expect(resolved.has("VIEW_CHANNEL")).toBe(true);
		expect(resolved.has("SEND_MESSAGES")).toBe(true);
	});

	it("aggregates role overwrites before applying them", () => {
		const client = makeClient();
		const guild = makeGuild(client, {
			roles: [
				makeRole("guild-1", 0n),
				makeRole("role-a", 0n),
				makeRole("role-b", 0n),
			],
		});
		const member = makeMember(client, guild, "user-1", ["role-a", "role-b"]);
		const channel = makeChannelWithOverwrites(client, guild, [
			{ id: "role-a", type: 0, allow: "0", deny: DiscordPermissions.SEND_MESSAGES.toString() },
			{ id: "role-b", type: 0, allow: DiscordPermissions.SEND_MESSAGES.toString(), deny: "0" },
		]);

		if (!channel.permission_overwrites) throw new Error("Expected permission_overwrites to exist on test channel");
		const resolved = ResolvePermissions(guild, member, channel as GuildTextChannel & { permission_overwrites: NonNullable<GuildTextChannel["permission_overwrites"]> });

		expect(resolved.has("SEND_MESSAGES")).toBe(true);
	});

	it("throws when the member references a role missing from guild cache", () => {
		const client = makeClient();
		const guild = makeGuild(client, {
			roles: [makeRole("guild-1", 0n)],
		});
		const member = makeMember(client, guild, "user-1", ["ghost-role"]);

		expect(() => ResolvePermissions(guild, member)).toThrow("Role does not exist in cache");
	});
});