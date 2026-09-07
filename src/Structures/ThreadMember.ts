import { DiscordMember, DiscordThreadMember } from "../Types/DiscordAPITypes.js";
import { APIGuildStructure } from "../Contracts/DiscordStructure.js";
import { Client } from "../Client.js";
import { Guild } from "./Guild.js";
import type { Member } from "./Member.js";
import type { User } from "./User.js";
import type { GuildThreadChannel } from "./Channels/GuildThreadChannel.js";

/**
 * A user's membership of a single {@link GuildThreadChannel}.
 *
 * Thread members are only ever delivered over the gateway or the thread-member REST routes, and
 * carry almost nothing of their own - the interesting data lives on the guild {@link Member} and
 * the {@link User}, both of which this structure resolves from the client caches rather than
 * duplicating.
 *
 * @see https://docs.discord.com/developers/resources/channel#thread-member-object
 */
export class ThreadMember extends APIGuildStructure<DiscordThreadMember> {
	/** Id of the thread this membership belongs to */
	id!: string
	/** Id of the user who joined the thread */
	userId!: string
	/** When the user last joined the thread */
	joinedAt!: Date
	/** Thread-member flags, currently only used for notification settings */
	flags!: number
	/**
	 * The guild member behind this membership, present only when Discord sent the member object
	 * alongside it (`with_member` on the REST routes, or a `THREAD_MEMBERS_UPDATE` addition).
	 */
	member?: Member

	/** The thread this membership belongs to */
	readonly thread: GuildThreadChannel

	constructor(client: Client, guild: Guild, thread: GuildThreadChannel, data: DiscordThreadMember) {
		super(client, guild);
		this.thread = thread;
		this.patch(data);
	}

	patch(data: DiscordThreadMember): void {
		// Discord omits `id` and `user_id` when the thread member is nested inside a channel
		// payload - the surrounding thread and the current user are implied - so both fall back to
		// what the owning thread already knows.
		this.id = data.id ?? this.id ?? this.thread.id;
		this.userId = data.user_id ?? this.userId ?? this.client.user?.id ?? "";

		if (data.join_timestamp !== undefined) this.joinedAt = new Date(data.join_timestamp);
		if (data.flags !== undefined) this.flags = data.flags;

		// `member` is typed as a partial, but Discord only ever sends it complete; a missing user
		// would leave the member cache unable to key it, so skip those rather than guess.
		if (data.member?.user !== undefined) {
			this.member = this.guild.members.upsert(data.member as DiscordMember);
		}
	}

	/** The user behind this membership, or `undefined` when they are not cached */
	get user(): User | undefined {
		return this.client.users.get(this.userId);
	}
}
