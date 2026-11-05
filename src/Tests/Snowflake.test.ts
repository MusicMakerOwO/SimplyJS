import { describe, expect, it } from "vitest";
import { SnowflakeTimestamp } from "../Utils.js";
import { Client } from "../Client.js";
import { User } from "../Structures/User.js";
import { Guild } from "../Structures/Guild.js";
import { Role } from "../Structures/Role.js";

// Discord's documented example: 175928847299117063 was created 2016-04-30 11:18:25.796 UTC
const EXAMPLE_ID = "175928847299117063";
const EXAMPLE_TIMESTAMP = 1462015105796;

describe("SnowflakeTimestamp", () => {
	it("reads the creation time from a string or bigint id", () => {
		expect(SnowflakeTimestamp(EXAMPLE_ID)).toBe(EXAMPLE_TIMESTAMP);
		expect(SnowflakeTimestamp(BigInt(EXAMPLE_ID))).toBe(EXAMPLE_TIMESTAMP);
	});

	it("counts from Discord's epoch", () => {
		expect(SnowflakeTimestamp("0")).toBe(Date.UTC(2015, 0, 1));
	});
});

describe("createdAt", () => {
	it("derives a structure's creation time from its id", () => {
		const client = new Client({ token: "token", intents: 0 });
		const user = new User(client, { id: EXAMPLE_ID, username: "u", discriminator: "0", global_name: null, avatar: null });

		expect(user.createdTimestamp).toBe(EXAMPLE_TIMESTAMP);
		expect(user.createdAt).toEqual(new Date(EXAMPLE_TIMESTAMP));
	});

	it("is shared by guild-scoped structures and survives clone()", () => {
		const client = new Client({ token: "token", intents: 0 });
		const guild = new Guild(client, {
			id: "1", name: "g", owner_id: "1", afk_timeout: 60, verification_level: 0,
			default_message_notifications: 0, explicit_content_filter: 0, roles: [], emojis: [], features: [],
			mfa_level: 0, system_channel_flags: 0, premium_tier: 0, preferred_locale: "en-US", nsfw_level: 0,
			premium_progress_bar_enabled: false
		} as never);
		const role = new Role(client, { id: EXAMPLE_ID, name: "r", color: 0, colors: { primary_color: 0, secondary_color: null, tertiary_color: null }, hoist: false, position: 1, permissions: "0", managed: false, mentionable: false, flags: 0 } as never, guild);

		expect(role.createdTimestamp).toBe(EXAMPLE_TIMESTAMP);
		expect(role.clone().createdAt).toEqual(new Date(EXAMPLE_TIMESTAMP));
	});
});
