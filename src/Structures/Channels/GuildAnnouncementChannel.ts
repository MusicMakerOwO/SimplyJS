import { DiscordChannelTypes, DiscordFollowedChannel } from "../../Types/DiscordAPITypes.js";
import { Message } from "../Message.js";
import { DiscordMessage } from "../../Types/MessageComponents.js";
import { GuildTextChannel } from "./GuildTextChannel.js";

/**
 * Announcement channels are structurally identical to text channels
 * with one extra ability: crossposting a message to following servers
 */
export class GuildAnnouncementChannel extends GuildTextChannel {
	declare type: typeof DiscordChannelTypes.GUILD_ANNOUNCEMENT

	/**
	 * Crossposts a message to all servers following this announcement channel.
	 * @param messageId The ID of the message to crosspost.
	 * @returns The crossposted message.
	 */
	async crosspost(messageId: string): Promise<Message> {
		const response = await this.client.rest.post<DiscordMessage>(
			`/channels/${this.id}/messages/${messageId}/crosspost`,
			{}
		);
		return new Message(this.client, response);
	}

	/**
	 * Follows this announcement channel into another channel, so everything crossposted here is
	 * relayed there. Discord does this by creating a Channel Follower webhook in the target channel.
	 *
	 * Requires the `MANAGE_WEBHOOKS` permission in the *target* channel. The webhook it creates lives
	 * in the target channel's guild, so it does not land in this guild's `webhooks` cache.
	 * @param targetChannelId Id of the channel that should receive this channel's posts
	 * @param reason Optional audit log reason.
	 * @returns The followed channel and the id of the webhook created to relay it
	 * @see https://docs.discord.com/developers/resources/channel#follow-announcement-channel
	 */
	async follow(targetChannelId: string, reason?: string): Promise<DiscordFollowedChannel> {
		return await this.client.rest.post<DiscordFollowedChannel>(
			`/channels/${this.id}/followers`,
			{ webhook_channel_id: targetChannelId },
			reason ? { 'X-Audit-Log-Reason': reason } : {}
		);
	}
}