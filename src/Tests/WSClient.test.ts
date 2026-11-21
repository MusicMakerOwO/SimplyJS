import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { WSClient, WSEvents } from "../WSClient.js";
import { GatewayEvents, GatewayIntents, GatewayOpCodes, GatewayPayload } from "../Types/DiscordGateway.js";
import { ActivityType, DiscordUser, Status } from "../Types/DiscordAPITypes.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

const wsMockState = vi.hoisted(() => {
	/**
	 * Stands in for the runtime's global `WebSocket`. It is a real `EventTarget`, so listener options
	 * such as `signal` behave exactly as they do on Node, Bun, and Deno.
	 */
	class MockWebSocket extends EventTarget {
		sent: string[] = [];
		url: string;
		binaryType: string = "blob";
		/** Every code this socket was closed with, in order - `undefined` for a bare `close()` */
		closeCodes: (number | undefined)[] = [];

		constructor(url: string) {
			super();
			this.url = url;
			wsMockState.instances.push(this);
		}

		send(payload: string): void {
			this.sent.push(payload);
		}

		emitMessage(payload: GatewayPayload): void {
			this.emitRaw(JSON.stringify(payload));
		}

		/** Delivers a frame as-is: a string for a text frame, an `ArrayBuffer` for a binary one */
		emitRaw(packet: string | ArrayBuffer): void {
			this.dispatchEvent(new MessageEvent("message", { data: packet }));
		}

		/**
		 * Fires `error` the way a runtime does, with its own error (if any) on the event's `error`. Like
		 * Node 22 after a failed connect, no `close` follows; call {@link emitClose} for runtimes where one does.
		 */
		emitError(error?: unknown): void {
			this.dispatchEvent(Object.assign(new Event("error"), { error }));
		}

		/** Fires `close` without recording a {@link close} call - the runtime's own close, not one the client asked for */
		emitClose(code: number): void {
			this.dispatchEvent(Object.assign(new Event("close"), { code }));
		}

		/** Records the code and fires `close` synchronously, inside the call, which is what Bun does */
		close(code?: number): void {
			this.closeCodes.push(code);
			this.emitClose(code ?? 1005);
		}
	}

	return {
		MockWebSocket,
		instances: [] as InstanceType<typeof MockWebSocket>[]
	};
});

