import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { WSClient, WSEvents } from "../WSClient.js";
import { GatewayEvents, GatewayIntents, GatewayOpCodes, GatewayPayload } from "../Types/DiscordGateway.js";
import { ActivityType, DiscordUser, Status } from "../Types/DiscordAPITypes.js";

type MessageHandler = (data: { toString(): string }) => void;
type CloseHandler = (code?: number) => void;
type ErrorHandler = (err: Error) => void;

const wsMockState = vi.hoisted(() => {
	class MockWebSocket {
		sent: string[] = [];
		url: string;
		#messageHandlers: MessageHandler[] = [];
		#closeHandlers: CloseHandler[] = [];
		#errorHandlers: ErrorHandler[] = [];

		constructor(url: string) {
			this.url = url;
			wsMockState.instances.push(this);
		}

		on(event: "message" | "close" | "error", handler: MessageHandler | CloseHandler | ErrorHandler): void {
			if (event === "message") {
				this.#messageHandlers.push(handler as MessageHandler);
				return;
			}
			if (event === "error") {
				this.#errorHandlers.push(handler as ErrorHandler);
				return;
			}

			this.#closeHandlers.push(handler as CloseHandler);
		}

		emitError(err: Error): void {
			for (const handler of this.#errorHandlers) {
				handler(err);
			}
		}

		send(payload: string): void {
			this.sent.push(payload);
		}

		emitMessage(payload: GatewayPayload): void {
			this.emitRaw(JSON.stringify(payload));
		}

		emitRaw(packet: string): void {
			for (const handler of this.#messageHandlers) {
				handler({
					toString: () => packet
				});
			}
		}

		close(code?: number): void {
			for (const handler of this.#closeHandlers) {
				handler(code);
			}
		}

		removeAllListeners(): void {
			this.#messageHandlers = [];
			this.#closeHandlers = [];
			this.#errorHandlers = [];
		}
	}

	return {
		MockWebSocket,
		instances: [] as InstanceType<typeof MockWebSocket>[]
	};
});

vi.mock("ws", () => ({
	default: wsMockState.MockWebSocket
}));

function createUser(id = "user-1"): DiscordUser {
	return {
		id,
		username: "tester",
		discriminator: "0001",
		global_name: "tester",
		avatar: null
	};
}

