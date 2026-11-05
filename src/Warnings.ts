import type { Client } from "./Client.js";
import { ClientEvents, ClientWarning, WarningCodes } from "./Types/SimplyJSTypes.js";
import { ObjectValues } from "./Types/HelperTypes.js";
import { GatewayIntents } from "./Types/DiscordGateway.js";
import { HasIntent } from "./Intents.js";

/**
 * Reports a {@link ClientWarning} through {@link ClientEvents.Warn}, or prints it with
 * `console.warn` when nothing is listening.
 *
 * The fallback is what keeps warnings loud by default: a bot that never heard of `Warn` still
 * sees them, and one that listens has taken over the output and decides what to keep. Every
 * warning the library raises goes through here, so that rule holds for all of them.
 *
 * Never throws. Warnings are raised from places that cannot absorb a listener's exception: a
 * `newListener` hook (where it would make `client.on()` itself throw), an unref'd timer (where it
 * would crash the process), and the `catch` of an interaction response (where it would replace
 * the Discord error the caller is about to see). A `Warn` listener that throws gets its error
 * printed, alongside the warning it failed on so that warning is not lost.
 *
 * @internal Not intended for use outside the library.
 */
export function EmitWarning(client: Client, code: ObjectValues<typeof WarningCodes>, message: string): void {
	if (client.listenerCount(ClientEvents.Warn) === 0) {
		console.warn(`[SimplyJS] ${message}`);
		return;
	}

	const warning: ClientWarning = { code, message };
	try {
		client.emit(ClientEvents.Warn, warning);
	} catch (error) {
		console.warn(`[SimplyJS] ${message}`);
		console.error(`Error in a "${ClientEvents.Warn}" listener:`, error);
	}
}

/** An intent name, as `GatewayIntents` keys them */
type IntentName = keyof typeof GatewayIntents;

/**
 * Which intents can deliver each client event: a row means "any of these", and `[]` means the
 * event needs none.
 *
 * Derived from the `GatewayIntents` JSDoc (`src/Types/DiscordGateway.ts`), which is the source of
 * truth for intent-to-event coverage - keep the two in step. Keyed by `ClientEvents`, not by gateway
 * event, because a listener is what gets checked, and exhaustive over it: a new client event is a
 * compile error here until it has a row.
 *
 * Deliberately "any of" only. Partial coverage (`GuildMessages` without `DirectMessages`) is a
 * normal choice for a bot that ignores DMs, not a mistake, so it is never warned about.
 */
