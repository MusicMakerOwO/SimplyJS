import { Client } from "../Client.js";
import {
	ActivityType,
	DiscordActivity,
	DiscordActivityEmoji,
	DiscordPresence,
	Status
} from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Guild } from "./Guild.js";
import { ObjectValues } from "../Types/HelperTypes.js";
import type { Member } from "./Member.js";
import type { User } from "./User.js";

/** Unix millisecond bounds of an activity, used to render "elapsed" and "remaining" timers */
export type ActivityTimestamps = {
	/** Unix ms of when the activity started */
	start?: number;
	/** Unix ms of when the activity ends */
	end?: number;
};

/** The party the user is currently in */
export type ActivityParty = {
	id?: string;
	/** Current and maximum party size, in that order */
	size?: [currentSize: number, maxSize: number];
};

/** Images and hover texts for the rich presence card */
export type ActivityAssets = {
	largeImage?: string;
	largeText?: string;
	largeUrl?: string;
	smallImage?: string;
	smallText?: string;
	smallUrl?: string;
};

/** Rich presence join/spectate secrets */
export type ActivitySecrets = {
	join?: string;
	spectate?: string;
	match?: string;
};

/**
 * A single activity on a {@link Presence}.
 *
 * Activities are a plain camelCased object rather than a structure class: they have no id, are
 * replaced wholesale on every presence update, and are never cached individually, so there is
 * nothing for a class to own.
 */
export type Activity = {
	/** The activity's name */
	name: string;
	/** What kind of activity this is, which decides how clients render `name` and `state` */
	type: ObjectValues<typeof ActivityType>;
	/** Unix ms of when the activity was added to the user's session */
	createdAt: number;
	/** Stream url, only meaningful when `type` is `STREAMING` */
	url?: string | null;
	timestamps?: ActivityTimestamps;
	/** Application id for the game */
	applicationId?: string;
	/** What the player is currently doing */
	details?: string | null;
	/** The user's current party status, or the text used for a custom status */
	state?: string | null;
	/** Emoji used for a custom status */
	emoji?: DiscordActivityEmoji | null;
	party?: ActivityParty;
	assets?: ActivityAssets;
	secrets?: ActivitySecrets;
	/** Whether the activity is an instanced game session */
	instance?: boolean;
	/** Bitfield of `ActivityFlags` describing what the payload includes */
	flags?: number;
	/** Custom button labels shown on the profile. Discord only sends labels, never urls */
	buttons?: string[];
};

/** Per-device status for a user; a key is absent entirely when the user is offline on that platform */
export type ClientStatus = {
	desktop?: ObjectValues<typeof Status>;
	mobile?: ObjectValues<typeof Status>;
	web?: ObjectValues<typeof Status>;
};

/** Devices a user can be online from, as reported in {@link ClientStatus} */
export type PresenceDevice = "desktop" | "mobile" | "web";

/**
 * Maps a raw gateway activity onto its camelCased {@link Activity} form.
 * @param data The activity as Discord sent it.
 */