vi.stubGlobal("WebSocket", wsMockState.MockWebSocket);
afterAll(() => {
	vi.unstubAllGlobals();
});

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

	it("sends requestGuildMembers as an op 8 frame", () => {
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");
		socket.initialize();

		socket.requestGuildMembers({ guild_id: "guild-1", query: "", limit: 0, nonce: "abc" });

		expect(JSON.parse(wsMockState.instances[0]!.sent[0]!)).toEqual({
			op: GatewayOpCodes.RequestGuildMembers,
			d: { guild_id: "guild-1", query: "", limit: 0, nonce: "abc" },
			s: null,
			t: null
		});
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
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, {});
		socket.setToken("token");
		const errorSpy = vi.fn();
		socket.on(WSEvents.Error, errorSpy);

		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;
		const err = new Error("ECONNRESET");

		expect(() => mockSocket.emitError(err)).not.toThrow();
		expect(errorSpy).toHaveBeenCalledWith(err);
		socket.destroy();
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

		const emitSpy = vi.spyOn(client, "emit");
		secondSocket.emitMessage({ op: GatewayOpCodes.Dispatch, d: null, s: 2, t: "RESUMED" });

		expect(socket.ready).toBe(true);
		expect(resumedSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("RESUMED"));
		// RESUMED carries a null `d`, but still has to reach the dispatcher
		expect(emitSpy).toHaveBeenCalledWith(ClientEvents.Resumed);
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

	it("sends an out-of-cycle heartbeat when the gateway asks for one", () => {
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on(WSEvents.Heartbeat, heartbeatSpy);
		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;

		mockSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });
		mockSocket.sent.length = 0;
		// op 1 inbound is the gateway asking for a beat now rather than at the next interval
		mockSocket.emitMessage({ op: GatewayOpCodes.Heartbeat, d: null, s: 5, t: null });

		expect(heartbeatSpy).toHaveBeenCalledTimes(1);
		// the beat carries the last sequence number seen, which this frame's own `s` just advanced
		expect(JSON.parse(mockSocket.sent[0]!) as GatewayPayload).toMatchObject({
			op: GatewayOpCodes.Heartbeat,
			d: 5
		});
	});

	it("resumes rather than re-identifying on a resumable InvalidSession", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, ws: { jitterOverride: 1 } });
		const invalidSessionSpy = vi.fn();
		client.socket.on(WSEvents.InvalidSession, invalidSessionSpy);

		client.socket.initialize();
		wsMockState.instances[0]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: createReadyPayload(createUser()),
			s: 7,
			t: GatewayEvents.Ready
		});

		// `d: true` means the session survives - keep it and RESUME, rather than dropping it
		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.InvalidSession, d: true, s: null, t: null });
		expect(invalidSessionSpy).toHaveBeenCalledWith(true);
		vi.advanceTimersByTime(5000);

		const secondSocket = wsMockState.instances[1]!;
		secondSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });

		const resume = secondSocket.sent
			.map((raw) => JSON.parse(raw) as GatewayPayload)
			.find((payload) => payload.op === GatewayOpCodes.Resume);
		expect(resume?.d).toMatchObject({ session_id: "session-1", seq: 7 });
	});

	it("reconnects when the gateway never acknowledges a heartbeat", async () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on(WSEvents.Heartbeat, heartbeatSpy);
		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;

		mockSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 100 }, s: null, t: null });
		await vi.advanceTimersByTimeAsync(100);
		expect(heartbeatSpy).toHaveBeenCalledTimes(1);

		// no HeartbeatACK comes back, so the next beat finds the connection dead and reconnects
		// instead of sending into it
		await vi.advanceTimersByTimeAsync(100);

		expect(heartbeatSpy).toHaveBeenCalledTimes(1);
		expect(wsMockState.instances).toHaveLength(2);
	});

	it("stops heartbeating once the connection is gone", async () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on(WSEvents.Heartbeat, heartbeatSpy);
		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;

		mockSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 100 }, s: null, t: null });
		await vi.advanceTimersByTimeAsync(100);
		mockSocket.emitMessage({ op: GatewayOpCodes.HeartbeatACK, d: null, s: null, t: null });
		expect(heartbeatSpy).toHaveBeenCalledTimes(1);

		// the replacement connection sends no HELLO, so nothing should be beating on the old interval
		mockSocket.close();
		await vi.advanceTimersByTimeAsync(1000);

		expect(heartbeatSpy).toHaveBeenCalledTimes(1);
	});

	// destroy() clears the heartbeat timer itself *and* closes the socket, whose close handler tears
	// the same timer down - the redundancy is deliberate, since a real socket closes asynchronously
	// and could let one more beat through. This pins the observable contract the two add up to
	it("leaves nothing armed after destroy()", async () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on(WSEvents.Heartbeat, heartbeatSpy);
		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;

		mockSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 100 }, s: null, t: null });
		await vi.advanceTimersByTimeAsync(100);
		mockSocket.emitMessage({ op: GatewayOpCodes.HeartbeatACK, d: null, s: null, t: null });

		socket.destroy();

		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(1000);
		expect(heartbeatSpy).toHaveBeenCalledTimes(1);
	});

	it("cancels a reconnect that is still waiting out its backoff on destroy()", () => {
		vi.useFakeTimers();
		vi.spyOn(Math, "random").mockReturnValue(1);
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();

		// first drop reconnects immediately, the second has to wait a second - destroy() lands inside it
		wsMockState.instances[0]!.close();
		vi.advanceTimersByTime(0);
		wsMockState.instances[1]!.close();
		// the socket is already gone by now, so destroy() clearing this timer is the only thing that
		// can - counting them is what distinguishes a cancelled reconnect from one that still fires
		// and is merely ignored
		expect(vi.getTimerCount()).toBe(1);

		socket.destroy();

		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(60_000);
		expect(wsMockState.instances).toHaveLength(2);
	});

	it("keeps the process alive while a reconnect waits out its backoff", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();
		const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

		// once the socket is closed nothing else is ref'd, so an unref'd reconnect timer lets node exit
		wsMockState.instances[0]!.close();

		const timer = setTimeoutSpy.mock.results.at(-1)!.value as NodeJS.Timeout;
		expect(timer.hasRef()).toBe(true);

		socket.destroy();
	});

	it("supersedes a pending reconnect when initialize() is called directly", () => {
		vi.useFakeTimers();
		vi.spyOn(Math, "random").mockReturnValue(1);
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();

		wsMockState.instances[0]!.close();
		vi.advanceTimersByTime(0);
		wsMockState.instances[1]!.close();

		expect(vi.getTimerCount()).toBe(1);

		// connecting now makes the queued attempt redundant, so it is disarmed rather than left to
		// fire into an `initialize()` that would early-return on the socket it already has
		socket.initialize();

		expect(wsMockState.instances).toHaveLength(3);
		// the one timer left is the new connection's HELLO timeout, not the queued reconnect
		expect(vi.getTimerCount()).toBe(1);

		// well past the reconnect's 1s backoff, and short of the 30s HELLO timeout
		vi.advanceTimersByTime(29_000);
		expect(wsMockState.instances).toHaveLength(3);
		socket.destroy();
	});

	it("reconnects to the resume url the READY dispatch supplied", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, ws: { jitterOverride: 1 } });
		client.socket.initialize();
		expect(wsMockState.instances[0]!.url).toBe("wss://gateway.discord.gg?v=10&encoding=json");

		wsMockState.instances[0]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: { ...createReadyPayload(createUser()), resume_gateway_url: "wss://resume.example.com" },
			s: 1,
			t: GatewayEvents.Ready
		});

		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.Reconnect, d: null, s: null, t: null });
		vi.advanceTimersByTime(0);

		// a resume has to go back to the url the session was handed, not the generic gateway
		expect(wsMockState.instances[1]!.url).toBe("wss://resume.example.com?v=10&encoding=json");
	});

	it("measures ping from a heartbeat to its ACK", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();
		const mock = wsMockState.instances[0]!;
		const latencies: number[] = [];
		socket.on(WSEvents.HeartbeatAck, (latency) => latencies.push(latency));
		expect(socket.ping).toBe(-1);

		// the gateway asking for a heartbeat sends one immediately
		mock.emitMessage({ op: GatewayOpCodes.Heartbeat, d: null, s: null, t: null });
		vi.advanceTimersByTime(42);
		mock.emitMessage({ op: GatewayOpCodes.HeartbeatACK, d: null, s: null, t: null });

		expect(socket.ping).toBe(42);
		expect(latencies).toEqual([42]);

		// a stray ACK with no heartbeat outstanding leaves the last measurement alone
		vi.advanceTimersByTime(1_000);
		mock.emitMessage({ op: GatewayOpCodes.HeartbeatACK, d: null, s: null, t: null });
		expect(socket.ping).toBe(42);
		socket.destroy();
	});

	it("connects and resumes at gatewayUrl, ignoring the resume url from READY", () => {
		vi.useFakeTimers();
		const client = new Client({
			token: "token",
			intents: GatewayIntents.Guilds,
			ws: { jitterOverride: 1, gatewayUrl: "ws://127.0.0.1:9000" }
		});
		client.socket.initialize();
		expect(wsMockState.instances[0]!.url).toBe("ws://127.0.0.1:9000?v=10&encoding=json");

		wsMockState.instances[0]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: { ...createReadyPayload(createUser()), resume_gateway_url: "wss://resume.example.com" },
			s: 1,
			t: GatewayEvents.Ready
		});
		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.Reconnect, d: null, s: null, t: null });
		vi.advanceTimersByTime(0);

		// a proxied client that resumed at Discord's url would bypass its own proxy
		expect(wsMockState.instances[1]!.url).toBe("ws://127.0.0.1:9000?v=10&encoding=json");
		client.socket.destroy();
	});

	it("closes with a resumable code when it tears down to reconnect", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();

		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.Reconnect, d: null, s: null, t: null });

		// 1000/1001 would log the bot out and make the resume fail
		expect(wsMockState.instances[0]!.closeCodes).toEqual([4200]);
		socket.destroy();
	});

	it("logs out with 1000 on destroy() and is not ready by the time it returns", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		socket.initialize();
		const mock = wsMockState.instances[0]!;
		mock.emitMessage({ op: GatewayOpCodes.Dispatch, d: createReadyPayload(createUser()), s: 1, t: GatewayEvents.Ready });
		expect(socket.ready).toBe(true);

		socket.destroy();

		// Client.destroy() polls `ready`, so it has to drop without waiting on a close event that a
		// dead peer may never send
		expect(socket.ready).toBe(false);
		expect(mock.closeCodes).toEqual([1000]);
	});

	it("drops the session on destroy() so the next connection identifies", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, ws: { jitterOverride: 1 } });
		const socket = client.socket;
		socket.initialize();
		wsMockState.instances[0]!.emitMessage({
			op: GatewayOpCodes.Dispatch,
			d: { ...createReadyPayload(createUser()), resume_gateway_url: "wss://resume.example.com" },
			s: 7,
			t: GatewayEvents.Ready
		});

		socket.destroy();
		socket.initialize();

		const secondSocket = wsMockState.instances[1]!;
		expect(secondSocket.url).toBe("wss://gateway.discord.gg?v=10&encoding=json");

		secondSocket.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });
		const ops = secondSocket.sent.map((raw) => (JSON.parse(raw) as GatewayPayload).op);
		expect(ops).toContain(GatewayOpCodes.Identify);
		expect(ops).not.toContain(GatewayOpCodes.Resume);
	});
});