const EventIntents: { readonly [K in ObjectValues<typeof ClientEvents>]: readonly IntentName[] } = {
	[ClientEvents.Ready]: [],
	[ClientEvents.Resumed]: [],
	[ClientEvents.ClientUserUpdate]: [],
	// only ever arrives in answer to a request, and `fetchGateway()` checks its own intents
	[ClientEvents.GuildMembersChunk]: [],
	[ClientEvents.InteractionCreate]: [],
	[ClientEvents.SlashCommandUsed]: [],
	[ClientEvents.UserContextMenuUsed]: [],
	[ClientEvents.MessageContextMenuUsed]: [],
	[ClientEvents.ButtonUsed]: [],
	[ClientEvents.SelectMenuUsed]: [],
	[ClientEvents.AutocompleteUsed]: [],
	[ClientEvents.ModalSubmitted]: [],
	[ClientEvents.Warn]: [],

	[ClientEvents.GuildCreate]: ["Guilds"],
	[ClientEvents.GuildUpdate]: ["Guilds"],
	[ClientEvents.GuildDelete]: ["Guilds"],
	[ClientEvents.ChannelCreate]: ["Guilds"],
	[ClientEvents.ChannelUpdate]: ["Guilds"],
	[ClientEvents.ChannelDelete]: ["Guilds"],
	[ClientEvents.ThreadCreate]: ["Guilds"],
	[ClientEvents.ThreadUpdate]: ["Guilds"],
	[ClientEvents.ThreadDelete]: ["Guilds"],
	[ClientEvents.ThreadMemberUpdate]: ["Guilds"],
	// `Guilds` covers the bot's own thread membership, `GuildMembers` everyone else's
	[ClientEvents.ThreadMembersUpdate]: ["Guilds", "GuildMembers"],
	[ClientEvents.ThreadListSync]: ["Guilds"],
	[ClientEvents.RoleCreate]: ["Guilds"],
	[ClientEvents.RoleUpdate]: ["Guilds"],
	[ClientEvents.RoleDelete]: ["Guilds"],
	[ClientEvents.ChannelPinsUpdate]: ["Guilds", "DirectMessages"],

	[ClientEvents.MemberCreate]: ["GuildMembers"],
	[ClientEvents.MemberUpdate]: ["GuildMembers"],
	[ClientEvents.MemberDelete]: ["GuildMembers"],

	[ClientEvents.GuildBanAdd]: ["GuildModeration"],
	[ClientEvents.GuildBanRemove]: ["GuildModeration"],
	[ClientEvents.AuditLogEntryCreate]: ["GuildModeration"],

	[ClientEvents.EmojiCreate]: ["GuildExpressions"],
	[ClientEvents.EmojiUpdate]: ["GuildExpressions"],
	[ClientEvents.EmojiDelete]: ["GuildExpressions"],
	[ClientEvents.StickerCreate]: ["GuildExpressions"],
	[ClientEvents.StickerUpdate]: ["GuildExpressions"],
	[ClientEvents.StickerDelete]: ["GuildExpressions"],
	[ClientEvents.SoundboardSoundCreate]: ["GuildExpressions"],
	[ClientEvents.SoundboardSoundUpdate]: ["GuildExpressions"],
	[ClientEvents.SoundboardSoundDelete]: ["GuildExpressions"],
	[ClientEvents.SoundboardSoundsUpdate]: ["GuildExpressions"],

	[ClientEvents.IntegrationCreate]: ["GuildIntegrations"],
	[ClientEvents.IntegrationUpdate]: ["GuildIntegrations"],
	[ClientEvents.IntegrationDelete]: ["GuildIntegrations"],
	[ClientEvents.GuildIntegrationsUpdate]: ["GuildIntegrations"],

	[ClientEvents.WebhooksUpdate]: ["GuildWebhooks"],

	[ClientEvents.InviteCreate]: ["GuildInvites"],
	[ClientEvents.InviteDelete]: ["GuildInvites"],

	[ClientEvents.PresenceUpdate]: ["GuildPresences"],

	[ClientEvents.MessageCreate]: ["GuildMessages", "DirectMessages"],
	[ClientEvents.MessageUpdate]: ["GuildMessages", "DirectMessages"],
	[ClientEvents.MessageDelete]: ["GuildMessages", "DirectMessages"],
	[ClientEvents.MessageDeleteBulk]: ["GuildMessages"],

	[ClientEvents.ReactionAdd]: ["GuildMessageReactions", "DirectMessageReactions"],
	[ClientEvents.ReactionRemove]: ["GuildMessageReactions", "DirectMessageReactions"],
	[ClientEvents.ReactionRemoveAll]: ["GuildMessageReactions", "DirectMessageReactions"],
	[ClientEvents.ReactionRemoveEmoji]: ["GuildMessageReactions", "DirectMessageReactions"],

	[ClientEvents.TypingStart]: ["GuildMessageTyping", "DirectMessageTyping"],

	[ClientEvents.GuildScheduledEventCreate]: ["GuildScheduledEvents"],
	[ClientEvents.GuildScheduledEventUpdate]: ["GuildScheduledEvents"],
	[ClientEvents.GuildScheduledEventDelete]: ["GuildScheduledEvents"],
	[ClientEvents.GuildScheduledEventUserAdd]: ["GuildScheduledEvents"],
	[ClientEvents.GuildScheduledEventUserRemove]: ["GuildScheduledEvents"],

	[ClientEvents.AutoModerationRuleCreate]: ["AutoModerationConfiguration"],
	[ClientEvents.AutoModerationRuleUpdate]: ["AutoModerationConfiguration"],
	[ClientEvents.AutoModerationRuleDelete]: ["AutoModerationConfiguration"],
	[ClientEvents.AutoModerationActionExecution]: ["AutoModerationExecution"],

	[ClientEvents.MessagePollVoteAdd]: ["GuildMessagePolls", "DirectMessagePolls"],
	[ClientEvents.MessagePollVoteRemove]: ["GuildMessagePolls", "DirectMessagePolls"],
};

