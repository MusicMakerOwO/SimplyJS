import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { User } from "../Structures/User.js";
import { Member } from "../Structures/Member.js";
import { Message } from "../Structures/Message.js";
import { CreateInteraction } from "../Factory/CreateInteraction.js";
import { BaseInteraction } from "../Structures/Interactions/BaseInteraction.js";
import { PingInteraction } from "../Structures/Interactions/PingInteraction.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";
import { SlashCommandOptions } from "../Managers/SlashCommandOptions.js";
import { UserContextMenuInteraction } from "../Structures/Interactions/UserContextMenuInteraction.js";
import { MessageContextMenuInteraction } from "../Structures/Interactions/MessageContextMenuInteraction.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SelectMenuInteraction } from "../Structures/Interactions/SelectMenuInteraction.js";
import { AutocompleteInteraction } from "../Structures/Interactions/AutocompleteInteraction.js";
import { ModalInteraction } from "../Structures/Interactions/ModalInteraction.js";
import { ModalBuilder } from "../Builders/ModalBuilder.js";
import {
	ApplicationCommandAutocompleteInteraction,
	ApplicationCommandInteraction,
	InteractionCallbackModal,
	InteractionCallbackTypes,
	InteractionTypes,
	MessageComponentInteraction as MessageComponentInteractionPayload,
	ModalSubmitInteraction as ModalSubmitInteractionPayload,
	PingInteraction as PingInteractionPayload
} from "../Types/Interactions.js";
import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "../Types/ApplicationCommand.js";
import { ComponentTypes, TextInputStyles } from "../Types/Components.js";
import { DiscordGuild, DiscordMember, DiscordUser } from "../Types/DiscordAPITypes.js";
import { DiscordMessage, MessageTypes } from "../Types/MessageComponents.js";

// ---------------------------------------------------------------------------
// Fixtures
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

function memberData(userId = "user-1"): DiscordMember {
	return {
		user: userData(userId),
		roles: ["role-1"],
		joined_at: "2024-01-01T00:00:00.000Z",
		deaf: false,
		mute: false,
		flags: 0,
	};
}

