import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { CreateDispatch } from "../EventDispatcher.js";
import { createCollector, createInternalCollector } from "../Collector.js";
import { GatewayEvents, GatewayIntents } from "../Types/DiscordGateway.js";
import { ClientEvents, ClientWarning, WarningCodes } from "../Types/SimplyJSTypes.js";
import { InteractionTypes } from "../Types/Interactions.js";
import { ApplicationCommandTypes } from "../Types/ApplicationCommand.js";
import { JSONObject } from "../Types/Internal.js";
import { DiscordAPIError } from "../Rest.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";

function createClient(intents: number): { client: Client; warnings: ClientWarning[] } {
	const client = new Client({ token: "token", intents });
	const warnings: ClientWarning[] = [];
	client.on(ClientEvents.Warn, (warning) => warnings.push(warning));
	return { client, warnings };
}

describe("Warn fallback", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("prints with console.warn while nothing listens to Warn", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });

		client.on(ClientEvents.MemberCreate, () => {});

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('"GuildMembers"');
	});

	it("never lets a throwing Warn listener escape, and still prints the warning", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		client.on(ClientEvents.Warn, () => { throw new Error("broken logger"); });

		// the warning is raised from `newListener`, so a leak would make `on()` itself throw
		expect(() => client.on(ClientEvents.MemberCreate, () => {})).not.toThrow();
		expect(warn.mock.calls[0]![0]).toContain('"GuildMembers"');
		expect(error).toHaveBeenCalledWith(expect.stringContaining("Warn"), expect.objectContaining({ message: "broken logger" }));
	});

	it("reads the client's own intents, not the socket's", () => {
		const client = new Client({ token: "token", intents: ["Guilds", "GuildMembers"] });

		expect(client.intents).toBe(GatewayIntents.Guilds | GatewayIntents.GuildMembers);
		expect(client.socket.intents).toBe(client.intents);
	});
});

describe("intent/listener check", () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.restoreAllMocks();
		warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		// every case routes through a Warn listener, so nothing should ever reach the console
		expect(warn).not.toHaveBeenCalled();
	});

	it("warns once for an event none of the client's intents can deliver", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);

		client.on(ClientEvents.MemberCreate, () => {});
		client.on(ClientEvents.MemberCreate, () => {});
		client.once(ClientEvents.MemberCreate, () => {});

		expect(warnings).toEqual([{ code: WarningCodes.MissingIntent, message: expect.stringContaining('"MemberCreate"') }]);
	});

	it("names every intent that would do when the event has several", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);

		client.on(ClientEvents.ReactionAdd, () => {});

		expect(warnings[0]!.message).toContain('"GuildMessageReactions" or "DirectMessageReactions"');
	});

	it("does not warn for partial coverage", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds | GatewayIntents.GuildMessageReactions);

		// no DirectMessageReactions, but a bot that ignores DMs is not making a mistake
		client.on(ClientEvents.ReactionAdd, () => {});

		expect(warnings).toEqual([]);
	});

	it("never warns for events that need no intents", () => {
		const { client, warnings } = createClient(0);

		client.on(ClientEvents.Ready, () => {});
		client.on(ClientEvents.InteractionCreate, () => {});
		client.on(ClientEvents.SlashCommandUsed, () => {});
		client.on(ClientEvents.GuildMembersChunk, () => {});

		expect(warnings).toEqual([]);
	});

	it("hints at MessageContent once for message listeners without it", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds | GatewayIntents.GuildMessages);

		client.on(ClientEvents.MessageCreate, () => {});
		client.on(ClientEvents.MessageUpdate, () => {});

		expect(warnings).toEqual([{ code: WarningCodes.MissingMessageContent, message: expect.stringContaining("MessageContent") }]);
	});

	it("does not hint at MessageContent when the client has it", () => {
		const { client, warnings } = createClient(GatewayIntents.GuildMessages | GatewayIntents.MessageContent);

		client.on(ClientEvents.MessageCreate, () => {});

		expect(warnings).toEqual([]);
	});

	it("reports both a missing intent and missing MessageContent for a message listener with neither", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);

		client.on(ClientEvents.MessageCreate, () => {});

		expect(warnings.map((w) => w.code)).toEqual([WarningCodes.MissingIntent, WarningCodes.MissingMessageContent]);
	});

	it("ignores the Ready handler's own GuildCreate listener", () => {
		const { client, warnings } = createClient(0);
		const dispatch = CreateDispatch();

		dispatch(client, GatewayEvents.Ready, {
			v: 10, user: { id: "1", username: "bot", discriminator: "0", global_name: null, avatar: null },
			session_id: "s", resume_gateway_url: "wss://x", guilds: [{ id: "100", unavailable: true }],
			presences: [], geo_ordered_rtc_regions: [], session_type: "normal", user_settings: null, auth: null,
			application: { id: "1", flags: 0, flags_new: "0" }
		});

		expect(client.listenerCount(ClientEvents.GuildCreate)).toBe(1);
		expect(warnings).toEqual([]);
	});

	it("warns for a bot's collector, even on a hub an internal collector created first", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);

		const internal = createInternalCollector(client, ClientEvents.MemberCreate, {});
		expect(warnings).toEqual([]);

		// the hub's one real listener already exists, so no newListener fires for this one
		const collector = createCollector(client, ClientEvents.MemberCreate, {});
		expect(warnings).toEqual([{ code: WarningCodes.MissingIntent, message: expect.stringContaining('"MemberCreate"') }]);

		internal.stop();
		collector.stop();
	});
});

