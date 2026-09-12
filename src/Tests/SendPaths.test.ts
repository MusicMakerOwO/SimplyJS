import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { Guild } from "../Structures/Guild.js";
import { Message } from "../Structures/Message.js";
import { User } from "../Structures/User.js";
import { Webhook } from "../Structures/Webhook.js";
import { WebhookMessage } from "../Structures/WebhookMessage.js";
import { CreateChannel } from "../Factory/CreateChannel.js";
import { CreateInteraction } from "../Factory/CreateInteraction.js";
import { GuildTextChannel } from "../Structures/Channels/GuildTextChannel.js";
import { GuildForumChannel } from "../Structures/Channels/GuildForumChannel.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";
import { TextDisplayBuilder } from "../Builders/TextDisplayBuilder.js";
import { ActionRowBuilder } from "../Builders/ActionRowBuilder.js";
import { ButtonBuilder } from "../Builders/ButtonBuilder.js";
import { MessagePayload } from "../Types/Internal.js";
import { ButtonStyles, ComponentTypes } from "../Types/Components.js";
import {
	ApplicationCommandInteraction,
	InteractionTypes,
	MessageComponentInteraction as MessageComponentInteractionPayload
} from "../Types/Interactions.js";
import { ApplicationCommandTypes } from "../Types/ApplicationCommand.js";
import {
	DiscordChannel,
	DiscordChannelTypes,
	DiscordGuild,
	DiscordUser,
	DiscordWebhook,
	DiscordWebhookType,
	MessageFlags
} from "../Types/DiscordAPITypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";

// ---------------------------------------------------------------------------
// What this file is for
// ---------------------------------------------------------------------------
//
// `PreparePayload()` is the single funnel every send path runs through, and that is the whole
// basis of the claim that the Components V2 rules are unskippable. The rules themselves are
// covered in ComponentsV2Payload.test.ts, which calls `PreparePayload` directly - so nothing
// there would notice a send path that stopped calling it at all. This file covers exactly that
// gap: for each of the twelve call sites, that the funnel ran and that its output reached REST.
//
// The assertions are deliberately behavioural rather than a spy on `PreparePayload`. Every call
// site holds a direct ESM import binding, so spying the module export would not intercept it,
// and mocking Structures/Message.js would drag in `Message` itself. Asserting on the body that
// reaches `client.rest` proves the same thing and survives refactors.

// ---------------------------------------------------------------------------
// Fixtures (copied rather than shared, matching StructureActions.test.ts)
// ---------------------------------------------------------------------------

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
		roles: [],
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

function messageData(overrides: Partial<DiscordMessage> = {}): DiscordMessage & { guild_id: string } {
	return {
		id: "msg-1",
		channel_id: "channel-1",
		guild_id: "guild-1",
		author: userData("bot-user"),
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
		...overrides
	};
}

function dmChannelData(id = "dm-1"): DiscordChannel {
	return { id, type: DiscordChannelTypes.DM, permission_overwrites: [] };
}

