import { describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { Guild } from "../Structures/Guild.js";
import {
	DiscordAutoModerationActionExecution,
	DiscordAutoModerationActionType,
	DiscordAutoModerationRule,
	DiscordAutoModerationRuleEventType,
	DiscordAutoModerationRuleTriggerType,
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordGuildScheduledEvent,
	DiscordGuildScheduledEventEntityTypes,
	DiscordGuildScheduledEventPrivacyLevel,
	DiscordGuildScheduledEventStatus,
	DiscordMember,
	DiscordRole,
	DiscordThreadMember,
	DiscordUser
} from "../Types/DiscordAPITypes.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { ChannelCreate, ChannelDelete, ChannelPinsUpdate, ChannelUpdate } from "../Events/Channels.js";
import {
	ThreadCreate,
	ThreadDelete,
	ThreadListSync,
	ThreadMemberUpdate,
	ThreadMembersUpdate,
	ThreadUpdate
} from "../Events/Threads.js";
import { GuildCreate, GuildDelete, GuildUpdate } from "../Events/Guilds.js";
import { Member } from "../Structures/Member.js";
import { Role } from "../Structures/Role.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { MemberCreate, MemberDelete, MemberUpdate, MembersChunk } from "../Events/Members.js";
import { MessageCreate, MessageDelete, MessageUpdate } from "../Events/Messages.js";
import { Ready } from "../Events/Ready.js";
import { Resumed } from "../Events/Resumed.js";
import { UserUpdate } from "../Events/Users.js";
import { User } from "../Structures/User.js";
import { RoleCreate, RoleDelete, RoleUpdate } from "../Events/Roles.js";
import { GuildBanAdd, GuildBanRemove } from "../Events/Bans.js";
import { AuditLogEntryCreate } from "../Events/AuditLogs.js";
import { DiscordAuditLogEvent } from "../Types/DiscordAPITypes.js";
import { AutoModerationActionExecutionPayload, ClientEvents } from "../Types/SimplyJSTypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";
import { Message } from "../Structures/Message.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import { ThreadMember } from "../Structures/ThreadMember.js";
import {
	AutoModerationActionExecution,
	AutoModerationRuleCreate,
	AutoModerationRuleDelete,
	AutoModerationRuleUpdate
} from "../Events/AutoModeration.js";
import { AutoModerationRule } from "../Structures/AutoModerationRule.js";
import { ReactionRemoveAll, ReactionRemoveEmoji } from "../Events/Reactions.js";
import { WebhooksUpdate } from "../Events/Webhooks.js";
import { MessagePollVoteAdd, MessagePollVoteRemove } from "../Events/Polls.js";
import { PresenceUpdate } from "../Events/Presence.js";
import { Presence } from "../Structures/Presence.js";
import { ActivityType, DiscordActivity, DiscordPresence, Status } from "../Types/DiscordAPITypes.js";
import {
	GuildScheduledEventCreate,
	GuildScheduledEventDelete,
	GuildScheduledEventUpdate,
	GuildScheduledEventUserAdd,
	GuildScheduledEventUserRemove
} from "../Events/GuildScheduledEvents.js";
import { GuildScheduledEvent } from "../Structures/GuildScheduledEvent.js";
import {
	GuildIntegrationsUpdate,
	IntegrationCreate,
	IntegrationDelete,
	IntegrationUpdate
} from "../Events/Integrations.js";
import { Integration } from "../Structures/Integration.js";
import { SoundboardSound } from "../Structures/SoundboardSound.js";
import {
	SoundboardSoundCreate,
	SoundboardSoundDelete,
	SoundboardSoundUpdate,
	SoundboardSoundsUpdate
} from "../Events/SoundboardSounds.js";
import { DiscordGuildSoundboardSoundCreate } from "../Types/DiscordAPITypes.js";
import { DiscordIntegrationCreate, DiscordIntegrationExpireBehaviors } from "../Types/DiscordAPITypes.js";
import { StickersUpdate } from "../Events/Stickers.js";
import { InviteCreate, InviteDelete } from "../Events/Invites.js";
import { MessageDeleteBulk } from "../Events/Messages.js";
import { TypingStart } from "../Events/Typing.js";
import { Invite } from "../Structures/Invite.js";
import { DiscordSticker, DiscordStickerFormatTypes, DiscordStickerTypes } from "../Types/DiscordAPITypes.js";
import { GatewayInvite } from "../Types/DiscordGateway.js";

/**
 * Pulls the payload of the first `emit` call for a given event off a spy, so a test can assert
 * against the exact object a listener would have received.
 */
function emitted(emitSpy: { mock: { calls: unknown[][] } }, event: string): unknown[] {
	const call = emitSpy.mock.calls.find(([emittedEvent]) => emittedEvent === event);
	expect(call, `expected ${event} to have been emitted`).toBeDefined();
	return call!.slice(1);
}

function createUser(id = "user-1"): DiscordUser {
	return {
		id,
		username: "tester",
		discriminator: "0001",
		global_name: "tester",
		avatar: null
	};
}

function createRole(id = "role-1"): DiscordRole {
	return {
		id,
		name: "Role",
		color: 0,
		colors: {
			primary_color: 0,
			secondary_color: null,
			tertiary_color: null
		},
		hoist: false,
		position: 1,
		permissions: "0",
		managed: false,
		mentionable: false,
		flags: 0
	};
}

function createGuild(id = "guild-1"): DiscordGuild {
	return {
		id,
		name: "Guild",
		owner_id: "owner-1",
		afk_timeout: 60,
		verification_level: 0,
		default_message_notifications: 0,
		explicit_content_filter: 0,
		roles: [createRole()],
		emojis: [],
		features: [],
		mfa_level: 0,
		system_channel_flags: 0,
		premium_tier: 0,
		preferred_locale: "en-US",
		nsfw_level: 0,
		premium_progress_bar_enabled: false
	};
}

function createScheduledEvent(id = "scheduled-event-1", guildId = "guild-1"): DiscordGuildScheduledEvent {
	return {
		id,
		guild_id: guildId,
		channel_id: "channel-1",
		creator_id: "user-1",
		name: "Game night",
		description: "Bring snacks",
		scheduled_start_time: "2024-01-01T00:00:00.000Z",
		scheduled_end_time: null,
		privacy_level: DiscordGuildScheduledEventPrivacyLevel.GUILD_ONLY,
		status: DiscordGuildScheduledEventStatus.SCHEDULED,
		entity_type: DiscordGuildScheduledEventEntityTypes.VOICE,
		entity_id: null,
		entity_metadata: null,
		recurrence_rule: null
	};
}

function createIntegration(id = "integration-1", guildId = "guild-1"): DiscordIntegrationCreate {
	return {
		id,
		guild_id: guildId,
		name: "Cool Streamer",
		type: "twitch",
		enabled: true,
		account: { id: "twitch-1", name: "coolstreamer" },
		syncing: false,
		role_id: "role-1",
		enable_emoticons: true,
		expire_behavior: DiscordIntegrationExpireBehaviors.REMOVE_ROLE,
		expire_grace_period: 7,
		user: createUser(),
		synced_at: "2024-01-01T00:00:00.000Z",
		subscriber_count: 3,
		revoked: false
	};
}

function createSoundboardSound(id = "sound-1", guildId = "guild-1"): DiscordGuildSoundboardSoundCreate {
	return {
		sound_id: id,
		guild_id: guildId,
		name: "Airhorn",
		volume: 0.75,
		emoji_id: "emoji-1",
		emoji_name: null,
		available: true
	};
}

function createChannel(id = "channel-1", guildId = "guild-1"): DiscordChannel {
	return {
		id,
		type: DiscordChannelTypes.GUILD_TEXT,
		guild_id: guildId,
		name: "general",
		permission_overwrites: []
	};
}

function createMember(id = "member-1"): DiscordMember & { guild_id: string } {
	return {
		guild_id: "guild-1",
		user: createUser(id),
		roles: ["role-1"],
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: false,
		mute: false,
		flags: 0
	};
}

function createMessage(id = "message-1", content = "hello"): DiscordMessage & { guild_id: string | null } {
	return {
		id,
		channel_id: "channel-1",
		guild_id: "guild-1",
		author: createUser("author-1"),
		content,
		timestamp: "2024-01-01T00:00:00.000Z",
		edited_timestamp: null,
		tts: false,
		mention_everyone: false,
		mentions: [createUser("mentioned-1")],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: MessageTypes.DEFAULT
	};
}

function createReadyPayload(user: DiscordUser, guildIds: string[] = []): {
	v: number,
	user_settings: Record<string, never>,
	user: DiscordUser,
	session_type: "normal",
	session_id: string,
	resume_gateway_url: string,
	presences: [],
	guilds: { id: string, unavailable: true }[],
	geo_ordered_rtc_regions: [],
	auth: Record<string, never>,
	application: {
		id: string,
		flags_new: string,
		flags: number
	}
} {
	return {
		v: 10,
		user_settings: {},
		user,
		session_type: "normal",
		session_id: "session-1",
		resume_gateway_url: "wss://gateway.discord.gg",
		presences: [],
		guilds: guildIds.map(id => ({ id, unavailable: true })),
		geo_ordered_rtc_regions: [],
		auth: {},
		application: {
			id: "app-1",
			flags_new: "0",
			flags: 0
		}
	};
}

describe("Gateway event handlers mutate caches", () => {
	it("GuildCreate upserts a guild and emits the public event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);

		expect(client.guilds.has(guildPayload.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildCreate, expect.objectContaining({ id: guildPayload.id }));
	});

	it("GuildDelete removes the guild from cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);
		await GuildDelete.handler(client, guildPayload);

		expect(client.guilds.has(guildPayload.id)).toBe(false);
	});

	it("ChannelCreate stores the channel under the target guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const channelPayload = createChannel();

		await GuildCreate.handler(client, guildPayload);
		await ChannelCreate.handler(client, channelPayload);

		expect(client.guilds.get(guildPayload.id)?.channels.has(channelPayload.id)).toBe(true);
	});

	it("ChannelDelete removes channels from the guild channel cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const channelPayload = createChannel();

		await GuildCreate.handler(client, guildPayload);
		await ChannelCreate.handler(client, channelPayload);
		await ChannelDelete.handler(client, channelPayload);

		expect(client.guilds.get(guildPayload.id)?.channels.has(channelPayload.id)).toBe(false);
	});

	it("ChannelUpdate upserts and emits the client update event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const channelPayload = createChannel();

		await GuildCreate.handler(client, guildPayload);
		await ChannelUpdate.handler(client, channelPayload);

		expect(client.guilds.get(guildPayload.id)?.channels.get(channelPayload.id)?.name).toBe("general");
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ChannelUpdate, undefined, expect.objectContaining({ id: channelPayload.id }));
	});

	it("RoleCreate stores the role under the target guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const rolePayload = createRole("role-2");

		await GuildCreate.handler(client, guildPayload);
		await RoleCreate.handler(client, { guild_id: guildPayload.id, role: rolePayload });

		expect(client.guilds.get(guildPayload.id)?.roles.has(rolePayload.id)).toBe(true);
	});

	it("RoleDelete removes roles from the guild role cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const guildPayload = createGuild();
		const rolePayload = createRole("role-3");

		await GuildCreate.handler(client, guildPayload);
		await RoleCreate.handler(client, { guild_id: guildPayload.id, role: rolePayload });
		await RoleDelete.handler(client, { guild_id: guildPayload.id, role_id: rolePayload.id });

		expect(client.guilds.get(guildPayload.id)?.roles.has(rolePayload.id)).toBe(false);
	});

	it("RoleUpdate emits the client update event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const rolePayload = createRole("role-update");

		await GuildCreate.handler(client, guildPayload);
		await RoleUpdate.handler(client, { guild_id: guildPayload.id, role: rolePayload });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.RoleUpdate, undefined, expect.objectContaining({ id: rolePayload.id }));
	});

	it("MemberCreate adds member to cache and emits MemberCreate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const member = createMember();

		await GuildCreate.handler(client, guildPayload);
		await MemberCreate.handler(client, member);
		expect(client.guilds.get(guildPayload.id)?.members.has(member.user.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MemberCreate, expect.objectContaining({ user: expect.objectContaining({ id: member.user.id }) }));
	});

	it("MemberUpdate updates member in cache and emits MemberUpdate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const member = createMember();

		await GuildCreate.handler(client, guildPayload);
		await MemberCreate.handler(client, member);

		const updatedMember = { ...member, nick: "updated-nick" };
		await MemberUpdate.handler(client, updatedMember);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MemberUpdate, expect.anything(), expect.objectContaining({ nick: "updated-nick" }));
	});

	it("MemberDelete removes member from cache and emits MemberDelete event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const member = createMember();

		await GuildCreate.handler(client, guildPayload);
		await MemberCreate.handler(client, member);
		await MemberDelete.handler(client, { guild_id: guildPayload.id, user: member.user });
		expect(client.guilds.get(guildPayload.id)?.members.has(member.user.id)).toBe(false);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MemberDelete, expect.objectContaining({ user: expect.objectContaining({ id: member.user.id }) }));
	});

	it("MembersChunk caches every member in the chunk and emits the mapped payload", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);
		await MembersChunk.handler(client, {
			guild_id: guildPayload.id,
			members: [createMember("chunked-1"), createMember("chunked-2")],
			chunk_index: 0,
			chunk_count: 2,
			not_found: ["missing-1"],
			nonce: "test-nonce"
		});

		const guild = client.guilds.get(guildPayload.id)!;
		expect(guild.members.has("chunked-1")).toBe(true);
		expect(guild.members.has("chunked-2")).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildMembersChunk, expect.objectContaining({
			guild,
			chunkIndex: 0,
			chunkCount: 2,
			notFound: ["missing-1"],
			nonce: "test-nonce",
			members: expect.arrayContaining([expect.objectContaining({ id: "chunked-1" })])
		}));
	});

	it("MembersChunk caches online presences and drops offline ones", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers | GatewayIntents.GuildPresences
		});
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);
		await MembersChunk.handler(client, {
			guild_id: guildPayload.id,
			members: [createMember("online-1"), createMember("offline-1")],
			chunk_index: 0,
			chunk_count: 1,
			presences: [
				{ user: { id: "online-1" }, status: Status.ONLINE, activities: [], client_status: {} },
				{ user: { id: "offline-1" }, status: Status.OFFLINE, activities: [], client_status: {} }
			]
		});

		const guild = client.guilds.get(guildPayload.id)!;
		expect(guild.presences.has("online-1")).toBe(true);
		expect(guild.presences.has("offline-1")).toBe(false);
	});

	it("MembersChunk ignores chunks for an uncached guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		const emitSpy = vi.spyOn(client, "emit");

		await MembersChunk.handler(client, {
			guild_id: "unknown-guild",
			members: [createMember("chunked-1")],
			chunk_index: 0,
			chunk_count: 1
		});

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("MessageCreate adds message author and mentions to user cache and emits MessageCreate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createMessage();

		await MessageCreate.handler(client, payload);

		expect(client.users.has(payload.author.id)).toBe(true);
		expect(client.users.has("mentioned-1")).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageCreate, expect.any(Message));
	});

	it("MessageUpdate updates message content and emits MessageUpdate event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createMessage();

		await MessageCreate.handler(client, payload);
		await MessageUpdate.handler(client, { ...payload, content: "updated" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageUpdate, expect.objectContaining({ content: "updated" }));
	});

	it("MessageDelete emits MessageDelete event and removes message from cache if present", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createMessage();

		await MessageCreate.handler(client, payload);
		const deletePayload = { id: payload.id, channel_id: payload.channel_id, guild_id: payload.guild_id };
		await MessageDelete.handler(client, deletePayload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageDelete, {
			id: deletePayload.id,
			channelId: deletePayload.channel_id,
			guildId: deletePayload.guild_id
		});
	});

	it("Ready stores client.user and emits READY", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		await Ready.handler(client, createReadyPayload(user));

		expect(client.user?.id).toBe(user.id);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.Ready, expect.objectContaining({ id: user.id }));
	});

	it("Ready waits for all expected guilds before emitting", async () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		await Ready.handler(client, createReadyPayload(user, ["guild-1", "guild-2"]));

		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await GuildCreate.handler(client, createGuild("guild-1"));
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await GuildCreate.handler(client, createGuild("guild-2"));
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(15_000);
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(1);
		vi.useRealTimers();
	});

	it("Ready emits after timeout when guilds do not arrive", async () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		await Ready.handler(client, createReadyPayload(user, ["guild-missing"]));
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(14_999);
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(1);
		expect(emitSpy.mock.calls.filter(([event]) => event === ClientEvents.Ready)).toHaveLength(1);
		vi.useRealTimers();
	});

	it("ReactionAdd and ReactionRemove emit correct client events and update caches", async () => {
		const { Client } = await import("../Client.js");
		const { ReactionAdd, ReactionRemove } = await import("../Events/Reactions.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const { GatewayIntents } = await import("../Types/DiscordGateway.js");
		const vi = (await import("vitest")).vi;

		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMessageReactions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild and a user in cache
		const guildPayload: DiscordGuild = {
			id: "guild-1",
			name: "Guild",
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
			premium_progress_bar_enabled: false
		};
		await GuildCreate.handler(client, guildPayload);

		// ReactionAdd
		const reactionAddPayload = {
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji: { id: "emoji-1", name: "smile", animated: false },
			burst: false,
			type: 0
		};
		await ReactionAdd.handler(client, reactionAddPayload);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ReactionAdd,
			expect.objectContaining({
				guild: expect.objectContaining({ id: "guild-1" }),
				channel: expect.objectContaining({ id: "channel-1" }),
				user: expect.objectContaining({ id: "user-1" }),
				messageId: "message-1",
				emoji: expect.objectContaining({ id: "emoji-1" })
			})
		);

		// ReactionRemove
		const reactionRemovePayload = {
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji: { id: "emoji-1", name: "smile", animated: false }
		};
		await ReactionRemove.handler(client, reactionRemovePayload);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ReactionRemove,
			expect.objectContaining({
				guild: expect.objectContaining({ id: "guild-1" }),
				channel: expect.objectContaining({ id: "channel-1" }),
				user: expect.objectContaining({ id: "user-1" }),
				messageId: "message-1",
				emoji: expect.objectContaining({ id: "emoji-1" })
			})
		);
	});

	it("GuildUpdate emits the client update event and updates cache", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);

		const updatedGuildPayload = { ...guildPayload, name: "Updated Guild" };
		await (await import("../Events/Guilds.js")).GuildUpdate.handler(client, updatedGuildPayload);

		const updatedGuild = client.guilds.get(guildPayload.id);
		expect(updatedGuild?.name).toBe("Updated Guild");
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildUpdate,
			expect.objectContaining({ id: guildPayload.id }),
			expect.objectContaining({ id: guildPayload.id, name: "Updated Guild" })
		);
	});

	it("EmojiCreate adds new emoji to cache and emits EmojiCreate event", async () => {
		const { EmojisUpdate } = await import("../Events/Emojis.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);

		// EmojiCreate
		const emoji1 = { id: "emoji-1", name: "smile", animated: false, available: true };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1] });
		const emojiCreateCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.EmojiCreate);
		expect(emojiCreateCall).toBeDefined();
		expect(emojiCreateCall?.[1].id).toBe(guildPayload.id);
		expect(emojiCreateCall?.[2].id).toBe("emoji-1");
		expect(client.guilds.get(guildPayload.id)?.emojis.has("emoji-1")).toBe(true);
	});

	it("EmojiUpdate filters cached emojis and only emits changed data", async () => {
		const { EmojisUpdate } = await import("../Events/Emojis.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild and initial emoji
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		const emoji1 = { id: "emoji-1", name: "smile", animated: false, available: true };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1] });

		// EmojiUpdate
		const emoji1Updated = { ...emoji1, name: "grin" };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1Updated] });
		const emojiUpdateCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.EmojiUpdate);
		expect(emojiUpdateCall).toBeDefined();
		expect(emojiUpdateCall?.[1].id).toBe(guildPayload.id);
		expect(emojiUpdateCall?.[2].id).toBe("emoji-1");
		expect(emojiUpdateCall?.[3].id).toBe("emoji-1");
		// Only check the new name, as the old object is mutated in cache
		expect(emojiUpdateCall?.[3].name).toBe("grin");
		expect(client.guilds.get(guildPayload.id)?.emojis.get("emoji-1")?.name).toBe("grin");
	});

	it("EmojiDelete removes emoji from cache and emits EmojiDelete event", async () => {
		const { EmojisUpdate } = await import("../Events/Emojis.js");
		const { GuildCreate } = await import("../Events/Guilds.js");
		const { ClientEvents } = await import("../Types/SimplyJSTypes.js");
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const emitSpy = vi.spyOn(client, "emit");

		// Setup: create a guild and initial emoji
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		const emoji1 = { id: "emoji-1", name: "smile", animated: false, available: true };
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [emoji1] });

		// EmojiDelete
		await EmojisUpdate.handler(client, { guild_id: guildPayload.id, emojis: [] });
		const emojiDeleteCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.EmojiDelete);
		expect(emojiDeleteCall).toBeDefined();
		expect(emojiDeleteCall?.[1].id).toBe(guildPayload.id);
		expect(emojiDeleteCall?.[2].id).toBe("emoji-1");
		expect(client.guilds.get(guildPayload.id)?.emojis.has("emoji-1")).toBe(false);
	});

	it("GuildBanAdd upserts user to cache and emits GuildBanAdd event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const bannedUser = createUser("banned-user-1");

		await GuildCreate.handler(client, guildPayload);
		await GuildBanAdd.handler(client, { guild_id: guildPayload.id, user: bannedUser });

		expect(client.users.has(bannedUser.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildBanAdd,
			expect.objectContaining({ id: guildPayload.id }),
			expect.objectContaining({ id: bannedUser.id })
		);
	});

	it("AuditLogEntryCreate emits the entry without the guild_id field", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();

		await GuildCreate.handler(client, guildPayload);
		await AuditLogEntryCreate.handler(client, {
			guild_id: guildPayload.id,
			id: "entry-1",
			target_id: "user-1",
			user_id: "mod-1",
			action_type: DiscordAuditLogEvent.MEMBER_KICK,
			reason: "spam"
		});

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.AuditLogEntryCreate);
		expect(call?.[1].id).toBe(guildPayload.id);
		expect(call?.[2]).toEqual({
			id: "entry-1",
			target_id: "user-1",
			user_id: "mod-1",
			action_type: DiscordAuditLogEvent.MEMBER_KICK,
			reason: "spam"
		});
	});

	it("AuditLogEntryCreate ignores entries for uncached guilds", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");

		await AuditLogEntryCreate.handler(client, {
			guild_id: "unknown-guild",
			id: "entry-1",
			target_id: null,
			user_id: null,
			action_type: DiscordAuditLogEvent.MEMBER_KICK
		});

		expect(emitSpy.mock.calls.find(([event]) => event === ClientEvents.AuditLogEntryCreate)).toBeUndefined();
	});

	it("GuildBanRemove upserts user to cache and emits GuildBanRemove event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildModeration });
		const emitSpy = vi.spyOn(client, "emit");
		const guildPayload = createGuild();
		const unbannedUser = createUser("unbanned-user-1");

		await GuildCreate.handler(client, guildPayload);
		await GuildBanRemove.handler(client, { guild_id: guildPayload.id, user: unbannedUser });

		expect(client.users.has(unbannedUser.id)).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildBanRemove,
			expect.objectContaining({ id: guildPayload.id }),
			expect.objectContaining({ id: unbannedUser.id })
		);
	});
});
describe("Thread gateway event handlers", () => {
	function createThread(id = "thread-1", guildId = "guild-1"): DiscordChannel {
		return {
			id,
			type: DiscordChannelTypes.PUBLIC_THREAD,
			guild_id: guildId,
			parent_id: "channel-1",
			name: "help-thread",
			owner_id: "user-1",
			message_count: 1,
			member_count: 1,
			thread_metadata: {
				archived: false,
				auto_archive_duration: 1440,
				archive_timestamp: "2024-01-01T00:00:00.000Z",
				locked: false
			}
		};
	}

	async function seededClient(): Promise<Client> {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("ThreadCreate caches the thread as a GuildThreadChannel and emits", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const threadPayload = createThread();

		await ThreadCreate.handler(client, threadPayload);

		const cached = client.guilds.get("guild-1")?.channels.get(threadPayload.id);
		expect(cached).toBeInstanceOf(GuildThreadChannel);
		expect(cached?.isThreadChannel()).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ThreadCreate,
			expect.objectContaining({ id: threadPayload.id })
		);
	});

	it("ThreadUpdate patches the cached instance in place and emits both states", async () => {
		const client = await seededClient();
		const threadPayload = createThread();
		await ThreadCreate.handler(client, threadPayload);

		const emitSpy = vi.spyOn(client, "emit");
		const cachedBefore = client.guilds.get("guild-1")!.channels.get(threadPayload.id);

		await ThreadUpdate.handler(client, {
			...threadPayload,
			name: "renamed-thread",
			thread_metadata: { ...threadPayload.thread_metadata!, archived: true, locked: true }
		});

		const cachedAfter = client.guilds.get("guild-1")!.channels.get(threadPayload.id);
		// upsert() patches rather than replacing, so the cached reference stays stable
		expect(cachedAfter).toBe(cachedBefore);
		expect(cachedAfter?.name).toBe("renamed-thread");
		expect((cachedAfter as GuildThreadChannel).threadMetadata?.archived).toBe(true);

		// ...so the emitted old value is a snapshot taken before the patch, not the cached instance
		const [oldThread, newThread] = emitted(emitSpy, ClientEvents.ThreadUpdate) as [GuildThreadChannel, GuildThreadChannel];
		expect(newThread).toBe(cachedAfter);
		expect(oldThread).not.toBe(cachedAfter);
		expect(oldThread.name).toBe("help-thread");
		expect(oldThread.threadMetadata?.archived).toBe(false);
	});

	it("ThreadDelete emits the cached thread before evicting it", async () => {
		const client = await seededClient();
		const threadPayload = createThread();
		await ThreadCreate.handler(client, threadPayload);

		const emitSpy = vi.spyOn(client, "emit");
		// THREAD_DELETE only carries a partial channel
		await ThreadDelete.handler(client, {
			id: threadPayload.id,
			guild_id: "guild-1",
			parent_id: "channel-1",
			type: DiscordChannelTypes.PUBLIC_THREAD
		} as DiscordChannel);

		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.ThreadDelete,
			expect.objectContaining({ name: "help-thread" })
		);
		expect(client.guilds.get("guild-1")?.channels.has(threadPayload.id)).toBe(false);
	});

	it("ThreadDelete emits the raw payload when the thread was never cached", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const partial = {
			id: "thread-unknown",
			guild_id: "guild-1",
			parent_id: "channel-1",
			type: DiscordChannelTypes.PUBLIC_THREAD
		} as DiscordChannel;

		await ThreadDelete.handler(client, partial);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadDelete, partial);
	});

	it("ignores thread events for uncached guilds", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");
		const threadPayload = createThread("thread-1", "guild-missing");

		await ThreadCreate.handler(client, threadPayload);
		await ThreadUpdate.handler(client, threadPayload);
		await ThreadDelete.handler(client, threadPayload);

		expect(emitSpy).not.toHaveBeenCalled();
	});
});

