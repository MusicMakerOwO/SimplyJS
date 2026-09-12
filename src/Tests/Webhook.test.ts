import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { Webhook } from "../Structures/Webhook.js";
import { WebhookMessage } from "../Structures/WebhookMessage.js";
import { Guild } from "../Structures/Guild.js";
import { Message } from "../Structures/Message.js";
import { GuildAnnouncementChannel } from "../Structures/Channels/GuildAnnouncementChannel.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordRole,
	DiscordUser,
	DiscordWebhook,
	DiscordWebhookType
} from "../Types/DiscordAPITypes.js";

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

function channelData(id = "channel-1"): DiscordChannel {
	return { id, type: DiscordChannelTypes.GUILD_TEXT, guild_id: "guild-1", name: "general", permission_overwrites: [] };
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

/**
 * Builds a webhook payload. Overrides set to `undefined` remove the key entirely, so tests can
 * model the tokenless and user-less shapes Discord actually returns.
 */
function webhookData(overrides: { [K in keyof DiscordWebhook]?: DiscordWebhook[K] | undefined } = {}): DiscordWebhook {
	const data: DiscordWebhook = {
		id: "webhook-1",
		type: DiscordWebhookType.Incoming,
		guild_id: "guild-1",
		channel_id: "channel-1",
		user: userData(),
		name: "Announcer",
		avatar: null,
		token: "secret-token",
		application_id: null,
	};

	for (const [ key, value ] of Object.entries(overrides)) {
		if (value === undefined) delete data[key as keyof DiscordWebhook];
		else Object.assign(data, { [key]: value });
	}

	return data;
}

/** A minimal message payload, as Discord returns from an executed webhook */
function messageData(overrides: Partial<DiscordMessage> = {}): DiscordMessage {
	return {
		id: "message-1",
		channel_id: "channel-1",
		author: userData(),
		content: "hello",
		timestamp: "2026-01-01T00:00:00.000Z",
		edited_timestamp: null,
		tts: false,
		mention_everyone: false,
		mentions: [],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: 0,
		...overrides
	};
}

// ---------------------------------------------------------------------------
// Webhook.patch
// ---------------------------------------------------------------------------

describe("Webhook.patch", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("maps the snake_case payload onto camelCase fields", () => {
		const webhook = new Webhook(client, webhookData());

		expect(webhook.id).toBe("webhook-1");
		expect(webhook.type).toBe(DiscordWebhookType.Incoming);
		expect(webhook.guildId).toBe("guild-1");
		expect(webhook.channelId).toBe("channel-1");
		expect(webhook.name).toBe("Announcer");
		expect(webhook.avatar).toBeNull();
		expect(webhook.token).toBe("secret-token");
		expect(webhook.applicationId).toBeNull();
	});

	it("upserts the creating user into the client cache", () => {
		const webhook = new Webhook(client, webhookData());

		expect(webhook.owner!.id).toBe("user-1");
		expect(client.users.get("user-1")).toBe(webhook.owner);
	});

	it("leaves optional fields undefined when Discord omits them", () => {
		const webhook = new Webhook(client, webhookData({ user: undefined, token: undefined, url: undefined }));

		expect(webhook.owner).toBeUndefined();
		expect(webhook.token).toBeUndefined();
		expect(webhook.url).toBeUndefined();
	});

	it("keeps the channel follower source objects", () => {
		const webhook = new Webhook(client, webhookData({
			type: DiscordWebhookType.ChannelFollower,
			source_guild: { id: "guild-2", name: "Source" },
			source_channel: { id: "channel-2", name: "news" }
		}));

		expect(webhook.sourceGuild!.id).toBe("guild-2");
		expect(webhook.sourceChannel!.id).toBe("channel-2");
	});
});

// ---------------------------------------------------------------------------
// Lazy getters
// ---------------------------------------------------------------------------

