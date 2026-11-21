// Gateway lifecycle against a real socket, run directly by each runtime on the built package:
//   node scripts/integration/gateway.mjs
//   bun scripts/integration/gateway.mjs
//   deno run -A scripts/integration/gateway.mjs
// SIMPLYJS_ENTRY overrides the import (defaults to the built dist/). Exits 1 if any scenario fails.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startFakeGateway } from "./fake-gateway.mjs";

const { Client, ClientEvents, WSEvents } = await import(process.env.SIMPLYJS_ENTRY ?? new URL("../../dist/index.js", import.meta.url).href);
const runtime = globalThis.Bun ? `bun ${globalThis.Bun.version}` : globalThis.Deno ? `deno ${globalThis.Deno.version.deno}` : `node ${process.version}`;
// Not unref()d on purpose: the runner has to stay alive while it waits, even after the client has
// (correctly) let go of the event loop - e.g. once it gives up reconnecting. scripts/** is outside
// eslint, so the unref() rule does not apply here.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, ms) {
	const end = Date.now() + ms;
	while (Date.now() < end) { if (check()) return true; await sleep(10); }
	return check();
}
const makeClient = (gateway) => new Client({
	token: "MQ.x.y", intents: 513,
	ws: { gatewayUrl: gateway.url, maxReconnectAttempts: 3, jitterOverride: 0.5 }
});