describe("Auto moderation gateway event handlers", () => {
	function createAutoModerationRule(id = "rule-1", guildId = "guild-1"): DiscordAutoModerationRule {
		return {
			id,
			guild_id: guildId,
			name: "No links",
			creator_id: "user-1",
			event_type: DiscordAutoModerationRuleEventType.MESSAGE_SEND,
			trigger_type: DiscordAutoModerationRuleTriggerType.KEYWORD,
			trigger_metadata: { keyword_filter: ["discord.gg"] },
			actions: [{ type: DiscordAutoModerationActionType.BLOCK_MESSAGE }],
			enabled: true,
			exempt_roles: [],
			exempt_channels: []
		};
	}

	function createActionExecution(guildId = "guild-1"): DiscordAutoModerationActionExecution {
		return {
			guild_id: guildId,
			action: {
				type: DiscordAutoModerationActionType.SEND_ALERT_MESSAGE,
				metadata: { channel_id: "channel-log" }
			},
			rule_id: "rule-1",
			rule_trigger_type: DiscordAutoModerationRuleTriggerType.KEYWORD,
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			alert_system_message_id: "message-alert",
			content: "join discord.gg/example",
			matched_keyword: "discord.gg",
			matched_content: "discord.gg"
		};
	}

	async function seededClient(): Promise<Client> {
		const client = new Client({ token: "token", intents: GatewayIntents.AutoModerationConfiguration });
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("AutoModerationRuleCreate caches the rule and emits", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const rulePayload = createAutoModerationRule();

		await AutoModerationRuleCreate.handler(client, rulePayload);

		const cached = client.guilds.get("guild-1")?.autoModerationRules.get(rulePayload.id);
		expect(cached).toBeInstanceOf(AutoModerationRule);
		expect(cached?.name).toBe("No links");
		expect(cached?.triggerMetadata.keyword_filter).toEqual(["discord.gg"]);
		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.AutoModerationRuleCreate,
			expect.objectContaining({ id: rulePayload.id })
		);
	});

	it("AutoModerationRuleUpdate patches the cached instance in place and emits both states", async () => {
		const client = await seededClient();
		const rulePayload = createAutoModerationRule();
		await AutoModerationRuleCreate.handler(client, rulePayload);

		const emitSpy = vi.spyOn(client, "emit");
		const cachedBefore = client.guilds.get("guild-1")!.autoModerationRules.get(rulePayload.id);

		await AutoModerationRuleUpdate.handler(client, {
			...rulePayload,
			name: "No invites",
			enabled: false,
			exempt_roles: ["role-1"]
		});

		const cachedAfter = client.guilds.get("guild-1")!.autoModerationRules.get(rulePayload.id);
		// upsert() patches rather than replacing, so the cached reference stays stable
		expect(cachedAfter).toBe(cachedBefore);
		expect(cachedAfter?.name).toBe("No invites");
		expect(cachedAfter?.enabled).toBe(false);
		expect(cachedAfter?.exemptRoles).toEqual(["role-1"]);

		// ...so the emitted old value is a snapshot taken before the patch, not the cached instance
		const [oldRule, newRule] = emitted(emitSpy, ClientEvents.AutoModerationRuleUpdate) as [AutoModerationRule, AutoModerationRule];
		expect(newRule).toBe(cachedAfter);
		expect(oldRule).not.toBe(cachedAfter);
		expect(oldRule.name).toBe("No links");
		expect(oldRule.enabled).toBe(true);
		expect(oldRule.exemptRoles).toEqual([]);
	});

	it("AutoModerationRuleDelete emits the cached rule before evicting it", async () => {
		const client = await seededClient();
		const rulePayload = createAutoModerationRule();
		await AutoModerationRuleCreate.handler(client, rulePayload);

		const emitSpy = vi.spyOn(client, "emit");
		await AutoModerationRuleDelete.handler(client, rulePayload);

		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.AutoModerationRuleDelete,
			expect.any(AutoModerationRule)
		);
		expect(client.guilds.get("guild-1")?.autoModerationRules.has(rulePayload.id)).toBe(false);
	});

	it("AutoModerationRuleDelete emits the raw payload when the rule was never cached", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		// Rules are never sent in GUILD_CREATE, so an uncached delete is the common case
		const rulePayload = createAutoModerationRule("rule-unknown");

		await AutoModerationRuleDelete.handler(client, rulePayload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.AutoModerationRuleDelete, rulePayload);
	});

	it("ignores auto moderation events for uncached guilds", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.AutoModerationConfiguration });
		const emitSpy = vi.spyOn(client, "emit");
		const rulePayload = createAutoModerationRule("rule-1", "guild-missing");

		await AutoModerationRuleCreate.handler(client, rulePayload);
		await AutoModerationRuleUpdate.handler(client, rulePayload);
		await AutoModerationRuleDelete.handler(client, rulePayload);
		await AutoModerationActionExecution.handler(client, createActionExecution("guild-missing"));

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("AutoModerationActionExecution emits a camel cased payload", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createActionExecution();

		await AutoModerationActionExecution.handler(client, payload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.AutoModerationActionExecution, {
			guildId: "guild-1",
			action: payload.action,
			ruleId: "rule-1",
			ruleTriggerType: DiscordAutoModerationRuleTriggerType.KEYWORD,
			userId: "user-1",
			channelId: "channel-1",
			messageId: "message-1",
			alertSystemMessageId: "message-alert",
			content: "join discord.gg/example",
			matchedKeyword: "discord.gg",
			matchedContent: "discord.gg"
		});
	});

	it("AutoModerationActionExecution omits the optional fields when Discord does", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		// A blocked message never reaches a channel, so Discord sends no channel/message ids,
		// and without the MessageContent intent the content fields come back empty
		const payload: DiscordAutoModerationActionExecution = {
			guild_id: "guild-1",
			action: { type: DiscordAutoModerationActionType.BLOCK_MESSAGE },
			rule_id: "rule-1",
			rule_trigger_type: DiscordAutoModerationRuleTriggerType.SPAM,
			user_id: "user-1",
			content: "",
			matched_keyword: null,
			matched_content: null
		};

		await AutoModerationActionExecution.handler(client, payload);

		const emitted = emitSpy.mock.calls.find(
			([name]) => name === ClientEvents.AutoModerationActionExecution
		)?.[1] as AutoModerationActionExecutionPayload;
		expect(emitted).toBeDefined();
		expect("channelId" in emitted).toBe(false);
		expect("messageId" in emitted).toBe(false);
		expect("alertSystemMessageId" in emitted).toBe(false);
		expect(emitted.matchedKeyword).toBeNull();
		expect(emitted.content).toBe("");
	});

	it("AutoModerationActionExecution does not touch the rule cache", async () => {
		const client = await seededClient();
		const rules = client.guilds.get("guild-1")!.autoModerationRules;

		await AutoModerationActionExecution.handler(client, createActionExecution());

		expect(rules.size).toBe(0);
	});
});