function slashCommandPayload(): JSONObject {
	return {
		id: "interaction-1",
		application_id: "app-1",
		token: "interaction-token",
		version: 1,
		app_permissions: "0",
		entitlements: [],
		authorizing_integration_owners: {},
		attachment_size_limit: 25_000_000,
		data: { id: "command-1", name: "greet", type: ApplicationCommandTypes.CHAT_INPUT },
		type: InteractionTypes.APPLICATION_COMMAND,
	};
}

describe("slow acknowledgement warning", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function receive(client: Client): void {
		CreateDispatch()(client, GatewayEvents.InteractionCreate, slashCommandPayload());
	}

	it("warns when an interaction is still unanswered at the threshold", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);
		client.on(ClientEvents.SlashCommandUsed, () => {});

		receive(client);
		vi.advanceTimersByTime(2_499);
		expect(warnings).toEqual([]);

		vi.advanceTimersByTime(1);
		expect(warnings).toEqual([{ code: WarningCodes.SlowAcknowledgement, message: expect.stringContaining('SlashCommandUsed "greet"') }]);
		expect(warnings[0]!.message).toContain("2,500ms");
		expect(warnings[0]!.message).toContain("handlers received it immediately");
	});

	it("stays quiet for an interaction answered in time", async () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);
		vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
		client.on(ClientEvents.SlashCommandUsed, (interaction) => void interaction.deferReply());

		receive(client);
		await vi.advanceTimersByTimeAsync(5_000);

		expect(warnings).toEqual([]);
	});

	it("honours a custom threshold, and false turns it off", () => {
		const custom = new Client({ token: "token", intents: GatewayIntents.Guilds, slowAcknowledgementWarning: 1_000 });
		const off = new Client({ token: "token", intents: GatewayIntents.Guilds, slowAcknowledgementWarning: false });
		const customWarnings: ClientWarning[] = [];
		const offWarnings: ClientWarning[] = [];
		custom.on(ClientEvents.Warn, (w) => customWarnings.push(w));
		off.on(ClientEvents.Warn, (w) => offWarnings.push(w));

		receive(custom);
		receive(off);
		vi.advanceTimersByTime(10_000);

		expect(customWarnings.map((w) => w.message)).toEqual([expect.stringContaining("1,000ms")]);
		expect(offWarnings).toEqual([]);
	});

	it("says when nothing handles the interaction at all", () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);

		receive(client);
		vi.advanceTimersByTime(2_500);

		expect(warnings[0]!.message).toContain("Nothing listens for SlashCommandUsed");
	});

	it("separates time spent in async collector filters from the handler's share", async () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);
		client.on(ClientEvents.SlashCommandUsed, () => {});
		// a filter that takes two seconds to decide, and then declines
		const collector = createCollector(client, ClientEvents.SlashCommandUsed, {
			filter: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2_000).unref())
		});

		receive(client);
		await vi.advanceTimersByTimeAsync(2_500);

		expect(warnings[0]!.message).toContain("2,000ms of that was spent in collector filters");
		collector.stop();
	});

	it("reports a 10062 Unknown interaction with how late the response was", async () => {
		const { client, warnings } = createClient(GatewayIntents.Guilds);
		const interaction = new SlashCommandInteraction(client, slashCommandPayload() as never);
		vi.spyOn(client.rest, "post").mockRejectedValue(new DiscordAPIError("Unknown interaction", 404, 10062));

		vi.advanceTimersByTime(3_412);
		await expect(interaction.deferReply()).rejects.toThrow("Unknown interaction");

		expect(warnings).toEqual([{ code: WarningCodes.SlowAcknowledgement, message: expect.stringContaining("3,412ms") }]);
		expect(interaction.acknowledged).toBe(false);
	});
});
