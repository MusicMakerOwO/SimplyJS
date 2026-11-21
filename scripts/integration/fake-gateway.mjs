// A local, dependency-free Discord gateway: real TCP, real WebSocket framing, scripted gateway
// behavior. Speaks just enough RFC 6455 for a client that sends small masked text frames.
import net from "node:net";
import { createHash } from "node:crypto";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function encodeFrame(opcode, payload) {
	const header = payload.length < 126
		? Buffer.from([0x80 | opcode, payload.length])
		: Buffer.from([0x80 | opcode, 126, payload.length >> 8, payload.length & 0xff]); // payloads stay < 64KiB
	return Buffer.concat([header, payload]);
}

/** Splits complete client frames off `buffer`; client frames are always masked */
function decodeFrames(buffer) {
	const frames = [];
	let offset = 0;
	while (buffer.length - offset >= 6) {
		const opcode = buffer[offset] & 0x0f;
		let length = buffer[offset + 1] & 0x7f;
		let cursor = offset + 2;
		if (length === 126) { length = buffer.readUInt16BE(cursor); cursor += 2; }
		if (buffer.length < cursor + 4 + length) break;
		const mask = buffer.subarray(cursor, cursor + 4);
		const payload = Buffer.from(buffer.subarray(cursor + 4, cursor + 4 + length));
		for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
		frames.push({ opcode, payload });
		offset = cursor + 4 + length;
	}
	return { frames, rest: buffer.subarray(offset) };
}

const sendTo = (socket, payload) => socket?.write(encodeFrame(0x1, Buffer.from(JSON.stringify(payload))));

/**
 * Starts a gateway on 127.0.0.1. HELLO on connect, READY for IDENTIFY, RESUMED for RESUME, and an
 * ACK for every heartbeat. `silence()` makes a connection stop answering (a zombie); `drop()` kills
 * TCP without a close frame; `closeWith(code)` sends a close frame; `stop()` refuses new connections.
 *
 * Serves any number of shards: each connection is the shard its IDENTIFY named (`[0, 1]` without
 * one), and a RESUME finds its shard again through the session id. `drop`, `closeWith`, and
 * `silence` take a shard id, and default to the most recent connection. It also answers
 * `GET <restUrl>/gateway/bot` from `gatewayBot`, for `shards: { count: "auto" }`.
 */
export function startFakeGateway({ heartbeatInterval = 45_000, gatewayBot = { shards: 1, max_concurrency: 1, remaining: 1000 } } = {}) {
	let current = null;
	const byShard = new Map();
	const silenced = new WeakSet();
	const sockets = new Set();
	const target = (shard) => (shard === undefined ? current : byShard.get(shard));
	const gateway = {
		url: "",
		restUrl: "",
		received: [],
		/** One `{ shard, at }` per IDENTIFY, where `shard` is the `[id, count]` it carried (or `null`) */
		identifies: [],
		connections: 0,
		send: (payload) => sendTo(current, payload),
		closeWith: (code, shard) => target(shard)?.end(encodeFrame(0x8, Buffer.from([code >> 8, code & 0xff]))),
		drop: (shard) => target(shard)?.destroy(),
		silence: (shard) => { const socket = target(shard); if (socket) silenced.add(socket); },
		stop: () => new Promise((resolve) => {
			for (const socket of sockets) socket.destroy();
			server.close(() => resolve());
		}),
	};

	/** Answers a plain HTTP request on a connection that did not ask to upgrade */
	function answerHttp(socket, head) {
		const [method, path] = head.split(" ");
		const found = method === "GET" && path.endsWith("/gateway/bot");
		const body = found ? JSON.stringify({
			url: gateway.url, shards: gatewayBot.shards,
			session_start_limit: { total: 1000, remaining: gatewayBot.remaining, reset_after: 0, max_concurrency: gatewayBot.max_concurrency }
		}) : JSON.stringify({ message: "404: Not Found", code: 0 });
		socket.end(`HTTP/1.1 ${found ? "200 OK" : "404 Not Found"}\r\nContent-Type: application/json\r\n` +
			`Content-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
	}

	const server = net.createServer((socket) => {
		sockets.add(socket);
		socket.on("close", () => sockets.delete(socket));
		socket.on("error", () => {});
		let upgraded = false;
		let pending = Buffer.alloc(0);

		socket.on("data", (chunk) => {
			if (silenced.has(socket)) return;
			pending = Buffer.concat([pending, chunk]);
			if (!upgraded) {
				const end = pending.indexOf("\r\n\r\n");
				if (end === -1) return;
				const head = pending.subarray(0, end).toString("latin1");
				const upgrade = /sec-websocket-key:\s*(\S+)/i.exec(head);
				if (!upgrade) { answerHttp(socket, head); return; }
				const key = upgrade[1];
				const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
				socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
				pending = pending.subarray(end + 4);
				upgraded = true;
				current = socket;
				gateway.connections++;
				sendTo(socket, { op: 10, d: { heartbeat_interval: heartbeatInterval }, s: null, t: null });
			}
			const { frames, rest } = decodeFrames(pending);
			pending = rest;
			for (const frame of frames) {
				if (frame.opcode === 0x8) { socket.end(encodeFrame(0x8, frame.payload.subarray(0, 2))); continue; }
				if (frame.opcode !== 0x1) continue;
				const payload = JSON.parse(frame.payload.toString());
				gateway.received.push(payload);
				if (payload.op === 1) sendTo(socket, { op: 11, d: null, s: null, t: null });
				if (payload.op === 2) {
					const shard = payload.d.shard ?? null;
					gateway.identifies.push({ shard, at: Date.now() });
					byShard.set(shard?.[0] ?? 0, socket);
					// session-1 for shard 0, session-2 for shard 1, ... so a RESUME names its shard
					sendTo(socket, { op: 0, s: 1, t: "READY", d: {
						v: 10, user: { id: "1", username: "bot", discriminator: "0", global_name: null, avatar: null },
						session_id: `session-${(shard?.[0] ?? 0) + 1}`, resume_gateway_url: gateway.url, guilds: [], presences: [],
						geo_ordered_rtc_regions: [], session_type: "normal", auth: {}, user_settings: {},
						application: { id: "1", flags: 0, flags_new: "0" }, ...(shard ? { shard } : {})
					} });
				}
				if (payload.op === 6) {
					byShard.set(Number(payload.d.session_id.split("-")[1]) - 1, socket);
					sendTo(socket, { op: 0, s: 2, t: "RESUMED", d: null });
				}
			}
		});
	});

	return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
		gateway.url = `ws://127.0.0.1:${server.address().port}`;
		gateway.restUrl = `http://127.0.0.1:${server.address().port}/api/v10`;
		resolve(gateway);
	}));
}