describe("Reaction removal gateway event handlers", () => {
	const emoji = { id: "emoji-1", name: "smile", animated: false };

	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildMessageReactions
		});
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		return client;
	}

	it("ReactionRemoveAll emits with the cached guild and channel", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveAll.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveAll, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			messageId: "message-1"
		});
	});

	it("ReactionRemoveEmoji passes the emoji through alongside the resolved location", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveEmoji.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveEmoji, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			messageId: "message-1",
			emoji
		});
	});

	it("falls back to bare id objects for uncached guilds instead of dropping the event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessageReactions });
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveAll.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-missing"
		});
		await ReactionRemoveEmoji.handler(client, {
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-missing",
			emoji
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveAll, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-1" },
			messageId: "message-1"
		});
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveEmoji, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-1" },
			messageId: "message-1",
			emoji
		});
	});

	it("emits a null guild for DM channels", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ReactionRemoveAll.handler(client, {
			channel_id: "dm-1",
			message_id: "message-1"
		});
		await ReactionRemoveEmoji.handler(client, {
			channel_id: "dm-1",
			message_id: "message-1",
			emoji
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveAll, {
			guild: null,
			channel: { id: "dm-1" },
			messageId: "message-1"
		});
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ReactionRemoveEmoji, {
			guild: null,
			channel: { id: "dm-1" },
			messageId: "message-1",
			emoji
		});
	});

	it("does not touch any cache", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;

		await ReactionRemoveAll.handler(client, {
			channel_id: "channel-2",
			message_id: "message-1",
			guild_id: "guild-1"
		});
		await ReactionRemoveEmoji.handler(client, {
			channel_id: "channel-2",
			message_id: "message-1",
			guild_id: "guild-1",
			emoji
		});

		expect(guild.channels.size).toBe(1);
		expect(guild.members.size).toBe(0);
		expect(client.guilds.size).toBe(1);
	});
});

