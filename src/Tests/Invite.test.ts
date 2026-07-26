import { describe, expect, it } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents, GatewayInvite } from "../Types/DiscordGateway.js";
import { Invite } from "../Structures/Invite.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordInvite,
	DiscordInviteTypes,
	DiscordRole,
	DiscordUser
} from "../Types/DiscordAPITypes.js";

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
	return { id, type: DiscordChannelTypes.GUILD_TEXT, guild_id: "guild-1", name: "general" };
}

/** The fat shape, as returned by `GET /invites/<code>` */
function apiInvite(): DiscordInvite {
	return {
		type: DiscordInviteTypes.GUILD,
		code: "abc123",
		guild: guildData(),
		channel: channelData(),
		inviter: userData(),
		expires_at: "2024-06-01T00:00:00.000Z",
		approximate_member_count: 42,
		roles: [ roleData() ],
	};
}

/** The thin shape, as sent by the `INVITE_CREATE` gateway event */
function gatewayInvite(): GatewayInvite {
	return {
		channel_id: "channel-1",
		code: "abc123",
		created_at: "2024-01-01T00:00:00.000Z",
		guild_id: "guild-1",
		inviter: userData(),
		max_age: 3600,
		max_uses: 5,
		temporary: false,
		uses: 0,
		role_ids: [ "role-1" ],
	};
}

describe("Invite normalization", () => {
	it("reduces the API shape to ids", () => {
		const invite = new Invite(makeClient(), apiInvite());

		expect(invite.code).toBe("abc123");
		expect(invite.guild_id).toBe("guild-1");
		expect(invite.channel_id).toBe("channel-1");
		expect(invite.role_ids).toEqual([ "role-1" ]);
		expect(invite.type).toBe(DiscordInviteTypes.GUILD);
		expect(invite.expires_at).toBe("2024-06-01T00:00:00.000Z");
		expect(invite.approximate_member_count).toBe(42);
	});

	it("reads the gateway shape's ids straight through", () => {
		const invite = new Invite(makeClient(), gatewayInvite());

		expect(invite.code).toBe("abc123");
		expect(invite.guild_id).toBe("guild-1");
		expect(invite.channel_id).toBe("channel-1");
		expect(invite.role_ids).toEqual([ "role-1" ]);
	});

	it("produces the same identifying fields from both shapes", () => {
		const client = makeClient();
		const fromApi = new Invite(client, apiInvite());
		const fromGateway = new Invite(client, gatewayInvite());

		expect(fromGateway.code).toBe(fromApi.code);
		expect(fromGateway.guild_id).toBe(fromApi.guild_id);
		expect(fromGateway.channel_id).toBe(fromApi.channel_id);
		expect(fromGateway.role_ids).toEqual(fromApi.role_ids);
		expect(fromGateway.type).toBe(fromApi.type);
	});

	it("infers a guild invite when Discord omits the type", () => {
		const invite = new Invite(makeClient(), gatewayInvite());
		expect(invite.type).toBe(DiscordInviteTypes.GUILD);
	});

	it("keeps invite metadata when present and leaves it undefined otherwise", () => {
		const client = makeClient();
		const withMetadata = new Invite(client, gatewayInvite());
		const withoutMetadata = new Invite(client, apiInvite());

		expect(withMetadata.has_metadata).toBe(true);
		expect(withMetadata.uses).toBe(0);
		expect(withMetadata.max_uses).toBe(5);
		expect(withMetadata.max_age).toBe(3600);
		expect(withMetadata.temporary).toBe(false);
		expect(withMetadata.created_at).toBe("2024-01-01T00:00:00.000Z");

		expect(withoutMetadata.has_metadata).toBe(false);
		expect(withoutMetadata.uses).toBeUndefined();
	});

	it("normalizes a missing gateway expires_at to null", () => {
		const data = gatewayInvite();
		delete data.expires_at;
		expect(new Invite(makeClient(), data).expires_at).toBeNull();
	});

	it("retains the API's partial objects for uncached guilds", () => {
		const invite = new Invite(makeClient(), apiInvite());

		expect(invite.guild).toBeNull();
		expect(invite.partial_guild?.name).toBe("Test Guild");
		expect(invite.partial_channel?.name).toBe("general");
		expect(invite.partial_roles?.[0].name).toBe("Test Role");
	});

	it("upserts the inviter into the user cache", () => {
		const client = makeClient();
		const invite = new Invite(client, gatewayInvite());

		expect(invite.inviter?.id).toBe("user-1");
		expect(client.users.get("user-1")).toBe(invite.inviter);
	});
});

describe("Invite cache resolution", () => {
	it("resolves guild, channel and roles from cache for both shapes", () => {
		const client = makeClient();
		client.guilds.upsert(guildData());
		client.guilds.get("guild-1")!.channels.upsert(channelData());

		for (const data of [ apiInvite(), gatewayInvite() ]) {
			const invite = new Invite(client, data);

			expect(invite.guild?.id).toBe("guild-1");
			expect(invite.channel?.id).toBe("channel-1");
			expect(invite.roles.map(role => role.id)).toEqual([ "role-1" ]);
		}
	});

	it("skips roles that are not in cache", () => {
		const client = makeClient();
		client.guilds.upsert(guildData());

		const data = gatewayInvite();
		data.role_ids = [ "role-1", "role-missing" ];

		expect(new Invite(client, data).roles.map(role => role.id)).toEqual([ "role-1" ]);
	});

	it("returns null rather than throwing when nothing is cached", () => {
		const invite = new Invite(makeClient(), gatewayInvite());

		expect(invite.guild).toBeNull();
		expect(invite.channel).toBeNull();
		expect(invite.roles).toEqual([]);
	});
});

describe("Invite helpers", () => {
	it("stringifies to an invite URL", () => {
		expect(String(new Invite(makeClient(), gatewayInvite()))).toBe("https://discord.gg/abc123");
	});
});