const scenarios = {
	async "identify -> READY"() {
		const gateway = await startFakeGateway(); const client = makeClient(gateway);
		await client.login();
		const identify = gateway.received.find((p) => p.op === 2);
		await client.destroy(); await gateway.stop();
		return identify?.d.intents === 513 || `identify: ${JSON.stringify(identify)}`;
	},
	async "identify carries the configured shard"() {
		const gateway = await startFakeGateway();
		const client = new Client({
			token: "MQ.x.y", intents: 513, shards: { count: 4, ids: [2] },
			ws: { gatewayUrl: gateway.url, maxReconnectAttempts: 3, jitterOverride: 0.5 }
		});
		await client.login();
		const identify = gateway.received.find((p) => p.op === 2);
		await client.destroy(); await gateway.stop();
		return JSON.stringify(identify?.d.shard) === "[2,4]" || `identify: ${JSON.stringify(identify)}`;
	},
	async "two shards in one process -> paced identifies, one Ready"() {
		const gateway = await startFakeGateway();
		const client = new Client({
			token: "MQ.x.y", intents: 513, shards: { count: 2 },
			ws: { gatewayUrl: gateway.url, maxReconnectAttempts: 3, jitterOverride: 0.5 }
		});
		const events = [];
		client.on(ClientEvents.ShardReady, (id) => events.push(`ShardReady ${id}`));
		client.on(ClientEvents.Ready, () => events.push("Ready"));
		await client.login();
		const [first, second] = gateway.identifies;
		const gap = second ? second.at - first.at : null;
		// login() sends them as it resolves, so they may still be on the wire
		await waitFor(() => gateway.received.filter((p) => p.op === 3).length >= 2, 2000);
		const presences = gateway.received.filter((p) => p.op === 3).length;
		await client.destroy(); await gateway.stop();
		const ok = JSON.stringify(first?.shard) === "[0,2]" && JSON.stringify(second?.shard) === "[1,2]" && gap >= 4900 &&
			events.join() === "ShardReady 0,ShardReady 1,Ready" && presences === 2;
		return ok || `identifies=${JSON.stringify(gateway.identifies)} gap=${gap} events=${events} presences=${presences}`;
	},
	async "count: auto -> GET /gateway/bot sizes and paces the shards"() {
		const gateway = await startFakeGateway({ gatewayBot: { shards: 3, max_concurrency: 2, remaining: 1000 } });
		const client = new Client({
			token: "MQ.x.y", intents: 513, shards: { count: "auto" }, rest: { baseUrl: gateway.restUrl },
			ws: { gatewayUrl: gateway.url, maxReconnectAttempts: 3, jitterOverride: 0.5 }
		});
		await client.login();
		const shards = gateway.identifies.map((i) => i.shard?.join("/")).join();
		const gap = gateway.identifies[2] ? gateway.identifies[2].at - gateway.identifies[0].at : null;
		const count = client.shardCount;
		await client.destroy(); await gateway.stop();
		// buckets 0 and 1 identify together, shard 2 waits behind shard 0
		return (count === 3 && shards === "0/3,1/3,2/3" && gap >= 4900) || `shardCount=${count} identifies=${shards} gap=${gap}`;
	},
	async "one shard drops -> only it resumes"() {
		const gateway = await startFakeGateway({ gatewayBot: { shards: 2, max_concurrency: 2, remaining: 1000 } });
		const client = new Client({
			token: "MQ.x.y", intents: 513, shards: { count: "auto" }, rest: { baseUrl: gateway.restUrl },
			ws: { gatewayUrl: gateway.url, maxReconnectAttempts: 3, jitterOverride: 0.5 }
		});
		const resumed = []; client.on(ClientEvents.ShardResumed, (id) => resumed.push(id));
		await client.login(); gateway.drop(1);
		const ok = await waitFor(() => resumed.length > 0, 3000);
		const resumes = gateway.received.filter((p) => p.op === 6).map((p) => p.d.session_id);
		const stillReady = client.shards.get(0).ready;
		let socketThrew = false; try { void client.socket; } catch { socketThrew = true; }
		await client.destroy(); await gateway.stop();
		return (ok && resumed.join() === "1" && resumes.join() === "session-2" && gateway.connections === 3 && stillReady && socketThrew) ||
			`resumed=${resumed} resumes=${resumes} connections=${gateway.connections} shard0Ready=${stillReady} socketThrew=${socketThrew}`;
	},
	async "network drop -> RESUME"() {
		const gateway = await startFakeGateway(); const client = makeClient(gateway);
		let resumed = false; client.socket.on(WSEvents.Resumed, () => { resumed = true; });
		await client.login(); gateway.drop();
		const ok = await waitFor(() => resumed, 3000);
		const resume = gateway.received.find((p) => p.op === 6);
		await client.destroy(); await gateway.stop();
		return (ok && resume?.d.session_id === "session-1" && resume.d.seq === 1) || `resumed=${ok} resume=${JSON.stringify(resume)}`;
	},
	async "fatal close 4004 -> Disconnect, no retry"() {
		const gateway = await startFakeGateway(); const client = makeClient(gateway);
		let code = null; client.socket.on(WSEvents.Disconnect, (_reason, c) => { code = c; });
		await client.login(); gateway.closeWith(4004);
		await waitFor(() => code !== null, 3000); await sleep(1500);
		const connections = gateway.connections; await client.destroy(); await gateway.stop();
		return (code === 4004 && connections === 1) || `code=${code} connections=${connections}`;
	},
	async "gateway unreachable -> retries, then Disconnect"() {
		const gateway = await startFakeGateway(); const client = makeClient(gateway);
		let gaveUp = false; client.socket.on(WSEvents.Disconnect, () => { gaveUp = true; });
		client.socket.on(WSEvents.Error, () => {});
		await client.login(); await gateway.stop();
		const ok = await waitFor(() => gaveUp, 12_000);
		await client.destroy();
		return ok || "no Disconnect after 12s - a failed reconnect stranded the client";
	},
	async "destroy() against a silent gateway"() {
		const gateway = await startFakeGateway(); const client = makeClient(gateway);
		await client.login(); gateway.silence();
		const done = await Promise.race([client.destroy().then(() => true), sleep(5000).then(() => false)]);
		await gateway.stop();
		return done || "destroy() still pending after 5s";
	},
	async "missed heartbeat ACK -> reconnect + RESUME"() {
		const gateway = await startFakeGateway({ heartbeatInterval: 200 }); const client = makeClient(gateway);
		let resumed = false; client.socket.on(WSEvents.Resumed, () => { resumed = true; });
		await client.login(); gateway.silence();
		const ok = await waitFor(() => resumed, 4000);
		await client.destroy(); await gateway.stop();
		return ok || `connections=${gateway.connections}`;
	},
	async "a bot process survives a network drop"() {
		// in-process scenarios cannot catch this one - the fake gateway's own server keeps this process alive
		const gateway = await startFakeGateway();
		const script = fileURLToPath(new URL("./bot.mjs", import.meta.url));
		const args = globalThis.Deno ? ["run", "-A", script, gateway.url] : [script, gateway.url];
		const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
		let exitCode = null; child.on("exit", (code) => { exitCode = code; });
		await waitFor(() => gateway.received.some((p) => p.op === 2), 5000);
		await sleep(200); gateway.drop();
		const resumed = await waitFor(() => gateway.received.some((p) => p.op === 6), 5000);
		await waitFor(() => exitCode !== null, 5000);
		if (exitCode === null) child.kill();
		await gateway.stop();
		return resumed || `the bot process exited (code ${exitCode}) instead of reconnecting`;
	},
};

let failed = 0;
for (const [name, run] of Object.entries(scenarios)) {
	let result;
	try { result = await run(); } catch (error) { result = String(error); }
	if (result !== true) failed++;
	console.log(`[${runtime}] ${result === true ? "PASS" : "FAIL"} ${name}${result === true ? "" : ` - ${result}`}`);
}
process.exit(failed === 0 ? 0 : 1);
