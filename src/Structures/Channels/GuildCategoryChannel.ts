import { DiscordChannel, DiscordOverwrite, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

/**
 * A category channel, used to visually group other channels. Categories cannot be nested inside
 * another category, so unlike other channel types they have no `parent_id`.
 */
export class GuildCategoryChannel extends PermissionOverwrites(Moveable(BaseChannel)) {
	declare type: typeof DiscordChannelTypes.GUILD_CATEGORY

	// no parent_id - categories can't be nested

	patch(data: DiscordChannel): void {
		super.patch(data);
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