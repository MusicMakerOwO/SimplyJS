import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { Client } from "../Client.js";
import { CreateDispatch } from "../EventDispatcher.js";
import { DiscordAPIError } from "../Rest.js";
import { createCollector } from "../Collector.js";
import { GatewayEvents, GatewayIntents } from "../Types/DiscordGateway.js";
import { WSEvents } from "../WSClient.js";
import { ClientEvents } from "../Types/index.js";
import { InteractionCallbackModal, InteractionTypes } from "../Types/Interactions.js";
import { ApplicationCommandTypes } from "../Types/ApplicationCommand.js";
import { ComponentTypes, TextInputStyles } from "../Types/Components.js";
import { JSONObject } from "../Types/Internal.js";
import { Message } from "../Structures/Message.js";
import { ButtonInteraction } from "../Structures/Interactions/ButtonInteraction.js";
import { SlashCommandInteraction } from "../Structures/Interactions/SlashCommandInteraction.js";

function buttonPayload(customId = "click"): JSONObject {
	return {
		id: "interaction-1",
		application_id: "app-1",
		token: "interaction-token",
		version: 1 as const,
		app_permissions: "0",
		entitlements: [],
		authorizing_integration_owners: {},
		attachment_size_limit: 25_000_000,
		type: InteractionTypes.MESSAGE_COMPONENT,
		data: { custom_id: customId, component_type: ComponentTypes.BUTTON },
		message: {
			id: "msg-1", channel_id: "channel-1", content: "hi", type: 0,
			author: { id: "user-1", username: "tester", discriminator: "0001", global_name: "tester", avatar: null },
			timestamp: "2024-01-01T00:00:00.000Z", edited_timestamp: null, tts: false,
			mention_everyone: false, mentions: [], mention_roles: [], attachments: [], embeds: [], pinned: false,
		},
	};
}

function slashPayload(): JSONObject {
	return {
		...buttonPayload(),
		type: InteractionTypes.APPLICATION_COMMAND,
		data: { id: "command-1", name: "ping", type: ApplicationCommandTypes.CHAT_INPUT },
	};
}

/** The message body Discord returns from the follow-up and edit routes */
function messagePayload(): JSONObject {
	return {
		id: "msg-2", channel_id: "channel-1", content: "hi", type: 0,
		author: { id: "user-1", username: "tester", discriminator: "0001", global_name: "tester", avatar: null },
		timestamp: "2024-01-01T00:00:00.000Z", edited_timestamp: null, tts: false,
		mention_everyone: false, mentions: [], mention_roles: [], attachments: [], embeds: [], pinned: false,
	};
}

function modalPayload(): InteractionCallbackModal {
	return {
		custom_id: "feedback-modal",
		title: "Feedback",
		components: [{
			type: ComponentTypes.LABEL,
			label: "Feedback",
			component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT },
		}],
	};
}

function makeClient(options: Partial<ConstructorParameters<typeof Client>[0]> = {}): Client {
	return new Client({ token: "token", intents: GatewayIntents.Guilds, ...options });
}

