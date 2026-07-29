import { DiscordChannel, DiscordThreadMember, DiscordThreadMetadata, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Messageable } from "../../Mixins/Channels/Messageable.js";

export class GuildThreadChannel extends Messageable(BaseChannel) {
	declare type: typeof DiscordChannelTypes.ANNOUNCEMENT_THREAD | typeof DiscordChannelTypes.PUBLIC_THREAD | typeof DiscordChannelTypes.PRIVATE_THREAD

	// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
	// es2022+), an emitted initializer would run after super() and wipe the value patch() just
	// set during construction (patch() is invoked from BaseChannel's constructor, further up
	// the super() chain than this class's own field declarations).
	declare owner_id?: string
	declare parent_id?: string | null
	declare last_message_id?: string | null
	declare message_count?: number
	declare member_count?: number
	declare thread_metadata?: DiscordThreadMetadata
	declare member?: DiscordThreadMember
	declare total_message_sent?: number
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