function messageData(id = "msg-1", authorId = "user-1"): DiscordMessage {
	return {
		id,
		channel_id: "channel-1",
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

/**
 * Fields common to every interaction payload, per `BaseInteraction<TType>` in
 * Types/Interactions.ts. `type` is deliberately excluded — it's applied last by each concrete
 * fixture function below so it always keeps its exact literal type, rather than widening to a
 * union of every interaction type once spread together with `overrides`.
 */
function commonFields<T extends object>(overrides: T) {
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

function pingData(overrides: Partial<Omit<PingInteractionPayload, "type">> = {}): PingInteractionPayload {
	return { ...commonFields(overrides), type: InteractionTypes.PING };
}

function slashCommandData(overrides: Partial<Omit<ApplicationCommandInteraction, "type">> = {}): ApplicationCommandInteraction {
	return {
		...commonFields({
			data: { id: "command-1", name: "greet", type: ApplicationCommandTypes.CHAT_INPUT },
			...overrides,
		}),
		type: InteractionTypes.APPLICATION_COMMAND,
	};
}

function userContextData(overrides: Partial<Omit<ApplicationCommandInteraction, "type">> = {}): ApplicationCommandInteraction {
	return {
		...commonFields({
			data: {
				id: "command-2",
				name: "Inspect User",
				type: ApplicationCommandTypes.USER,
				target_id: "user-2",
				resolved: { users: { "user-2": userData("user-2") } },
			},
			...overrides,
		}),
		type: InteractionTypes.APPLICATION_COMMAND,
	};
}

function messageContextData(overrides: Partial<Omit<ApplicationCommandInteraction, "type">> = {}): ApplicationCommandInteraction {
	return {
		...commonFields({
			data: {
				id: "command-3",
				name: "Inspect Message",
				type: ApplicationCommandTypes.MESSAGE,
				target_id: "msg-1",
				resolved: { messages: { "msg-1": messageData("msg-1") } },
			},
			...overrides,
		}),
		type: InteractionTypes.APPLICATION_COMMAND,
	};
}

function autocompleteData(overrides: Partial<Omit<ApplicationCommandAutocompleteInteraction, "type">> = {}): ApplicationCommandAutocompleteInteraction {
	return {
		...commonFields({
			data: {
				id: "command-1",
				name: "greet",
				type: ApplicationCommandTypes.CHAT_INPUT,
				options: [
					{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "jo", focused: true },
				],
			},
			...overrides,
		}),
		type: InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE,
	};
}

function buttonComponentData(overrides: Partial<Omit<MessageComponentInteractionPayload, "type">> = {}): MessageComponentInteractionPayload {
	return {
		...commonFields({
			data: { custom_id: "confirm", component_type: ComponentTypes.BUTTON },
			message: messageData(),
			...overrides,
		}),
		type: InteractionTypes.MESSAGE_COMPONENT,
	};
}

function selectComponentData(overrides: Partial<Omit<MessageComponentInteractionPayload, "type">> = {}): MessageComponentInteractionPayload {
	return {
		...commonFields({
			data: { custom_id: "pick-role", component_type: ComponentTypes.STRING_SELECT, values: ["role-a"] },
			message: messageData(),
			...overrides,
		}),
		type: InteractionTypes.MESSAGE_COMPONENT,
	};
}

function modalSubmitData(overrides: Partial<Omit<ModalSubmitInteractionPayload, "type">> = {}): ModalSubmitInteractionPayload {
	return {
		...commonFields({
			data: {
				custom_id: "feedback-modal",
				components: [
					{
						type: ComponentTypes.LABEL,
						label: "Feedback",
						component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT },
					},
				],
			},
			...overrides,
		}),
		type: InteractionTypes.MODAL_SUBMIT,
	};
}

function makeModal(): ModalBuilder {
	const payload: InteractionCallbackModal = {
		custom_id: "feedback-modal",
		title: "Feedback",
		components: [
			{
				type: ComponentTypes.LABEL,
				label: "Feedback",
				component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT },
			},
		],
	};
	return ModalBuilder.from(payload);
}

// ---------------------------------------------------------------------------
// CreateInteraction factory dispatch
// ---------------------------------------------------------------------------

describe("CreateInteraction", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("dispatches PING to PingInteraction", () => {
		expect(CreateInteraction(client, pingData())).toBeInstanceOf(PingInteraction);
	});

	it("dispatches a CHAT_INPUT application command to SlashCommandInteraction", () => {
		expect(CreateInteraction(client, slashCommandData())).toBeInstanceOf(SlashCommandInteraction);
	});

	it("dispatches a USER application command to UserContextMenuInteraction", () => {
		expect(CreateInteraction(client, userContextData())).toBeInstanceOf(UserContextMenuInteraction);
	});

	it("dispatches a MESSAGE application command to MessageContextMenuInteraction", () => {
		expect(CreateInteraction(client, messageContextData())).toBeInstanceOf(MessageContextMenuInteraction);
	});

	it("dispatches APPLICATION_COMMAND_AUTOCOMPLETE to AutocompleteInteraction", () => {
		expect(CreateInteraction(client, autocompleteData())).toBeInstanceOf(AutocompleteInteraction);
	});

	it("dispatches a BUTTON component to ButtonInteraction", () => {
		expect(CreateInteraction(client, buttonComponentData())).toBeInstanceOf(ButtonInteraction);
	});

	it("dispatches a STRING_SELECT component to SelectMenuInteraction", () => {
		expect(CreateInteraction(client, selectComponentData())).toBeInstanceOf(SelectMenuInteraction);
	});

	it("dispatches any non-button select type (e.g. USER_SELECT) to SelectMenuInteraction", () => {
		const data = selectComponentData({
			data: { custom_id: "pick-user", component_type: ComponentTypes.USER_SELECT, values: ["user-9"] },
		});
		expect(CreateInteraction(client, data)).toBeInstanceOf(SelectMenuInteraction);
	});

	it("dispatches MODAL_SUBMIT to ModalInteraction", () => {
		expect(CreateInteraction(client, modalSubmitData())).toBeInstanceOf(ModalInteraction);
	});
});