/** Dispatches a button interaction and lets the handler's awaits drain before returning */
async function clickButton(client: Client, customId = "click"): Promise<void> {
	CreateDispatch()(client, GatewayEvents.InteractionCreate, buttonPayload(customId));
	await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Records unhandled rejections for the rest of the test.
 *
 * Removal goes through `onTestFinished` rather than a line at the end of the test body, because a
 * failed assertion would skip that line and leave the listener installed - and a registered
 * `unhandledRejection` listener suppresses node's crash-on-unhandled-rejection for every later test
 * in this worker, hiding exactly the bugs these tests exist to catch.
 */
function watchUnhandledRejections(): ReturnType<typeof vi.fn> {
	const unhandled = vi.fn();
	process.on("unhandledRejection", unhandled);
	onTestFinished(() => void process.off("unhandledRejection", unhandled));

	return unhandled;
}

describe("CollectorManager", () => {
	// teardown rather than setup: a spy restored only on the way *in* to the next test outlives the
	// last test in the file, and console mocks that outlive their test swallow real output
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// not just at the end of the tests that install them - a failed assertion would skip that line
	// and leak fake timers into every later test in this worker, masking the original failure
	afterEach(() => {
		vi.useRealTimers();
	});

	describe("shared listeners", () => {
		it("costs the client one listener no matter how many collectors are on the event", () => {
			const client = makeClient();
			const collectors = Array.from({ length: 50 }, () =>
				createCollector(client, ClientEvents.ButtonUsed, { filter: () => true })
			);

			// the whole point: 50 collectors used to mean 50 listeners and a MaxListenersExceededWarning
			expect(client.listenerCount(ClientEvents.ButtonUsed)).toBe(1);

			for (const collector of collectors) collector.stop();
		});

		it("releases the listener once the last collector on the event stops", () => {
			const client = makeClient();
			const first = createCollector(client, ClientEvents.ButtonUsed);
			const second = createCollector(client, ClientEvents.ButtonUsed);

			first.stop();
			expect(client.listenerCount(ClientEvents.ButtonUsed)).toBe(1);

			second.stop();
			expect(client.listenerCount(ClientEvents.ButtonUsed)).toBe(0);
		});

		it("stops every live collector when the client is destroyed", () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed);

			client.collectors.clear();

			expect(collector.ended).toBe(true);
			expect(client.listenerCount(ClientEvents.ButtonUsed)).toBe(0);
		});
	});

	describe("claiming", () => {
		it("lets a collector take a button before the registered handler sees it", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: (interaction) => interaction.customId === "click",
			});
			collector.on("collect", (interaction) => void interaction.reply("Hello"));

			// the registered-handler half of the bug: a fallback that answers anything unclaimed
			const handled: boolean[] = [];
			client.on(ClientEvents.ButtonUsed, (interaction) => {
				handled.push(interaction.claimed);
				if (interaction.claimed) return;
				void interaction.reply("Unknown button");
			});

			await clickButton(client);

			expect(collector.collected).toHaveLength(1);
			expect(handled).toEqual([true]);
			// exactly one response reached Discord - this is the 40060 that used to be guaranteed
			expect(post).toHaveBeenCalledTimes(1);
			expect(post.mock.calls[0]![1]).toMatchObject({ data: { content: "Hello" } });

			collector.stop();
		});

		it("leaves an unclaimed button to the registered handler", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: (interaction) => interaction.customId === "something-else",
			});

			client.on(ClientEvents.ButtonUsed, (interaction) => {
				if (interaction.claimed) return;
				void interaction.reply("Unknown button");
			});

			await clickButton(client, "click");

			expect(collector.collected).toHaveLength(0);
			expect(post).toHaveBeenCalledTimes(1);
			expect(post.mock.calls[0]![1]).toMatchObject({ data: { content: "Unknown button" } });

			collector.stop();
		});

		it("gives the interaction to the first matching collector only", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

			const first = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });
			const second = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			await clickButton(client);

			expect(first.collected).toHaveLength(1);
			expect(second.collected).toHaveLength(0);

			first.stop();
			second.stop();
		});

		it("offers InteractionCreate collectors before the concrete event's", async () => {
			const client = makeClient();
			const generic = createCollector(client, ClientEvents.InteractionCreate, { filter: () => true });
			const specific = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			await clickButton(client);

			expect(generic.collected).toHaveLength(1);
			expect(specific.collected).toHaveLength(0);

			generic.stop();
			specific.stop();
		});

		it("waits for an async filter to settle before emitting to handlers", async () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: async (interaction) => {
					await new Promise((resolve) => setTimeout(resolve, 5).unref());
					return interaction.customId === "click";
				},
			});

			let seenClaimed: boolean | null = null;
			client.on(ClientEvents.ButtonUsed, (interaction) => void (seenClaimed = interaction.claimed));

			CreateDispatch()(client, GatewayEvents.InteractionCreate, buttonPayload());
			await new Promise((resolve) => setTimeout(resolve, 20).unref());

			expect(collector.collected).toHaveLength(1);
			expect(seenClaimed).toBe(true);

			collector.stop();
		});

		it("still emits a claimed interaction, so logging listeners see everything", async () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			const seen: string[] = [];
			client.on(ClientEvents.InteractionCreate, () => void seen.push("InteractionCreate"));
			client.on(ClientEvents.ButtonUsed, () => void seen.push("ButtonUsed"));

			await clickButton(client);

			expect(seen).toEqual(["InteractionCreate", "ButtonUsed"]);

			collector.stop();
		});

		it("does not collect twice when the client re-emits the interaction it arbitrated", async () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			await clickButton(client);

			// the hub's own listener also hears the emit that follows the offer; without the
			// already-offered check it would collect the same click a second time
			expect(collector.collected).toHaveLength(1);

			collector.stop();
		});

		it("offers a manually emitted interaction to InteractionCreate collectors first", () => {
			const client = makeClient();
			const generic = createCollector(client, ClientEvents.InteractionCreate, { filter: () => true });
			const specific = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			// the concrete event, emitted directly: the hub used to arbitrate its own collectors and
			// mark the interaction offered, so whichever event was emitted first won and the
			// documented "generic collectors get first refusal" order depended on emit order
			client.emit(ClientEvents.ButtonUsed, new ButtonInteraction(client, buttonPayload() as never));

			expect(generic.collected).toHaveLength(1);
			expect(specific.collected).toHaveLength(0);

			generic.stop();
			specific.stop();
		});

		it("still feeds collectors for a manually emitted interaction event", async () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			const interaction = new ButtonInteraction(client, buttonPayload() as never);
			client.emit(ClientEvents.ButtonUsed, interaction);

			expect(collector.collected).toHaveLength(1);

			collector.stop();
		});
	});

	describe("collector error isolation", () => {
		it("still emits the interaction when a filter throws", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

			const thrower = createCollector(client, ClientEvents.ButtonUsed, {
				filter: () => { throw new Error("boom"); },
			});

			const emitted: string[] = [];
			client.on(ClientEvents.InteractionCreate, () => emitted.push("InteractionCreate"));
			client.on(ClientEvents.ButtonUsed, (interaction) => {
				emitted.push("ButtonUsed");
				if (interaction.claimed) return;
				void interaction.reply("Unknown button");
			});

			await clickButton(client);

			// the bug was both of these being skipped entirely, leaving the click unanswered
			expect(emitted).toEqual(["InteractionCreate", "ButtonUsed"]);
			expect(post).toHaveBeenCalledTimes(1);
			expect(error).toHaveBeenCalledTimes(1);
			expect(error.mock.calls[0]![0]).toContain(ClientEvents.ButtonUsed);

			thrower.stop();
		});

		it("lets the next collector claim an interaction an earlier one threw on", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			vi.spyOn(console, "error").mockImplementation(() => undefined);

			const thrower = createCollector(client, ClientEvents.ButtonUsed, {
				filter: () => { throw new Error("boom"); },
			});
			const healthy = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			await clickButton(client);

			expect(thrower.collected).toHaveLength(0);
			expect(healthy.collected).toHaveLength(1);

			thrower.stop();
			healthy.stop();
		});

		it("still emits the interaction when a collect handler throws", async () => {
			const client = makeClient();
			const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

			const collector = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });
			collector.on("collect", () => { throw new Error("boom"); });

			const emitted: string[] = [];
			client.on(ClientEvents.InteractionCreate, () => emitted.push("InteractionCreate"));
			client.on(ClientEvents.ButtonUsed, () => emitted.push("ButtonUsed"));

			await clickButton(client);

			expect(collector.collected).toHaveLength(1);
			expect(emitted).toEqual(["InteractionCreate", "ButtonUsed"]);
			expect(error).toHaveBeenCalledTimes(1);

			collector.stop();
		});

		it("keeps the interaction claimed when the collect handler throws", async () => {
			const client = makeClient();
			const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);

			const thrower = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });
			thrower.on("collect", () => { throw new Error("boom"); });
			const second = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			const handled: boolean[] = [];
			client.on(ClientEvents.ButtonUsed, (interaction) => {
				handled.push(interaction.claimed);
				if (interaction.claimed) return;
				void interaction.reply("Unknown button");
			});

			await clickButton(client);

			// the click is in `collected` before the handler runs, so reporting it declined handed
			// the same interaction to the next collector and let the fallback answer it as well -
			// two collectors and a handler all acting on one interaction's single response
			expect(thrower.collected).toHaveLength(1);
			expect(second.collected).toHaveLength(0);
			expect(handled).toEqual([true]);
			expect(post).not.toHaveBeenCalled();
			expect(error).toHaveBeenCalledTimes(1);

			thrower.stop();
			second.stop();
		});

		it("does not re-arm the idle timer when a collect handler stops the collector", () => {
			vi.useFakeTimers();
			const client = makeClient();

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: () => true,
				idle: 60_000,
			});
			collector.on("collect", () => collector.stop());

			client.emit(ClientEvents.ButtonUsed, new ButtonInteraction(client, buttonPayload() as never));

			// `stop()` cleared the timers and emitted `end`, then control returned into `#collect`,
			// which armed a fresh 60s idle timer on a collector that had already ended
			expect(collector.ended).toBe(true);
			expect(vi.getTimerCount()).toBe(0);
		});

		it("does not leave an unhandled rejection when an async filter rejects", async () => {
			const client = makeClient();
			const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
			const unhandled = watchUnhandledRejections();

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: () => Promise.reject(new Error("boom")),
			});

			// straight through the emitter rather than the dispatcher, so this lands on the hub's
			// own listener path rather than the arbitration path
			client.emit(ClientEvents.ButtonUsed, new ButtonInteraction(client, buttonPayload() as never));
			await new Promise((resolve) => setImmediate(resolve));

			expect(error).toHaveBeenCalledTimes(1);
			expect(unhandled).not.toHaveBeenCalled();

			collector.stop();
		});
	});

	describe("unbounded collector accumulation", () => {
		it("warns once past the threshold, naming the event", () => {
			const client = makeClient();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			const collectors = Array.from({ length: 12 }, () =>
				createCollector(client, ClientEvents.ButtonUsed)
			);

			expect(warn).toHaveBeenCalledTimes(1);
			const message = warn.mock.calls[0]![0] as string;
			expect(message).toContain(ClientEvents.ButtonUsed);
			expect(message).toContain("no `time`, `idle` or `max`");

			// the stack has to start at the caller, not at the library frames in between, or the
			// warning tells you nothing about which of your files is leaking
			const firstFrame = message.slice(message.indexOf("created at:")).split("\n")[1];
			expect(firstFrame).toContain("CollectorManager.test.ts");

			for (const collector of collectors) collector.stop();
		});

		it("stays quiet below the threshold", () => {
			const client = makeClient();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			const collectors = Array.from({ length: 10 }, () =>
				createCollector(client, ClientEvents.ButtonUsed)
			);

			expect(warn).not.toHaveBeenCalled();

			for (const collector of collectors) collector.stop();
		});

		it("does not count collectors that will stop on their own", () => {
			const client = makeClient();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			// the same 50 collectors that trip the warning when unbounded
			const collectors = Array.from({ length: 50 }, () =>
				createCollector(client, ClientEvents.ButtonUsed, { time: 10_000 })
			);
			const capped = Array.from({ length: 50 }, () =>
				createCollector(client, ClientEvents.SelectMenuUsed, { max: 1 })
			);

			expect(warn).not.toHaveBeenCalled();

			for (const collector of [...collectors, ...capped]) collector.stop();
		});

		it("does not count collectors that were bounded after they were created", () => {
			const client = makeClient();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			// a bound that depends on state resolved after construction. The hub classified these as
			// unbounded when they were added and never looked again, so twelve collectors that all
			// stop after a minute still got told none of them would ever stop on their own.
			const collectors = Array.from({ length: 12 }, () => {
				const collector = createCollector(client, ClientEvents.ButtonUsed);
				collector.resetTimer({ time: 60_000 });
				return collector;
			});

			expect(warn).not.toHaveBeenCalled();

			for (const collector of collectors) collector.stop();
		});

		it("can be disabled with maxUnbounded = 0", () => {
			const client = makeClient();
			client.collectors.maxUnbounded = 0;
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			const collectors = Array.from({ length: 30 }, () =>
				createCollector(client, ClientEvents.ButtonUsed)
			);

			expect(warn).not.toHaveBeenCalled();

			for (const collector of collectors) collector.stop();
		});
	});

	describe("acknowledgement state", () => {
		it("marks the interaction acknowledged synchronously, before the request settles", () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			// deliberately not awaited - the flag has to be set by the time `reply()` yields, or a
			// second responder in the same tick would still see `false` and fire
			void interaction.reply("hi");

			expect(interaction.acknowledged).toBe(true);
		});

		// the response methods are `async`, so their guards surface as rejections - the flag set
		// itself still happens synchronously, which is what closes the race
		it("rejects a second response, naming the method that already answered", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			await interaction.reply("first");

			await expect(interaction.update("second")).rejects.toThrow(/already acknowledged by `reply\(\)`/);
			await expect(interaction.deferReply()).rejects.toThrow(/already acknowledged by `reply\(\)`/);
		});

		it("points at `claimed` when the second responder collided with a collector", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);
			interaction.claimed = true;

			await interaction.reply("first");

			await expect(interaction.reply("second")).rejects.toThrow(/check\s+`interaction\.claimed`/);
		});

		it("rejects a follow-up before there is anything to follow up on", async () => {
			const client = makeClient();
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			await expect(interaction.followUp("hi")).rejects.toThrow(/needs this interaction to have been responded to/);
			await expect(interaction.editReply("hi")).rejects.toThrow(/needs this interaction to have been responded to/);
		});

		it("leaves the interaction answerable when the payload was rejected before sending", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			// a payload rejected by local validation never reaches Discord, so it must not burn
			// the one response the interaction gets - a corrected retry has to be allowed through
			await expect(interaction.reply({
				content: "hi",
				attachments: [{ name: "same.txt", data: "a" }, { name: "same.txt", data: "b" }],
			})).rejects.toThrow(/Duplicate attachment name/);

			expect(post).not.toHaveBeenCalled();
			expect(interaction.acknowledged).toBe(false);

			await interaction.reply("corrected");
			expect(interaction.acknowledged).toBe(true);
		});

		it("names the response methods the interaction's own type actually has", async () => {
			const client = makeClient();
			const button = new ButtonInteraction(client, buttonPayload() as never);
			const command = new SlashCommandInteraction(client, slashPayload() as never);

			// a component interaction answers with `update()`; telling its author to call `reply()`
			// sends them to a method that works but replaces the message they meant to edit
			await expect(button.followUp("hi")).rejects.toThrow(/call `update\(\)` or `deferUpdate\(\)`/);
			await expect(command.followUp("hi")).rejects.toThrow(/call `reply\(\)` or `deferReply\(\)`/);
		});

		// #3: the acknowledgement is a bet that the request will land, and has to be taken back when
		// it does not - otherwise one 503 costs the interaction its entire 15 minute token window
		it("takes the acknowledgement back when the request itself fails", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post")
				.mockRejectedValueOnce(new Error("Discord API Error: Service Unavailable (0)"))
				.mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			await expect(interaction.reply("hi")).rejects.toThrow(/Service Unavailable/);
			expect(interaction.acknowledged).toBe(false);

			// nothing reached Discord, so this is the interaction's first response, not its second
			await interaction.reply("retry");
			expect(interaction.acknowledged).toBe(true);
			expect(post).toHaveBeenCalledTimes(2);
		});

		// the other half of #3: Discord answering `40060` means the response *did* land, so taking
		// the acknowledgement back there locks an interaction that has a real response waiting
		it("keeps the acknowledgement when Discord says the response already landed", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockRejectedValue(new DiscordAPIError(
				"Discord API Error: Interaction has already been acknowledged (40060)", 400, 40060
			));
			const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(messagePayload());
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			// the shape of a lost callback response that `Rest` retried: the defer exists on
			// Discord's side, so `editReply` is the only way left to answer it
			await expect(interaction.deferReply()).rejects.toThrow(/40060/);
			expect(interaction.acknowledged).toBe(true);

			await expect(interaction.editReply("after")).resolves.toBeInstanceOf(Message);
			expect(post).toHaveBeenCalledTimes(1);
			expect(patch).toHaveBeenCalledTimes(1);
		});

		it("takes it back for every response method, not just `reply`", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockRejectedValue(new Error("network down"));
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			for (const respond of [
				() => interaction.deferReply(),
				() => interaction.update("edited"),
				() => interaction.deferUpdate(),
				() => interaction.showModal(modalPayload()),
			]) {
				await expect(respond()).rejects.toThrow(/network down/);
				expect(interaction.acknowledged).toBe(false);
			}
		});

		// #7: `acknowledged` and "has a message to edit" are different questions - a modal answers
		// the interaction without creating one, so `@original` 10008s
		it("refuses to edit or delete a response that showing a modal never created", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(undefined);
			const remove = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			await interaction.showModal(modalPayload());

			await expect(interaction.editReply("hi")).rejects.toThrow(/cannot be used after `showModal\(\)`/);
			await expect(interaction.deleteReply()).rejects.toThrow(/cannot be used after `showModal\(\)`/);
			expect(patch).not.toHaveBeenCalled();
			expect(remove).not.toHaveBeenCalled();
		});

		it("only blames a modal when a modal is what acknowledged the interaction", () => {
			const client = makeClient();
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			// `respond()` (autocomplete) sets the same "acknowledged, nothing to edit" state that
			// `showModal()` does. Autocomplete has no edit routes of its own to reach the guard
			// through, so this drives it directly rather than through a response method.
			interaction.acknowledge("respond", false);

			// pointing its author at "the interaction Discord sends when the modal is submitted"
			// sends them looking for an event that is never coming
			expect(() => interaction.assertEditable("editReply")).toThrow(/cannot be used after `respond\(\)`/);
			expect(() => interaction.assertEditable("editReply")).not.toThrow(/modal/);
		});

		// deliberately still allowed: a follow-up creates its own message rather than addressing
		// `@original`, so unlike `editReply` it has something to send even after a modal
		it("still allows a follow-up after showing a modal", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(messagePayload());
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			await interaction.showModal(modalPayload());
			await interaction.followUp("meanwhile");

			expect(post).toHaveBeenLastCalledWith(
				`/webhooks/${interaction.applicationId}/${interaction.token}`,
				{ content: "meanwhile" },
				undefined,
				[]
			);
		});
	});

	// #14: the guards above only prove what they refuse. These prove they let the real sequences
	// through - without them, an `acknowledge()` that stopped recording state would still pass the
	// whole suite while every `deferReply()` -> `editReply()` bot flow threw.
	describe("acknowledged response flows", () => {
		it("allows `editReply` after each acknowledgement that leaves a message behind", async () => {
			const client = makeClient();
			vi.spyOn(client.rest, "post").mockResolvedValue(undefined);
			const patch = vi.spyOn(client.rest, "patch").mockResolvedValue(messagePayload());

			for (const respond of [
				(interaction: ButtonInteraction) => interaction.reply("first"),
				(interaction: ButtonInteraction) => interaction.deferReply(),
				(interaction: ButtonInteraction) => interaction.update("edited"),
				(interaction: ButtonInteraction) => interaction.deferUpdate(),
			]) {
				const interaction = new ButtonInteraction(client, buttonPayload() as never);
				await respond(interaction);

				await expect(interaction.editReply("after")).resolves.toBeInstanceOf(Message);
			}

			expect(patch).toHaveBeenCalledTimes(4);
			expect(patch).toHaveBeenLastCalledWith(
				expect.stringMatching(/\/messages\/@original$/),
				{ content: "after" },
				undefined,
				[]
			);
		});

		it("allows `followUp` and `deleteReply` after a reply", async () => {
			const client = makeClient();
			const post = vi.spyOn(client.rest, "post").mockResolvedValue(messagePayload());
			const remove = vi.spyOn(client.rest, "delete").mockResolvedValue(undefined);
			const interaction = new ButtonInteraction(client, buttonPayload() as never);

			await interaction.reply("first");

			await expect(interaction.followUp("second")).resolves.toBeInstanceOf(Message);
			await interaction.deleteReply();

			expect(post).toHaveBeenCalledTimes(2);
			expect(remove).toHaveBeenCalledWith(
				`/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`
			);
		});
	});

	describe("collectorDefaults", () => {
		it("applies client-level bounds to a collector that sets none", () => {
			const client = makeClient({ collectorDefaults: { time: 10_000 } });
			const collector = createCollector(client, ClientEvents.ButtonUsed);

			expect(collector.bounded).toBe(true);

			collector.stop();
		});

		it("lets a collector's own options win over the defaults", async () => {
			vi.useFakeTimers();
			const client = makeClient({ collectorDefaults: { time: 10_000 } });
			const collector = createCollector(client, ClientEvents.ButtonUsed, { time: 100 });
			const ended = vi.fn();
			collector.on("end", ended);

			await vi.advanceTimersByTimeAsync(150);

			expect(ended).toHaveBeenCalledWith([], "time");
		});

		it("leaves collectors unbounded when no defaults are configured", () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed);

			expect(collector.bounded).toBe(false);

			collector.stop();
		});

		it("does not reach the collectors the library creates for itself", async () => {
			// an inherited `idle` used to arm at construction and end `login`'s wait before READY,
			// which then reported a Discord outage that had not happened
			const client = makeClient({ collectorDefaults: { idle: 1 } });
			vi.spyOn(client.socket, "initialize").mockImplementation(() => {});

			const pending = client.login();
			// reaching the gateway-rejection branch at all is the assertion: had the 1ms idle
			// default reached login's waits, both would have ended during the pause below and the
			// race would have settled as "No ready event ... Discord may be having an outage"
			const assertion = expect(pending).rejects.toThrow(/Failed to connect to the gateway/);

			await new Promise<void>((resolve) => void setTimeout(() => resolve(), 20).unref());
			client.socket.emit(WSEvents.Disconnect, "closed by test", 1000);

			await assertion;
		});
	});

	describe("arrival order", () => {
		/** Two dispatches back-to-back with no await between them, exactly as `WSClient` does it */
		function dispatchBoth(client: Client, first: JSONObject, second: JSONObject): void {
			const dispatch = CreateDispatch();
			dispatch(client, GatewayEvents.InteractionCreate, first);
			dispatch(client, GatewayEvents.InteractionCreate, second);
		}

		it("emits interactions in the order they arrived when a filter suspends", async () => {
			const client = makeClient();

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: async (interaction) => {
					const delay = interaction.customId === "first" ? 30 : 1;
					await new Promise((resolve) => void setTimeout(resolve, delay).unref());
					return false;
				},
			});

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, (interaction) => seen.push(interaction.customId));

			dispatchBoth(client, buttonPayload("first"), buttonPayload("second"));
			await new Promise((resolve) => void setTimeout(resolve, 80).unref());

			// the second click's filter settles first, but it arrived second and so emits second -
			// otherwise a `max: 1` collector takes whichever filter won the race, not whichever
			// click the user actually made first
			expect(seen).toEqual(["first", "second"]);

			collector.stop();
		});

		it("emits interactions of different types in arrival order", async () => {
			const client = makeClient();

			// collectors on one event and none on the other: the button walks a deeper arbitration
			// chain than the command does, which was enough to reorder them even though every
			// filter here is synchronous
			const collectors = Array.from({ length: 3 }, () =>
				createCollector(client, ClientEvents.ButtonUsed, { filter: () => false })
			);

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, () => seen.push("button"));
			client.on(ClientEvents.SlashCommandUsed, () => seen.push("slash"));

			dispatchBoth(client, buttonPayload(), slashPayload());
			await new Promise((resolve) => setImmediate(resolve));

			expect(seen).toEqual(["button", "slash"]);

			for (const collector of collectors) collector.stop();
		});

		it("emits inside the dispatch when no filter suspends", () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed, { filter: () => false });

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, () => seen.push("button"));

			CreateDispatch()(client, GatewayEvents.InteractionCreate, buttonPayload());

			// deliberately not awaited: arbitration that never suspends stays on the fast path and
			// emits synchronously, as dispatch did before collectors got first refusal
			expect(seen).toEqual(["button"]);

			collector.stop();
		});

		it("does not hold an interaction no collector can claim behind a slow filter", async () => {
			const client = makeClient();

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: async () => {
					await new Promise((resolve) => void setTimeout(resolve, 30).unref());
					return false;
				},
			});

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, () => seen.push("button"));
			client.on(ClientEvents.SlashCommandUsed, () => seen.push("slash"));

			dispatchBoth(client, buttonPayload(), slashPayload());

			// deliberately not awaited: nothing collects `SlashCommandUsed`, so the command has no
			// arbitration to wait on and emits inside its own dispatch. Queued behind the button's
			// filter it would blow Discord's three second deadline on a command that has nothing to
			// do with the collector.
			expect(seen).toEqual(["slash"]);

			await new Promise((resolve) => void setTimeout(resolve, 60).unref());
			expect(seen).toEqual(["slash", "button"]);

			collector.stop();
		});

		it("keeps one order across types while a generic collector could claim any of them", async () => {
			const client = makeClient();

			// an `InteractionCreate` collector can take a command as readily as a click, so the two
			// really can contend and the ordering guarantee has to span both
			const collector = createCollector(client, ClientEvents.InteractionCreate, {
				filter: async (interaction) => {
					const delay = interaction instanceof ButtonInteraction ? 30 : 1;
					await new Promise((resolve) => void setTimeout(resolve, delay).unref());
					return false;
				},
			});

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, () => seen.push("button"));
			client.on(ClientEvents.SlashCommandUsed, () => seen.push("slash"));

			dispatchBoth(client, buttonPayload(), slashPayload());
			await new Promise((resolve) => void setTimeout(resolve, 80).unref());

			expect(seen).toEqual(["button", "slash"]);

			collector.stop();
		});

		it("drops interactions still queued when the client is destroyed", async () => {
			const client = makeClient();

			let release: ((passed: boolean) => void) | undefined;
			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: () => new Promise<boolean>((resolve) => { release = resolve; }),
			});

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, (interaction) => seen.push(interaction.customId));

			dispatchBoth(client, buttonPayload("first"), buttonPayload("second"));

			// what `client.destroy()` calls, by which point it has already emptied the guild and
			// user caches
			client.collectors.clear();
			release?.(false);
			await new Promise((resolve) => setImmediate(resolve));

			// "first" was already being arbitrated and still finishes; "second" was queued behind it
			// and would otherwise be emitted into a half-torn-down client
			expect(seen).toEqual(["first"]);
			expect(collector.ended).toBe(true);
		});

		it("keeps dispatching after a handler throws", async () => {
			const client = makeClient();
			const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

			const collector = createCollector(client, ClientEvents.ButtonUsed, {
				filter: async () => {
					await new Promise((resolve) => void setTimeout(resolve, 1).unref());
					return false;
				},
			});

			const seen: string[] = [];
			client.on(ClientEvents.ButtonUsed, (interaction) => {
				seen.push(interaction.customId);
				if (interaction.customId === "first") throw new Error("boom");
			});

			dispatchBoth(client, buttonPayload("first"), buttonPayload("second"));
			await new Promise((resolve) => void setTimeout(resolve, 40).unref());

			// the queue is what every later interaction chains onto, so a throwing handler must not
			// be able to reject it and take every interaction behind it down with it
			expect(seen).toEqual(["first", "second"]);
			expect(error).toHaveBeenCalledTimes(1);

			collector.stop();
		});
	});

	describe("arbitration outside the dispatcher", () => {
		it("lets only the first collector claim a manually emitted interaction", () => {
			const client = makeClient();
			const first = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });
			const second = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			const interaction = new ButtonInteraction(client, buttonPayload() as never);
			client.emit(ClientEvents.ButtonUsed, interaction);

			// the hub's listener used to fan out to every collector, so both of these collected and
			// both replied - the second one getting `40060 already acknowledged` back
			expect(first.collected).toHaveLength(1);
			expect(second.collected).toHaveLength(0);
			expect(interaction.claimed).toBe(true);

			first.stop();
			second.stop();
		});

		it("arbitrates every interaction event, not just button clicks", () => {
			const client = makeClient();
			const first = createCollector(client, ClientEvents.SlashCommandUsed, { filter: () => true });
			const second = createCollector(client, ClientEvents.SlashCommandUsed, { filter: () => true });

			const interaction = new SlashCommandInteraction(client, slashPayload() as never);
			client.emit(ClientEvents.SlashCommandUsed, interaction);

			expect(first.collected).toHaveLength(1);
			expect(second.collected).toHaveLength(0);

			first.stop();
			second.stop();
		});

		it("gives one interaction one claimer across two emits", () => {
			const client = makeClient();
			const generic = createCollector(client, ClientEvents.InteractionCreate, { filter: () => true });
			const concrete = createCollector(client, ClientEvents.ButtonUsed, { filter: () => true });

			const interaction = new ButtonInteraction(client, buttonPayload() as never);
			client.emit(ClientEvents.InteractionCreate, interaction);
			client.emit(ClientEvents.ButtonUsed, interaction);

			// one initial response means one claimer, however many events carried it
			expect(generic.collected).toHaveLength(1);
			expect(concrete.collected).toHaveLength(0);

			generic.stop();
			concrete.stop();
		});

		it("still fans a non-interaction event out to every collector", () => {
			const client = makeClient();
			const first = createCollector(client, ClientEvents.MessageCreate, { filter: () => true });
			const second = createCollector(client, ClientEvents.MessageCreate, { filter: () => true });

			client.emit(ClientEvents.MessageCreate, {} as never);

			// there is no exclusive response to arbitrate over a message, so every collector that
			// wants it gets it - exclusivity is an interaction concept, not a collector one
			expect(first.collected).toHaveLength(1);
			expect(second.collected).toHaveLength(1);

			first.stop();
			second.stop();
		});
	});

	describe("bounded", () => {
		it("counts an idle-only collector as bounded", () => {
			const client = makeClient();
			const collector = createCollector(client, ClientEvents.ButtonUsed, { idle: 1000 });

			// `idle` stops a collector on its own just as `time` and `max` do
			expect(collector.bounded).toBe(true);

			collector.stop();
		});

		it("does not warn about accumulating idle-only collectors", () => {
			const client = makeClient();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

			const collectors = Array.from({ length: 30 }, () =>
				createCollector(client, ClientEvents.ButtonUsed, { idle: 60_000 })
			);

			expect(warn).not.toHaveBeenCalled();

			for (const collector of collectors) collector.stop();
		});
	});
});
