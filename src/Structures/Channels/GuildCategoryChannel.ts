import { DiscordChannel, DiscordOverwrite, DiscordChannelTypes } from "../../Types/DiscordAPITypes.js";
import { BaseChannel } from "./BaseChannel.js";
import { Moveable } from "../../Mixins/Channels/Moveable.js";
import { PermissionOverwrites } from "../../Mixins/Channels/PermissionOverwrites.js";

/**
 * A category channel, used to visually group other channels. Categories cannot be nested inside
 * another category, so unlike other channel types they have no `parentId`.
 */
export class GuildCategoryChannel extends PermissionOverwrites(Moveable(BaseChannel)) {
	declare type: typeof DiscordChannelTypes.GUILD_CATEGORY

	// no parentId - categories can't be nested

	patch(data: DiscordChannel): void {
		super.patch(data);
	}

	async modify(options: {
		name?: string
		position?: number
		permissionOverwrites?: DiscordOverwrite[]
		// no parentId by design
	}): Promise<void> {
		const { permissionOverwrites, ...rest } = options;
		const payload: Partial<DiscordChannel> = { ...rest };
		if (permissionOverwrites !== undefined) payload.permission_overwrites = permissionOverwrites;
		await super.modify(payload);
	}
}