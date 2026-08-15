import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { CreateDispatch } from "../EventDispatcher.js";
import { GatewayEvents, GatewayIntents } from "../Types/DiscordGateway.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";
import { JSONObject } from "../Types/Internal.js";
import { InteractionTypes } from "../Types/Interactions.js";
import { ApplicationCommandTypes } from "../Types/ApplicationCommand.js";
import { ComponentTypes } from "../Types/Components.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";
import { UserContextMenuInteraction } from "../Structures/Interactions/UserContextMenuInteraction.js";
import { MessageContextMenuInteraction } from "../Structures/Interactions/MessageContextMenuInteraction.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SelectMenuInteraction } from "../Structures/Interactions/SelectMenuInteraction.js";
import { AutocompleteInteraction } from "../Structures/Interactions/AutocompleteInteraction.js";
import { ModalInteraction } from "../Structures/Interactions/ModalInteraction.js";

import { ClientEvents } from "../Types/index.js";

function createUser(id = "user-1"): DiscordUser {
	return {
		id,
		username: "tester",
		discriminator: "0001",
		global_name: "tester",
		avatar: null
	};
}

function createReadyPayload(user: DiscordUser): JSONObject {
	return {
		v: 10,
		user_settings: null,
		user: {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			global_name: user.global_name,
			avatar: user.avatar
		},
		session_type: "normal",
		session_id: "session-1",
		resume_gateway_url: "wss://gateway.discord.gg",
		presences: [],
		guilds: [],
		geo_ordered_rtc_regions: [],
		auth: null,
		application: {
			id: "app-1",
			flags_new: "0",
			flags: 0
		}
	};
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

function slashCommandPayload(): JSONObject {
	return commonInteractionFields({
		data: { id: "command-1", name: "greet", type: ApplicationCommandTypes.CHAT_INPUT },
		type: InteractionTypes.APPLICATION_COMMAND,
	});
}

function userContextPayload(): JSONObject {
	return commonInteractionFields({
		data: {
			id: "command-2", name: "Inspect User", type: ApplicationCommandTypes.USER,
			target_id: "user-2", resolved: { users: { "user-2": createUser("user-2") } },
		},
		type: InteractionTypes.APPLICATION_COMMAND,
	});
}

function messageContextPayload(): JSONObject {
	return commonInteractionFields({
		data: {
			id: "command-3", name: "Inspect Message", type: ApplicationCommandTypes.MESSAGE,
			target_id: "msg-1",
			resolved: {
				messages: {
					"msg-1": {
						id: "msg-1", channel_id: "channel-1", author: createUser(), content: "hi",
						timestamp: "2024-01-01T00:00:00.000Z", edited_timestamp: null, tts: false,
						mention_everyone: false, mentions: [], mention_roles: [], attachments: [],
						embeds: [], pinned: false, type: 0,
					},
				},
			},
		},
		type: InteractionTypes.APPLICATION_COMMAND,
	});
}

function autocompletePayload(): JSONObject {
	return commonInteractionFields({
		data: {
			id: "command-1", name: "greet", type: ApplicationCommandTypes.CHAT_INPUT,
			options: [{ name: "name", type: 3, value: "jo", focused: true }],
		},
		type: InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE,
	});
}

function buttonPayload(): JSONObject {
	return commonInteractionFields({
		data: { custom_id: "confirm", component_type: ComponentTypes.BUTTON },
		message: {
			id: "msg-1", channel_id: "channel-1", author: createUser(), content: "hi",
			timestamp: "2024-01-01T00:00:00.000Z", edited_timestamp: null, tts: false,
			mention_everyone: false, mentions: [], mention_roles: [], attachments: [],
			embeds: [], pinned: false, type: 0,
		},
		type: InteractionTypes.MESSAGE_COMPONENT,
	});
}

function selectMenuPayload(): JSONObject {
	return commonInteractionFields({
		data: { custom_id: "pick-role", component_type: ComponentTypes.STRING_SELECT, values: ["role-a"] },
		message: {
			id: "msg-1", channel_id: "channel-1", author: createUser(), content: "hi",
			timestamp: "2024-01-01T00:00:00.000Z", edited_timestamp: null, tts: false,
			mention_everyone: false, mentions: [], mention_roles: [], attachments: [],
			embeds: [], pinned: false, type: 0,
		},
		type: InteractionTypes.MESSAGE_COMPONENT,
	});
}

function modalSubmitPayload(): JSONObject {
	return commonInteractionFields({
		data: { custom_id: "feedback-modal", components: [] },
		type: InteractionTypes.MODAL_SUBMIT,
	});
}

describe("EventDispatcher", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("warns when dispatching an unhandled event", () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const dispatch = CreateDispatch();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		dispatch(client, "__UNHANDLED_EVENT__" as never, {});

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unhandled event"));
	});

	it("routes READY to the registered handler", () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const dispatch = CreateDispatch();
		const emitSpy = vi.spyOn(client, "emit");
		const user = createUser();

		dispatch(client, GatewayEvents.Ready, createReadyPayload(user));

		expect(client.user?.id).toBe(user.id);
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.Ready, expect.objectContaining({ id: user.id }));
	});

	it("does not warn for handled events", () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const dispatch = CreateDispatch();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		dispatch(client, GatewayEvents.Ready, createReadyPayload(createUser()));

		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("uses event overrides instead of built-in handlers", () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const user = createUser();
		const payload = createReadyPayload(user);
		const overrideHandler = vi.fn();
		const dispatch = CreateDispatch({
			[GatewayEvents.Ready]: (overrideClient, overrideData) => {
				overrideHandler(overrideClient, overrideData);
			}
		});

		dispatch(client, GatewayEvents.Ready, payload);

		expect(overrideHandler).toHaveBeenCalledWith(client, payload);
		expect(client.user).toBeNull();
	});

	it("ignores undefined overrides and falls back to built-in handlers", () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const payload = createReadyPayload(createUser("user-fallback"));
		// @ts-expect-error | Protected by types but that doesn't mean people will abide by them lmao
		const dispatch = CreateDispatch({
			[GatewayEvents.Ready]: undefined
		});

		dispatch(client, GatewayEvents.Ready, payload);

		expect(client.user?.id).toBe("user-fallback");
	});

	it("Client ws.eventOverrides are forwarded to WSClient dispatch", () => {
		const overrideHandler = vi.fn();
		const user = createUser("wired-user");
		const payload = createReadyPayload(user);

		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds,
			ws: {
				eventOverrides: {
					[GatewayEvents.Ready]: (c, d) => { overrideHandler(c, d); }
				}
			}
		});

		// The override must be live on the socket's dispatch function
		client.socket.dispatch(client, GatewayEvents.Ready, payload);

		// Override was called with the right arguments
		expect(overrideHandler).toHaveBeenCalledOnce();
		expect(overrideHandler).toHaveBeenCalledWith(client, payload);

		// Built-in READY side effect must NOT have run (client.user stays null)
		expect(client.user).toBeNull();
	});

	it("forwards the same data object reference to override handlers", () => {
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const payload = { id: "m-1", channel_id: "c-1", guild_id: "g-1" };
		const overrideHandler = vi.fn();
		const dispatch = CreateDispatch({
			[GatewayEvents.MessageDelete]: (_overrideClient, overrideData) => {
				overrideHandler(overrideData);
			}
		});

		dispatch(client, GatewayEvents.MessageDelete, payload);

		expect(overrideHandler).toHaveBeenCalledOnce();
		expect(overrideHandler.mock.calls[0]?.[0]).toBe(payload);
	});

	it("keeps handler registries isolated between dispatch instances", () => {
		const payload = createReadyPayload(createUser("isolated-user"));
		const overrideHandler = vi.fn();

		const defaultClient = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const overriddenClient = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const defaultDispatch = CreateDispatch();
		const overriddenDispatch = CreateDispatch({
			[GatewayEvents.Ready]: (client, data) => {
				overrideHandler(client, data);
			}
		});

		defaultDispatch(defaultClient, GatewayEvents.Ready, payload);
		overriddenDispatch(overriddenClient, GatewayEvents.Ready, payload);

		expect(defaultClient.user?.id).toBe("isolated-user");
		expect(overriddenClient.user).toBeNull();
		expect(overrideHandler).toHaveBeenCalledOnce();
		expect(overrideHandler).toHaveBeenCalledWith(overriddenClient, payload);
	});

	describe("INTERACTION_CREATE", () => {
		function dispatchInteraction(payload: JSONObject) {
			const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
			const dispatch = CreateDispatch();
			const emitSpy = vi.spyOn(client, "emit");

			dispatch(client, GatewayEvents.InteractionCreate, payload);

			return emitSpy;
		}

		it("always emits InteractionCreate regardless of interaction type", () => {
			const emitSpy = dispatchInteraction(slashCommandPayload());

			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.InteractionCreate, expect.any(SlashCommandInteraction));
		});

		it("emits SlashCommandUsed alongside InteractionCreate for a CHAT_INPUT command", () => {
			const emitSpy = dispatchInteraction(slashCommandPayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SlashCommandUsed, expect.any(SlashCommandInteraction));
		});

		it("emits UserContextMenuUsed alongside InteractionCreate for a USER command", () => {
			const emitSpy = dispatchInteraction(userContextPayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.UserContextMenuUsed, expect.any(UserContextMenuInteraction));
		});

		it("emits MessageContextMenuUsed alongside InteractionCreate for a MESSAGE command", () => {
			const emitSpy = dispatchInteraction(messageContextPayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.MessageContextMenuUsed, expect.any(MessageContextMenuInteraction));
		});

		it("emits AutocompleteUsed alongside InteractionCreate for an autocomplete request", () => {
			const emitSpy = dispatchInteraction(autocompletePayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.AutocompleteUsed, expect.any(AutocompleteInteraction));
		});

		it("emits ButtonUsed alongside InteractionCreate for a button component", () => {
			const emitSpy = dispatchInteraction(buttonPayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ButtonUsed, expect.any(ButtonInteraction));
		});

		it("emits SelectMenuUsed alongside InteractionCreate for a select menu component", () => {
			const emitSpy = dispatchInteraction(selectMenuPayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.SelectMenuUsed, expect.any(SelectMenuInteraction));
		});

		it("emits ModalSubmitted alongside InteractionCreate for a modal submission", () => {
			const emitSpy = dispatchInteraction(modalSubmitPayload());

			expect(emitSpy).toHaveBeenCalledTimes(2);
			expect(emitSpy).toHaveBeenCalledWith(ClientEvents.ModalSubmitted, expect.any(ModalInteraction));
		});

		it("emits the same interaction instance for both InteractionCreate and the discriminated event", () => {
			const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
			const dispatch = CreateDispatch();
			const emitSpy = vi.spyOn(client, "emit");

			dispatch(client, GatewayEvents.InteractionCreate, buttonPayload());

			const genericCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.InteractionCreate);
			const specificCall = emitSpy.mock.calls.find(([event]) => event === ClientEvents.ButtonUsed);

			expect(genericCall?.[1]).toBe(specificCall?.[1]);
		});
	});
});