describe("Webhook getters", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = client.guilds.upsert(guildData());
		guild.channels.upsert(channelData());
	});

	it("resolves the guild and channel from cache", () => {
		const webhook = new Webhook(client, webhookData());

		expect(webhook.guild).toBe(guild);
		expect(webhook.channel).toBe(guild.channels.get("channel-1"));
	});

	it("returns null for uncached targets", () => {
		const webhook = new Webhook(client, webhookData({ guild_id: "guild-99", channel_id: "channel-99" }));

		expect(webhook.guild).toBeNull();
		expect(webhook.channel).toBeNull();
	});

	it("overwrites the getter after the first read", () => {
		const webhook = new Webhook(client, webhookData());

		expect(webhook.guild).toBe(guild);
		client.guilds.delete("guild-1");
		expect(webhook.guild).toBe(guild); // cached from the first read
	});

	it("builds an avatar url only when an avatar hash is set", () => {
		expect(new Webhook(client, webhookData()).avatarURL()).toBeNull();
		expect(new Webhook(client, webhookData({ avatar: "hash" })).avatarURL())
			.toBe("https://cdn.discordapp.com/avatars/webhook-1/hash.png?size=1024");
		expect(new Webhook(client, webhookData({ avatar: "a_hash" })).avatarURL())
			.toBe("https://cdn.discordapp.com/avatars/webhook-1/a_hash.gif?size=1024");
	});

	it("stringifies to the execution url, preferring the one Discord sent", () => {
		expect(new Webhook(client, webhookData()).toString())
			.toBe("https://discord.com/api/webhooks/webhook-1/secret-token");
		expect(new Webhook(client, webhookData({ token: undefined })).toString())
			.toBe("https://discord.com/api/webhooks/webhook-1");
		expect(new Webhook(client, webhookData({ url: "https://example.com/hook" })).toString())
			.toBe("https://example.com/hook");
	});
});

// ---------------------------------------------------------------------------
// REST actions
// ---------------------------------------------------------------------------

