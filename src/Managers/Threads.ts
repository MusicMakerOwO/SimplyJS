import { Client } from "../Client.js";
import { BaseChannel } from "../Structures/Channels/BaseChannel.js";
import { Guild } from "../Structures/Guild.js";
import { GuildThreadChannel } from "../Structures/Channels/GuildThreadChannel.js";
import { CreateMessagePayload, SplitAttachments } from "../Structures/Message.js";
import { DiscordChannel, DiscordChannelTypes, DiscordThreadMember } from "../Types/DiscordAPITypes.js";
import { JSONObject, MessagePayload } from "../Types/Internal.js";

/** Options shared by every thread creation call. */
type BaseThreadCreateOptions = {
	/** 1-100 character thread name */
	name: string;
	/** Minutes of inactivity before the thread is auto-archived: `60`, `1440`, `4320` or `10080` */
	autoArchiveDuration?: number;
	/** Slowmode duration in seconds for the new thread */
	rateLimitPerUser?: number | null;
	/** Reason to attach to the audit log entry */
	reason?: string;
};

/** Options for creating a thread that is not attached to an existing message. */
export type ThreadCreateOptions = BaseThreadCreateOptions & {
	/**
	 * The thread type. Defaults to `PUBLIC_THREAD`; pass `PRIVATE_THREAD` for a private thread,
	 * or `ANNOUNCEMENT_THREAD` in an announcement channel.
	 */
	type?: typeof DiscordChannelTypes.ANNOUNCEMENT_THREAD
		| typeof DiscordChannelTypes.PUBLIC_THREAD
		| typeof DiscordChannelTypes.PRIVATE_THREAD;
	/** Whether non-moderators can add other members to a private thread */
	invitable?: boolean;
};

/** Options for creating a forum or media post, whose first message is part of the same request. */
export type ForumThreadCreateOptions = BaseThreadCreateOptions & {
	/** The post's first message - plain text, or a full message payload with embeds and files */
	message: string | MessagePayload;
	/** Ids of the forum tags to apply to the post */
	appliedTags?: string[];
};

/** Options for creating a thread from an existing message. */
export type MessageThreadCreateOptions = BaseThreadCreateOptions;

/** Pagination options for the archived thread listings. */
export type ArchivedThreadFetchOptions = {
	/** Return threads archived before this ISO timestamp */
	before?: string;
	/** Maximum number of threads to return */
	limit?: number;
};

/** A page of threads returned by one of the listing endpoints. */
export type FetchedThreads = {
	/** The threads on this page, upserted into the guild's channel cache */
	threads: GuildThreadChannel[];
	/**
	 * Whether more threads match the query than were returned. Page again with `before` set to the
	 * archive timestamp of the last thread.
	 */
	hasMore: boolean;
};

/** The shape Discord returns from every thread listing endpoint. */
type ThreadListResponse = {
	threads: DiscordChannel[];
	members: DiscordThreadMember[];
	has_more?: boolean;
};

/**
 * Manages the threads of a single channel. This manager has no cache of its own - threads live in
 * the guild's channel cache alongside every other channel, and each method upserts into it.
 */
export class ThreadManager {
	client: Client;
	guild: Guild;
	channel: BaseChannel;

	constructor(client: Client, guild: Guild, channel: BaseChannel) {
		this.client = client;
		this.guild = guild;
		this.channel = channel;
	}

	/** Upserts a raw thread payload into the guild's channel cache. */
	private upsert(data: DiscordChannel): GuildThreadChannel {
		return this.guild.channels.upsert(data) as GuildThreadChannel;
	}

	/**
	 * Upserts a listing response, seeding each returned thread's member cache with the
	 * accompanying `members` entries (Discord only sends the current user's memberships here).
	 */
	private upsertList(response: ThreadListResponse): FetchedThreads {
		const threads = response.threads.map((thread) => this.upsert(thread));
		for (const member of response.members) {
			// `id` is the thread the membership belongs to; it is only omitted in payloads nested
			// inside a channel object, which this is not.
			const thread = threads.find((candidate) => candidate.id === member.id);
			thread?.members.upsert(member);
		}
		return { threads, hasMore: response.has_more ?? false };
	}

	/**
	 * Creates a thread that is not attached to an existing message. Requires `CREATE_PUBLIC_THREADS`
	 * (or `CREATE_PRIVATE_THREADS` for a private thread).
	 *
	 * Forum and media channels reject this call - their posts always carry a first message, so use
	 * {@link createForumPost} there instead.
	 * @param options The thread creation payload.
	 */
	async create(options: ThreadCreateOptions): Promise<GuildThreadChannel> {
		const { autoArchiveDuration, rateLimitPerUser, reason, ...rest } = options;
		const payload: JSONObject = {
			...rest,
			type: options.type ?? DiscordChannelTypes.PUBLIC_THREAD,
		};
		if (autoArchiveDuration !== undefined) payload.auto_archive_duration = autoArchiveDuration;
		if (rateLimitPerUser !== undefined) payload.rate_limit_per_user = rateLimitPerUser;

		const created = await this.client.rest.post<DiscordChannel>(
			`/channels/${this.channel.id}/threads`,
			payload,
			reason ? { 'X-Audit-Log-Reason': reason } : {}
		);
		return this.upsert(created);
	}

