import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { Webhook } from "../Structures/Webhook.js";
import { Guild } from "../Structures/Guild.js";
import { Message } from "../Structures/Message.js";
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
