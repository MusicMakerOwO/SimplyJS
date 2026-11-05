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

/**
 * Starts a gateway on 127.0.0.1. HELLO on connect, READY for IDENTIFY, RESUMED for RESUME, and an
 * ACK for every heartbeat. `silence()` makes the current connection stop answering (a zombie);
 * `drop()` kills TCP without a close frame; `closeWith(code)` sends a close frame; `stop()` refuses
 * new connections.
 */
export function startFakeGateway({ heartbeatInterval = 45_000 } = {}) {
	let current = null;
	const silenced = new WeakSet();
	const sockets = new Set();
	const gateway = {
		url: "",
		received: [],
		connections: 0,
		send: (payload) => current?.write(encodeFrame(0x1, Buffer.from(JSON.stringify(payload)))),
		closeWith: (code) => current?.end(encodeFrame(0x8, Buffer.from([code >> 8, code & 0xff]))),
		drop: () => current?.destroy(),
		silence: () => { if (current) silenced.add(current); },
		stop: () => new Promise((resolve) => {
			for (const socket of sockets) socket.destroy();
			server.close(() => resolve());
		}),
	};

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
				const key = /sec-websocket-key:\s*(\S+)/i.exec(pending.subarray(0, end).toString("latin1"))[1];
				const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
				socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
				pending = pending.subarray(end + 4);
				upgraded = true;
				current = socket;
				gateway.connections++;
				gateway.send({ op: 10, d: { heartbeat_interval: heartbeatInterval }, s: null, t: null });
			}
			const { frames, rest } = decodeFrames(pending);
			pending = rest;
			for (const frame of frames) {
				if (frame.opcode === 0x8) { socket.end(encodeFrame(0x8, frame.payload.subarray(0, 2))); continue; }
				if (frame.opcode !== 0x1) continue;
				const payload = JSON.parse(frame.payload.toString());
				gateway.received.push(payload);
				if (payload.op === 1) gateway.send({ op: 11, d: null, s: null, t: null });
				if (payload.op === 2) gateway.send({ op: 0, s: 1, t: "READY", d: {
					v: 10, user: { id: "1", username: "bot", discriminator: "0", global_name: null, avatar: null },
					session_id: "session-1", resume_gateway_url: gateway.url, guilds: [], presences: [],
					geo_ordered_rtc_regions: [], session_type: "normal", auth: {}, user_settings: {},
					application: { id: "1", flags: 0, flags_new: "0" }
				} });
				if (payload.op === 6) gateway.send({ op: 0, s: 2, t: "RESUMED", d: null });
			}
		});
	});

	return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
		gateway.url = `ws://127.0.0.1:${server.address().port}`;
		resolve(gateway);
	}));
}