function webhookData(): DiscordWebhook {
	return {
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
}

// Moveable/PermissionOverwrites assign via non-null assertion, so `position` and
// `permission_overwrites` must both be present - see StructureActions.test.ts.
function makeTextChannel(client: Client, guild: Guild): GuildTextChannel {
	return CreateChannel(client, guild, {
		id: "channel-1", type: DiscordChannelTypes.GUILD_TEXT, name: "general", position: 0, permission_overwrites: []
	}) as GuildTextChannel;
}

function makeForumChannel(client: Client, guild: Guild): GuildForumChannel {
	return CreateChannel(client, guild, {
		id: "channel-1", type: DiscordChannelTypes.GUILD_FORUM, name: "forum", position: 0, permission_overwrites: []
	}) as GuildForumChannel;
}

function commonInteractionFields<T extends object>(overrides: T) {
	return {
		id: "interaction-1",
		application_id: "app-1",
		token: "interaction-token",
		version: 1 as const,
		app_permissions: "0",
		entitlements: [],
		authorizing_integration_owners: {},
		attachment_size_limit: 25_000_000,
		...overrides,
	};
}

function slashCommandData(): ApplicationCommandInteraction {
	return {
		...commonInteractionFields({
			data: { id: "command-1", name: "greet", type: ApplicationCommandTypes.CHAT_INPUT },
		}),
		type: InteractionTypes.APPLICATION_COMMAND,
	};
}

function buttonComponentData(message: DiscordMessage = messageData()): MessageComponentInteractionPayload {
	return {
		...commonInteractionFields({
			data: { custom_id: "confirm", component_type: ComponentTypes.BUTTON },
			message,
		}),
		type: InteractionTypes.MESSAGE_COMPONENT,
	};
}

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------

/** A v2-only component, so a payload carrying it must come out flagged IS_COMPONENTS_V2 */
function v2Payload(): MessagePayload {
	return { components: [ new TextDisplayBuilder().setContent("a text display") ] };
}

/** The same v2 component alongside `content`, which Discord rejects and the funnel must catch */
function mixedPayload(): MessagePayload {
	return { content: "plain text", components: [ new TextDisplayBuilder().setContent("a text display") ] };
}

/** An action row is valid in both versions, so this looks like a v1 payload on its own */
function actionRowPayload(): MessagePayload {
	return {
		components: [
			new ActionRowBuilder().setComponents([
				new ButtonBuilder().setStyle(ButtonStyles.PRIMARY).setLabel("Click").setCustomId("click")
			])
		]
	};
}

function uploadPayload(): MessagePayload {
	return {
		components: [ new TextDisplayBuilder().setContent("a text display") ],
		attachments: [ { name: "a.txt", data: "file contents" } ]
	};
}

// ---------------------------------------------------------------------------
// The send-path table
// ---------------------------------------------------------------------------

type SendPath = {
	name: string;
	/** Which rest verb the path calls, and so which one to spy on */
	verb: "post" | "patch";
	/**
	 * Pulls the message body out of the recorded call arguments. The interaction callback routes
	 * nest it under `data` and a forum post nests it under `message`, so this is not uniform.
	 */
	bodyOf: (args: unknown[]) => Record<string, unknown>;
	/** Drives the path far enough to reach REST */
	invoke: (client: Client, payload: MessagePayload) => Promise<unknown>;
};

function topLevelBody(args: unknown[]): Record<string, unknown> {
	return args[1] as Record<string, unknown>;
}

function callbackDataBody(args: unknown[]): Record<string, unknown> {
	return (args[1] as { data: Record<string, unknown> }).data;
}

const sendPaths: SendPath[] = [
	{
		name: "channel.send",
		verb: "post",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => {
			const guild = new Guild(client, guildData());
			return await makeTextChannel(client, guild).send(payload);
		}
	},
	{
		name: "message.reply",
		verb: "post",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => await new Message(client, messageData()).reply(payload)
	},
	{
		name: "message.update",
		verb: "patch",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => {
			// update() refuses messages the bot did not author, so the ids have to line up
			client.user = new User(client, userData("bot-user"));
			return await new Message(client, messageData()).update(payload);
		}
	},
	{
		name: "user.send",
		verb: "post",
		// the first post creates the DM channel, the second sends the message
		bodyOf: (args) => topLevelBody(args),
		invoke: async (client, payload) => await new User(client, userData()).send(payload)
	},
	{
		name: "webhook.send",
		verb: "post",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => await new Webhook(client, webhookData()).send(payload)
	},
	{
		name: "webhook.editMessage",
		verb: "patch",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => await new Webhook(client, webhookData()).editMessage("msg-1", payload)
	},
	{
		name: "webhookMessage.update",
		verb: "patch",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => {
			const message = new WebhookMessage(client, messageData(), {
				webhookId: "webhook-1", webhookToken: "secret-token"
			});
			return await message.update(payload);
		}
	},
	{
		name: "threads.createForumPost",
		verb: "post",
		bodyOf: (args) => (args[1] as { message: Record<string, unknown> }).message,
		invoke: async (client, payload) => {
			const guild = new Guild(client, guildData());
			return await makeForumChannel(client, guild).threads.createForumPost({ name: "post", message: payload });
		}
	},
	{
		name: "interaction.reply",
		verb: "post",
		bodyOf: callbackDataBody,
		invoke: async (client, payload) => {
			const interaction = CreateInteraction(client, slashCommandData()) as SlashCommandInteraction;
			return await interaction.reply(payload);
		}
	},
	{
		name: "interaction.editReply",
		verb: "patch",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => {
			const interaction = CreateInteraction(client, slashCommandData()) as SlashCommandInteraction;
			return await interaction.editReply(payload);
		}
	},
	{
		name: "interaction.followUp",
		verb: "post",
		bodyOf: topLevelBody,
		invoke: async (client, payload) => {
			const interaction = CreateInteraction(client, slashCommandData()) as SlashCommandInteraction;
			return await interaction.followUp(payload);
		}
	},
	{
		name: "component.update",
		verb: "post",
		bodyOf: callbackDataBody,
		invoke: async (client, payload) => {
			const interaction = CreateInteraction(client, buttonComponentData()) as ButtonInteraction;
			return await interaction.update(payload);
		}
	},
];

/**
 * Spies both verbs and returns the one the path under test records its message on.
 *
 * `user.send` is the one path that makes two POSTs - it creates the DM channel first - so it
 * needs the channel payload returned ahead of the message. Handing that payload to every path
 * would break the others, whose first POST *is* the message.
 */
function spyRest(client: Client, path: SendPath) {
	const post = vi.spyOn(client.rest, "post");
	if (path.name === "user.send") post.mockResolvedValueOnce(dmChannelData() as never);
	post.mockResolvedValue(messageData() as never);

	vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);
	return vi.mocked(path.verb === "post" ? client.rest.post : client.rest.patch);
}