export function ToActivity(data: DiscordActivity): Activity {
	const activity: Activity = {
		name: data.name,
		type: data.type,
		createdAt: data.created_at
	};

	if ("url" in data && data.url !== undefined) activity.url = data.url;
	if ("application_id" in data && data.application_id !== undefined) activity.applicationId = data.application_id;
	if ("details" in data && data.details !== undefined) activity.details = data.details;
	if ("state" in data && data.state !== undefined) activity.state = data.state;
	if ("emoji" in data && data.emoji !== undefined) activity.emoji = data.emoji;
	if ("instance" in data && data.instance !== undefined) activity.instance = data.instance;
	if ("flags" in data && data.flags !== undefined) activity.flags = data.flags;
	if ("buttons" in data && data.buttons !== undefined) activity.buttons = [...data.buttons];

	if ("timestamps" in data && data.timestamps !== undefined) {
		activity.timestamps = { ...data.timestamps };
	}

	if ("party" in data && data.party !== undefined) {
		activity.party = {};
		if (data.party.id !== undefined) activity.party.id = data.party.id;
		if (data.party.size !== undefined) activity.party.size = [...data.party.size];
	}

	if ("assets" in data && data.assets !== undefined) {
		activity.assets = {};
		if (data.assets.large_image !== undefined) activity.assets.largeImage = data.assets.large_image;
		if (data.assets.large_text !== undefined) activity.assets.largeText = data.assets.large_text;
		if (data.assets.large_url !== undefined) activity.assets.largeUrl = data.assets.large_url;
		if (data.assets.small_image !== undefined) activity.assets.smallImage = data.assets.small_image;
		if (data.assets.small_text !== undefined) activity.assets.smallText = data.assets.small_text;
		if (data.assets.small_url !== undefined) activity.assets.smallUrl = data.assets.small_url;
	}

	if ("secrets" in data && data.secrets !== undefined) {
		activity.secrets = { ...data.secrets };
	}

	return activity;
}

/**
 * A user's presence in a guild - their status, per-device status, and current activities.
 *
 * Presences only arrive with the privileged `GuildPresences` intent. The payload's `user` object
 * is partial (Discord guarantees only `id`), so this structure stores `userId` and resolves the
 * full {@link User} from the client cache on access rather than trusting the payload.
 */
export class Presence extends APIGuildStructure<DiscordPresence> {
	/** Id of the guild this presence was reported in */
	guildId!: string
	/** Id of the user this presence belongs to */
	userId!: string
	/** Overall status across every device */
	status!: ObjectValues<typeof Status>
	/** The user's current activities, most recent first */
	activities!: Activity[]
	/** Per-device status; a key is absent when the user is offline on that platform */
	clientStatus!: ClientStatus

	constructor(client: Client, guild: Guild, data: DiscordPresence) {
		super(client, guild);
		this.patch(data);
	}

	patch(data: DiscordPresence): void {
		// `guild_id` is omitted on the presences embedded in GUILD_CREATE, where the parent guild is implied
		this.guildId = data.guild_id ?? this.guild.id;
		this.userId = data.user.id;
		this.status = data.status;
		this.activities = (data.activities ?? []).map(ToActivity);
		this.clientStatus = { ...(data.client_status ?? {}) };
	}

	/** The cached user this presence belongs to, or `undefined` when the user has not been seen */
	get user(): User | undefined {
		return this.client.users.get(this.userId);
	}

	/** The cached member this presence belongs to, or `undefined` when the member is not cached */
	get member(): Member | undefined {
		return this.guild.members.get(this.userId);
	}

	/** Text of the user's custom status, or `null` when they have not set one */
	get customStatus(): string | null {
		return this.activityOfType(ActivityType.CUSTOM)?.state ?? null;
	}

	/**
	 * Finds this presence's first activity of a given type.
	 * @param type The activity type to look for.
	 *
	 * @example
	 * ```ts
	 * presence.activityOfType(ActivityType.PLAYING)?.name; // "Factorio"
	 * ```
	 */
	activityOfType(type: ObjectValues<typeof ActivityType>): Activity | undefined {
		return this.activities.find(activity => activity.type === type);
	}

	/**
	 * Tests whether the user has an active session on a device that is not offline.
	 * @param device The device to check.
	 */
	isOn(device: PresenceDevice): boolean {
		const status = this.clientStatus[device];
		return status !== undefined && status !== Status.OFFLINE;
	}

	/**
	 * The activity objects and the client status map are handed out to listeners as-is, so a
	 * snapshot takes its own copies rather than letting a caller mutate the cached presence's.
	 */
	protected override detach(source: this): void {
		this.activities = source.activities.map(activity => structuredClone(activity));
		this.clientStatus = { ...source.clientStatus };
	}
}
