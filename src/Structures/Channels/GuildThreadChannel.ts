import { DiscordChannel, DiscordThreadMember, DiscordThreadMetadata, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Messageable } from "../../Mixins/Channels/Messageable.js";

/**
 * A thread channel (public, private, or announcement). Threads inherit permission overwrites
 * from their parent channel rather than declaring their own.
 */
export class GuildThreadChannel extends Messageable(BaseChannel) {
	declare type: typeof DiscordChannelTypes.ANNOUNCEMENT_THREAD | typeof DiscordChannelTypes.PUBLIC_THREAD | typeof DiscordChannelTypes.PRIVATE_THREAD

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	/** Id of the user who created the thread */
	declare ownerId?: string
	/** Id of the channel the thread was created in */
	declare parentId?: string | null
	declare lastMessageId?: string | null
	/** Number of messages in the thread, not counting the initial message or deleted messages */
	declare messageCount?: number
	/** Approximate number of members in the thread; Discord stops counting past `50`, so this is not exact for larger threads */
	declare memberCount?: number
	/** Thread-specific state: archive status, auto-archive duration, lock status, and timestamps */
	declare threadMetadata?: DiscordThreadMetadata
	/** Thread membership data for the current user, only present when the current user has joined the thread */
	declare member?: DiscordThreadMember
	/** Total number of messages ever sent in the thread, including deleted ones; unlike `messageCount` this never decreases */
	declare totalMessageSent?: number
	/** Ids of the forum/media tags applied to this thread */
	declare appliedTags?: string[]
	declare rateLimitPerUser?: number
	// no permissionOverwrites - threads inherit from parent

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.owner_id !== undefined) this.ownerId = data.owner_id;
		if (data.parent_id !== undefined) this.parentId = data.parent_id;
		if (data.last_message_id !== undefined) this.lastMessageId = data.last_message_id;
		if (data.message_count !== undefined) this.messageCount = data.message_count;
		if (data.member_count !== undefined) this.memberCount = data.member_count;
		if (data.thread_metadata !== undefined) this.threadMetadata = data.thread_metadata;
		if (data.member !== undefined) this.member = data.member;
		if (data.total_message_sent !== undefined) this.totalMessageSent = data.total_message_sent;
		if (data.applied_tags !== undefined) this.appliedTags = data.applied_tags;
		if (data.rate_limit_per_user !== undefined) this.rateLimitPerUser = data.rate_limit_per_user;
	}

	// threads have their own modify semantics - no position, no parent, no overwrites
	async modify(options: {
		name?: string
		archived?: boolean
		autoArchiveDuration?: number
		locked?: boolean
		invitable?: boolean
		rateLimitPerUser?: number
		flags?: number
		appliedTags?: string[]
	}): Promise<void> {
		const { autoArchiveDuration, rateLimitPerUser, appliedTags, ...rest } = options;
		const payload: Record<string, unknown> = { ...rest };
		if (autoArchiveDuration !== undefined) payload.auto_archive_duration = autoArchiveDuration;
		if (rateLimitPerUser !== undefined) payload.rate_limit_per_user = rateLimitPerUser;
		if (appliedTags !== undefined) payload.applied_tags = appliedTags;
		await super.modify(payload as Partial<DiscordChannel>);
	}
}