/** The recorded call that actually carried the message, skipping `user.send`'s DM channel creation */
function messageCall(spy: ReturnType<typeof spyRest>, path: SendPath): unknown[] {
	const calls = spy.mock.calls as unknown[][];
	if (path.name === "user.send") return calls[1]!;
	return calls[0]!;
}

describe.each(sendPaths)("Components V2 rules on $name", (path) => {
	let client: Client;

	beforeEach(() => {
		vi.restoreAllMocks();
		client = makeClient();
	});

	it("flags a v2 payload on the way out", async () => {
		const spy = spyRest(client, path);

		await path.invoke(client, v2Payload());

		const body = path.bodyOf(messageCall(spy, path));
		expect(body.flags).toBeDefined();
		expect((body.flags as number) & MessageFlags.IS_COMPONENTS_V2).not.toBe(0);
	});

	it("rejects a v1/v2 mix before the request leaves", async () => {
		const spy = spyRest(client, path);

		await expect(path.invoke(client, mixedPayload())).rejects.toThrow(/cannot also set content/);

		// the throw has to precede the request, not merely accompany it
		if (path.name === "user.send") expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
		else expect(spy).not.toHaveBeenCalled();
	});

	it("splits uploads out of the body and into the files argument", async () => {
		const spy = spyRest(client, path);

		await path.invoke(client, uploadPayload());

		const args = messageCall(spy, path);
		expect(path.bodyOf(args).attachments).toEqual([ { id: "0", filename: "a.txt" } ]);
		expect(args[3]).toEqual([ { name: "a.txt", data: "file contents" } ]);
	});
});

// ---------------------------------------------------------------------------
// Threading the edited message's own flags through
// ---------------------------------------------------------------------------
//
// An edit made of action rows alone does not look like a v2 payload on its own, so the only thing
// keeping it held to the v2 rules is the flags of the message being edited. Three paths can see
// those flags and pass them as `PreparePayload`'s second argument; two cannot.

