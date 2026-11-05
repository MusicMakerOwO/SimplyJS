// A minimal bot for the "survives a network drop" scenario: nothing but the client holds the
// event loop, which is exactly the situation an unref()d reconnect timer gets wrong.
const { Client, WSEvents } = await import(process.env.SIMPLYJS_ENTRY ?? new URL("../../dist/index.js", import.meta.url).href);
const client = new Client({ token: "MQ.x.y", intents: 513, ws: { gatewayUrl: process.argv[2] } });
client.socket.on(WSEvents.Resumed, () => { void client.destroy().then(() => process.exit(0)); });
await client.login();