	/**
	 * Creates a forum or media post - a thread whose first message is sent in the same request.
	 * Requires `SEND_MESSAGES` in the forum.
	 * @param options The post payload, including its first message.
	 */
	async createForumPost(options: ForumThreadCreateOptions): Promise<GuildThreadChannel> {
		const { message, autoArchiveDuration, rateLimitPerUser, appliedTags, reason, ...rest } = options;
		const { body, files } = SplitAttachments(CreateMessagePayload(message));
		const payload: JSONObject = { ...rest, message: body as JSONObject };
		if (autoArchiveDuration !== undefined) payload.auto_archive_duration = autoArchiveDuration;
		if (rateLimitPerUser !== undefined) payload.rate_limit_per_user = rateLimitPerUser;
		if (appliedTags !== undefined) payload.applied_tags = appliedTags;

		const created = await this.client.rest.post<DiscordChannel>(
			`/channels/${this.channel.id}/threads`,
			payload,
			reason ? { 'X-Audit-Log-Reason': reason } : {},
			files
		);
		return this.upsert(created);
	}

	/**
	 * Creates a thread from an existing message in this channel. The thread's id is the message's
	 * id, and its type follows the parent channel (announcement channels produce announcement
	 * threads).
	 * @param messageId The id of the message to start the thread from.
	 * @param options The thread creation payload.
	 */
	async createFromMessage(messageId: string, options: MessageThreadCreateOptions): Promise<GuildThreadChannel> {
		const { autoArchiveDuration, rateLimitPerUser, reason, ...rest } = options;
		const payload: JSONObject = { ...rest };
		if (autoArchiveDuration !== undefined) payload.auto_archive_duration = autoArchiveDuration;
		if (rateLimitPerUser !== undefined) payload.rate_limit_per_user = rateLimitPerUser;

		const created = await this.client.rest.post<DiscordChannel>(
			`/channels/${this.channel.id}/messages/${messageId}/threads`,
			payload,
			reason ? { 'X-Audit-Log-Reason': reason } : {}
		);
		return this.upsert(created);
	}

	/**
	 * Fetches every active (non-archived) thread in this channel's guild, then narrows the result
	 * to the ones parented to this channel.
	 *
	 * Discord has no per-channel active listing, so this is a guild-wide request either way - the
	 * threads it returns for sibling channels are still cached.
	 */
	async fetchActive(): Promise<GuildThreadChannel[]> {
		const response = await this.client.rest.get<ThreadListResponse>(
			`/guilds/${this.guild.id}/threads/active`
		);
		return this.upsertList(response).threads.filter((thread) => thread.parentId === this.channel.id);
	}

	/**
	 * Fetches a page of this channel's archived public threads, newest first. Requires
	 * `READ_MESSAGE_HISTORY`.
	 * @param options Pagination options.
	 */
	async fetchArchived(options?: ArchivedThreadFetchOptions): Promise<FetchedThreads> {
		return this.fetchArchivedList(`/channels/${this.channel.id}/threads/archived/public`, options);
	}

	/**
	 * Fetches a page of this channel's archived private threads, newest first. Requires
	 * `READ_MESSAGE_HISTORY` and `MANAGE_THREADS`.
	 * @param options Pagination options.
	 */
	async fetchArchivedPrivate(options?: ArchivedThreadFetchOptions): Promise<FetchedThreads> {
		return this.fetchArchivedList(`/channels/${this.channel.id}/threads/archived/private`, options);
	}

	/**
	 * Fetches a page of the archived private threads in this channel that the current user has
	 * joined, newest first. Unlike the other archived listings this one pages by thread id, so
	 * `before` takes an id rather than a timestamp.
	 * @param options Pagination options, where `before` is a thread id.
	 */
	async fetchJoinedArchivedPrivate(options?: ArchivedThreadFetchOptions): Promise<FetchedThreads> {
		return this.fetchArchivedList(`/channels/${this.channel.id}/users/@me/threads/archived/private`, options);
	}

	/** Shared request path for the three archived listings, which differ only in their route. */
	private async fetchArchivedList(path: string, options?: ArchivedThreadFetchOptions): Promise<FetchedThreads> {
		const params = new URLSearchParams();
		if (options?.before) params.append('before', options.before);
		if (options?.limit) params.append('limit', options.limit.toString());
		const query = params.toString()
			? `?${params.toString()}`
			: '';

		const response = await this.client.rest.get<ThreadListResponse>(`${path}${query}`);
		return this.upsertList(response);
	}
}
