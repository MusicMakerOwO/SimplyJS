import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { ChannelPermissionManager } from "../../Managers/ChannelPermissionManager.js";
import { Constructor, DiscordChannel } from "../../Types/index.js";

type PermissionOverwritesClass<T> = {
	/** Manager for this channel's per-role and per-member permission overwrites */
	permissionOverwrites?: ChannelPermissionManager;
} & T;

/**
 * Mixes a `permissionOverwrites` manager into a channel class, created on first `patch()`
 * and updated in place on subsequent ones so existing references stay valid. Applied to
 * channel types that support permission overwrites.
 * @param Base The channel class to extend.
 * @returns A subclass of `Base` with a `permissionOverwrites` property.
 */
export function PermissionOverwrites<TBase extends Constructor<BaseChannel>>(
	Base: TBase,
): Constructor<PermissionOverwritesClass<InstanceType<TBase>>> {
	return class extends Base {
		// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
		// es2022+), an emitted initializer would run after super() and wipe the value patch()
		// just set during construction.
		declare permissionOverwrites: ChannelPermissionManager;

		patch(data: DiscordChannel): void {
			super.patch(data);
			if (!this.permissionOverwrites) {
				this.permissionOverwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites ?? []);
			} else if (data.permission_overwrites) {
				this.permissionOverwrites.patch(data.permission_overwrites);
			}
		}
	} as unknown as Constructor<PermissionOverwritesClass<InstanceType<TBase>>>;
}