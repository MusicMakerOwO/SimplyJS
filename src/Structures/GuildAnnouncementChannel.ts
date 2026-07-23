import { Message } from "./Message.js";
import { DiscordMessage } from "../Types/MessageComponents.js";
import { GuildTextChannel } from "./GuildTextChannel.js";

/**
 * Announcement channels are structurally identical to text channels
 * with one extra ability: crossposting a message to following servers
 */
export class GuildAnnouncementChannel extends GuildTextChannel {
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
}