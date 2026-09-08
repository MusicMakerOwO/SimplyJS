import { randomUUID } from "node:crypto";
import { Member } from "../Structures/Member.js";
import { GuildScopedCache } from "../Contracts/CacheStructure.js";
import { Client } from "../Client.js";
import { DiscordMember } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { HasIntent } from "../Intents.js";
import { createCollector } from "../Collector.js";
import { ClientEvents } from "../Types/SimplyJSTypes.js";

/** Pagination options for a bulk {@link MemberCache.fetch} call. */
export type MemberFetchOptions = {
	/** Number of members to return (1-1000, default 1) */
	limit?: number;
	/** Consider only members after the given user id - useful in batching */
	after?: string;
};

/** Options for a {@link MemberCache.fetchGateway} request. */
export type GatewayMemberFetchOptions = {
	/**
	 * Username/nickname prefix to match. Defaults to `""` (every member) when `userIds` is omitted.
	 * Mutually exclusive with `userIds`, and requires the privileged `GuildMembers` intent.
	 */
	query?: string;
	/** Maximum number of members to return; `0` means no limit, and is the only valid value for a `""` query. */
	limit?: number;
	/** Specific user ids to fetch, up to 100. Mutually exclusive with `query`. */
	userIds?: string[];
	/** Whether to also fetch each member's presence. Requires the privileged `GuildPresences` intent. */
	presences?: boolean;
	/** How long to wait for the response to complete before rejecting, in ms (default 30000) */
	time?: number;
};

/** Discord rejects a `RequestGuildMembers` payload carrying more ids than this */
const MAX_REQUESTED_USER_IDS = 100;

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
	 * Fetches members over the gateway with a `RequestGuildMembers` (op 8) request, resolving once
	 * the last chunk of the response arrives. Every member is cached along the way.
	 *
	 * Unlike the REST {@link fetch}, this is not rate limited per 1000 members and is the only way
	 * to pull members together with their presences or to look up a batch of user ids in one call.
	 * Each chunk is also emitted as `ClientEvents.GuildMembersChunk` as it lands, so a very large
	 * fetch can be streamed instead of awaited.
	 *
	 * @param options Which members to request, and how long to wait for them.
	 * @throws {Error} If `query` and `userIds` are both given, more than 100 ids are requested, the
	 * intents required by the request are missing, or the response does not complete in time.
	 *
	 * @example
	 * ```ts
	 * const members = await guild.members.fetchGateway({ userIds: ["123", "456"], presences: true });
	 * ```
	 */
	async fetchGateway(options: GatewayMemberFetchOptions = {}): Promise<Member[]> {
		if (options.query !== undefined && options.userIds !== undefined) {
			throw new Error("`query` and `userIds` are mutually exclusive - request members by one or the other");
		}
		if (options.userIds && options.userIds.length > MAX_REQUESTED_USER_IDS) {
			throw new Error(
				`Cannot request more than ${MAX_REQUESTED_USER_IDS} user ids at once (got ${options.userIds.length})`
			);
		}

		const intents = this.client.socket.intents;
		// Discord silently drops a request whose intents are missing, so it would otherwise hang
		// until the timeout with no indication of why.
		if (!options.userIds && !HasIntent(intents, GatewayIntents.GuildMembers)) {
			throw new Error("Fetching members by query over the gateway requires the privileged `GuildMembers` intent");
		}
		if (options.presences && !HasIntent(intents, GatewayIntents.GuildPresences)) {
			throw new Error("Fetching presences over the gateway requires the privileged `GuildPresences` intent");
		}

		// A nonce is what tells one in-flight request's chunks from another's; Discord caps it at 32
		// characters, which a UUID fits once its dashes are stripped.
		const nonce = randomUUID().replaceAll("-", "");

		const collector = createCollector(this.client, ClientEvents.GuildMembersChunk, {
			filter: (payload) => payload.nonce === nonce && payload.guild.id === this.guild.id,
			time: options.time ?? 30_000
		});

		const members: Member[] = [];
		const completed = new Promise<Member[]>((resolve, reject) => {
			collector.on("collect", (payload) => {
				members.push(...payload.members);
				if (payload.chunkIndex >= payload.chunkCount - 1) collector.stop();
			});
			collector.on("end", (_collected, reason) => {
				if (reason === "time") {
					reject(new Error(`Timed out waiting for guild member chunks for guild ${this.guild.id}`));
					return;
				}
				resolve(members);
			});
		});

		// Sent only once the collector is listening, so a chunk that comes back immediately is caught.
		try {
			this.client.socket.requestGuildMembers({
				guild_id: this.guild.id,
				limit: options.limit ?? 0,
				...(options.presences === undefined ? {} : { presences: options.presences }),
				...(options.userIds ? { user_ids: options.userIds } : { query: options.query ?? "" }),
				nonce
			});
		} catch (error) {
			collector.stop();
			throw error;
		}

		return completed;
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