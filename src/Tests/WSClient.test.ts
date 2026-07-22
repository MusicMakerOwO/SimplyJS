import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { WSClient } from "../WSClient.js";
import { GatewayEvents, GatewayIntents, GatewayOpCodes, GatewayPayload } from "../Types/DiscordGateway.js";
import { DiscordUser } from "../Types/DiscordAPITypes.js";

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
		const socket = new WSClient({} as Client, { jitter_override: 1 });
		socket.setToken("token");
		const heartbeatSpy = vi.fn();
		socket.on("HEARTBEAT", heartbeatSpy);

		socket.initialize();
		const mockSocket = wsMockState.instances[0]!;
		mockSocket.emitMessage({
			op: GatewayOpCodes.Hello,
			d: { heartbeat_interval: 100 },
			s: null,
			t: null
		});

		expect(socket.heartbeat_interval).toBe(100);
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
		expect(client.socket.heartbeat_interval).toBe(-1);
	});
});