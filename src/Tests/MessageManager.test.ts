import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { Guild } from "../Structures/Guild.js";
import { Message } from "../Structures/Message.js";
import { MessageManager } from "../Managers/Messages.js";
import { CreateChannel } from "../Factory/CreateChannel.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { DiscordChannelTypes, DiscordGuild, DiscordRole, DiscordUser } from "../Types/DiscordAPITypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
}

function userData(id = "user-1"): DiscordUser {
	return { id, username: "tester", discriminator: "0001", global_name: "Tester", avatar: null };
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

describe("MessageManager", () => {
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
		const manager = channel.messages;
		expect(manager).toBeInstanceOf(MessageManager);
		expect(channel.messages).toBe(manager);
		expect(manager.channel).toBe(channel);
	});

	it("fetch(id) hits the single-message route and returns a Message", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue(messageData("msg-9"));

		const message = await channel.messages.fetch("msg-9");

		expect(spy).toHaveBeenCalledWith("/channels/channel-1/messages/msg-9");
		expect(message).toBeInstanceOf(Message);
		expect(message.id).toBe("msg-9");
		expect(message.content).toBe("hello");
	});

	it("fetch() without options sends no query string", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([]);

		const messages = await channel.messages.fetch();

		expect(spy).toHaveBeenCalledWith("/channels/channel-1/messages");
		expect(messages).toEqual([]);
	});

	it("fetch(options) serialises pagination params and maps every entry to a Message", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([ messageData("msg-1"), messageData("msg-2") ]);

		const messages = await channel.messages.fetch({ limit: 5, before: "msg-3" });

		expect(spy).toHaveBeenCalledWith("/channels/channel-1/messages?limit=5&before=msg-3");
		expect(messages).toHaveLength(2);
		expect(messages.every(x => x instanceof Message)).toBe(true);
		expect(messages.map(x => x.id)).toEqual([ "msg-1", "msg-2" ]);
	});

	it("fetch(options) serialises around and after", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([]);

		await channel.messages.fetch({ around: "msg-4" });
		expect(spy).toHaveBeenLastCalledWith("/channels/channel-1/messages?around=msg-4");

		await channel.messages.fetch({ after: "msg-5", limit: 10 });
		expect(spy).toHaveBeenLastCalledWith("/channels/channel-1/messages?limit=10&after=msg-5");
	});

	it("fetch(options) rejects more than one anchor", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([]);

		await expect(channel.messages.fetch({ before: "a", after: "b" })).rejects.toThrow(/Only one of before, after and around/);
		await expect(channel.messages.fetch({ before: "a", around: "c" })).rejects.toThrow();

		expect(spy).not.toHaveBeenCalled();
	});

	it("caches nothing it fetches, but still upserts message authors into the user cache", async () => {
		vi.spyOn(client.rest, "get").mockResolvedValue([ messageData("msg-1", "user-7") ]);

		await channel.messages.fetch({ limit: 1 });

		expect(client.users.has("user-7")).toBe(true);
		expect(Object.keys(channel.messages)).not.toContain("cache");
		expect(channel.messages).not.toBeInstanceOf(Map);
	});
});
