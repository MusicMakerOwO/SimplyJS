import { Client, ClientEvents, createCollector } from "../../dist/index.js";
import { CommandHandler, FullClient } from "./types.js";

import * as Commands from "./commands";

// A collector is a temporary event listener with a lifetime, a filter, and somewhere to put
// what it caught. It attaches one listener to an emitter, keeps it only as long as the flow
// it belongs to lasts, and detaches itself when it hits its `time`/`idle`/`max` bound or when
// you call `.stop()` - so the bind/unbind/timeout bookkeeping that a hand-rolled
// `client.on(...)` / `client.off(...)` pair needs is handled once, generically.
//
// discord.js has a separate class per thing you might want to collect (`MessageCollector`,
// `ReactionCollector`, `InteractionCollector`, ...), all built around the "collect N things"
// framing. In practice people mostly use them as scoped listeners and per-message state, so
// SimplyJS treats *that* as the point: one `createCollector(emitter, event, options)` that
// works on any typed emitter in the library, plus `awaitEvent` for the one-shot case.
//
// !! READ THIS BEFORE YOU BUILD ANYTHING ON A COLLECTOR !!
//
// Collectors are 100% in-memory and 100% temporary. They live in this process and nowhere
// else. A restart or a crash kills every live collector instantly, and every
// button those collectors were listening for goes dead - no error, no crash, no visual change,
// the buttons are still sitting there in Discord looking perfectly clickable and simply
// nothing happens. This is the single most common way beginners get confused ("my buttons
// randomly stopped working"), usually because the tutorial they followed never mentioned it.
//
// So: a collector is for one interaction's lifetime - one user, one message, state that is
// completely fine to lose. Anything that must still work tomorrow, or five minutes after a
// deploy, wants a registered handler keyed by `customId` (examples 11-13) with its state in
// the message itself or in a database. That is not a collector's job.
const client = new Client({
	token: process.env.TOKEN!,
	// `GuildMessages` and `MessageContent` are here for the message-based collectors in
	// `collect.ts` and `wizard.ts` - without `MessageContent` (a privileged intent, toggled in
	// the Developer Portal) messages still arrive but `message.content` is an empty string, so
	// a collector filtering on what someone typed silently matches nothing.
	intents: ["Guilds", "GuildMessages", "MessageContent"]
}) as FullClient;

client.commands = new Map();
for (const command of Object.values(Commands) as CommandHandler[]) {
	if (client.commands.has(command.data.name)) {
		throw new Error(`Duplicate command name: "${command.data.name}"`);
	}
	client.commands.set(command.data.name, command);
}

client.login();

client.on(ClientEvents.Ready, (user) => {
	console.log(`Logged in as ${user.username}`);
});

// Note what is *not* below: a `ButtonUsed` listener. Examples 11-13 need one because their
// buttons are registered up front and routed by `customId`; here every button belongs to the
// collector that sent it, so the collectors do their own routing through their filters.
client.on(ClientEvents.SlashCommandUsed, async (interaction) => {
	const command = client.commands.get(interaction.commandName);
	if (!command) {
		await interaction.reply(`Unknown command "${interaction.commandName}"`);
		return;
	}

	try {
		await command.execute(client, interaction);
	} catch (error) {
		console.log(error);
		await interaction.reply("Something went wrong!");
	}
});

// `createCollector` isn't tied to `Client`. It takes any typed `EventEmitter` in the library
// and reads the argument types out of that emitter's event map, so pointing it at the raw
// gateway socket works with the exact same call and still infers everything - `WSEvents` here
// instead of `ClientEventMap`, no generics written by hand.
//
// `HEARTBEAT_ACK` carries no arguments, so this is the degenerate case of a collector: it is
// being used purely as "wake me when this fires, or give up after a minute".
const heartbeat = createCollector(client.socket, "HEARTBEAT_ACK", { max: 1, time: 60_000 });
heartbeat.next
	.then(() => console.log('Gateway acknowledged a heartbeat, the connection is alive'))
	.catch(() => console.log('No heartbeat ack within 60s, the gateway connection looks stalled'));

process.on('SIGINT', async () => {
	await client.destroy();
	console.log('Goodbye!');
	process.exit(0);
});