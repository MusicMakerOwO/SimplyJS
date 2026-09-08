import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { User } from "../Structures/User.js";
import { Guild } from "../Structures/Guild.js";
import { Member } from "../Structures/Member.js";
import { Sticker } from "../Structures/Sticker.js";
import { CreateChannel } from "../Factory/CreateChannel.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordEmoji,
	DiscordGuild,
	DiscordMember,
	DiscordRole,
	DiscordSticker,
	DiscordStickerFormatTypes,
	DiscordStickerTypes,
	DiscordUser,
} from "../Types/DiscordAPITypes.js";

function makeClient(): Client {
	return new Client({ token: "test-token", intents: GatewayIntents.Guilds });
}

function userData(): DiscordUser {
	return {
		id: "user-1",
		username: "musicmaker",
		discriminator: "0",
		global_name: "Music Maker",
		avatar: "a_hash",
		bot: false,
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
		features: [ "COMMUNITY" ],
		mfa_level: 0,
		system_channel_flags: 0,
		premium_tier: 0,
		preferred_locale: "en-US",
		nsfw_level: 0,
		premium_progress_bar_enabled: false,
	};
}

function memberData(): DiscordMember {
	return {
		user: userData(),
		roles: [ "role-1" ],
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: true,
		mute: true,
		flags: 4,
		nick: "nickname",
	};
}

describe("User.patch", () => {
	let client: Client;
	let user: User;

	beforeEach(() => {
		client = makeClient();
		user = new User(client, userData());
	});

	it("keeps identity fields when a partial payload omits them", () => {
		// the shape PRESENCE_UPDATE sends
		user.patch({ id: "user-1" } as DiscordUser);

		expect(user.id).toBe("user-1");
		expect(user.username).toBe("musicmaker");
		expect(user.discriminator).toBe("0");
		expect(user.globalName).toBe("Music Maker");
		expect(user.avatar).toBe("a_hash");
	});

	it("still applies identity fields when they are present", () => {
		user.patch({ ...userData(), username: "renamed", global_name: null, avatar: null });

		expect(user.username).toBe("renamed");
		expect(user.globalName).toBeNull();
		expect(user.avatar).toBeNull();
	});

	it("upserting a partial payload does not blank an already-cached user", () => {
		client.users.upsert(userData());
		client.users.upsert({ id: "user-1" } as DiscordUser);

		expect(client.users.get("user-1")!.username).toBe("musicmaker");
	});
});

describe("Member.patch", () => {
	let client: Client;
	let guild: Guild;
	let member: Member;

	beforeEach(() => {
		client = makeClient();
		guild = new Guild(client, guildData());
		member = guild.members.upsert(memberData());
	});

	it("keeps required fields when a partial payload omits them", () => {
		// the shape an interaction's `resolved.members` carries - no user, deaf or mute
		member.patch({ user: userData(), nick: "renamed" } as DiscordMember);

		expect(member.nick).toBe("renamed");
		expect(member.deaf).toBe(true);
		expect(member.mute).toBe(true);
		expect(member.flags).toBe(4);
		expect(member.roles).toEqual([ "role-1" ]);
		expect(member.joinedAt).toBe("2024-01-01T00:00:00.000Z");
	});

	it("does not throw when the payload carries no user, and keeps the cached one", () => {
		expect(() => member.patch({ nick: "renamed" } as DiscordMember)).not.toThrow();

		expect(member.user).toBeInstanceOf(User);
		expect(member.user.username).toBe("musicmaker");
	});
});

describe("Guild.patch", () => {
	it("keeps required fields when a partial payload omits them", () => {
		const client = makeClient();
		const guild = new Guild(client, guildData());

		// the shape an invite's `guild` carries
		guild.patch({ id: "guild-1", name: "Renamed" } as unknown as DiscordGuild);

		expect(guild.name).toBe("Renamed");
		expect(guild.features).toEqual([ "COMMUNITY" ]);
		expect(guild.ownerId).toBe("owner-1");
		expect(guild.preferredLocale).toBe("en-US");
		expect(guild.premiumProgressBarEnabled).toBe(false);
	});

	it("does not throw on a partial payload with no roles array, and keeps the cached roles", () => {
		const client = makeClient();
		const guild = new Guild(client, guildData());

		expect(() => guild.patch({ id: "guild-1" } as unknown as DiscordGuild)).not.toThrow();

		expect(guild.roles.has("role-1")).toBe(true);
	});
});

describe("BaseChannel.patch", () => {
	it("keeps id and type when a partial payload omits them", () => {
		const client = makeClient();
		const guild = new Guild(client, guildData());
		const channel = CreateChannel(client, guild, {
			id: "channel-1",
			type: DiscordChannelTypes.GUILD_TEXT,
			name: "general",
			position: 0,
			permission_overwrites: [],
		}) as GuildTextChannel;

		channel.patch({ name: "renamed" } as DiscordChannel);

		expect(channel.id).toBe("channel-1");
		expect(channel.type).toBe(DiscordChannelTypes.GUILD_TEXT);
		expect(channel.name).toBe("renamed");
	});
});

describe("Emoji.patch", () => {
	it("keeps required fields when a partial payload omits them", () => {
		const client = makeClient();
		const guild = new Guild(client, guildData());
		const emoji = guild.emojis.upsert({ id: "emoji-1", name: "airhorn", animated: false, available: true } as DiscordEmoji);

		// the shape a reaction's `emoji` carries
		emoji.patch({ id: "emoji-1", name: "airhorn" } as DiscordEmoji);

		expect(emoji.available).toBe(true);
		expect(emoji.animated).toBe(false);
	});
});

describe("Sticker.patch", () => {
	it("keeps required fields when a partial payload omits them", () => {
		const client = makeClient();
		const guild = new Guild(client, guildData());
		const sticker = new Sticker(client, guild, {
			id: "sticker-1",
			name: "wave",
			tags: "wave,hello",
			type: DiscordStickerTypes.GUILD,
			format_type: DiscordStickerFormatTypes.PNG,
		} as DiscordSticker);

		// the shape a message's `sticker_items` carry
		sticker.patch({ id: "sticker-1", name: "wave", format_type: DiscordStickerFormatTypes.PNG } as DiscordSticker);

		expect(sticker.tags).toBe("wave,hello");
		expect(sticker.type).toBe(DiscordStickerTypes.GUILD);
	});
});
