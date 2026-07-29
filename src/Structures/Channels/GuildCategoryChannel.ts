import { DiscordChannel, DiscordOverwrite, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { ChannelPermissionManager } from "../../Managers/ChannelPermissionManager.js";

export class GuildCategoryChannel extends BaseChannel {
	declare type: typeof DiscordChannelTypes.GUILD_CATEGORY

	position?: number
	permission_overwrites?: ChannelPermissionManager
	// no parent_id - categories can't be nested

	patch(data: DiscordChannel): void {
		super.patch(data);
		if (data.position !== undefined) this.position = data.position;
		if (data.permission_overwrites !== undefined) this.permission_overwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites);
	}

	async modify(options: {
		name?: string
		position?: number
		permission_overwrites?: DiscordOverwrite[]
		// no parent_id by design
	}): Promise<void> {
		await super.modify(options);
	}
}