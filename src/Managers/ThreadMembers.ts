import { ThreadMember } from "../Structures/ThreadMember.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordThreadMember } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import type { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";

/**
 * Cache of a single thread's {@link ThreadMember}s, keyed by user id.
 *
 * Seeded by `THREAD_LIST_SYNC` and kept current by `THREAD_MEMBER_UPDATE` and
 * `THREAD_MEMBERS_UPDATE`. Gateway coverage is partial by design - without the privileged
 * `GuildMembers` intent Discord only reports the current user's membership, and
 * `THREAD_MEMBERS_UPDATE` caps its `added_members` list at 50 - so use {@link fetchAll} when a
 * complete member list matters.
 */
export class ThreadMemberCache extends GuildScopedCache<string, ThreadMember, DiscordThreadMember> {
	private readonly thread: GuildThreadChannel;

	constructor(client: Client, guild: Guild, thread: GuildThreadChannel) {
		super(client, guild);
		this.thread = thread;
	}

	upsert(data: DiscordThreadMember): ThreadMember {
		// `user_id` is omitted when the payload is the current user's membership nested inside a
		// channel object, which is the only case Discord leaves it out.
		const key = data.user_id ?? this.client.user?.id;
		if (key === undefined) {
			// Nothing to key on - hand back a detached instance rather than caching it under a
			// placeholder that later lookups could never find.
			return new ThreadMember(this.client, this.guild, this.thread, data);
		}

		if (this.has(key)) {
			this.get(key)!.patch(data);
		} else {
			this.set(key, new ThreadMember(this.client, this.guild, this.thread, data));
		}
		return this.get(key)!;
	}

	async fetch(id: string): Promise<ThreadMember> {
		const fetched = await this.client.rest.get<DiscordThreadMember>(
			`/channels/${this.thread.id}/thread-members/${id}?with_member=true`
		);
		return this.upsert(fetched);
	}

	/**
	 * Fetches every member of this thread and upserts them into the cache. Requires the privileged
	 * `GuildMembers` intent.
	 */
	async fetchAll(): Promise<ThreadMember[]> {
		const fetched = await this.client.rest.get<DiscordThreadMember[]>(
			`/channels/${this.thread.id}/thread-members?with_member=true`
		);
		return fetched.map((member) => this.upsert(member));
	}
}