describe("ChannelPinsUpdate gateway event handler", () => {
	async function seededClient(): Promise<Client> {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		return client;
	}

	it("emits with the cached guild and channel", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ChannelPinsUpdate.handler(client, {
			guild_id: "guild-1",
			channel_id: "channel-1",
			last_pin_timestamp: "2024-01-01T00:00:00.000Z"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ChannelPinsUpdate, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			lastPinTimestamp: "2024-01-01T00:00:00.000Z"
		});
	});

	it("normalises a missing timestamp to null when the last pin is removed", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ChannelPinsUpdate.handler(client, {
			guild_id: "guild-1",
			channel_id: "channel-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ChannelPinsUpdate, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			lastPinTimestamp: null
		});
	});

	it("falls back to bare id objects for uncached guilds instead of dropping the event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");

		await ChannelPinsUpdate.handler(client, {
			guild_id: "guild-missing",
			channel_id: "channel-1",
			last_pin_timestamp: null
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ChannelPinsUpdate, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-1" },
			lastPinTimestamp: null
		});
	});

	it("emits a null guild for DM channels", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ChannelPinsUpdate.handler(client, { channel_id: "dm-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ChannelPinsUpdate, {
			guild: null,
			channel: { id: "dm-1" },
			lastPinTimestamp: null
		});
	});

	it("does not touch any cache", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;

		await ChannelPinsUpdate.handler(client, { guild_id: "guild-1", channel_id: "channel-2" });

		expect(guild.channels.size).toBe(1);
		expect(client.guilds.size).toBe(1);
	});
});

describe("Guild scheduled event gateway event handlers", () => {
	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildScheduledEvents
		});
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("GuildScheduledEventCreate caches the event on its guild and emits the structure", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await GuildScheduledEventCreate.handler(client, createScheduledEvent());

		const cached = client.guilds.get("guild-1")!.scheduledEvents.get("scheduled-event-1");
		expect(cached).toBeInstanceOf(GuildScheduledEvent);
		expect(cached!.name).toBe("Game night");
		expect(cached!.entityType).toBe(DiscordGuildScheduledEventEntityTypes.VOICE);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildScheduledEventCreate, cached);
	});

	it("GuildScheduledEventUpdate patches the cached instance in place", async () => {
		const client = await seededClient();
		await GuildScheduledEventCreate.handler(client, createScheduledEvent());
		const cached = client.guilds.get("guild-1")!.scheduledEvents.get("scheduled-event-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await GuildScheduledEventUpdate.handler(client, {
			...createScheduledEvent(),
			name: "Game night II",
			status: DiscordGuildScheduledEventStatus.ACTIVE
		});

		const updated = client.guilds.get("guild-1")!.scheduledEvents.get("scheduled-event-1")!;
		expect(updated).toBe(cached);
		expect(updated.name).toBe("Game night II");
		expect(updated.status).toBe(DiscordGuildScheduledEventStatus.ACTIVE);

		// ...so the emitted old value is a snapshot taken before the patch, not the cached instance
		const [oldEvent, newEvent] = emitted(emitSpy, ClientEvents.GuildScheduledEventUpdate) as [GuildScheduledEvent, GuildScheduledEvent];
		expect(newEvent).toBe(updated);
		expect(oldEvent).not.toBe(updated);
		expect(oldEvent.name).toBe("Game night");
		expect(oldEvent.status).toBe(createScheduledEvent().status);
	});

	it("GuildScheduledEventDelete emits the cached event and drops it from the cache", async () => {
		const client = await seededClient();
		await GuildScheduledEventCreate.handler(client, createScheduledEvent());
		const cached = client.guilds.get("guild-1")!.scheduledEvents.get("scheduled-event-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await GuildScheduledEventDelete.handler(client, createScheduledEvent());

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildScheduledEventDelete, cached);
		expect(client.guilds.get("guild-1")!.scheduledEvents.size).toBe(0);
	});

	it("GuildScheduledEventDelete falls back to the raw payload for an uncached event", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createScheduledEvent();

		await GuildScheduledEventDelete.handler(client, payload);

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildScheduledEventDelete, payload);
	});

	it("GuildScheduledEventUserAdd emits the cached event, user, and guild", async () => {
		const client = await seededClient();
		await GuildScheduledEventCreate.handler(client, createScheduledEvent());
		const guild = client.guilds.get("guild-1")!;
		const cached = guild.scheduledEvents.get("scheduled-event-1")!;
		const user = client.users.upsert(createUser());
		const emitSpy = vi.spyOn(client, "emit");

		await GuildScheduledEventUserAdd.handler(client, {
			guild_scheduled_event_id: "scheduled-event-1",
			user_id: "user-1",
			guild_id: "guild-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildScheduledEventUserAdd, cached, user, guild);
	});

	it("GuildScheduledEventUserAdd falls back to bare ids for an uncached event and user", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await GuildScheduledEventUserAdd.handler(client, {
			guild_scheduled_event_id: "scheduled-event-missing",
			user_id: "user-missing",
			guild_id: "guild-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(
			ClientEvents.GuildScheduledEventUserAdd,
			{ id: "scheduled-event-missing" },
			{ id: "user-missing" },
			guild
		);
	});

	it("keeps userCount in step only when it is already known", async () => {
		const client = await seededClient();
		await GuildScheduledEventCreate.handler(client, createScheduledEvent());
		const cached = client.guilds.get("guild-1")!.scheduledEvents.get("scheduled-event-1")!;
		const payload = { guild_scheduled_event_id: "scheduled-event-1", user_id: "user-1", guild_id: "guild-1" };

		await GuildScheduledEventUserAdd.handler(client, payload);
		expect(cached.userCount).toBeUndefined();

		cached.userCount = 3;
		await GuildScheduledEventUserAdd.handler(client, payload);
		expect(cached.userCount).toBe(4);

		await GuildScheduledEventUserRemove.handler(client, payload);
		expect(cached.userCount).toBe(3);
	});

	it("GuildScheduledEventUserRemove never drives userCount below zero", async () => {
		const client = await seededClient();
		await GuildScheduledEventCreate.handler(client, createScheduledEvent());
		const cached = client.guilds.get("guild-1")!.scheduledEvents.get("scheduled-event-1")!;
		cached.userCount = 0;

		await GuildScheduledEventUserRemove.handler(client, {
			guild_scheduled_event_id: "scheduled-event-1",
			user_id: "user-1",
			guild_id: "guild-1"
		});

		expect(cached.userCount).toBe(0);
	});

	it("ignores every event for an uncached guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildScheduledEvents });
		const emitSpy = vi.spyOn(client, "emit");
		const payload = createScheduledEvent("scheduled-event-1", "guild-missing");

		await GuildScheduledEventCreate.handler(client, payload);
		await GuildScheduledEventUpdate.handler(client, payload);
		await GuildScheduledEventDelete.handler(client, payload);
		await GuildScheduledEventUserAdd.handler(client, {
			guild_scheduled_event_id: "scheduled-event-1",
			user_id: "user-1",
			guild_id: "guild-missing"
		});
		await GuildScheduledEventUserRemove.handler(client, {
			guild_scheduled_event_id: "scheduled-event-1",
			user_id: "user-1",
			guild_id: "guild-missing"
		});

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("GUILD_CREATE seeds the scheduled event cache", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildScheduledEvents
		});

		await GuildCreate.handler(client, {
			...createGuild(),
			guild_scheduled_events: [createScheduledEvent(), createScheduledEvent("scheduled-event-2")]
		} as DiscordGuild);

		const events = client.guilds.get("guild-1")!.scheduledEvents;
		expect(events.size).toBe(2);
		expect(events.get("scheduled-event-2")).toBeInstanceOf(GuildScheduledEvent);
	});
});

describe("WebhooksUpdate gateway event handler", () => {
	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildWebhooks
		});
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		return client;
	}

	it("emits with the cached guild and channel", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await WebhooksUpdate.handler(client, { guild_id: "guild-1", channel_id: "channel-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.WebhooksUpdate, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1")
		});
	});

	it("falls back to bare id objects for uncached guilds instead of dropping the event", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildWebhooks });
		const emitSpy = vi.spyOn(client, "emit");

		await WebhooksUpdate.handler(client, { guild_id: "guild-missing", channel_id: "channel-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.WebhooksUpdate, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-1" }
		});
	});

	it("falls back to a bare id object for uncached channels of a cached guild", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await WebhooksUpdate.handler(client, { guild_id: "guild-1", channel_id: "channel-2" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.WebhooksUpdate, {
			guild: client.guilds.get("guild-1"),
			channel: { id: "channel-2" }
		});
	});

	it("does not touch any cache", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;

		await WebhooksUpdate.handler(client, { guild_id: "guild-1", channel_id: "channel-2" });

		expect(guild.channels.size).toBe(1);
		expect(client.guilds.size).toBe(1);
	});
});