describe("existing flags on an edit", () => {
	let client: Client;

	beforeEach(() => {
		vi.restoreAllMocks();
		client = makeClient();
		client.user = new User(client, userData("bot-user"));
	});

	it("message.update holds an already-v2 message to the v2 rules", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);
		const v2Message = (): Message =>
			new Message(client, messageData({ flags: MessageFlags.IS_COMPONENTS_V2 }));

		await v2Message().update(actionRowPayload());

		const body = topLevelBody(spy.mock.calls[0] as unknown[]);
		expect((body.flags as number) & MessageFlags.IS_COMPONENTS_V2).not.toBe(0);

		await expect(
			v2Message().update({ content: "plain text", ...actionRowPayload() })
		).rejects.toThrow(/cannot also set content/);
	});

	it("component update holds the attached message to the v2 rules", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData() as never);
		const v2Component = (): ButtonInteraction => CreateInteraction(
			client,
			buttonComponentData(messageData({ flags: MessageFlags.IS_COMPONENTS_V2 }))
		) as ButtonInteraction;

		await v2Component().update(actionRowPayload());

		const body = callbackDataBody(spy.mock.calls[0] as unknown[]);
		expect((body.flags as number) & MessageFlags.IS_COMPONENTS_V2).not.toBe(0);

		await expect(
			v2Component().update({ content: "plain text", ...actionRowPayload() })
		).rejects.toThrow(/cannot also set content/);
	});

	it("webhookMessage.update holds an already-v2 message to the v2 rules", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);
		const v2Message = (): WebhookMessage => new WebhookMessage(
			client,
			messageData({ flags: MessageFlags.IS_COMPONENTS_V2 }),
			{ webhookId: "webhook-1", webhookToken: "secret-token" }
		);

		await v2Message().update(actionRowPayload());

		const body = topLevelBody(spy.mock.calls[0] as unknown[]);
		expect((body.flags as number) & MessageFlags.IS_COMPONENTS_V2).not.toBe(0);

		await expect(
			v2Message().update({ content: "plain text", ...actionRowPayload() })
		).rejects.toThrow(/cannot also set content/);
	});

	// The two paths below address what they are editing by token or by id rather than fetching it,
	// so its flags are never in hand. This pins the limitation as known rather than broken - an
	// edit that looks like v2 on its own is still checked, one that does not is left to Discord.

	it("editReply cannot - it addresses the original response by token and never sees its flags", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);
		const interaction = CreateInteraction(client, slashCommandData()) as SlashCommandInteraction;

		await expect(
			interaction.editReply({ content: "plain text", ...actionRowPayload() })
		).resolves.toBeInstanceOf(Message);

		expect(topLevelBody(spy.mock.calls[0] as unknown[]).flags).toBeUndefined();
	});

	it("webhook.editMessage cannot - it addresses the message by id and never sees its flags", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);
		const webhook = new Webhook(client, webhookData());

		await expect(
			webhook.editMessage("msg-1", { content: "plain text", ...actionRowPayload() })
		).resolves.toBeInstanceOf(WebhookMessage);

		expect(topLevelBody(spy.mock.calls[0] as unknown[]).flags).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Attachment and poll handling, end to end
// ---------------------------------------------------------------------------
//
// The rules themselves are unit-tested in Multipart.test.ts against SplitAttachments directly.
// These prove they are reached through a real send path rather than only by calling it.

describe("attachments and polls on the send path", () => {
	let client: Client;

	beforeEach(() => {
		vi.restoreAllMocks();
		client = makeClient();
		client.user = new User(client, userData("bot-user"));
	});

	it("message.update sends an explicit empty attachment list so an edit can clear every file", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);

		await new Message(client, messageData()).update({ content: "kept", attachments: [] });

		const body = topLevelBody(spy.mock.calls[0] as unknown[]);
		expect(body).toHaveProperty("attachments");
		expect(body.attachments).toEqual([]);
	});

	it("counts retained attachments toward the limit on a real edit", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData() as never);
		const attachments = [
			...Array.from({ length: 8 }, (_, i) => ({ id: `${i}`, filename: `kept-${i}.txt` })),
			...Array.from({ length: 5 }, (_, i) => ({ name: `new-${i}.txt`, data: "x" }))
		];

		// only 5 files are uploaded, so the check inside Rest would let this through
		await expect(new Message(client, messageData()).update({ attachments }))
			.rejects.toThrow(/more than 10 attachments/);

		expect(spy).not.toHaveBeenCalled();
	});

	it("passes a poll through to the request body", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData() as never);
		const guild = new Guild(client, guildData());
		const poll = {
			question: { text: "Best colour?" },
			answers: [ { poll_media: { text: "red" } }, { poll_media: { text: "blue" } } ]
		};

		await makeTextChannel(client, guild).send({ poll });

		expect(topLevelBody(spy.mock.calls[0] as unknown[]).poll).toEqual(poll);
	});
});
