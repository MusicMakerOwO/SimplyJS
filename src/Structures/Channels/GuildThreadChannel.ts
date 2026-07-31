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
	declare owner_id?: string
	/** Id of the channel the thread was created in */
	declare parent_id?: string | null
	declare last_message_id?: string | null
	/** Number of messages in the thread, not counting the initial message or deleted messages */
	declare message_count?: number
	/** Approximate number of members in the thread; Discord stops counting past `50`, so this is not exact for larger threads */
	declare member_count?: number
	/** Thread-specific state: archive status, auto-archive duration, lock status, and timestamps */
	declare thread_metadata?: DiscordThreadMetadata
	/** Thread membership data for the current user, only present when the current user has joined the thread */
	declare member?: DiscordThreadMember
	/** Total number of messages ever sent in the thread, including deleted ones; unlike `message_count` this never decreases */
	declare total_message_sent?: number
	/** Ids of the forum/media tags applied to this thread */
	declare applied_tags?: string[]
	declare rate_limit_per_user?: number
	// no permission_overwrites - threads inherit from parent

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.owner_id !== undefined) this.owner_id = data.owner_id;
		if (data.parent_id !== undefined) this.parent_id = data.parent_id;
		if (data.last_message_id !== undefined) this.last_message_id = data.last_message_id;
		if (data.message_count !== undefined) this.message_count = data.message_count;
		if (data.member_count !== undefined) this.member_count = data.member_count;
		if (data.thread_metadata !== undefined) this.thread_metadata = data.thread_metadata;
		if (data.member !== undefined) this.member = data.member;
		if (data.total_message_sent !== undefined) this.total_message_sent = data.total_message_sent;
		if (data.applied_tags !== undefined) this.applied_tags = data.applied_tags;
		if (data.rate_limit_per_user !== undefined) this.rate_limit_per_user = data.rate_limit_per_user;
	}

	// threads have their own modify semantics - no position, no parent, no overwrites
	async modify(options: {
		name?: string
		archived?: boolean
		auto_archive_duration?: number
		locked?: boolean
		invitable?: boolean
		rate_limit_per_user?: number
		flags?: number
		applied_tags?: string[]
	}): Promise<void> {
		await super.modify(options);
	}
}