describe("PresenceUpdate gateway event handler", () => {
	function createActivity(overrides: Partial<DiscordActivity> = {}): DiscordActivity {
		return {
			name: "Factorio",
			type: ActivityType.PLAYING,
			created_at: 1704067200000,
			...overrides
		};
	}

	function createPresence(overrides: Partial<DiscordPresence> = {}): DiscordPresence & { guild_id: string } {
		return {
			user: { id: "member-1" },
			guild_id: "guild-1",
			status: Status.ONLINE,
			activities: [createActivity()],
			client_status: { desktop: Status.ONLINE },
			...overrides
		} as DiscordPresence & { guild_id: string };
	}

	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildPresences
		});
		await GuildCreate.handler(client, createGuild());
		await MemberCreate.handler(client, createMember());
		return client;
	}

	it("caches the presence on its guild keyed by user id and emits it", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await PresenceUpdate.handler(client, createPresence());

		const cached = client.guilds.get("guild-1")!.presences.get("member-1");
		expect(cached).toBeInstanceOf(Presence);
		expect(cached!.status).toBe(Status.ONLINE);
		expect(cached!.userId).toBe("member-1");
		expect(cached!.guildId).toBe("guild-1");
		expect(cached!.activities[0]!.name).toBe("Factorio");
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.PresenceUpdate, undefined, cached);
	});

	it("patches the existing instance in place rather than replacing it", async () => {
		const client = await seededClient();
		const presences = client.guilds.get("guild-1")!.presences;

		await PresenceUpdate.handler(client, createPresence());
		const first = presences.get("member-1")!;
		await PresenceUpdate.handler(client, createPresence({ status: Status.IDLE }));

		expect(presences.get("member-1")).toBe(first);
		expect(presences.size).toBe(1);
		expect(first.status).toBe(Status.IDLE);
	});

	it("emits an oldPresence snapshot that survives the in-place patch", async () => {
		const client = await seededClient();
		await PresenceUpdate.handler(client, createPresence());

		const emitSpy = vi.spyOn(client, "emit");
		await PresenceUpdate.handler(client, createPresence({
			status: Status.DND,
			activities: [createActivity({ name: "Terraria" })]
		}));

		const [, oldPresence, newPresence] = emitSpy.mock.calls[0] as [unknown, Presence, Presence];
		expect(oldPresence).not.toBe(newPresence);
		expect(oldPresence.status).toBe(Status.ONLINE);
		expect(oldPresence.activities[0]!.name).toBe("Factorio");
		expect(newPresence.status).toBe(Status.DND);
		expect(newPresence.activities[0]!.name).toBe("Terraria");
	});

	it("drops the cache entry when the user goes offline, but still emits the old presence", async () => {
		const client = await seededClient();
		const presences = client.guilds.get("guild-1")!.presences;
		await PresenceUpdate.handler(client, createPresence());

		const emitSpy = vi.spyOn(client, "emit");
		await PresenceUpdate.handler(client, createPresence({ status: Status.OFFLINE, activities: [] }));

		expect(presences.size).toBe(0);
		const [, oldPresence, newPresence] = emitSpy.mock.calls[0] as [unknown, Presence, Presence];
		expect(oldPresence.status).toBe(Status.ONLINE);
		expect(newPresence.status).toBe(Status.OFFLINE);
	});

	it("does not corrupt the user cache when the payload carries an id-only user", async () => {
		const client = await seededClient();
		const cachedUser = client.users.get("member-1")!;

		await PresenceUpdate.handler(client, createPresence());

		expect(client.users.get("member-1")).toBe(cachedUser);
		expect(cachedUser.username).toBe("tester");
		expect(cachedUser.globalName).toBe("tester");
		expect(cachedUser.discriminator).toBe("0001");
	});

	it("ignores presences for an uncached guild", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await PresenceUpdate.handler(client, createPresence({ guild_id: "guild-missing" }));

		expect(emitSpy).not.toHaveBeenCalled();
		expect(client.guilds.get("guild-1")!.presences.size).toBe(0);
	});

	it("exposes a custom status through customStatus", async () => {
		const client = await seededClient();

		await PresenceUpdate.handler(client, createPresence({
			activities: [createActivity({ type: ActivityType.CUSTOM, name: "Custom Status", state: "building a bot" })]
		}));

		const presence = client.guilds.get("guild-1")!.presences.get("member-1")!;
		expect(presence.customStatus).toBe("building a bot");
		expect(presence.activityOfType(ActivityType.PLAYING)).toBeUndefined();
	});

	it("returns null from customStatus when no custom activity is set", async () => {
		const client = await seededClient();
		await PresenceUpdate.handler(client, createPresence());

		expect(client.guilds.get("guild-1")!.presences.get("member-1")!.customStatus).toBeNull();
	});

	it("camelCases nested activity fields", async () => {
		const client = await seededClient();

		await PresenceUpdate.handler(client, createPresence({
			activities: [createActivity({
				application_id: "app-1",
				timestamps: { start: 1704067200000, end: 1704070800000 },
				emoji: { name: "wave", id: "emoji-1", animated: true },
				party: { id: "party-1", size: [2, 4] },
				assets: { large_image: "large", large_text: "Large", small_url: "https://example.test" },
				secrets: { join: "join-secret" },
				buttons: ["Join us"]
			})]
		}));

		const activity = client.guilds.get("guild-1")!.presences.get("member-1")!.activities[0]!;
		expect(activity.createdAt).toBe(1704067200000);
		expect(activity.applicationId).toBe("app-1");
		expect(activity.timestamps).toEqual({ start: 1704067200000, end: 1704070800000 });
		expect(activity.emoji).toEqual({ name: "wave", id: "emoji-1", animated: true });
		expect(activity.party).toEqual({ id: "party-1", size: [2, 4] });
		expect(activity.assets).toEqual({ largeImage: "large", largeText: "Large", smallUrl: "https://example.test" });
		expect(activity.secrets).toEqual({ join: "join-secret" });
		expect(activity.buttons).toEqual(["Join us"]);
	});

	it("maps per-device client status and resolves isOn", async () => {
		const client = await seededClient();

		await PresenceUpdate.handler(client, createPresence({
			client_status: { mobile: Status.ONLINE, desktop: Status.IDLE }
		}));

		const presence = client.guilds.get("guild-1")!.presences.get("member-1")!;
		expect(presence.clientStatus).toEqual({ mobile: Status.ONLINE, desktop: Status.IDLE });
		expect(presence.isOn("mobile")).toBe(true);
		expect(presence.isOn("desktop")).toBe(true);
		expect(presence.isOn("web")).toBe(false);
	});

	it("resolves the cached user and member from the presence", async () => {
		const client = await seededClient();
		await PresenceUpdate.handler(client, createPresence());

		const presence = client.guilds.get("guild-1")!.presences.get("member-1")!;
		expect(presence.user).toBe(client.users.get("member-1"));
		expect(presence.member).toBe(client.guilds.get("guild-1")!.members.get("member-1"));
	});

	it("exposes the presence on the member, and clears it once they go offline", async () => {
		const client = await seededClient();
		const member = client.guilds.get("guild-1")!.members.get("member-1")!;

		await PresenceUpdate.handler(client, createPresence());
		expect(member.presence).toBe(client.guilds.get("guild-1")!.presences.get("member-1"));

		await PresenceUpdate.handler(client, createPresence({ status: Status.OFFLINE, activities: [] }));
		expect(member.presence).toBeUndefined();
	});

	it("GUILD_CREATE seeds the presence cache, resolving guildId for entries without guild_id", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildPresences
		});

		await GuildCreate.handler(client, {
			...createGuild(),
			presences: [
				{ user: { id: "member-1" }, status: Status.ONLINE, activities: [], client_status: {} },
				{ user: { id: "member-2" }, status: Status.IDLE, activities: [], client_status: {} }
			]
		});

		const presences = client.guilds.get("guild-1")!.presences;
		expect(presences.size).toBe(2);
		expect(presences.get("member-1")!.guildId).toBe("guild-1");
		expect(presences.get("member-2")!.status).toBe(Status.IDLE);
	});

	it("GUILD_CREATE skips offline presences and leaves the cache empty without the intent", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });

		await GuildCreate.handler(client, {
			...createGuild(),
			presences: [{ user: { id: "member-1" }, status: Status.OFFLINE, activities: [], client_status: {} }]
		});
		expect(client.guilds.get("guild-1")!.presences.size).toBe(0);

		await GuildCreate.handler(client, createGuild("guild-2"));
		expect(client.guilds.get("guild-2")!.presences.size).toBe(0);
	});

	it("rejects fetch, since presences have no REST route", async () => {
		const client = await seededClient();

		await expect(client.guilds.get("guild-1")!.presences.fetch("member-1"))
			.rejects.toThrow("Presences are only delivered over the gateway");
	});
});