// ---------------------------------------------------------------------------
// BaseInteraction field mapping
// ---------------------------------------------------------------------------

describe("BaseInteraction.patch()", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("maps every shared field from the raw payload", () => {
		const interaction = new PingInteraction(client, pingData({
			guild_id: "guild-1",
			channel_id: "channel-1",
			locale: "en-US",
			guild_locale: "en-GB",
			app_permissions: "8",
			attachment_size_limit: 10_000,
		}));

		expect(interaction.id).toBe("interaction-1");
		expect(interaction.applicationId).toBe("app-1");
		expect(interaction.type).toBe(InteractionTypes.PING);
		expect(interaction.token).toBe("interaction-token");
		expect(interaction.version).toBe(1);
		expect(interaction.guildId).toBe("guild-1");
		expect(interaction.channelId).toBe("channel-1");
		expect(interaction.locale).toBe("en-US");
		expect(interaction.guildLocale).toBe("en-GB");
		expect(interaction.appPermissions).toBe("8");
		expect(interaction.attachmentSizeLimit).toBe(10_000);
	});

	it("resolves `user` from `member.user` when invoked in a guild", () => {
		const interaction = new PingInteraction(client, pingData({
			guild_id: "guild-1",
			member: memberData("user-9"),
		}));

		expect(interaction.user).toBeInstanceOf(User);
		expect(interaction.user.id).toBe("user-9");
	});

	it("resolves `user` directly when invoked in a DM (no member)", () => {
		const interaction = new PingInteraction(client, pingData({ user: userData("dm-user") }));

		expect(interaction.user).toBeInstanceOf(User);
		expect(interaction.user.id).toBe("dm-user");
	});

	it("wraps `member` as a Member when the guild is already cached", () => {
		const guild = client.guilds.upsert(guildData("guild-1"));

		const interaction = new PingInteraction(client, pingData({
			guild_id: "guild-1",
			member: memberData("user-9"),
		}));

		expect(interaction.member).toBeInstanceOf(Member);
		expect(interaction.member).toBe(guild.members.get("user-9"));
	});

	it("leaves `member` unset when the guild is not cached, but still resolves `user`", () => {
		const interaction = new PingInteraction(client, pingData({
			guild_id: "uncached-guild",
			member: memberData("user-9"),
		}));

		expect(interaction.member).toBeUndefined();
		expect(interaction.user).toBeInstanceOf(User);
		expect(interaction.user.id).toBe("user-9");
	});

	it("upserts the resolved user into the client's global user cache", () => {
		new PingInteraction(client, pingData({ user: userData("cached-dm-user") }));

		expect(client.users.get("cached-dm-user")).toBeInstanceOf(User);
	});
});

// ---------------------------------------------------------------------------
// Repliable mixin (SlashCommandInteraction, ModalInteraction, ButtonInteraction, ...)
// ---------------------------------------------------------------------------