describe("native WebSocket", () => {
	beforeEach(() => {
		wsMockState.instances.length = 0;
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function connect(options: ConstructorParameters<typeof WSClient>[1] = {}): WSClient {
		const socket = new WSClient({} as Client, { jitterOverride: 1, ...options });
		socket.setToken("token");
		socket.initialize();
		return socket;
	}

	it("asks for binary frames as an ArrayBuffer and decodes them", () => {
		const socket = connect();
		const mock = wsMockState.instances[0]!;

		// the runtime defaults differ (a Blob on Node and Deno, a Buffer on Bun), and a Blob only decodes asynchronously
		expect(mock.binaryType).toBe("arraybuffer");

		const hello = JSON.stringify({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });
		mock.emitRaw(new TextEncoder().encode(hello).buffer);

		expect(socket.heartbeatInterval).toBe(45_000);
		socket.destroy();
	});

	it("reconnects on an error alone, since Node 22 sends no close after a failed connect", () => {
		vi.useFakeTimers();
		const socket = connect();

		wsMockState.instances[0]!.emitError(new Error("connect failed"));
		vi.advanceTimersByTime(0);

		expect(wsMockState.instances).toHaveLength(2);
		socket.destroy();
	});

	it("handles the close that follows an error only once", () => {
		vi.useFakeTimers();
		vi.spyOn(Math, "random").mockReturnValue(1);
		const socket = connect({ maxReconnectAttempts: 5 });
		const failed = wsMockState.instances[0]!;

		failed.emitError(new Error("connect failed"));
		// Node 24+, Bun, and Deno all follow the error with a close of their own
		failed.emitClose(1006);
		vi.advanceTimersByTime(0);

		// a second reconnect for the same failure would have queued attempt 2 behind attempt 1
		expect(wsMockState.instances).toHaveLength(2);
		expect(vi.getTimerCount()).toBe(1); // just the new socket's HELLO timeout
		socket.destroy();
	});

	it("closes a socket whose close dispatches synchronously without re-entering its own teardown", () => {
		vi.useFakeTimers();
		const socket = connect();
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);

		// the mock fires "close" inside close(), as Bun does, so an un-aborted listener would recurse
		expect(() => socket.destroy()).not.toThrow();
		expect(wsMockState.instances[0]!.closeCodes).toEqual([1000]);
		vi.advanceTimersByTime(60_000);
		expect(wsMockState.instances).toHaveLength(1);
		expect(disconnectSpy).not.toHaveBeenCalled();
	});

	it("names the gateway url when the runtime's error says nothing", () => {
		vi.useFakeTimers();
		const socket = connect();
		const errorSpy = vi.fn();
		socket.on(WSEvents.Error, errorSpy);

		// what Node actually delivers for a refused connection, a DNS failure, or a non-101 response
		const nodeError = new TypeError("");
		wsMockState.instances[0]!.emitError(nodeError);

		const emitted = errorSpy.mock.calls[0]![0] as Error;
		expect(emitted.message).toBe("WebSocket connection to wss://gateway.discord.gg?v=10&encoding=json failed");
		expect(emitted.cause).toBe(nodeError);
		socket.destroy();
	});

	it("still emits an Error for an error event that carries none", () => {
		vi.useFakeTimers();
		const socket = connect();
		const errorSpy = vi.fn();
		socket.on(WSEvents.Error, errorSpy);

		wsMockState.instances[0]!.emitError();

		const emitted = errorSpy.mock.calls[0]![0] as Error;
		expect(emitted).toBeInstanceOf(Error);
		expect(emitted.message).toMatch(/failed$/);
		expect(emitted).not.toHaveProperty("cause");
		socket.destroy();
	});

	it("gives up on a connection that sends no HELLO within 30 seconds", () => {
		vi.useFakeTimers();
		const socket = connect();
		const errorSpy = vi.fn();
		socket.on(WSEvents.Error, errorSpy);

		vi.advanceTimersByTime(29_999);
		expect(wsMockState.instances).toHaveLength(1);

		vi.advanceTimersByTime(1);
		expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("sent no HELLO") }));
		// a retry, not a logout - the session (if any) is still resumable
		expect(wsMockState.instances[0]!.closeCodes).toEqual([4200]);

		// the immediate retry was queued from inside a timer, which the fake clock puts 1ms out
		vi.advanceTimersByTime(1);
		expect(wsMockState.instances).toHaveLength(2);
		socket.destroy();
	});

	it("disarms the HELLO timeout once HELLO arrives", () => {
		vi.useFakeTimers();
		const socket = connect();
		const errorSpy = vi.fn();
		socket.on(WSEvents.Error, errorSpy);

		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });
		// short of the first heartbeat (45s with jitter 1), well past the HELLO timeout
		vi.advanceTimersByTime(40_000);

		expect(errorSpy).not.toHaveBeenCalled();
		expect(wsMockState.instances).toHaveLength(1);
		socket.destroy();
	});

	it("ignores a malformed HELLO, leaving the timeout to retry", () => {
		vi.useFakeTimers();
		const socket = connect();

		wsMockState.instances[0]!.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: "soon" }, s: null, t: null });
		// 30s for the timeout, then 1ms for the retry it queues
		vi.advanceTimersByTime(30_001);

		expect(wsMockState.instances).toHaveLength(2);
		socket.destroy();
	});

	it("leaves no timers behind when destroyed before HELLO", () => {
		vi.useFakeTimers();
		const socket = connect();
		expect(vi.getTimerCount()).toBe(1);

		socket.destroy();

		expect(vi.getTimerCount()).toBe(0);
	});

	it("keeps the HELLO timeout from holding the process open", () => {
		const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
		const socket = connect();

		// the connecting socket holds the event loop itself; a ref'd timer would only delay an exit after destroy()
		const timer = setTimeoutSpy.mock.results.at(-1)!.value as NodeJS.Timeout;
		expect(timer.hasRef()).toBe(false);
		socket.destroy();
	});
});

