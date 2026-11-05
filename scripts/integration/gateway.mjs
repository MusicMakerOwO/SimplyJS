// Gateway lifecycle against a real socket, run directly by each runtime on the built package:
//   node scripts/integration/gateway.mjs
//   bun scripts/integration/gateway.mjs
//   deno run -A scripts/integration/gateway.mjs
// SIMPLYJS_ENTRY overrides the import (defaults to the built dist/). Exits 1 if any scenario fails.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startFakeGateway } from "./fake-gateway.mjs";

const { Client, WSEvents } = await import(process.env.SIMPLYJS_ENTRY ?? new URL("../../dist/index.js", import.meta.url).href);
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