describe("Repliable mixin", () => {
	let client: Client;
	let interaction: SlashCommandInteraction;

	beforeEach(() => {
		client = makeClient();
		interaction = new SlashCommandInteraction(client, slashCommandData());
		vi.restoreAllMocks();
	});

	it("reply() posts CHANNEL_MESSAGE_WITH_SOURCE to the interaction callback route", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.reply("hello world");

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE,
			data: { content: "hello world" },
		});
	});

	it("reply() passes a full payload through unchanged", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.reply({ content: "styled", embeds: [{ title: "Embed" }] });

		const [, body] = spy.mock.calls[0]! as [string, { data: unknown }];
		expect(body.data).toEqual({ content: "styled", embeds: [{ title: "Embed" }] });
	});

	it("deferReply() with no argument posts DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE with no data", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.deferReply();

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
		});
	});

	it("deferReply(true) sets the ephemeral flag bit (64) in the data", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.deferReply(true);

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
			data: { flags: 64 },
		});
	});

	it("editReply() patches the @original webhook message and returns a Message", async () => {
		const spy = vi.spyOn(client.rest, "patch").mockResolvedValue(messageData());

		const result = await interaction.editReply("edited");

		expect(spy).toHaveBeenCalledWith(
			`/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`,
			{ content: "edited" }
		);
		expect(result).toBeInstanceOf(Message);
	});

	it("followUp() posts to the webhook route and returns a Message", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(messageData("msg-2"));

		const result = await interaction.followUp("more info");

		expect(spy).toHaveBeenCalledWith(
			`/webhooks/${interaction.applicationId}/${interaction.token}`,
			{ content: "more info" }
		);
		expect(result).toBeInstanceOf(Message);
	});

	it("deleteReply() deletes the @original webhook message", async () => {
		const spy = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);

		await interaction.deleteReply();

		expect(spy).toHaveBeenCalledWith(`/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`);
	});
});

// ---------------------------------------------------------------------------
// Updateable mixin (ButtonInteraction, SelectMenuInteraction)
// ---------------------------------------------------------------------------

describe("Updateable mixin", () => {
	let client: Client;
	let interaction: ButtonInteraction;

	beforeEach(() => {
		client = makeClient();
		interaction = new ButtonInteraction(client, buttonComponentData());
		vi.restoreAllMocks();
	});

	it("update() posts UPDATE_MESSAGE to the interaction callback route", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.update("edited message");

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.UPDATE_MESSAGE,
			data: { content: "edited message" },
		});
	});

	it("deferUpdate() posts DEFERRED_UPDATE_MESSAGE with no data", async () => {
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.deferUpdate();

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.DEFERRED_UPDATE_MESSAGE,
		});
	});
});

// ---------------------------------------------------------------------------
// ModalShowable mixin (commands + components)
// ---------------------------------------------------------------------------

