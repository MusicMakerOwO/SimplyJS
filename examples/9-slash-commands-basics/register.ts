import { Client, SlashCommandBuilder } from "../../dist/index.js";

// Slash commands have to be *registered* with Discord before anyone can type them. That is a
// separate step from handling them: registering tells Discord the command exists and what
// arguments it takes, so it can autocomplete it in the client, while index.ts is what runs
// when someone actually uses it.
//
// Discord recommends only re-registering commands when they've actually changed,
// not on every boot - so this lives in its own script, run separately from the bot.
// No login needed: registering commands is a plain REST call, the gateway is never touched.
//
// One more thing to get right before any of this shows up: the bot's invite link needs the
// `applications.commands` scope. If it was invited with only `bot`, registration succeeds and
// the commands still never appear anywhere. Re-inviting with both scopes fixes it, no kick
// required.
const client = new Client({
	token: process.env.TOKEN!,
	intents: []
});

const commands = [
	new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with pong'),

	new SlashCommandBuilder()
		.setName('coinflip')
		.setDescription('Flips a coin'),

	new SlashCommandBuilder()
		.setName('greet')
		.setDescription('Greets a user')
		.addUserOption('user', 'The user to greet', { required: true })
];

// registerPublicCommands() registers globally, for every server the bot is in.
// There is also registerGuildCommands(commands, guildID) if you want the commands locked to
// just 1 guild.
//
// The difference matters more than it looks while developing: global commands can take up to
// an hour to propagate, so running this and immediately finding no /ping in Discord usually
// means it worked and you're waiting. Guild commands update instantly, which is why most
// people register to a single test server while building and only go global on release.
client.registerPublicCommands(commands)
	.then(() => {
		console.log('Slash commands registered!');
	})
	// Registering is a network call and Discord rejects malformed commands, so surface the
	// failure rather than letting it vanish into an unhandled rejection.
	.catch(console.error);