/** Listeners the library registers on a client itself, which the intent check never reports */
const InternalListeners = new WeakSet<(...args: never[]) => unknown>();

/** Event names each client has already been warned about, so every warning is sent once */
const ReportedEvents = new WeakMap<Client, Set<string>>();

/** Key under which the once-only `MissingMessageContent` warning is recorded alongside event names */
const MESSAGE_CONTENT_KEY = "\0MessageContent";

/**
 * Exempts a listener the library adds to a client from the intent check, so a bot is never
 * warned about the library's own machinery - the `Ready` handler waiting on `GuildCreate`, or
 * a collector hub. Returns the listener for use inline.
 *
 * @internal Not intended for use outside the library.
 */
export function MarkInternalListener<T extends (...args: never[]) => unknown>(listener: T): T {
	InternalListeners.add(listener);
	return listener;
}

/** Whether a listener was registered by the library, see {@link MarkInternalListener} */
export function IsInternalListener(listener: unknown): boolean {
	return typeof listener === "function" && InternalListeners.has(listener as (...args: never[]) => unknown);
}

/**
 * Warns when a listener is added for an event the client's intents can never deliver, and when
 * a message listener is added without `MessageContent`. Each warning is sent once per client.
 *
 * Runs on every registration - `Client` calls it from `newListener`, and `CollectorManager` for
 * each user collector, since collectors share one real listener per event - rather than once at
 * `login()`, so handlers loaded after login are checked too. Intents are fixed at construction,
 * so the answer cannot change afterwards.
 *
 * @internal Not intended for use outside the library.
 */
export function CheckListenerIntents(client: Client, event: string | symbol): void {
	if (typeof event !== "string" || !Object.hasOwn(EventIntents, event)) return;

	let reported = ReportedEvents.get(client);
	if (!reported) {
		reported = new Set();
		ReportedEvents.set(client, reported);
	}

	const intents = client.intents;
	const required = EventIntents[event as keyof typeof EventIntents];

	if (required.length > 0 && !required.some((name) => HasIntent(intents, GatewayIntents[name])) && !reported.has(event)) {
		reported.add(event);
		const options = required.map((name) => `"${name}"`).join(" or ");
		EmitWarning(
			client,
			WarningCodes.MissingIntent,
			`A listener was added for "${event}", which needs the ${options} intent - none of which this client ` +
			`has, so it will never fire. Add ${required.length > 1 ? "one of them" : "it"} to ClientOptions.intents.`
		);
	}

	const isMessageEvent = event === ClientEvents.MessageCreate || event === ClientEvents.MessageUpdate;
	if (isMessageEvent && !HasIntent(intents, GatewayIntents.MessageContent) && !reported.has(MESSAGE_CONTENT_KEY)) {
		reported.add(MESSAGE_CONTENT_KEY);
		EmitWarning(
			client,
			WarningCodes.MissingMessageContent,
			`A "${event}" listener was added without the "MessageContent" intent. Messages will still arrive, but ` +
			"their content, embeds, attachments, and components are empty except in DMs, in messages that mention " +
			"the bot, and in the bot's own messages. MessageContent is privileged: enable it in the developer " +
			"portal as well as in ClientOptions.intents."
		);
	}
}