function createReadyPayload(user: DiscordUser): Record<string, unknown> {
	return {
		v: 10,
		user_settings: null,
		user,
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

describe("WSClient lifecycle", () => {
	beforeEach(() => {
		wsMockState.instances.length = 0;
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("throws when initialized without a token", () => {
		const socket = new WSClient({} as Client, {});

		expect(() => socket.initialize()).toThrow(/No token provided/);
	});

	it("throws when sending before initialization", () => {
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");

		expect(() => socket.send({ op: GatewayOpCodes.Heartbeat, d: null, s: null, t: null })).toThrow(/websocket client not initialized/i);
	});

	it("appends gateway version and encoding to the connection URL", () => {
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");

		socket.initialize();

		expect(wsMockState.instances[0]!.url).toBe("wss://gateway.discord.gg?v=10&encoding=json");
	});

	it("appends gateway version and encoding to the resume URL", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		client.socket.initialize();
		wsMockState.instances[0]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 1,
			t: GatewayEvents.Ready
		});

		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.Reconnect, d: null, s: null, t: null });
		vi.advanceTimersByTime(0);

		expect(wsMockState.instances[1]!.url).toBe("wss://gateway.discord.gg?v=10&encoding=json");
	});

	it("does not crash the process when the socket emits an error", () => {
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");
		const errorSpy = vi.fn();
		socket.on(WSEvents.Error, errorSpy);

		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;
		const err = new Error("ECONNRESET");

		expect(() => mockSocket.emitError(err)).not.toThrow();
		expect(errorSpy).toHaveBeenCalledWith(err);
	});

	it("clears the stale sequence number on a non-resumable InvalidSession", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, ws: { jitterOverride: 1 } });

		client.socket.initialize();
		let mockSocket = wsMockState.instances[0]!;
		mockSocket.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 42,
			t: GatewayEvents.Ready
		});

		mockSocket.emitMessage({ op: GatewayOpCodes.InvalidSession, d: false, s: null, t: null });
		// op 9 waits out its mandated 1-5s before reconnecting
		vi.advanceTimersByTime(5000);

		mockSocket = wsMockState.instances[1]!;
		mockSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 1000 },
			s: null,
			t: null
		});

		mockSocket.sent.length = 0;
		// jitterOverride: 1 => first heartbeat fires after the full interval
		vi.advanceTimersByTime(1000);

		const heartbeatPayload = mockSocket.sent
			.map((raw) => JSON.parse(raw) as GatewayPayload)
			.find((payload) => payload.op === GatewayOpCodes.Heartbeat);
		expect(heartbeatPayload?.d).toBeNull();
	});

	it("drops a malformed frame instead of throwing", () => {
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");
		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;

		expect(() => mockSocket.emitRaw("not json{")).not.toThrow();

		mockSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 45_000 },
			s: null,
			t: null
		});
		expect(socket.heartbeatInterval).toBe(45_000);
	});

	it("handles HELLO by sending identify and scheduling heartbeats", async () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on(WSEvents.Heartbeat, heartbeatSpy);

		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;
		mockSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 100 },
			s: null,
			t: null
		});

		expect(socket.heartbeatInterval).toBe(100);
		expect(mockSocket.sent).toHaveLength(1);
		expect(JSON.parse(mockSocket.sent[0]!) as GatewayPayload).toMatchObject({ op: GatewayOpCodes.Identify });

		await vi.advanceTimersByTimeAsync(100);

		expect(heartbeatSpy).toHaveBeenCalledTimes(1);
		expect(JSON.parse(mockSocket.sent[1]!) as GatewayPayload).toMatchObject({ op: GatewayOpCodes.Heartbeat });
	});

	it("applies jitter to the first heartbeat only, not every heartbeat period", async () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 0.1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on(WSEvents.Heartbeat, heartbeatSpy);

		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;
		mockSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 1000 },
			s: null,
			t: null
		});

		// first beat should fire at interval * jitter (100ms), not at the full interval
		await vi.advanceTimersByTimeAsync(100);
		expect(heartbeatSpy).toHaveBeenCalledTimes(1);
		mockSocket.emitMessage({ op: GatewayOpCodes.HeartbeatACK, d: null, s: null, t: null });

		// subsequent beats should be spaced by the full interval (1000ms), not interval * jitter again
		await vi.advanceTimersByTimeAsync(900);
		expect(heartbeatSpy).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(100);
		expect(heartbeatSpy).toHaveBeenCalledTimes(2);
	});

	it("marks client ready after receiving READY dispatch", () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds
		});
		client.socket.initialize();
		const mockSocket = wsMockState.instances[0]!;
		const user = createUser();

		mockSocket.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(user),
			s: 1,
			t: GatewayEvents.Ready
		});

		expect(client.socket.ready).toBe(true);
		expect(client.user?.id).toBe(user.id);
	});

	it("login() does not resolve until the READY dispatch is received", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds
		});

		let resolved = false;
		const loginPromise = client.login().then(() => {
			resolved = true;
		});
		const mockSocket = wsMockState.instances[0]!;

		mockSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 45_000 },
			s: null,
			t: null
		});
		await Promise.resolve();

		expect(resolved).toBe(false);
		expect(client.socket.ready).toBe(false);

		mockSocket.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 1,
			t: GatewayEvents.Ready
		});
		await loginPromise;

		expect(resolved).toBe(true);
		expect(client.socket.ready).toBe(true);
	});

	it("login() rejects with Discord's reason when the token is rejected", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds
		});

		const loginPromise = client.login();
		// 4004 is fatal, so waiting out the full ten second timeout would only produce a misleading error
		wsMockState.instances[0]!.close(4004);

		await expect(loginPromise).rejects.toThrow("4004");
	});

	it("does not send presence updates from setStatus()/setStatusMessage() until login() completes", async () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds
		});

		const loginPromise = client.login();
		const mockSocket = wsMockState.instances[0]!;

		client.setStatus(Status.IDLE);
		client.setStatusMessage(ActivityType.PLAYING, "Cool Game");

		expect(mockSocket.sent.some((raw) => (JSON.parse(raw) as GatewayPayload).op === GatewayOpCodes.PresenceUpdate)).toBe(false);

		mockSocket.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 1,
			t: GatewayEvents.Ready
		});
		await loginPromise;

		client.setStatus(Status.DND);

		const presencePayloads = mockSocket.sent
			.map((raw) => JSON.parse(raw) as GatewayPayload)
			.filter((payload) => payload.op === GatewayOpCodes.PresenceUpdate);
		expect(presencePayloads.length).toBeGreaterThan(0);
		expect((presencePayloads.at(-1)!.d as Record<string, unknown>).status).toBe(Status.DND);
	});

	it("resets ready state when socket closes", () => {
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds
		});
		client.socket.ready = true;
		client.socket.initialize();
		const mockSocket = wsMockState.instances[0]!;

		mockSocket.close();

		expect(client.socket.ready).toBe(false);
		expect(client.socket.heartbeatInterval).toBe(-1);
	});

	it("reconnects automatically after an unexpected socket close", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");
		socket.initialize();

		expect(wsMockState.instances).toHaveLength(1);

		wsMockState.instances[0]!.close();
		vi.advanceTimersByTime(0);

		expect(wsMockState.instances).toHaveLength(2);
	});

	it("becomes ready again after a RESUMED dispatch following a resume", () => {
		vi.useFakeTimers();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });
		const socket = client.socket;
		const resumedSpy = vi.fn();
		socket.on(WSEvents.Resumed, resumedSpy);

		socket.initialize();
		const firstSocket = wsMockState.instances[0]!;
		firstSocket.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 1,
			t: GatewayEvents.Ready
		});
		expect(socket.ready).toBe(true);

		// gateway asks for a reconnect+resume
		firstSocket.emitMessage({ op: GatewayOpCodes.Reconnect, d: null, s: null, t: null });
		expect(socket.ready).toBe(false);
		vi.advanceTimersByTime(0);
		expect(wsMockState.instances).toHaveLength(2);

		const secondSocket = wsMockState.instances[1]!;
		secondSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 45_000 },
			s: null,
			t: null
		});
		expect(secondSocket.sent.map((raw) => (JSON.parse(raw) as GatewayPayload).op)).toContain(GatewayOpCodes.Resume);

		secondSocket.emitMessage({ op: GatewayOpCodes.Dispatch, d: null, s: 2, t: "RESUMED" });

		expect(socket.ready).toBe(true);
		expect(resumedSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("RESUMED"));
	});

	it("does not reconnect after destroy()", () => {
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");
		socket.initialize();

		expect(wsMockState.instances).toHaveLength(1);

		socket.destroy();

		expect(wsMockState.instances).toHaveLength(1);
	});

	it("backs off exponentially between consecutive reconnects", () => {
		vi.useFakeTimers();
		// full jitter multiplies the backoff by Math.random(), so pin it to the top of the window
		vi.spyOn(Math, "random").mockReturnValue(1);
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();

		// first drop reconnects immediately - a one-off blip should not cost the user a second of downtime
		wsMockState.instances[0]!.close();
		vi.advanceTimersByTime(0);
		expect(wsMockState.instances).toHaveLength(2);

		// second consecutive drop waits a second
		wsMockState.instances[1]!.close();
		vi.advanceTimersByTime(999);
		expect(wsMockState.instances).toHaveLength(2);
		vi.advanceTimersByTime(1);
		expect(wsMockState.instances).toHaveLength(3);

		// third doubles it
		wsMockState.instances[2]!.close();
		vi.advanceTimersByTime(1999);
		expect(wsMockState.instances).toHaveLength(3);
		vi.advanceTimersByTime(1);
		expect(wsMockState.instances).toHaveLength(4);
	});

	it("resets the backoff once a connection reaches READY", () => {
		vi.useFakeTimers();
		vi.spyOn(Math, "random").mockReturnValue(1);
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, ws: { jitterOverride: 1 } });
		client.socket.initialize();

		wsMockState.instances[0]!.close();
		vi.advanceTimersByTime(0);
		wsMockState.instances[1]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 1,
			t: GatewayEvents.Ready
		});

		// the successful connection wiped the attempt counter, so this drop reconnects immediately again
		wsMockState.instances[1]!.close();
		vi.advanceTimersByTime(0);
		expect(wsMockState.instances).toHaveLength(3);
	});

	it("gives up after maxReconnectAttempts consecutive failures", () => {
		vi.useFakeTimers();
		vi.spyOn(Math, "random").mockReturnValue(0);
		const socket = new WSClient({} as Client, { jitterOverride: 1, maxReconnectAttempts: 2 });
		socket.setToken("token");
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);
		socket.initialize();

		for (let attempt = 0; attempt < 2; attempt++) {
			wsMockState.instances.at(-1)!.close();
			vi.advanceTimersByTime(0);
		}
		expect(wsMockState.instances).toHaveLength(3);
		expect(disconnectSpy).not.toHaveBeenCalled();

		wsMockState.instances.at(-1)!.close();
		vi.advanceTimersByTime(60_000);

		expect(wsMockState.instances).toHaveLength(3);
		expect(disconnectSpy).toHaveBeenCalledWith(expect.stringContaining("2 attempts"), null);
		expect(socket.ready).toBe(false);
	});

	it("stops reconnecting on a fatal close code instead of spinning", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("bad-token");
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);
		socket.initialize();

		// 4004: authentication failed - the token is wrong, so every retry sends the same bad IDENTIFY
		wsMockState.instances[0]!.close(4004);
		vi.advanceTimersByTime(60_000);

		expect(wsMockState.instances).toHaveLength(1);
		expect(disconnectSpy).toHaveBeenCalledWith(expect.stringContaining("4004"), 4004);
	});

	it("stops reconnecting when the requested intents are disallowed", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);
		socket.initialize();

		// 4014: a privileged intent was requested without enabling it in the Developer Portal
		wsMockState.instances[0]!.close(4014);
		vi.advanceTimersByTime(60_000);

		expect(wsMockState.instances).toHaveLength(1);
		expect(disconnectSpy).toHaveBeenCalledWith(expect.stringContaining("4014"), 4014);
	});

	it("identifies instead of resuming after a session-invalidating close code", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, ws: { jitterOverride: 1 } });
		client.socket.initialize();
		wsMockState.instances[0]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 7,
			t: GatewayEvents.Ready
		});

		// 4009: the session timed out, so the stored session_id can no longer be resumed
		wsMockState.instances[0]!.close(4009);
		vi.advanceTimersByTime(0);

		const secondSocket = wsMockState.instances[1]!;
		secondSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });

		const ops = secondSocket.sent.map((raw) => (JSON.parse(raw) as GatewayPayload).op);
		expect(ops).toContain(GatewayOpCodes.Identify);
		expect(ops).not.toContain(GatewayOpCodes.Resume);
	});

	it("waits out the mandated delay before re-identifying on InvalidSession", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();

		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.InvalidSession, d: false, s: null, t: null });

		// Discord requires a randomized 1-5s wait; reconnecting sooner burns the session start limit
		vi.advanceTimersByTime(999);
		expect(wsMockState.instances).toHaveLength(1);

		vi.advanceTimersByTime(4001);
		expect(wsMockState.instances).toHaveLength(2);
	});
});