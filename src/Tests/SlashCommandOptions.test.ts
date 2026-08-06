import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "../Client.js";
import { Guild } from "../Structures/Guild.js";
import { User } from "../Structures/User.js";
import { Member } from "../Structures/Member.js";
import { Role } from "../Structures/Role.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { SlashCommandOptions } from "../Managers/SlashCommandOptions.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { ApplicationCommandOptionTypes } from "../Types/ApplicationCommand.js";
import { ApplicationCommandInteractionDataOption } from "../Types/Interactions.js";
import { DiscordChannel, DiscordChannelTypes, DiscordGuild, DiscordRole, DiscordUser } from "../Types/DiscordAPITypes.js";
import { Attachment, ResolvedData } from "../Types/MessageComponents.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
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

function userData(id = "user-1"): DiscordUser {
	return { id, username: "tester", discriminator: "0001", global_name: "Tester", avatar: null };
}

function roleData(id = "role-1"): DiscordRole {
	return {
		id,
		name: "Moderator",
		color: 0,
		colors: { primary_color: 0, secondary_color: null, tertiary_color: null },
		hoist: false,
		position: 1,
		permissions: "0",
		managed: false,
		mentionable: true,
		flags: 0,
	};
}

function channelData(id = "channel-1"): DiscordChannel {
	return { id, type: DiscordChannelTypes.GUILD_TEXT, name: "general", permission_overwrites: [] };
}

function attachmentData(id = "attachment-1"): Attachment {
	return { id, filename: "file.png", size: 1024, url: "https://example.com/file.png", proxy_url: "https://example.com/file.png" };
}

/** Builds the raw leaf option array for a top-level (non-subcommand) invocation. */
function options(...leaves: ApplicationCommandInteractionDataOption[]): ApplicationCommandInteractionDataOption[] {
	return leaves;
}

// ---------------------------------------------------------------------------
// Subcommand / subcommand group unwrapping
// ---------------------------------------------------------------------------

describe("SlashCommandOptions subcommand unwrapping", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("returns null for getSubcommand/getSubcommandGroup when neither is used", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "Jo" },
		));

		expect(opts.getSubcommand()).toBeNull();
		expect(opts.getSubcommandGroup()).toBeNull();
	});

	it("unwraps a top-level subcommand and exposes its nested options as leaves", () => {
		const opts = new SlashCommandOptions(client, undefined, options({
			name: "add",
			type: ApplicationCommandOptionTypes.SUB_COMMAND,
			options: [{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "Jo" }],
		}));

		expect(opts.getSubcommand()).toBe("add");
		expect(opts.getSubcommandGroup()).toBeNull();
		expect(opts.getString("name")).toBe("Jo");
	});

	it("unwraps a subcommand nested inside a subcommand group", () => {
		const opts = new SlashCommandOptions(client, undefined, options({
			name: "role",
			type: ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
			options: [{
				name: "add",
				type: ApplicationCommandOptionTypes.SUB_COMMAND,
				options: [{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "Jo" }],
			}],
		}));

		expect(opts.getSubcommandGroup()).toBe("role");
		expect(opts.getSubcommand()).toBe("add");
		expect(opts.getString("name")).toBe("Jo");
	});
});

// ---------------------------------------------------------------------------
// Scalar accessors
// ---------------------------------------------------------------------------

describe("SlashCommandOptions scalar accessors", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("getString returns the value when present, null when absent", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "Jo" },
		));

		expect(opts.getString("name")).toBe("Jo");
		expect(opts.getString("missing")).toBeNull();
	});

	it("getInteger returns the value when present, null when absent", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "amount", type: ApplicationCommandOptionTypes.INTEGER, value: 5 },
		));

		expect(opts.getInteger("amount")).toBe(5);
		expect(opts.getInteger("missing")).toBeNull();
	});

	it("getNumber returns the value when present, null when absent", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "ratio", type: ApplicationCommandOptionTypes.NUMBER, value: 1.5 },
		));

		expect(opts.getNumber("ratio")).toBe(1.5);
		expect(opts.getNumber("missing")).toBeNull();
	});

	it("getBoolean returns the value when present, null when absent", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "flag", type: ApplicationCommandOptionTypes.BOOLEAN, value: true },
		));

		expect(opts.getBoolean("flag")).toBe(true);
		expect(opts.getBoolean("missing")).toBeNull();
	});

	it("throws a TypeError when an option is requested as the wrong type", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "Jo" },
		));

		expect(() => opts.getInteger("name")).toThrow(TypeError);
	});
});

