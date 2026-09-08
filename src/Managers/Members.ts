import { Member } from "../Structures/Member.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordMember } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

/** Pagination options for a bulk {@link MemberCache.fetch} call. */
export type MemberFetchOptions = {
	/** Number of members to return (1-1000, default 1) */
	limit?: number;
	/** Consider only members after the given user id - useful in batching */
	after?: string;
};

/** Cache of a single guild's {@link Member}s, keyed by user id. */
export class MemberCache extends GuildScopedCache<string, Member, DiscordMember> {
	constructor(client: Client, guild: Guild) {
		super(client, guild);
	}

	upsert(data: DiscordMember): Member {
		if (this.has(data.user.id)) {
			this.get(data.user.id)!.patch(data);
		} else {
			this.set(data.user.id, new Member(this.client, this.guild, data));
		}
		return this.get(data.user.id)!;
	}

	/**
	 * Fetches a single member by user id.
	 * @param id The member's user id.
	 */
	async fetch(id: string): Promise<Member>;
	/**
	 * Fetches a page of the guild's members, ordered by ascending user id. Requires the privileged
	 * `GuildMembers` intent.
	 *
	 * Discord caps this at 1000 members per call, so a full member list means paging with `after`
	 * set to the last id of the previous page until a short page comes back.
	 * @param options Pagination options.
	 */
	async fetch(options?: MemberFetchOptions): Promise<Member[]>;
	async fetch(options?: string | MemberFetchOptions): Promise<Member | Member[]> {
		if (typeof options === 'string') {
			const fetched = await this.client.rest.get<DiscordMember>(`/guilds/${this.guild.id}/members/${options}`);
			return this.upsert(fetched);
		} else {
			const params = new URLSearchParams();
			if (options?.limit) params.append('limit', options.limit.toString());
			if (options?.after) params.append('after', options.after);
			const query = params.toString()
				? `?${params.toString()}`
				: '';

			const fetched = await this.client.rest.get<DiscordMember[]>(`/guilds/${this.guild.id}/members${query}`);
			return fetched.map((member) => this.upsert(member));
		}
	}

	/**
	 * Fetches every member of the guild by paging through {@link fetch} until Discord runs out of
	 * members. Requires the privileged `GuildMembers` intent.
	 *
	 * This is one REST call per 1000 members - on a large guild it is both slow and heavily rate
	 * limited, so prefer a targeted {@link fetch} or {@link search} when you only need a few.
	 */
	async fetchAll(): Promise<Member[]> {
		const all: Member[] = [];
		let after: string | undefined;

		for (;;) {
			const page = await this.fetch(after === undefined ? { limit: 1000 } : { limit: 1000, after });
			all.push(...page);
			if (page.length < 1000) return all;
			after = page[page.length - 1].id;
		}
	}

	/**
	 * Searches the guild's members by username or nickname prefix.
	 * @param query The prefix to match against usernames and nicknames.
	 * @param limit Number of members to return (1-1000, default 1).
	 */
	async search(query: string, limit?: number): Promise<Member[]> {
		const params = new URLSearchParams({ query });
		if (limit) params.append('limit', limit.toString());

		const fetched = await this.client.rest.get<DiscordMember[]>(
			`/guilds/${this.guild.id}/members/search?${params.toString()}`
		);
		return fetched.map((member) => this.upsert(member));
	}
}