import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { CreateDispatch } from "../EventDispatcher.js";
import { GatewayEvents, GatewayIntents } from "../Types/DiscordGateway.js";
import { EventRequiredIntent } from "../Intents.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";
import { EventHandler, GatewayEventName, JSONObject } from "../Types/Internal.js";

import * as AvailableEvents from "../Events/index.js";
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

	it("maps exported gateway handlers to required intents where applicable", () => {
		const exportedHandlers = Object.values(AvailableEvents) as EventHandler<GatewayEventName, JSONObject>[];

		for (const { name } of exportedHandlers) {
			expect(EventRequiredIntent[name]).toBeDefined();
		}

		expect(EventRequiredIntent[GatewayEvents.GuildCreate]).toBe(GatewayIntents.Guilds);
		expect(EventRequiredIntent[GatewayEvents.GuildMemberUpdate]).toBe(GatewayIntents.GuildMembers);
		expect(EventRequiredIntent[GatewayEvents.MessageDelete]).toEqual([
			GatewayIntents.GuildMessages,
			GatewayIntents.DirectMessages
		]);
	});
});