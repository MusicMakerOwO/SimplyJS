import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { Guild } from "../Structures/Guild.js";
import { Member } from "../Structures/Member.js";
import { DiscordGuild, DiscordMember, DiscordRole, DiscordUser } from "../Types/DiscordAPITypes.js";
import { MembersChunk } from "../Events/Members.js";

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
}

function userData(id: string): DiscordUser {
	return { id, username: `user-${id}`, discriminator: "0001", global_name: null, avatar: null };
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

function guildData(id = "guild-1"): DiscordGuild {
	return {
		id,
		name: "Test Guild",
		owner_id: "owner-1",
		afk_timeout: 60,
		verification_level: 0,
		default_message_notifications: 0,
		explicit_content_filter: 0,
		roles: [ roleData() ],
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

function memberData(id: string): DiscordMember {
	return {
		user: userData(id),
		roles: [],
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: false,
		mute: false,
		flags: 0,
	};
}

describe("MemberCache", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = new Guild(client, guildData());
	});

	it("fetch(id) hits the single-member route and caches the result", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue(memberData("user-9"));

		const member = await guild.members.fetch("user-9");

		expect(spy).toHaveBeenCalledWith("/guilds/guild-1/members/user-9");
		expect(member).toBeInstanceOf(Member);
		expect(guild.members.get("user-9")).toBe(member);
	});

	it("fetch() without options sends no query string and returns a list", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([ memberData("user-1"), memberData("user-2") ]);

		const members = await guild.members.fetch();

		expect(spy).toHaveBeenCalledWith("/guilds/guild-1/members");
		expect(members.map(x => x.id)).toEqual([ "user-1", "user-2" ]);
		expect(guild.members.size).toBe(2);
	});

	it("fetch(options) serialises pagination params", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([]);

		await guild.members.fetch({ limit: 100, after: "user-3" });

		expect(spy).toHaveBeenCalledWith("/guilds/guild-1/members?limit=100&after=user-3");
	});

	it("fetch() upserts in place rather than replacing a cached member", async () => {
		guild.members.upsert(memberData("user-1"));
		const cached = guild.members.get("user-1")!;
		vi.spyOn(client.rest, "get").mockResolvedValue([ { ...memberData("user-1"), nick: "renamed" } ]);

		const [ member ] = await guild.members.fetch();

		expect(member).toBe(cached);
		expect(cached.nick).toBe("renamed");
	});

	it("fetchAll() pages until a short page comes back", async () => {
		const firstPage = Array.from({ length: 1000 }, (_, i) => memberData(`user-${i}`));
		const spy = vi.spyOn(client.rest, "get")
			.mockResolvedValueOnce(firstPage)
			.mockResolvedValueOnce([ memberData("user-1000") ]);

		const members = await guild.members.fetchAll();

		expect(members).toHaveLength(1001);
		expect(spy).toHaveBeenNthCalledWith(1, "/guilds/guild-1/members?limit=1000");
		expect(spy).toHaveBeenNthCalledWith(2, "/guilds/guild-1/members?limit=1000&after=user-999");
	});

	it("fetchAll() stops after a single call when the guild is smaller than a page", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([ memberData("user-1") ]);

		await guild.members.fetchAll();

		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("search() encodes the query and caches every match", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([ memberData("user-4") ]);

		const members = await guild.members.search("some one", 10);

		expect(spy).toHaveBeenCalledWith("/guilds/guild-1/members/search?query=some+one&limit=10");
		expect(members).toHaveLength(1);
		expect(guild.members.has("user-4")).toBe(true);
	});
});

describe("MemberCache.fetchGateway", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = new Client({
			token: "test-token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers
		});
		guild = client.guilds.upsert(guildData());
	});

	/** Replays a chunk back through the real handler, the way the dispatcher would */
	function respond(nonce: string | undefined, members: DiscordMember[], index: number, count: number): void {
		void MembersChunk.handler(client, {
			guild_id: guild.id,
			members,
			chunk_index: index,
			chunk_count: count,
			...(nonce === undefined ? {} : { nonce })
		});
	}

	it("sends op 8 with a nonce and resolves once the last chunk arrives", async () => {
		const spy = vi.spyOn(client.socket, "requestGuildMembers").mockImplementation(() => {});

		const pending = guild.members.fetchGateway();

		const sent = spy.mock.calls[0]![0];
		expect(sent).toMatchObject({ guild_id: "guild-1", query: "", limit: 0 });
		expect(sent.nonce).toBeTypeOf("string");

		respond(sent.nonce, [ memberData("user-1") ], 0, 2);
		respond(sent.nonce, [ memberData("user-2") ], 1, 2);

		const members = await pending;
		expect(members.map((member) => member.id)).toEqual([ "user-1", "user-2" ]);
		expect(guild.members.has("user-2")).toBe(true);
	});

	it("ignores chunks carrying a different nonce", async () => {
		vi.useFakeTimers();
		const spy = vi.spyOn(client.socket, "requestGuildMembers").mockImplementation(() => {});

		const pending = guild.members.fetchGateway({ time: 1000 });
		const assertion = expect(pending).rejects.toThrow(/Timed out/);

		respond("someone-elses-nonce", [ memberData("user-1") ], 0, 1);
		await vi.advanceTimersByTimeAsync(1000);

		await assertion;
		expect(spy).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});

	it("sends user ids instead of a query when given them", () => {
		const spy = vi.spyOn(client.socket, "requestGuildMembers").mockImplementation(() => {});

		void guild.members.fetchGateway({ userIds: [ "user-1", "user-2" ], limit: 0 });

		expect(spy.mock.calls[0]![0]).toMatchObject({ user_ids: [ "user-1", "user-2" ] });
		expect(spy.mock.calls[0]![0]).not.toHaveProperty("query");
	});

	it("rejects a request that mixes a query with user ids", async () => {
		await expect(guild.members.fetchGateway({ query: "a", userIds: [ "user-1" ] }))
			.rejects.toThrow(/mutually exclusive/);
	});

	it("rejects more than 100 user ids", async () => {
		const ids = Array.from({ length: 101 }, (_, i) => `user-${i}`);
		await expect(guild.members.fetchGateway({ userIds: ids })).rejects.toThrow(/more than 100/);
	});

	it("rejects a query fetch without the GuildMembers intent", async () => {
		const limited = new Client({ token: "test-token", intents: GatewayIntents.Guilds });
		const limitedGuild = limited.guilds.upsert(guildData("guild-2"));

		await expect(limitedGuild.members.fetchGateway()).rejects.toThrow(/GuildMembers/);
	});

	it("rejects a presence fetch without the GuildPresences intent", async () => {
		await expect(guild.members.fetchGateway({ presences: true })).rejects.toThrow(/GuildPresences/);
	});
});
