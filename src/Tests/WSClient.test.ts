import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { WSClient, WSEvents } from "../WSClient.js";
import { GatewayEvents, GatewayIntents, GatewayOpCodes, GatewayPayload } from "../Types/DiscordGateway.js";
import { ActivityType, DiscordUser, Status } from "../Types/DiscordAPITypes.js";

type MessageHandler = (data: { toString(): string }) => void;
type CloseHandler = () => void;

const wsMockState = vi.hoisted(() => {
	class MockWebSocket {
		sent: string[] = [];
		#messageHandlers: MessageHandler[] = [];
		#closeHandlers: CloseHandler[] = [];

		constructor() {
			wsMockState.instances.push(this);
		}

		on(event: "message" | "close", handler: MessageHandler | CloseHandler): void {
			if (event === "message") {
				this.#messageHandlers.push(handler as MessageHandler);
				return;
			}

			this.#closeHandlers.push(handler as CloseHandler);
		}

		send(payload: string): void {
			this.sent.push(payload);
		}

		emitMessage(payload: GatewayPayload): void {
			const packet = JSON.stringify(payload);
			for (const handler of this.#messageHandlers) {
				handler({
					toString: () => packet
				});
			}
		}

		close(): void {
			for (const handler of this.#closeHandlers) {
				handler();
			}
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

		expect(() => socket.send({ op: GatewayOpCodes.Heartbeat, d: null, s: null, t: null })).toThrow(/not initialized/i);
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
});