describe("Webhook actions", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("edits over the token route and patches itself with the response", async () => {
		const webhook = new Webhook(client, webhookData());
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(webhookData({ name: "Renamed" }));

		const result = await webhook.edit({ name: "Renamed" });

		expect(spy).toHaveBeenCalledWith("/webhooks/webhook-1/secret-token", { name: "Renamed" }, {});
		expect(result).toBe(webhook);
		expect(webhook.name).toBe("Renamed");
	});

	it("edits over the authenticated route when there is no token, passing the audit reason", async () => {
		const webhook = new Webhook(client, webhookData({ token: undefined }));
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(webhookData({ token: undefined }));

		await webhook.edit({ channel_id: "channel-2" }, "moving it");

		expect(spy).toHaveBeenCalledWith(
			"/webhooks/webhook-1",
			{ channel_id: "channel-2" },
			{ "X-Audit-Log-Reason": "moving it" }
		);
	});

	it("refuses to move a webhook to another channel over the token route", async () => {
		const webhook = new Webhook(client, webhookData());

		await expect(webhook.edit({ channel_id: "channel-2" })).rejects.toThrow();
	});

	it("deletes over the token route", async () => {
		const webhook = new Webhook(client, webhookData());
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await webhook.delete();

		expect(spy).toHaveBeenCalledWith("/webhooks/webhook-1/secret-token", {});
	});

	it("deletes over the authenticated route with an audit reason", async () => {
		const webhook = new Webhook(client, webhookData({ token: undefined }));
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await webhook.delete("cleanup");

		expect(spy).toHaveBeenCalledWith("/webhooks/webhook-1", { "X-Audit-Log-Reason": "cleanup" });
	});

	it("executes the webhook and returns the created message", async () => {
		const webhook = new Webhook(client, webhookData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue({
			id: "message-1",
			channel_id: "channel-1",
			author: userData(),
			content: "hello",
			timestamp: "2026-01-01T00:00:00.000Z",
			edited_timestamp: null,
			tts: false,
			mention_everyone: false,
			mentions: [],
			mention_roles: [],
			attachments: [],
			embeds: [],
			pinned: false,
			type: 0
		});

		const message = await webhook.send("hello", { username: "Announcer" });

		expect(spy).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token?wait=true",
			{ content: "hello", username: "Announcer" },
			undefined,
			[]
		);
		expect(message).toBeInstanceOf(Message);
		expect(message.id).toBe("message-1");
	});

	it("forwards attachments as files and describes them in the body", async () => {
		const webhook = new Webhook(client, webhookData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue({
			id: "message-1",
			channel_id: "channel-1",
			author: userData(),
			content: "hello",
			timestamp: "2026-01-01T00:00:00.000Z",
			edited_timestamp: null,
			tts: false,
			mention_everyone: false,
			mentions: [],
			mention_roles: [],
			attachments: [],
			embeds: [],
			pinned: false,
			type: 0
		});

		await webhook.send({ content: "hello", attachments: [{ name: "log.txt", data: "contents" }] });

		expect(spy).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token?wait=true",
			{ content: "hello", attachments: [{ id: "0", filename: "log.txt" }] },
			undefined,
			[{ name: "log.txt", data: "contents" }]
		);
	});

	it("passes thread_id as a query parameter rather than in the body", async () => {
		const webhook = new Webhook(client, webhookData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue({
			id: "message-1",
			channel_id: "thread-1",
			author: userData(),
			content: "hello",
			timestamp: "2026-01-01T00:00:00.000Z",
			edited_timestamp: null,
			tts: false,
			mention_everyone: false,
			mentions: [],
			mention_roles: [],
			attachments: [],
			embeds: [],
			pinned: false,
			type: 0
		});

		await webhook.send("hello", { thread_id: "thread-1" });

		expect(spy).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token?wait=true&thread_id=thread-1",
			{ content: "hello" },
			undefined,
			[]
		);
	});

	it("throws when executed without a token", async () => {
		const webhook = new Webhook(client, webhookData({ token: undefined }));

		await expect(webhook.send("hello")).rejects.toThrow(/no token/);
	});

	it("throws when the message would be empty", async () => {
		const webhook = new Webhook(client, webhookData());

		await expect(webhook.send({})).rejects.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Webhook message routes
// ---------------------------------------------------------------------------

describe("Webhook message routes", () => {
	let client: Client;
	let webhook: Webhook;

	beforeEach(() => {
		client = makeClient();
		webhook = new Webhook(client, webhookData());
	});

	it("hands back a WebhookMessage carrying the webhook identity", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData());

		const message = await webhook.send("hello");

		expect(message).toBeInstanceOf(WebhookMessage);
		expect(message.webhookId).toBe("webhook-1");
		expect(message.webhookToken).toBe("secret-token");
		expect(message.threadId).toBeUndefined();
	});

	it("remembers the thread a message was sent into", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData({ channel_id: "thread-1" }));

		const message = await webhook.send("hello", { thread_id: "thread-1" });

		expect(message.threadId).toBe("thread-1");
	});

	it("takes the thread a `thread_name` send created from the returned message", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData({ channel_id: "thread-2" }));

		const message = await webhook.send("hello", { thread_name: "Release notes" });

		expect(message.threadId).toBe("thread-2");
	});

	it("edits a sent message over the webhook route instead of the channel route", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData());
		const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData({ content: "goodbye" }));

		const message = await webhook.send("hello");
		const edited = await message.update("goodbye");

		expect(patch).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token/messages/message-1",
			{ content: "goodbye" },
			undefined,
			[]
		);
		expect(edited).toBeInstanceOf(WebhookMessage);
		expect(edited.content).toBe("goodbye");
		expect(edited.webhookToken).toBe("secret-token");
	});

	it("does not hold a webhook message to the bot-author check", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData());
		vi.spyOn(client.rest, "patch").mockResolvedValue(messageData());

		const message = await webhook.send("hello");

		// `client.user` is unset here, exactly as it is before login - `Message.update` would reject
		// the edit on the author comparison alone, well before the request
		expect(client.user).toBeNull();
		await expect(message.update("goodbye")).resolves.toBeInstanceOf(WebhookMessage);
	});

	it("keeps the thread on the route when editing a threaded message", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData({ channel_id: "thread-1" }));
		const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData({ channel_id: "thread-1" }));

		const message = await webhook.send("hello", { thread_id: "thread-1" });
		await message.update("goodbye");

		expect(patch).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token/messages/message-1?thread_id=thread-1",
			{ content: "goodbye" },
			undefined,
			[]
		);
	});

	it("deletes a sent message over the webhook route instead of the channel route", async () => {
		vi.spyOn(client.rest, "post").mockResolvedValue(messageData());
		const del = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		const message = await webhook.send("hello");
		await message.delete();

		expect(del).toHaveBeenCalledWith("/webhooks/webhook-1/secret-token/messages/message-1");
	});

	it("fetches a message by id", async () => {
		const get = vi.spyOn(client.rest, "get").mockResolvedValue(messageData());

		const message = await webhook.fetchMessage("message-1");

		expect(get).toHaveBeenCalledWith("/webhooks/webhook-1/secret-token/messages/message-1");
		expect(message).toBeInstanceOf(WebhookMessage);
		expect(message.id).toBe("message-1");
	});

	it("fetches a threaded message with the thread query", async () => {
		const get = vi.spyOn(client.rest, "get").mockResolvedValue(messageData({ channel_id: "thread-1" }));

		const message = await webhook.fetchMessage("message-1", "thread-1");

		expect(get).toHaveBeenCalledWith("/webhooks/webhook-1/secret-token/messages/message-1?thread_id=thread-1");
		expect(message.threadId).toBe("thread-1");
	});

	it("edits a message by id without fetching it first", async () => {
		const get = vi.spyOn(client.rest, "get");
		const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData({ content: "goodbye" }));

		const edited = await webhook.editMessage("message-1", "goodbye", "thread-1");

		expect(get).not.toHaveBeenCalled();
		expect(patch).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token/messages/message-1?thread_id=thread-1",
			{ content: "goodbye" },
			undefined,
			[]
		);
		expect(edited.threadId).toBe("thread-1");
	});

	it("forwards attachments when editing a message by id", async () => {
		const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData());

		await webhook.editMessage("message-1", { attachments: [{ name: "log.txt", data: "contents" }] });

		expect(patch).toHaveBeenCalledWith(
			"/webhooks/webhook-1/secret-token/messages/message-1",
			{ attachments: [{ id: "0", filename: "log.txt" }] },
			undefined,
			[{ name: "log.txt", data: "contents" }]
		);
	});

	it("deletes a message by id", async () => {
		const del = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await webhook.deleteMessage("message-1", "thread-1");

		expect(del).toHaveBeenCalledWith("/webhooks/webhook-1/secret-token/messages/message-1?thread_id=thread-1");
	});

	it("throws on every message route when there is no token", async () => {
		const tokenless = new Webhook(client, webhookData({ token: undefined }));

		await expect(tokenless.fetchMessage("message-1")).rejects.toThrow(/no token/);
		await expect(tokenless.editMessage("message-1", "goodbye")).rejects.toThrow(/no token/);
		await expect(tokenless.deleteMessage("message-1")).rejects.toThrow(/no token/);
	});
});

