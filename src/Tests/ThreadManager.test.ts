import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { Guild } from "../Structures/Guild.js";
import { ThreadManager } from "../Managers/Threads.js";
import { CreateChannel } from "../Factory/CreateChannel.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { GuildForumChannel } from "../Structures/Channels/GuildForumChannel.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import { DiscordChannel, DiscordChannelTypes, DiscordGuild, DiscordRole } from "../Types/DiscordAPITypes.js";

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
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

function threadData(id = "thread-1", parentId = "channel-1"): DiscordChannel {
	return {
		id,
		type: DiscordChannelTypes.PUBLIC_THREAD,
		name: "a thread",
		guild_id: "guild-1",
		parent_id: parentId,
		owner_id: "user-1",
		thread_metadata: {
			archived: false,
			auto_archive_duration: 1440,
			archive_timestamp: "2024-01-01T00:00:00.000Z",
			locked: false,
		},
	};
}

describe("ThreadManager", () => {
	let client: Client;
	let guild: Guild;
	let channel: GuildTextChannel;

	beforeEach(() => {
		client = makeClient();
		guild = new Guild(client, guildData());
		channel = CreateChannel(client, guild, {
			id: "channel-1",
			type: DiscordChannelTypes.GUILD_TEXT,
			name: "general",
			position: 0,
			permission_overwrites: [],
		}) as GuildTextChannel;
	});

	it("exposes a lazily created manager that is reused across accesses", () => {
		const manager = channel.threads;
		expect(manager).toBeInstanceOf(ThreadManager);
		expect(channel.threads).toBe(manager);
		expect(manager.channel).toBe(channel);
		expect(manager.guild).toBe(guild);
	});

	it("create() defaults to a public thread and upserts into the guild channel cache", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(threadData("thread-9"));

		const thread = await channel.threads.create({ name: "a thread", autoArchiveDuration: 1440 });

		expect(spy).toHaveBeenCalledWith(
			"/channels/channel-1/threads",
			{ name: "a thread", type: DiscordChannelTypes.PUBLIC_THREAD, auto_archive_duration: 1440 },
			{}
		);
		expect(thread).toBeInstanceOf(GuildThreadChannel);
		expect(guild.channels.get("thread-9")).toBe(thread);
	});

	it("create() honours an explicit type and forwards the audit log reason", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(threadData());

		await channel.threads.create({
			name: "secret",
			type: DiscordChannelTypes.PRIVATE_THREAD,
			invitable: false,
			rateLimitPerUser: 10,
			reason: "because",
		});

		expect(spy).toHaveBeenCalledWith(
			"/channels/channel-1/threads",
			{
				name: "secret",
				type: DiscordChannelTypes.PRIVATE_THREAD,
				invitable: false,
				rate_limit_per_user: 10,
			},
			{ "X-Audit-Log-Reason": "because" }
		);
	});

	it("createFromMessage() hits the message-scoped route", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(threadData("msg-4"));

		const thread = await channel.threads.createFromMessage("msg-4", { name: "spinoff" });

		expect(spy).toHaveBeenCalledWith("/channels/channel-1/messages/msg-4/threads", { name: "spinoff" }, {});
		expect(thread.id).toBe("msg-4");
	});

	it("createForumPost() nests the first message and passes applied tags", async () => {
		const forum = CreateChannel(client, guild, {
			id: "forum-1",
			type: DiscordChannelTypes.GUILD_FORUM,
			name: "help",
			position: 0,
			permission_overwrites: [],
		}) as GuildForumChannel;
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(threadData("post-1", "forum-1"));

		await forum.threads.createForumPost({ name: "my post", message: "hello", appliedTags: [ "tag-1" ] });

		expect(spy).toHaveBeenCalledWith(
			"/channels/forum-1/threads",
			{ name: "my post", message: { content: "hello" }, applied_tags: [ "tag-1" ] },
			{},
			[]
		);
	});

	it("fetchActive() asks the guild-wide route and narrows to this channel's threads", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue({
			threads: [ threadData("thread-1"), threadData("thread-2", "channel-2") ],
			members: [],
			has_more: false,
		});

		const threads = await channel.threads.fetchActive();

		expect(spy).toHaveBeenCalledWith("/guilds/guild-1/threads/active");
		expect(threads.map(x => x.id)).toEqual([ "thread-1" ]);
		// the sibling channel's thread is still cached, just not returned
		expect(guild.channels.has("thread-2")).toBe(true);
	});

	it("fetchArchived() serialises pagination and reports hasMore", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue({
			threads: [ threadData() ],
			members: [],
			has_more: true,
		});

		const page = await channel.threads.fetchArchived({ before: "2024-01-01T00:00:00.000Z", limit: 5 });

		expect(spy).toHaveBeenCalledWith(
			"/channels/channel-1/threads/archived/public?before=2024-01-01T00%3A00%3A00.000Z&limit=5"
		);
		expect(page.hasMore).toBe(true);
		expect(page.threads).toHaveLength(1);
	});

	it("the archived listings each use their own route and default hasMore to false", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue({ threads: [], members: [] });

		expect((await channel.threads.fetchArchived()).hasMore).toBe(false);
		expect(spy).toHaveBeenLastCalledWith("/channels/channel-1/threads/archived/public");

		await channel.threads.fetchArchivedPrivate();
		expect(spy).toHaveBeenLastCalledWith("/channels/channel-1/threads/archived/private");

		await channel.threads.fetchJoinedArchivedPrivate({ before: "thread-3" });
		expect(spy).toHaveBeenLastCalledWith("/channels/channel-1/users/@me/threads/archived/private?before=thread-3");
	});

	it("seeds each returned thread's member cache from the listing's members array", async () => {
		vi.spyOn(client.rest, "get").mockResolvedValue({
			threads: [ threadData("thread-1"), threadData("thread-2") ],
			members: [ { id: "thread-2", user_id: "user-5", join_timestamp: "2024-01-01T00:00:00.000Z", flags: 0 } ],
			has_more: false,
		});

		const page = await channel.threads.fetchArchived();

		expect((page.threads[0] as GuildThreadChannel).members.has("user-5")).toBe(false);
		expect((page.threads[1] as GuildThreadChannel).members.has("user-5")).toBe(true);
	});
});