describe("ModalShowable mixin", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
		vi.restoreAllMocks();
	});

	it("showModal() validates the modal and posts a MODAL callback", async () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
		const validateSpy = vi.spyOn(ModalBuilder, "validate");
		const modal = makeModal();

		await interaction.showModal(modal);

		expect(validateSpy).toHaveBeenCalledOnce();
		const [route, body] = spy.mock.calls[0]! as [string, { type: number; data: unknown }];
		expect(route).toBe(`/interactions/${interaction.id}/${interaction.token}/callback`);
		expect(body.type).toBe(InteractionCallbackTypes.MODAL);
	});

	it("showModal() posts the builder in wire format, without relying on JSON.stringify", async () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.showModal(makeModal());

		const [, body] = spy.mock.calls[0]! as [string, { data: InteractionCallbackModal }];
		// the payload the mixin hands to REST is already snake_case, before anything serializes it
		expect(body.data).toEqual({
			custom_id: "feedback-modal",
			title: "Feedback",
			components: [
				{
					type: ComponentTypes.LABEL,
					label: "Feedback",
					component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT },
				},
			],
		});
	});

	it("showModal() accepts a raw modal payload as well as a builder", async () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
		const payload: InteractionCallbackModal = {
			custom_id: "feedback-modal",
			title: "Feedback",
			components: [
				{
					type: ComponentTypes.LABEL,
					label: "Feedback",
					component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT },
				},
			],
		};

		await interaction.showModal(payload);

		const [, body] = spy.mock.calls[0]! as [string, { data: InteractionCallbackModal }];
		expect(body.data).toBe(payload);
	});

	it("showModal() throws and never calls REST when the modal is invalid", async () => {
		const interaction = new ButtonInteraction(client, buttonComponentData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
		const invalidModal = new ModalBuilder();

		await expect(interaction.showModal(invalidModal)).rejects.toThrow();
		expect(spy).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// PingInteraction
// ---------------------------------------------------------------------------

describe("PingInteraction", () => {
	it("pong() posts a PONG callback", async () => {
		const client = makeClient();
		const interaction = new PingInteraction(client, pingData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.pong();

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.PONG,
		});
	});
});

// ---------------------------------------------------------------------------
// SlashCommandInteraction
// ---------------------------------------------------------------------------

describe("SlashCommandInteraction", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	it("patches command id/name/type from data", () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData());

		expect(interaction.commandId).toBe("command-1");
		expect(interaction.commandName).toBe("greet");
		expect(interaction.commandType).toBe(ApplicationCommandTypes.CHAT_INPUT);
	});

	it("defaults options to an empty SlashCommandOptions when none are provided", () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData());

		expect(interaction.options).toBeInstanceOf(SlashCommandOptions);
		expect(interaction.options.getString("name")).toBeNull();
	});

	it("exposes resolved options through typed accessors", () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData({
			data: {
				id: "command-1",
				name: "greet",
				type: ApplicationCommandTypes.CHAT_INPUT,
				options: [{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "Jo" }],
			},
		}));

		expect(interaction.options.getString("name")).toBe("Jo");
	});

	it("sets commandGuildId only when the command is guild-registered", () => {
		const guildScoped = new SlashCommandInteraction(client, slashCommandData({
			data: { id: "command-1", name: "greet", type: ApplicationCommandTypes.CHAT_INPUT, guild_id: "guild-9" },
		}));
		const global = new SlashCommandInteraction(client, slashCommandData());

		expect(guildScoped.commandGuildId).toBe("guild-9");
		expect(global.commandGuildId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// UserContextMenuInteraction / MessageContextMenuInteraction
// ---------------------------------------------------------------------------

describe("UserContextMenuInteraction", () => {
	it("resolves the targeted user from the resolved data", () => {
		const client = makeClient();
		const interaction = new UserContextMenuInteraction(client, userContextData());

		expect(interaction.targetId).toBe("user-2");
		expect(interaction.targetUser).toBeInstanceOf(User);
		expect(interaction.targetUser.id).toBe("user-2");
	});
});

describe("MessageContextMenuInteraction", () => {
	it("resolves the targeted message from the resolved data", () => {
		const client = makeClient();
		const interaction = new MessageContextMenuInteraction(client, messageContextData());

		expect(interaction.targetId).toBe("msg-1");
		expect(interaction.targetMessage).toBeInstanceOf(Message);
		expect(interaction.targetMessage.id).toBe("msg-1");
	});
});

// ---------------------------------------------------------------------------
// ButtonInteraction / SelectMenuInteraction
// ---------------------------------------------------------------------------

describe("ButtonInteraction", () => {
	it("patches customId and wraps the attached message", () => {
		const client = makeClient();
		const interaction = new ButtonInteraction(client, buttonComponentData());

		expect(interaction.customId).toBe("confirm");
		expect(interaction.message).toBeInstanceOf(Message);
		expect(interaction.message.id).toBe("msg-1");
	});
});

describe("SelectMenuInteraction", () => {
	it("patches customId, values, and resolved data", () => {
		const client = makeClient();
		const interaction = new SelectMenuInteraction(client, selectComponentData({
			data: {
				custom_id: "pick-user",
				component_type: ComponentTypes.USER_SELECT,
				values: ["user-2"],
				resolved: { users: { "user-2": userData("user-2") } },
			},
		}));

		expect(interaction.customId).toBe("pick-user");
		expect(interaction.values).toEqual(["user-2"]);
		expect(interaction.resolved).toEqual({ users: { "user-2": userData("user-2") } });
	});

	it("defaults values to an empty array when not provided", () => {
		const client = makeClient();
		const interaction = new SelectMenuInteraction(client, selectComponentData({
			data: { custom_id: "pick-role", component_type: ComponentTypes.STRING_SELECT },
		}));

		expect(interaction.values).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// AutocompleteInteraction
// ---------------------------------------------------------------------------

describe("AutocompleteInteraction", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
		vi.restoreAllMocks();
	});

	it("patches command id/name and the full option tree", () => {
		const interaction = new AutocompleteInteraction(client, autocompleteData());

		expect(interaction.commandId).toBe("command-1");
		expect(interaction.commandName).toBe("greet");
		expect(interaction.options).toHaveLength(1);
	});

	it("finds the top-level focused option", () => {
		const interaction = new AutocompleteInteraction(client, autocompleteData());

		expect(interaction.focusedOption).toEqual({
			name: "name", type: ApplicationCommandOptionTypes.STRING, value: "jo", focused: true,
		});
	});

	it("finds a focused option nested inside a subcommand", () => {
		const interaction = new AutocompleteInteraction(client, autocompleteData({
			data: {
				id: "command-1",
				name: "greet",
				type: ApplicationCommandTypes.CHAT_INPUT,
				options: [
					{
						name: "sub",
						type: ApplicationCommandOptionTypes.SUB_COMMAND,
						options: [
							{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "jo", focused: true },
						],
					},
				],
			},
		}));

		expect(interaction.focusedOption).toEqual({
			name: "name", type: ApplicationCommandOptionTypes.STRING, value: "jo", focused: true,
		});
	});

	it("leaves focusedOption undefined when no option is focused", () => {
		const interaction = new AutocompleteInteraction(client, autocompleteData({
			data: {
				id: "command-1",
				name: "greet",
				type: ApplicationCommandTypes.CHAT_INPUT,
				options: [{ name: "name", type: ApplicationCommandOptionTypes.STRING, value: "jo" }],
			},
		}));

		expect(interaction.focusedOption).toBeUndefined();
	});

	it("respond() posts APPLICATION_COMMAND_AUTOCOMPLETE_RESULT with the given choices", async () => {
		const interaction = new AutocompleteInteraction(client, autocompleteData());
		const spy = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

		await interaction.respond([{ name: "Joanna", value: "joanna" }]);

		expect(spy).toHaveBeenCalledWith(`/interactions/${interaction.id}/${interaction.token}/callback`, {
			type: InteractionCallbackTypes.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			data: { choices: [{ name: "Joanna", value: "joanna" }] },
		});
	});
});

// ---------------------------------------------------------------------------
// ModalInteraction
// ---------------------------------------------------------------------------

describe("ModalInteraction", () => {
	it("patches customId and fields from the submitted data", () => {
		const client = makeClient();
		const interaction = new ModalInteraction(client, modalSubmitData());

		expect(interaction.customId).toBe("feedback-modal");
		expect(interaction.fields).toHaveLength(1);
		expect(interaction.fields[0]).toEqual({
			type: ComponentTypes.LABEL,
			label: "Feedback",
			component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT },
		});
	});
});

// ---------------------------------------------------------------------------
// Shape guarantees — each mixin combination should only appear where it's valid
// ---------------------------------------------------------------------------

describe("interaction class shapes", () => {
	let client: Client;

	beforeEach(() => {
		client = makeClient();
	});

	function methods(instance: object): Record<string, boolean> {
		return {
			reply: typeof (instance as { reply?: unknown }).reply === "function",
			deferReply: typeof (instance as { deferReply?: unknown }).deferReply === "function",
			editReply: typeof (instance as { editReply?: unknown }).editReply === "function",
			followUp: typeof (instance as { followUp?: unknown }).followUp === "function",
			deleteReply: typeof (instance as { deleteReply?: unknown }).deleteReply === "function",
			showModal: typeof (instance as { showModal?: unknown }).showModal === "function",
			update: typeof (instance as { update?: unknown }).update === "function",
			deferUpdate: typeof (instance as { deferUpdate?: unknown }).deferUpdate === "function",
			respond: typeof (instance as { respond?: unknown }).respond === "function",
			pong: typeof (instance as { pong?: unknown }).pong === "function",
		};
	}

	it("PingInteraction: only pong(), no reply/showModal/update/customId", () => {
		const interaction = new PingInteraction(client, pingData());

		expect(methods(interaction)).toEqual({
			reply: false, deferReply: false, editReply: false, followUp: false, deleteReply: false,
			showModal: false, update: false, deferUpdate: false, respond: false, pong: true,
		});
		expect((interaction as unknown as { customId?: unknown }).customId).toBeUndefined();
	});

	it("SlashCommandInteraction: Repliable + ModalShowable, no update/deferUpdate/customId", () => {
		const interaction = new SlashCommandInteraction(client, slashCommandData());

		expect(methods(interaction)).toEqual({
			reply: true, deferReply: true, editReply: true, followUp: true, deleteReply: true,
			showModal: true, update: false, deferUpdate: false, respond: false, pong: false,
		});
		expect((interaction as unknown as { customId?: unknown }).customId).toBeUndefined();
	});

	it("UserContextMenuInteraction and MessageContextMenuInteraction share SlashCommandInteraction's shape", () => {
		const userCtx = new UserContextMenuInteraction(client, userContextData());
		const messageCtx = new MessageContextMenuInteraction(client, messageContextData());

		for (const interaction of [userCtx, messageCtx]) {
			expect(methods(interaction)).toEqual({
				reply: true, deferReply: true, editReply: true, followUp: true, deleteReply: true,
				showModal: true, update: false, deferUpdate: false, respond: false, pong: false,
			});
			expect((interaction as unknown as { customId?: unknown }).customId).toBeUndefined();
		}
	});

	it("ButtonInteraction and SelectMenuInteraction: Repliable + Updateable + ModalShowable + customId", () => {
		const button = new ButtonInteraction(client, buttonComponentData());
		const select = new SelectMenuInteraction(client, selectComponentData());

		for (const interaction of [button, select]) {
			expect(methods(interaction)).toEqual({
				reply: true, deferReply: true, editReply: true, followUp: true, deleteReply: true,
				showModal: true, update: true, deferUpdate: true, respond: false, pong: false,
			});
			expect(interaction.customId).toBeDefined();
		}
	});

	it("SelectMenuInteraction has `values`, ButtonInteraction does not", () => {
		const button = new ButtonInteraction(client, buttonComponentData());
		const select = new SelectMenuInteraction(client, selectComponentData());

		expect((select as unknown as { values?: unknown }).values).toEqual(["role-a"]);
		expect((button as unknown as { values?: unknown }).values).toBeUndefined();
	});

	it("AutocompleteInteraction: only respond(), no reply/showModal/update/customId", () => {
		const interaction = new AutocompleteInteraction(client, autocompleteData());

		expect(methods(interaction)).toEqual({
			reply: false, deferReply: false, editReply: false, followUp: false, deleteReply: false,
			showModal: false, update: false, deferUpdate: false, respond: true, pong: false,
		});
		expect((interaction as unknown as { customId?: unknown }).customId).toBeUndefined();
	});

	it("ModalInteraction: Repliable only, no showModal(), no update/deferUpdate, has customId", () => {
		const interaction = new ModalInteraction(client, modalSubmitData());

		expect(methods(interaction)).toEqual({
			reply: true, deferReply: true, editReply: true, followUp: true, deleteReply: true,
			showModal: false, update: false, deferUpdate: false, respond: false, pong: false,
		});
		expect(interaction.customId).toBeDefined();
	});

	it("every non-ping interaction is an instance of BaseInteraction", () => {
		expect(new SlashCommandInteraction(client, slashCommandData())).toBeInstanceOf(BaseInteraction);
		expect(new ButtonInteraction(client, buttonComponentData())).toBeInstanceOf(BaseInteraction);
		expect(new ModalInteraction(client, modalSubmitData())).toBeInstanceOf(BaseInteraction);
		expect(new AutocompleteInteraction(client, autocompleteData())).toBeInstanceOf(BaseInteraction);
	});
});
