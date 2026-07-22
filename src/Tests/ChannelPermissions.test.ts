import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { DiscordChannelTypes, DiscordOverwrite } from "../Types/DiscordAPITypes.js";
import { Channel } from "../Structures/Channel.js";
import { Guild } from "../Structures/Guild.js";
import { ChannelPermissionManager } from "../Managers/ChannelPermissionManager.js";

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
}

function makeGuild(client: Client, id = "guild-1"): Guild {
	return new Guild(client, {
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
	});
}

function makeChannel(client: Client, guild: Guild, id = "channel-1"): Channel {
	return new Channel(client, guild, { id, type: DiscordChannelTypes.GUILD_TEXT, name: "general" });
}

function overwrites(count = 1): DiscordOverwrite[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `id-${i}`,
		type: (i % 2) as 0 | 1,
		allow: "0",
		deny: "0",
	}));
}

describe("ChannelPermissionManager", () => {
	let client: Client;
	let guild: Guild;
	let channel: Channel;
	let manager: ChannelPermissionManager;

	beforeEach(() => {
		client = makeClient();
		guild = makeGuild(client);
		channel = makeChannel(client, guild);
		manager = new ChannelPermissionManager(client, channel, []);
		vi.restoreAllMocks();
	});

	describe("construction and initialization", () => {
		it("initializes with empty cache when given empty overwrites array", () => {
			const mgr = new ChannelPermissionManager(client, channel, []);

			expect(mgr.cache.size).toBe(0);
		});

		it("populates cache with overwrites passed to constructor", () => {
			const overwritesList = overwrites(3);
			const mgr = new ChannelPermissionManager(client, channel, overwritesList);

			expect(mgr.cache.size).toBe(3);
			expect(mgr.get("id-0")).toEqual(overwritesList[0]);
			expect(mgr.get("id-1")).toEqual(overwritesList[1]);
			expect(mgr.get("id-2")).toEqual(overwritesList[2]);
		});

		it("stores client and channel references", () => {
			const mgr = new ChannelPermissionManager(client, channel, []);

			expect(mgr).toBeDefined();
		});
	});

	describe("patch()", () => {
		it("clears existing cache and repopulates with new overwrites", () => {
			const initial = overwrites(2);
			manager.patch(initial);

			expect(manager.cache.size).toBe(2);

			const updated = overwrites(3);
			manager.patch(updated);

			expect(manager.cache.size).toBe(3);
			expect(manager.get("id-0")).toEqual(updated[0]);
		});

		it("replaces all previous data completely", () => {
			manager.patch([{ id: "old-1", type: 0, allow: "0", deny: "0" }]);
			expect(manager.cache.size).toBe(1);

			manager.patch(overwrites(2));

			expect(manager.cache.size).toBe(2);
			expect(manager.get("old-1")).toBeUndefined();
		});

		it("handles empty overwrites array", () => {
			manager.patch(overwrites(2));
			manager.patch([]);

			expect(manager.cache.size).toBe(0);
		});

		it("stores each overwrite by its id as key", () => {
			const data = [
				{ id: "role-123", type: 0 as const, allow: "8", deny: "0" },
				{ id: "user-456", type: 1 as const, allow: "0", deny: "64" },
			];
			manager.patch(data);

			expect(manager.get("role-123")).toEqual(data[0]);
			expect(manager.get("user-456")).toEqual(data[1]);
		});
	});

	describe("get()", () => {
		it("returns the overwrite when it exists in cache", () => {
			const data = overwrites(1)[0]!;
			manager.patch([data]);

			const result = manager.get("id-0");

			expect(result).toEqual(data);
		});

		it("returns undefined when overwrite does not exist", () => {
			const result = manager.get("nonexistent");

			expect(result).toBeUndefined();
		});

		it("returns undefined from empty cache", () => {
			const result = manager.get("any-id");

			expect(result).toBeUndefined();
		});
	});

	describe("has()", () => {
		it("returns true when overwrite exists in cache", () => {
			manager.patch(overwrites(1));

			expect(manager.has("id-0")).toBe(true);
		});

		it("returns false when overwrite does not exist in cache", () => {
			manager.patch(overwrites(1));

			expect(manager.has("id-1")).toBe(false);
		});

		it("returns false from empty cache", () => {
			expect(manager.has("any-id")).toBe(false);
		});
	});

	describe("upsert()", () => {
		it("sends PUT request with correct route and permission payload", async () => {
			const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);
			const overwrite: DiscordOverwrite = {
				id: "role-123",
				type: 0,
				allow: "8",
				deny: "64",
			};

			await manager.upsert(overwrite);

			expect(spy).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledWith(
				`/channels/${channel.id}/permissions/role-123`,
				{
					allow: "8",
					deny: "64",
					type: 0,
				}
			);
		});

		it("sends PUT to correct Discord API endpoint with channel and overwrite IDs", async () => {
			const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);
			const overwrite: DiscordOverwrite = {
				id: "user-456",
				type: 1,
				allow: "0",
				deny: "0",
			};

			await manager.upsert(overwrite);

			const [route] = spy.mock.calls[0]!;
			expect(route).toContain(`/channels/${channel.id}/permissions/user-456`);
		});

		it("includes allow and deny permission bits in request body", async () => {
			const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

			await manager.upsert({
				id: "id-1",
				type: 0,
				allow: "1234567890",
				deny: "9876543210",
			});

			const [, body] = spy.mock.calls[0]! as [string, Record<string, unknown>];
			expect(body.allow).toBe("1234567890");
			expect(body.deny).toBe("9876543210");
		});

		it("includes type field in request body", async () => {
			const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

			await manager.upsert({
				id: "id-1",
				type: 0,
				allow: "0",
				deny: "0",
			});

			const [, body] = spy.mock.calls[0]! as [string, { type: number }];
			expect(body.type).toBe(0);
		});

		it("sends type 1 for member overwrites", async () => {
			const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

			await manager.upsert({
				id: "user-id",
				type: 1,
				allow: "0",
				deny: "0",
			});

			const [, body] = spy.mock.calls[0]! as [string, { type: number }];
			expect(body.type).toBe(1);
		});

		it("works for multiple sequential upserts with different IDs", async () => {
			const spy = vi.spyOn(client.rest, "put").mockResolvedValue(undefined);

			await manager.upsert({ id: "id-1", type: 0, allow: "0", deny: "0" });
			await manager.upsert({ id: "id-2", type: 1, allow: "0", deny: "0" });

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.calls[0]![0]).toContain("/id-1");
			expect(spy.mock.calls[1]![0]).toContain("/id-2");
		});

		it("rejects when REST call fails", async () => {
			vi.spyOn(client.rest, "put").mockRejectedValue(new Error("API Error"));

			await expect(
				manager.upsert({ id: "id-1", type: 0, allow: "0", deny: "0" })
			).rejects.toThrow("API Error");
		});
	});

	describe("delete()", () => {
		it("sends DELETE request to correct endpoint with channel and overwrite IDs", async () => {
			const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

			await manager.delete("role-123");

			expect(spy).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledWith(`/channels/${channel.id}/permissions/role-123`);
		});

		it("sends DELETE for different overwrite IDs to correct routes", async () => {
			const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

			await manager.delete("user-456");

			const [route] = spy.mock.calls[0]!;
			expect(route).toBe(`/channels/${channel.id}/permissions/user-456`);
		});

		it("works for multiple sequential deletes", async () => {
			const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

			await manager.delete("id-1");
			await manager.delete("id-2");

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.calls[0]![0]).toContain("/id-1");
			expect(spy.mock.calls[1]![0]).toContain("/id-2");
		});

		it("rejects when REST call fails", async () => {
			vi.spyOn(client.rest, "delete").mockRejectedValue(new Error("API Error"));

			await expect(manager.delete("id-1")).rejects.toThrow("API Error");
		});
	});

	describe("iteration and size", () => {
		it("size getter returns correct cache size", () => {
			manager.patch(overwrites(3));

			expect(manager.cache.size).toBe(3);
		});

		it("size getter returns 0 for empty cache", () => {
			expect(manager.cache.size).toBe(0);
		});

		it("iterable via for...of loop using Symbol.iterator", () => {
			const data = overwrites(2);
			manager.patch(data);

			const values: DiscordOverwrite[] = [];
			for (const value of manager.cache.values()) {
				values.push(value);
			}

			expect(values).toHaveLength(2);
			expect(values).toContain(data[0]);
			expect(values).toContain(data[1]);
		});

		it("keys() returns iterator over all overwrite IDs", () => {
			manager.patch(overwrites(3));

			const ids = Array.from(manager.cache.keys());

			expect(ids).toHaveLength(3);
			expect(ids).toContain("id-0");
			expect(ids).toContain("id-1");
			expect(ids).toContain("id-2");
		});

		it("values() returns iterator over all overwrites", () => {
			const data = overwrites(2);
			manager.patch(data);

			const vals = Array.from(manager.cache.values());

			expect(vals).toHaveLength(2);
			expect(vals).toContain(data[0]);
			expect(vals).toContain(data[1]);
		});
	});
});