// ---------------------------------------------------------------------------
// WebhookCache
// ---------------------------------------------------------------------------

describe("WebhookCache", () => {
	let client: Client;
	let guild: Guild;

	beforeEach(() => {
		client = makeClient();
		guild = client.guilds.upsert(guildData());
	});

	it("is attached to the guild and starts empty", () => {
		expect(guild.webhooks.size).toBe(0);
	});

	it("patches the existing instance on re-upsert rather than replacing it", () => {
		const first = guild.webhooks.upsert(webhookData());
		const second = guild.webhooks.upsert(webhookData({ name: "Renamed" }));

		expect(second).toBe(first);
		expect(first.name).toBe("Renamed");
		expect(guild.webhooks.size).toBe(1);
	});

	it("fetchAll populates the cache from the guild endpoint", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([ webhookData(), webhookData({ id: "webhook-2" }) ]);

		const fetched = await guild.webhooks.fetchAll();

		expect(spy).toHaveBeenCalledWith("/guilds/guild-1/webhooks");
		expect(fetched).toHaveLength(2);
		expect(guild.webhooks.size).toBe(2);
		expect(guild.webhooks.get("webhook-2")).toBe(fetched[1]);
	});

	it("fetchChannel populates the cache from the channel endpoint", async () => {
		const spy = vi.spyOn(client.rest, "get").mockResolvedValue([ webhookData() ]);

		await guild.webhooks.fetchChannel("channel-1");

		expect(spy).toHaveBeenCalledWith("/channels/channel-1/webhooks");
		expect(guild.webhooks.get("webhook-1")).toBeInstanceOf(Webhook);
	});

	it("fetch caches a single webhook by id", async () => {
		vi.spyOn(client.rest, "get").mockResolvedValue(webhookData());

		const fetched = await guild.webhooks.fetch("webhook-1");

		expect(guild.webhooks.get("webhook-1")).toBe(fetched);
	});

	it("create posts to the channel endpoint and caches the result", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(webhookData());

		const created = await guild.webhooks.create("channel-1", { name: "Announcer" }, "for releases");

		expect(spy).toHaveBeenCalledWith(
			"/channels/channel-1/webhooks",
			{ name: "Announcer" },
			{ "X-Audit-Log-Reason": "for releases" }
		);
		expect(guild.webhooks.get("webhook-1")).toBe(created);
	});
});