describe("sharding", () => {
	beforeEach(() => {
		wsMockState.instances.length = 0;
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function identifyOf(client: Client): Record<string, unknown> {
		client.socket.initialize();
		const mock = wsMockState.instances.at(-1)!;
		mock.emitMessage({ op: GatewayOpCodes.Hello, d: { heartbeat_interval: 45_000 }, s: null, t: null });
		const identify = mock.sent.map((raw) => JSON.parse(raw) as GatewayPayload).find((p) => p.op === GatewayOpCodes.Identify)!;
		client.socket.destroy();
		return identify.d as Record<string, unknown>;
	}

	it("identifies as the configured shard", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds, shards: { count: 4, ids: [2] } });

		expect(identifyOf(client).shard).toEqual([2, 4]);
		expect(client.shardCount).toBe(4);
		expect(client.socket.shard).toEqual([2, 4]);
	});

	it("sends no shard field when unsharded", () => {
		vi.useFakeTimers();
		const client = new Client({ token: "token", intents: GatewayIntents.Guilds });

		expect(identifyOf(client)).not.toHaveProperty("shard");
		expect(client.shardCount).toBe(1);
		expect(client.socket.shard).toBeNull();
	});

	it("rejects several shards in one process until 2.0", () => {
		expect(() => new Client({ token: "token", intents: 0, shards: { count: 4, ids: [0, 1] } }))
			.toThrow("arrives in 2.0");
		expect(() => new Client({ token: "token", intents: 0, shards: { count: 4, ids: [] } }))
			.toThrow("exactly one shard id");
	});

	it("rejects shard ids and counts out of range", () => {
		expect(() => new Client({ token: "token", intents: 0, shards: { count: 4, ids: [4] } })).toThrow(RangeError);
		expect(() => new Client({ token: "token", intents: 0, shards: { count: 4, ids: [-1] } })).toThrow(RangeError);
		expect(() => new Client({ token: "token", intents: 0, shards: { count: 4, ids: [1.5] } })).toThrow(RangeError);
		expect(() => new Client({ token: "token", intents: 0, shards: { count: 0, ids: [0] } })).toThrow(RangeError);
	});

	it("names the shards option when Discord demands sharding", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);
		socket.initialize();

		wsMockState.instances[0]!.close(4011);

		expect(disconnectSpy).toHaveBeenCalledWith(expect.stringContaining("ClientOptions.shards"), 4011);
	});

	it("points at the developer portal for disallowed intents", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1 });
		socket.setToken("token");
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);
		socket.initialize();

		wsMockState.instances[0]!.close(4014);

		expect(disconnectSpy).toHaveBeenCalledWith(expect.stringContaining("developer portal"), 4014);
	});

	it("shows the configured shard on an invalid shard close", () => {
		vi.useFakeTimers();
		const socket = new WSClient({} as Client, { jitterOverride: 1, shard: [3, 4] });
		socket.setToken("token");
		const disconnectSpy = vi.fn();
		socket.on(WSEvents.Disconnect, disconnectSpy);
		socket.initialize();

		wsMockState.instances[0]!.close(4010);

		expect(disconnectSpy).toHaveBeenCalledWith(expect.stringContaining("shard 3 of 4"), 4010);
	});
});