describe("Thread membership gateway event handlers", () => {
	function createThread(id = "thread-1", parentId = "channel-1", guildId = "guild-1"): DiscordChannel {
		return {
			id,
			type: DiscordChannelTypes.PUBLIC_THREAD,
			guild_id: guildId,
			parent_id: parentId,
			name: "help-thread",
			owner_id: "user-1",
			member_count: 1
		};
	}

	function createThreadMember(userId = "member-1", threadId = "thread-1"): DiscordThreadMember {
		return {
			id: threadId,
			user_id: userId,
			join_timestamp: "2024-01-01T00:00:00.000Z",
			flags: 0
		};
	}

	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers
		});
		await GuildCreate.handler(client, createGuild());
		await ThreadCreate.handler(client, createThread());
		return client;
	}

	function threadOf(client: Client, id = "thread-1"): GuildThreadChannel {
		return client.guilds.get("guild-1")!.channels.get(id) as GuildThreadChannel;
	}

	it("ThreadMemberUpdate caches the membership and emits it", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ThreadMemberUpdate.handler(client, { ...createThreadMember(), guild_id: "guild-1" });

		const cached = threadOf(client).members.get("member-1");
		expect(cached).toBeInstanceOf(ThreadMember);
		expect(cached!.id).toBe("thread-1");
		expect(cached!.userId).toBe("member-1");
		expect(cached!.joinedAt).toEqual(new Date("2024-01-01T00:00:00.000Z"));
		expect(cached!.thread).toBe(threadOf(client));
		expect(threadOf(client).member?.user_id).toBe("member-1");
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadMemberUpdate, cached);
	});

	it("ThreadMemberUpdate patches the existing instance in place", async () => {
		const client = await seededClient();
		await ThreadMemberUpdate.handler(client, { ...createThreadMember(), guild_id: "guild-1" });
		const first = threadOf(client).members.get("member-1")!;

		await ThreadMemberUpdate.handler(client, { ...createThreadMember(), flags: 4, guild_id: "guild-1" });

		expect(threadOf(client).members.get("member-1")).toBe(first);
		expect(threadOf(client).members.size).toBe(1);
		expect(first.flags).toBe(4);
	});

	it("ThreadMembersUpdate adds members, resolves their guild member, and updates the count", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ThreadMembersUpdate.handler(client, {
			id: "thread-1",
			guild_id: "guild-1",
			member_count: 3,
			added_members: [
				{ ...createThreadMember("member-1"), member: createMember("member-1") },
				createThreadMember("member-2")
			]
		});

		const thread = threadOf(client);
		expect(thread.memberCount).toBe(3);
		expect([...thread.members.keys()]).toEqual(["member-1", "member-2"]);
		expect(thread.members.get("member-1")!.member).toBe(client.guilds.get("guild-1")!.members.get("member-1"));
		expect(thread.members.get("member-2")!.member).toBeUndefined();
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadMembersUpdate, {
			guild: client.guilds.get("guild-1"),
			thread: thread,
			memberCount: 3,
			added: [thread.members.get("member-1"), thread.members.get("member-2")],
			removed: []
		});
	});

	it("ThreadMembersUpdate evicts removed members and reports their ids", async () => {
		const client = await seededClient();
		await ThreadMembersUpdate.handler(client, {
			id: "thread-1",
			guild_id: "guild-1",
			member_count: 2,
			added_members: [createThreadMember("member-1"), createThreadMember("member-2")]
		});

		const emitSpy = vi.spyOn(client, "emit");
		await ThreadMembersUpdate.handler(client, {
			id: "thread-1",
			guild_id: "guild-1",
			member_count: 1,
			removed_member_ids: ["member-2"]
		});

		const thread = threadOf(client);
		expect(thread.members.has("member-2")).toBe(false);
		expect(thread.members.has("member-1")).toBe(true);
		expect(thread.memberCount).toBe(1);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadMembersUpdate, expect.objectContaining({
			added: [],
			removed: ["member-2"]
		}));
	});

	it("ThreadListSync caches the synced threads and their members", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ThreadListSync.handler(client, {
			guild_id: "guild-1",
			channel_ids: ["channel-1"],
			threads: [createThread("thread-1"), createThread("thread-2")],
			members: [createThreadMember("member-1", "thread-2")]
		});

		const channels = client.guilds.get("guild-1")!.channels;
		expect(channels.has("thread-2")).toBe(true);
		expect(threadOf(client, "thread-2").members.get("member-1")!.userId).toBe("member-1");
		expect(threadOf(client, "thread-1").members.size).toBe(0);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadListSync, {
			guild: client.guilds.get("guild-1"),
			threads: [threadOf(client, "thread-1"), threadOf(client, "thread-2")],
			evicted: []
		});
	});

	it("ThreadListSync evicts stale threads under the synced channels only", async () => {
		const client = await seededClient();
		await ThreadCreate.handler(client, createThread("thread-stale", "channel-1"));
		await ThreadCreate.handler(client, createThread("thread-elsewhere", "channel-2"));
		const emitSpy = vi.spyOn(client, "emit");

		await ThreadListSync.handler(client, {
			guild_id: "guild-1",
			channel_ids: ["channel-1"],
			threads: [createThread("thread-1")],
			members: []
		});

		const channels = client.guilds.get("guild-1")!.channels;
		expect(channels.has("thread-stale")).toBe(false);
		expect(channels.has("thread-elsewhere")).toBe(true);
		expect(channels.has("thread-1")).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ThreadListSync, expect.objectContaining({
			evicted: ["thread-stale"]
		}));
	});

	it("ThreadListSync without channel_ids syncs the whole guild", async () => {
		const client = await seededClient();
		await ThreadCreate.handler(client, createThread("thread-elsewhere", "channel-2"));

		await ThreadListSync.handler(client, {
			guild_id: "guild-1",
			threads: [createThread("thread-1")],
			members: []
		});

		const channels = client.guilds.get("guild-1")!.channels;
		expect(channels.has("thread-elsewhere")).toBe(false);
		expect(channels.has("thread-1")).toBe(true);
	});

	it("ThreadListSync leaves non-thread channels alone", async () => {
		const client = await seededClient();
		await ChannelCreate.handler(client, createChannel("channel-1"));

		await ThreadListSync.handler(client, {
			guild_id: "guild-1",
			threads: [],
			members: []
		});

		expect(client.guilds.get("guild-1")!.channels.has("channel-1")).toBe(true);
	});

	it("all three handlers no-op on an uncached guild or thread", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await ThreadMemberUpdate.handler(client, { ...createThreadMember(), guild_id: "guild-missing" });
		await ThreadMembersUpdate.handler(client, { id: "thread-1", guild_id: "guild-missing", member_count: 1 });
		await ThreadListSync.handler(client, { guild_id: "guild-missing", threads: [], members: [] });

		await ThreadMemberUpdate.handler(client, { ...createThreadMember("member-1", "thread-missing"), guild_id: "guild-1" });
		await ThreadMembersUpdate.handler(client, { id: "thread-missing", guild_id: "guild-1", member_count: 1 });

		expect(emitSpy).not.toHaveBeenCalled();
		expect(threadOf(client).members.size).toBe(0);
	});
});

describe("Poll vote gateway event handlers", () => {
	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildMessagePolls
		});
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		return client;
	}

	it("MessagePollVoteAdd emits with the cached guild, channel, and user", async () => {
		const client = await seededClient();
		const user = client.users.upsert(createUser());
		const emitSpy = vi.spyOn(client, "emit");

		await MessagePollVoteAdd.handler(client, {
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			answer_id: 2
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessagePollVoteAdd, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			user: user,
			messageId: "message-1",
			answerId: 2
		});
	});

	it("MessagePollVoteRemove emits with the cached guild, channel, and user", async () => {
		const client = await seededClient();
		const user = client.users.upsert(createUser());
		const emitSpy = vi.spyOn(client, "emit");

		await MessagePollVoteRemove.handler(client, {
			user_id: "user-1",
			channel_id: "channel-1",
			message_id: "message-1",
			guild_id: "guild-1",
			answer_id: 2
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessagePollVoteRemove, {
			guild: client.guilds.get("guild-1"),
			channel: client.guilds.get("guild-1")!.channels.get("channel-1"),
			user: user,
			messageId: "message-1",
			answerId: 2
		});
	});

	it("falls back to bare ids for an uncached guild, channel, and user", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessagePolls });
		const emitSpy = vi.spyOn(client, "emit");

		await MessagePollVoteAdd.handler(client, {
			user_id: "user-missing",
			channel_id: "channel-missing",
			message_id: "message-1",
			guild_id: "guild-missing",
			answer_id: 1
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessagePollVoteAdd, {
			guild: { id: "guild-missing" },
			channel: { id: "channel-missing" },
			user: { id: "user-missing" },
			messageId: "message-1",
			answerId: 1
		});
	});

	it("emits a null guild for a poll vote in a DM", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await MessagePollVoteRemove.handler(client, {
			user_id: "user-1",
			channel_id: "dm-channel-1",
			message_id: "message-1",
			answer_id: 1
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessagePollVoteRemove, {
			guild: null,
			channel: { id: "dm-channel-1" },
			user: { id: "user-1" },
			messageId: "message-1",
			answerId: 1
		});
	});
});