// ---------------------------------------------------------------------------
// getUser / getMember
// ---------------------------------------------------------------------------

describe("SlashCommandOptions.getUser", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("resolves and upserts the user from resolved data", () => {
		const resolved: ResolvedData = { users: { "user-2": userData("user-2") } };
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "target", type: ApplicationCommandOptionTypes.USER, value: "user-2" },
		), resolved);

		const user = opts.getUser("target");

		expect(user).toBeInstanceOf(User);
		expect(user!.id).toBe("user-2");
		expect(client.users.get("user-2")).toBe(user);
	});

	it("returns null when the option is absent", () => {
		const opts = new SlashCommandOptions(client, undefined, options());

		expect(opts.getUser("target")).toBeNull();
	});

	it("throws when the option is present but its resolved user data is missing", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "target", type: ApplicationCommandOptionTypes.USER, value: "user-2" },
		));

		expect(() => opts.getUser("target")).toThrow();
	});
});

describe("SlashCommandOptions.getMember", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = client.guilds.upsert(guildData());
	});

	it("resolves and upserts the member by combining resolved member and user data", () => {
		const resolved: ResolvedData = {
			users: { "user-2": userData("user-2") },
			members: { "user-2": { roles: ["role-1"], joined_at: "2024-01-01T00:00:00.000Z", deaf: false, mute: false, flags: 0 } },
		};
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "target", type: ApplicationCommandOptionTypes.USER, value: "user-2" },
		), resolved);

		const member = opts.getMember("target");

		expect(member).toBeInstanceOf(Member);
		expect(member!.id).toBe("user-2");
		expect(guild.members.get("user-2")).toBe(member);
	});

	it("returns null when no guild is available", () => {
		const resolved: ResolvedData = {
			users: { "user-2": userData("user-2") },
			members: { "user-2": { roles: [], joined_at: "2024-01-01T00:00:00.000Z", deaf: false, mute: false, flags: 0 } },
		};
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "target", type: ApplicationCommandOptionTypes.USER, value: "user-2" },
		), resolved);

		expect(opts.getMember("target")).toBeNull();
	});

	it("returns null when the option is absent", () => {
		const opts = new SlashCommandOptions(client, guild, options());

		expect(opts.getMember("target")).toBeNull();
	});

	it("returns null when resolved member data is missing even though the option is present", () => {
		const resolved: ResolvedData = { users: { "user-2": userData("user-2") } };
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "target", type: ApplicationCommandOptionTypes.USER, value: "user-2" },
		), resolved);

		expect(opts.getMember("target")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getRole
// ---------------------------------------------------------------------------

describe("SlashCommandOptions.getRole", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = client.guilds.upsert(guildData());
	});

	it("resolves and upserts the role from resolved data", () => {
		const resolved: ResolvedData = { roles: { "role-1": roleData("role-1") } };
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "role", type: ApplicationCommandOptionTypes.ROLE, value: "role-1" },
		), resolved);

		const role = opts.getRole("role");

		expect(role).toBeInstanceOf(Role);
		expect(role!.id).toBe("role-1");
		expect(guild.roles.get("role-1")).toBe(role);
	});

	it("returns null when the option is absent", () => {
		const opts = new SlashCommandOptions(client, guild, options());

		expect(opts.getRole("role")).toBeNull();
	});

	it("throws when used outside of a guild", () => {
		const resolved: ResolvedData = { roles: { "role-1": roleData("role-1") } };
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "role", type: ApplicationCommandOptionTypes.ROLE, value: "role-1" },
		), resolved);

		expect(() => opts.getRole("role")).toThrow();
	});

	it("throws when resolved role data is missing", () => {
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "role", type: ApplicationCommandOptionTypes.ROLE, value: "role-1" },
		));

		expect(() => opts.getRole("role")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// getChannel
// ---------------------------------------------------------------------------

describe("SlashCommandOptions.getChannel", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = client.guilds.upsert(guildData());
	});

	it("returns the already-cached channel instance without touching resolved data", () => {
		const cached = guild.channels.upsert(channelData("channel-1"));
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "channel", type: ApplicationCommandOptionTypes.CHANNEL, value: "channel-1" },
		));

		expect(opts.getChannel("channel")).toBe(cached);
	});

	it("builds a channel from resolved data when not cached", () => {
		const resolved: ResolvedData = { channels: { "channel-2": channelData("channel-2") } };
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "channel", type: ApplicationCommandOptionTypes.CHANNEL, value: "channel-2" },
		), resolved);

		const channel = opts.getChannel("channel");

		expect(channel).toBeInstanceOf(GuildTextChannel);
		expect(channel!.id).toBe("channel-2");
	});

	it("returns null when the option is absent", () => {
		const opts = new SlashCommandOptions(client, guild, options());

		expect(opts.getChannel("channel")).toBeNull();
	});

	it("throws when used outside of a guild", () => {
		const resolved: ResolvedData = { channels: { "channel-1": channelData("channel-1") } };
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "channel", type: ApplicationCommandOptionTypes.CHANNEL, value: "channel-1" },
		), resolved);

		expect(() => opts.getChannel("channel")).toThrow();
	});

	it("throws when resolved channel data is missing and nothing is cached", () => {
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "channel", type: ApplicationCommandOptionTypes.CHANNEL, value: "channel-1" },
		));

		expect(() => opts.getChannel("channel")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// getMentionable
// ---------------------------------------------------------------------------

describe("SlashCommandOptions.getMentionable", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = client.guilds.upsert(guildData());
	});

	it("resolves to a Role when the id is present in resolved.roles", () => {
		const resolved: ResolvedData = { roles: { "role-1": roleData("role-1") } };
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "target", type: ApplicationCommandOptionTypes.MENTIONABLE, value: "role-1" },
		), resolved);

		expect(opts.getMentionable("target")).toBeInstanceOf(Role);
	});

	it("resolves to a User when the id is not present in resolved.roles", () => {
		const resolved: ResolvedData = { users: { "user-2": userData("user-2") } };
		const opts = new SlashCommandOptions(client, guild, options(
			{ name: "target", type: ApplicationCommandOptionTypes.MENTIONABLE, value: "user-2" },
		), resolved);

		expect(opts.getMentionable("target")).toBeInstanceOf(User);
	});

	it("returns null when the option is absent", () => {
		const opts = new SlashCommandOptions(client, guild, options());

		expect(opts.getMentionable("target")).toBeNull();
	});

	it("throws when resolved as a role outside of a guild", () => {
		const resolved: ResolvedData = { roles: { "role-1": roleData("role-1") } };
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "target", type: ApplicationCommandOptionTypes.MENTIONABLE, value: "role-1" },
		), resolved);

		expect(() => opts.getMentionable("target")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// getAttachment
// ---------------------------------------------------------------------------

describe("SlashCommandOptions.getAttachment", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("returns the resolved attachment", () => {
		const resolved: ResolvedData = { attachments: { "attachment-1": attachmentData("attachment-1") } };
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "file", type: ApplicationCommandOptionTypes.ATTACHMENT, value: "attachment-1" },
		), resolved);

		expect(opts.getAttachment("file")).toEqual(attachmentData("attachment-1"));
	});

	it("returns null when the option is absent", () => {
		const opts = new SlashCommandOptions(client, undefined, options());

		expect(opts.getAttachment("file")).toBeNull();
	});

	it("throws when resolved attachment data is missing", () => {
		const opts = new SlashCommandOptions(client, undefined, options(
			{ name: "file", type: ApplicationCommandOptionTypes.ATTACHMENT, value: "attachment-1" },
		));

		expect(() => opts.getAttachment("file")).toThrow();
	});
});