// ---------------------------------------------------------------------------
// Channel follower webhooks
// ---------------------------------------------------------------------------

describe("GuildAnnouncementChannel.follow", () => {
	let client: Client;
	let channel: GuildAnnouncementChannel;

	beforeEach(() => {
		client = makeClient();
		const guild = client.guilds.upsert(guildData());
		channel = guild.channels.upsert({
			...channelData("announcements"),
			type: DiscordChannelTypes.GUILD_ANNOUNCEMENT
		}) as GuildAnnouncementChannel;
	});

	it("posts the target channel to the followers endpoint", async () => {
		const spy = vi.spyOn(client.rest, "post")
			.mockResolvedValue({ channel_id: "announcements", webhook_id: "webhook-9" });

		const followed = await channel.follow("channel-2");

		expect(spy).toHaveBeenCalledWith(
			"/channels/announcements/followers",
			{ webhook_channel_id: "channel-2" },
			{}
		);
		expect(followed).toEqual({ channel_id: "announcements", webhook_id: "webhook-9" });
	});

	it("passes an audit log reason", async () => {
		const spy = vi.spyOn(client.rest, "post")
			.mockResolvedValue({ channel_id: "announcements", webhook_id: "webhook-9" });

		await channel.follow("channel-2", "relaying releases");

		expect(spy).toHaveBeenCalledWith(
			"/channels/announcements/followers",
			{ webhook_channel_id: "channel-2" },
			{ "X-Audit-Log-Reason": "relaying releases" }
		);
	});

	it("does not cache the created webhook, which lives in the target guild", async () => {
		vi.spyOn(client.rest, "post")
			.mockResolvedValue({ channel_id: "announcements", webhook_id: "webhook-9" });

		await channel.follow("channel-2");

		expect(client.guilds.get("guild-1")!.webhooks.size).toBe(0);
	});
});