describe("Integration gateway event handlers", () => {
	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildIntegrations
		});
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("IntegrationCreate caches the integration on its guild and emits the structure", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await IntegrationCreate.handler(client, createIntegration());

		const cached = client.guilds.get("guild-1")!.integrations.get("integration-1");
		expect(cached).toBeInstanceOf(Integration);
		expect(cached!.name).toBe("Cool Streamer");
		expect(cached!.type).toBe("twitch");
		expect(cached!.guildId).toBe("guild-1");
		expect(cached!.expireBehavior).toBe(DiscordIntegrationExpireBehaviors.REMOVE_ROLE);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.IntegrationCreate, cached);
	});

	it("IntegrationUpdate patches the cached instance in place", async () => {
		const client = await seededClient();
		await IntegrationCreate.handler(client, createIntegration());
		const cached = client.guilds.get("guild-1")!.integrations.get("integration-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await IntegrationUpdate.handler(client, {
			...createIntegration(),
			enabled: false,
			subscriber_count: 42
		});

		const updated = client.guilds.get("guild-1")!.integrations.get("integration-1")!;
		expect(updated).toBe(cached);
		expect(updated.enabled).toBe(false);
		expect(updated.subscriberCount).toBe(42);

		// ...so the emitted old value is a snapshot taken before the patch, not the cached instance
		const [oldIntegration, newIntegration] = emitted(emitSpy, ClientEvents.IntegrationUpdate) as [Integration, Integration];
		expect(newIntegration).toBe(updated);
		expect(oldIntegration).not.toBe(updated);
		expect(oldIntegration.enabled).toBe(true);
		expect(oldIntegration.subscriberCount).toBe(3);
	});

	it("IntegrationUpdate emits an undefined old integration when it was not cached", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await IntegrationUpdate.handler(client, createIntegration());

		const cached = client.guilds.get("guild-1")!.integrations.get("integration-1")!;
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.IntegrationUpdate, undefined, cached);
	});

	it("IntegrationDelete emits the cached integration with its guild and drops it from the cache", async () => {
		const client = await seededClient();
		await IntegrationCreate.handler(client, createIntegration());
		const guild = client.guilds.get("guild-1")!;
		const cached = guild.integrations.get("integration-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await IntegrationDelete.handler(client, {
			id: "integration-1",
			guild_id: "guild-1",
			application_id: "application-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.IntegrationDelete, cached, guild, "application-1");
		expect(guild.integrations.size).toBe(0);
	});

	it("IntegrationDelete falls back to a bare id for an uncached integration", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await IntegrationDelete.handler(client, { id: "integration-1", guild_id: "guild-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.IntegrationDelete, { id: "integration-1" }, guild, undefined);
	});

	it("GuildIntegrationsUpdate emits the guild the change happened in", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await GuildIntegrationsUpdate.handler(client, { guild_id: "guild-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.GuildIntegrationsUpdate, guild);
	});

	it("ignores every integration event for an uncached guild", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await IntegrationCreate.handler(client, createIntegration("integration-1", "guild-missing"));
		await IntegrationUpdate.handler(client, createIntegration("integration-1", "guild-missing"));
		await IntegrationDelete.handler(client, { id: "integration-1", guild_id: "guild-missing" });
		await GuildIntegrationsUpdate.handler(client, { guild_id: "guild-missing" });

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("leaves the subscriber fields undefined for a bot integration", async () => {
		const client = await seededClient();

		await IntegrationCreate.handler(client, {
			id: "integration-2",
			guild_id: "guild-1",
			name: "Helper Bot",
			type: "discord",
			enabled: true,
			account: { id: "application-1", name: "Helper Bot" },
			application: {
				id: "application-1",
				name: "Helper Bot",
				icon: null,
				description: "Helps"
			}
		});

		const cached = client.guilds.get("guild-1")!.integrations.get("integration-2")!;
		expect(cached.syncing).toBeUndefined();
		expect(cached.roleId).toBeUndefined();
		expect(cached.expireBehavior).toBeUndefined();
		expect(cached.application!.id).toBe("application-1");
		expect(cached.role).toBeUndefined();
	});

	it("resolves role from the guild role cache once the role is known", async () => {
		const client = await seededClient();
		await RoleCreate.handler(client, { guild_id: "guild-1", role: createRole() });

		await IntegrationCreate.handler(client, createIntegration());

		const cached = client.guilds.get("guild-1")!.integrations.get("integration-1")!;
		expect(cached.role).toBe(client.guilds.get("guild-1")!.roles.get("role-1"));
	});
});

describe("Soundboard sound gateway event handlers", () => {
	async function seededClient(): Promise<Client> {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions
		});
		await GuildCreate.handler(client, createGuild());
		return client;
	}

	it("SoundboardSoundCreate caches the sound on its guild and emits the structure", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundCreate.handler(client, createSoundboardSound());

		const cached = guild.soundboardSounds.get("sound-1");
		expect(cached).toBeInstanceOf(SoundboardSound);
		expect(cached!.name).toBe("Airhorn");
		expect(cached!.volume).toBe(0.75);
		expect(cached!.guildId).toBe("guild-1");
		expect(cached!.emojiId).toBe("emoji-1");
		expect(cached!.emojiName).toBeNull();
		expect(cached!.available).toBe(true);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SoundboardSoundCreate, guild, cached);
	});

	it("SoundboardSoundUpdate patches the cached instance in place", async () => {
		const client = await seededClient();
		await SoundboardSoundCreate.handler(client, createSoundboardSound());
		const guild = client.guilds.get("guild-1")!;
		const cached = guild.soundboardSounds.get("sound-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundUpdate.handler(client, {
			...createSoundboardSound(),
			name: "Louder Airhorn",
			volume: 1,
			available: false
		});

		const updated = guild.soundboardSounds.get("sound-1")!;
		expect(updated).toBe(cached);
		expect(updated.name).toBe("Louder Airhorn");
		expect(updated.volume).toBe(1);
		expect(updated.available).toBe(false);

		// ...so the emitted old value is a snapshot taken before the patch, not the cached instance
		const [, oldSound, newSound] = emitted(emitSpy, ClientEvents.SoundboardSoundUpdate) as [Guild, SoundboardSound, SoundboardSound];
		expect(newSound).toBe(updated);
		expect(oldSound).not.toBe(updated);
		expect(oldSound.name).toBe("Airhorn");
		expect(oldSound.volume).toBe(0.75);
		expect(oldSound.available).toBe(true);
	});

	it("SoundboardSoundUpdate emits an undefined old sound when it was not cached", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundUpdate.handler(client, createSoundboardSound());

		const cached = guild.soundboardSounds.get("sound-1")!;
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SoundboardSoundUpdate, guild, undefined, cached);
	});

	it("SoundboardSoundDelete emits the cached sound and drops it from the cache", async () => {
		const client = await seededClient();
		await SoundboardSoundCreate.handler(client, createSoundboardSound());
		const guild = client.guilds.get("guild-1")!;
		const cached = guild.soundboardSounds.get("sound-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundDelete.handler(client, { sound_id: "sound-1", guild_id: "guild-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SoundboardSoundDelete, guild, cached);
		expect(guild.soundboardSounds.size).toBe(0);
	});

	it("SoundboardSoundDelete falls back to a bare sound id for an uncached sound", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundDelete.handler(client, { sound_id: "sound-1", guild_id: "guild-1" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SoundboardSoundDelete, guild, { soundId: "sound-1" });
	});

	it("SoundboardSoundsUpdate derives per-sound create and update events, then emits the batch", async () => {
		const client = await seededClient();
		await SoundboardSoundCreate.handler(client, createSoundboardSound());
		const guild = client.guilds.get("guild-1")!;
		const existing = guild.soundboardSounds.get("sound-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundsUpdate.handler(client, {
			guild_id: "guild-1",
			soundboard_sounds: [
				{ ...createSoundboardSound(), name: "Renamed" },
				createSoundboardSound("sound-2")
			]
		});

		const added = guild.soundboardSounds.get("sound-2")!;
		expect(existing.name).toBe("Renamed");

		const [, oldSound, newSound] = emitted(emitSpy, ClientEvents.SoundboardSoundUpdate) as [Guild, SoundboardSound, SoundboardSound];
		expect(newSound).toBe(existing);
		expect(oldSound.name).toBe("Airhorn");
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SoundboardSoundCreate, guild, added);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SoundboardSoundsUpdate, guild, [existing, added]);
	});

	it("SoundboardSoundsUpdate does not evict cached sounds missing from the payload", async () => {
		const client = await seededClient();
		await SoundboardSoundCreate.handler(client, createSoundboardSound());
		const guild = client.guilds.get("guild-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundsUpdate.handler(client, {
			guild_id: "guild-1",
			soundboard_sounds: [createSoundboardSound("sound-2")]
		});

		expect(guild.soundboardSounds.has("sound-1")).toBe(true);
		expect(guild.soundboardSounds.size).toBe(2);
		expect(emitSpy).not.toHaveBeenCalledWith(
			ClientEvents.SoundboardSoundDelete,
			expect.anything(),
			expect.anything()
		);
	});

	it("seeds the soundboard cache from the GUILD_CREATE payload", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions
		});

		await GuildCreate.handler(client, {
			...createGuild("guild-2"),
			soundboard_sounds: [createSoundboardSound("sound-1", "guild-2")]
		});

		const cached = client.guilds.get("guild-2")!.soundboardSounds.get("sound-1");
		expect(cached).toBeInstanceOf(SoundboardSound);
		expect(cached!.name).toBe("Airhorn");
	});

	it("ignores every soundboard event for an uncached guild", async () => {
		const client = await seededClient();
		const emitSpy = vi.spyOn(client, "emit");

		await SoundboardSoundCreate.handler(client, createSoundboardSound("sound-1", "guild-missing"));
		await SoundboardSoundUpdate.handler(client, createSoundboardSound("sound-1", "guild-missing"));
		await SoundboardSoundDelete.handler(client, { sound_id: "sound-1", guild_id: "guild-missing" });
		await SoundboardSoundsUpdate.handler(client, { guild_id: "guild-missing", soundboard_sounds: [] });

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it("resolves emoji from the guild emoji cache, and undefined for a standard emoji", async () => {
		const client = await seededClient();
		const guild = client.guilds.get("guild-1")!;
		guild.emojis.upsert({ id: "emoji-1", name: "airhorn", animated: false, available: true });

		await SoundboardSoundCreate.handler(client, createSoundboardSound());
		await SoundboardSoundCreate.handler(client, {
			...createSoundboardSound("sound-2"),
			emoji_id: null,
			emoji_name: "📢"
		});

		expect(guild.soundboardSounds.get("sound-1")!.emoji).toBe(guild.emojis.get("emoji-1"));
		const standard = guild.soundboardSounds.get("sound-2")!;
		expect(standard.emoji).toBeUndefined();
		expect(standard.emojiName).toBe("📢");
	});

	it("leaves user undefined when the payload omits it", async () => {
		const client = await seededClient();

		await SoundboardSoundCreate.handler(client, createSoundboardSound());

		expect(client.guilds.get("guild-1")!.soundboardSounds.get("sound-1")!.user).toBeUndefined();
	});
});

/**
 * Caches patch their entries in place, so every `*Update` handler snapshots the previous value
 * with `clone()` before upserting. These cover the structures whose `patch()` mutates state rather
 * than reassigning it, which a plain shallow copy would leave shared with the live instance.
 */
describe("Update event old-value snapshots", () => {
	it("RoleUpdate emits an old role whose permissions survive the in-place override", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		const emitSpy = vi.spyOn(client, "emit");

		await RoleUpdate.handler(client, {
			guild_id: "guild-1",
			role: { ...createRole(), name: "Moderator", permissions: "8" }
		});

		const cached = client.guilds.get("guild-1")!.roles.get("role-1")!;
		const [oldRole, newRole] = emitted(emitSpy, ClientEvents.RoleUpdate) as [Role, Role];
		expect(newRole).toBe(cached);
		expect(oldRole).not.toBe(cached);
		expect(oldRole.name).toBe("Role");
		// patch() calls permissions.override(), so a shared bitfield would read "8" on both sides
		expect(oldRole.permissions).not.toBe(newRole.permissions);
		expect(oldRole.permissions.toString()).toBe("0");
		expect(newRole.permissions.toString()).toBe("8");
	});

	it("ChannelUpdate emits an old channel whose permission overwrites survive the in-place patch", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		const emitSpy = vi.spyOn(client, "emit");

		await ChannelUpdate.handler(client, {
			...createChannel(),
			name: "renamed",
			permission_overwrites: [{ id: "role-1", type: 0, allow: "0", deny: "1024" }]
		});

		const cached = client.guilds.get("guild-1")!.channels.get("channel-1")!;
		const [oldChannel, newChannel] = emitted(emitSpy, ClientEvents.ChannelUpdate) as [GuildTextChannel, GuildTextChannel];
		expect(newChannel).toBe(cached);
		expect(oldChannel.name).toBe("general");
		expect(newChannel.name).toBe("renamed");
		// patch() updates the manager in place, so a shared one would show the new overwrite on both sides
		expect(oldChannel.permissionOverwrites).not.toBe(newChannel.permissionOverwrites);
		expect(oldChannel.permissionOverwrites!.has("role-1")).toBe(false);
		expect(newChannel.permissionOverwrites!.has("role-1")).toBe(true);
	});

	it("a cloned channel builds its own message manager rather than throwing", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		await ChannelCreate.handler(client, createChannel());
		const emitSpy = vi.spyOn(client, "emit");

		await ChannelUpdate.handler(client, { ...createChannel(), name: "renamed" });

		// `messages` is lazily built off a WeakMap precisely so a clone, which carries no private
		// fields across, still resolves it
		const [oldChannel, newChannel] = emitted(emitSpy, ClientEvents.ChannelUpdate) as [GuildTextChannel, GuildTextChannel];
		expect(oldChannel.messages).toBeDefined();
		expect(oldChannel.messages).not.toBe(newChannel.messages);
	});

	it("MemberUpdate emits an old member whose user survives the in-place patch", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildMembers });
		await GuildCreate.handler(client, createGuild());
		await MemberCreate.handler(client, createMember());
		const emitSpy = vi.spyOn(client, "emit");

		const member = createMember();
		await MemberUpdate.handler(client, {
			...member,
			nick: "updated-nick",
			roles: ["role-1", "role-2"],
			user: { ...member.user, username: "renamed" }
		});

		const cached = client.guilds.get("guild-1")!.members.get("member-1")!;
		const [oldMember, newMember] = emitted(emitSpy, ClientEvents.MemberUpdate) as [Member, Member];
		expect(newMember).toBe(cached);
		expect(oldMember).not.toBe(cached);
		expect(oldMember.nick).toBeUndefined();
		expect(oldMember.roles).toEqual(["role-1"]);
		expect(newMember.roles).toEqual(["role-1", "role-2"]);
		// users.upsert() patches the shared User in place, so the snapshot needs its own copy
		expect(oldMember.user).not.toBe(newMember.user);
		expect(oldMember.user.username).toBe("tester");
		expect(newMember.user.username).toBe("renamed");
	});

	it("GuildUpdate emits an old guild that keeps its fields but shares the live sub-caches", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		await GuildCreate.handler(client, createGuild());
		const emitSpy = vi.spyOn(client, "emit");

		await GuildUpdate.handler(client, { ...createGuild(), name: "Updated Guild" });

		const cached = client.guilds.get("guild-1")!;
		const [oldGuild, newGuild] = emitted(emitSpy, ClientEvents.GuildUpdate) as [Guild, Guild];
		expect(newGuild).toBe(cached);
		expect(oldGuild).not.toBe(cached);
		expect(oldGuild.name).toBe("Guild");
		expect(newGuild.name).toBe("Updated Guild");
		// sub-caches are deliberately aliased, not copied - GUILD_UPDATE only changes guild fields
		expect(oldGuild.members).toBe(newGuild.members);
		expect(oldGuild.roles).toBe(newGuild.roles);
	});

	it("UserUpdate caches an unknown user and emits an undefined old user", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");

		await UserUpdate.handler(client, createUser());

		const cached = client.users.get("user-1");
		expect(cached?.username).toBe("tester");
		expect(emitted(emitSpy, ClientEvents.UserUpdate)).toEqual([undefined, cached]);
	});

	it("UserUpdate patches the cached user in place and emits a snapshot of the old one", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		client.users.upsert(createUser());
		const cached = client.users.get("user-1")!;
		const emitSpy = vi.spyOn(client, "emit");

		await UserUpdate.handler(client, { ...createUser(), username: "renamed", avatar: "avatar-hash" });

		const [oldUser, newUser] = emitted(emitSpy, ClientEvents.UserUpdate) as [User, User];
		expect(newUser).toBe(cached);
		expect(oldUser).not.toBe(cached);
		expect(oldUser.username).toBe("tester");
		expect(oldUser.avatar).toBeNull();
		expect(newUser.username).toBe("renamed");
		expect(newUser.avatar).toBe("avatar-hash");
	});

	it("UserUpdate keeps client.user in sync when the bot's own profile changes", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		client.user = client.users.upsert(createUser("self-1"));
		client.users.upsert(createUser("other-1"));

		await UserUpdate.handler(client, { ...createUser("other-1"), username: "unrelated" });
		expect(client.user.username).toBe("tester");

		await UserUpdate.handler(client, { ...createUser("self-1"), username: "renamed" });
		expect(client.user).toBe(client.users.get("self-1"));
		expect(client.user.username).toBe("renamed");
	});

	it("Resumed emits the client resumed event with no arguments", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");

		await Resumed.handler(client, {});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.Resumed);
	});
});

// ---------------------------------------------------------------------------
// Handlers that were registered but never covered
// ---------------------------------------------------------------------------

describe("ClientEvents names", () => {
	/**
	 * Every entry is its own name. Listeners subscribe with the string (`client.on("StickerUpdate")`)
	 * while handlers emit with the constant, so a value that disagrees with its key silently strands
	 * the event: nothing throws, and any test using the constant on both sides passes.
	 *
	 * This is not hypothetical - `StickerUpdate` shipped as `"StickersUpdate"` (`c02f1d9`), which is
	 * exactly the shape of bug a per-handler test cannot see.
	 */
	it("every ClientEvents value equals its key", () => {
		const mismatched = Object.entries(ClientEvents).filter(([key, value]) => key !== value);

		expect(mismatched).toEqual([]);
	});
});

function createSticker(id = "sticker-1", overrides: Partial<DiscordSticker> = {}): DiscordSticker {
	return {
		id,
		name: "blob",
		tags: "blob",
		description: "a blob",
		type: DiscordStickerTypes.GUILD,
		format_type: DiscordStickerFormatTypes.PNG,
		available: true,
		...overrides
	};
}

describe("StickersUpdate", () => {
	/**
	 * `GUILD_STICKERS_UPDATE` carries the guild's whole sticker list rather than a delta, so the
	 * handler derives the individual events by diffing. Mirrors the `EmojisUpdate` coverage above -
	 * same shape, and the sticker half shipped a bug (`c02f1d9`) that no test would have caught.
	 */
	async function seedGuild() {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds | GatewayIntents.GuildExpressions });
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		return { client, guildId: guildPayload.id };
	}

	it("emits StickerCreate and caches a sticker the guild has not seen", async () => {
		const { client, guildId } = await seedGuild();
		const emitSpy = vi.spyOn(client, "emit");

		await StickersUpdate.handler(client, { guild_id: guildId, stickers: [createSticker()] });

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.StickerCreate);
		expect(call).toBeDefined();
		expect(call?.[1].id).toBe(guildId);
		expect(call?.[2].id).toBe("sticker-1");
		expect(client.guilds.get(guildId)?.stickers.has("sticker-1")).toBe(true);
	});

	it("emits StickerUpdate with an old snapshot that survives the in-place upsert", async () => {
		const { client, guildId } = await seedGuild();
		await StickersUpdate.handler(client, { guild_id: guildId, stickers: [createSticker()] });
		const emitSpy = vi.spyOn(client, "emit");

		await StickersUpdate.handler(client, {
			guild_id: guildId,
			stickers: [createSticker("sticker-1", { name: "renamed" })]
		});

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.StickerUpdate);
		expect(call).toBeDefined();
		// the point of the clone() in the handler - upsert patches in place, so without it both
		// arguments would be the same already-mutated object and listeners could not diff them
		expect(call?.[2].name).toBe("blob");
		expect(call?.[3].name).toBe("renamed");
		expect(client.guilds.get(guildId)?.stickers.get("sticker-1")?.name).toBe("renamed");
	});

	it("emits StickerDelete and drops stickers missing from the incoming list", async () => {
		const { client, guildId } = await seedGuild();
		await StickersUpdate.handler(client, {
			guild_id: guildId,
			stickers: [createSticker("sticker-1"), createSticker("sticker-2")]
		});
		const emitSpy = vi.spyOn(client, "emit");

		await StickersUpdate.handler(client, { guild_id: guildId, stickers: [createSticker("sticker-1")] });

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.StickerDelete);
		expect(call).toBeDefined();
		expect(call?.[2].id).toBe("sticker-2");
		expect(client.guilds.get(guildId)?.stickers.has("sticker-2")).toBe(false);
		expect(client.guilds.get(guildId)?.stickers.has("sticker-1")).toBe(true);
	});

	it("emits nothing for an uncached guild", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const emitSpy = vi.spyOn(client, "emit");

		await StickersUpdate.handler(client, { guild_id: "missing-guild", stickers: [createSticker()] });

		expect(emitSpy).not.toHaveBeenCalled();
	});
});

describe("Invite handlers", () => {
	function createGatewayInvite(overrides: Partial<GatewayInvite> = {}): GatewayInvite {
		return {
			channel_id: "channel-1",
			code: "abc123",
			created_at: "2026-01-01T00:00:00.000Z",
			guild_id: "guild-1",
			max_age: 86400,
			max_uses: 0,
			temporary: false,
			uses: 0,
			...overrides
		};
	}

	it("InviteCreate emits an Invite instance built from the payload", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildInvites });
		const emitSpy = vi.spyOn(client, "emit");

		await InviteCreate.handler(client, createGatewayInvite());

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.InviteCreate);
		expect(call?.[1]).toBeInstanceOf(Invite);
		expect(call?.[1].code).toBe("abc123");
		expect(call?.[1].channelId).toBe("channel-1");
	});

	it("InviteDelete emits the code and its location, with no Invite to build", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildInvites });
		const emitSpy = vi.spyOn(client, "emit");

		await InviteDelete.handler(client, { channel_id: "channel-1", guild_id: "guild-1", code: "abc123" });

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.InviteDelete, {
			channelId: "channel-1",
			guildId: "guild-1",
			code: "abc123"
		});
	});

	it("InviteDelete omits guildId entirely for a DM invite rather than sending undefined", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildInvites });
		const emitSpy = vi.spyOn(client, "emit");

		await InviteDelete.handler(client, { channel_id: "channel-1", code: "abc123" });

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.InviteDelete);
		expect(call?.[1]).not.toHaveProperty("guildId");
	});
});

describe("MessageDeleteBulk", () => {
	it("emits the deleted ids and their location", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessages });
		const emitSpy = vi.spyOn(client, "emit");

		await MessageDeleteBulk.handler(client, {
			ids: ["message-1", "message-2"],
			channel_id: "channel-1",
			guild_id: "guild-1"
		});

		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageDeleteBulk, {
			ids: ["message-1", "message-2"],
			channelId: "channel-1",
			guildId: "guild-1"
		});
	});

	it("passes a null guildId through for a DM bulk delete", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.DirectMessages });
		const emitSpy = vi.spyOn(client, "emit");

		await MessageDeleteBulk.handler(client, { ids: ["message-1"], channel_id: "channel-1", guild_id: null });

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.MessageDeleteBulk);
		expect(call?.[1].guildId).toBeNull();
	});
});

describe("TypingStart", () => {
	it("resolves the guild and channel from cache and upserts the member", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessageTyping });
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		await ChannelCreate.handler(client, createChannel("channel-1", guildPayload.id));
		const emitSpy = vi.spyOn(client, "emit");

		await TypingStart.handler(client, {
			channel_id: "channel-1",
			guild_id: guildPayload.id,
			user_id: "user-1",
			timestamp: 1767225600,
			member: { user: createUser("user-1"), roles: [], joined_at: "2026-01-01T00:00:00.000Z", deaf: false, mute: false, flags: 0 }
		});

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.TypingStart);
		expect(call?.[1].guild).toBeInstanceOf(Guild);
		expect(call?.[1].channel).toBeInstanceOf(GuildTextChannel);
		expect(call?.[1].member).toBeInstanceOf(Member);
		expect(call?.[1].timestamp).toEqual(new Date(1767225600 * 1000));
	});

	it("emits a null member when Discord sends none, rather than upserting undefined", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.GuildMessageTyping });
		const guildPayload = createGuild();
		await GuildCreate.handler(client, guildPayload);
		const emitSpy = vi.spyOn(client, "emit");

		await TypingStart.handler(client, {
			channel_id: "channel-1",
			guild_id: guildPayload.id,
			user_id: "user-1",
			timestamp: 1767225600
		});

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.TypingStart);
		expect(call?.[1].member).toBeNull();
	});

	it("falls back to bare id objects for an uncached DM, where there is no guild at all", async () => {
		const client = new Client({ token: "token", intents: GatewayIntents.DirectMessageTyping });
		const emitSpy = vi.spyOn(client, "emit");

		await TypingStart.handler(client, { channel_id: "dm-1", user_id: "user-1", timestamp: 1767225600 });

		const call = emitSpy.mock.calls.find(([event]) => event === ClientEvents.TypingStart);
		expect(call?.[1].guild).toBeNull();
		expect(call?.[1].channel).toEqual({ id: "dm-1" });
		expect(call?.[1].user).toEqual({ id: "user-1" });
	});
});
