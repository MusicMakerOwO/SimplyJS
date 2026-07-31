import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { ChannelPermissionManager } from "../../Managers/ChannelPermissionManager.js";
import { Constructor, DiscordChannel } from "../../Types/index.js";

type PermissionOverwritesClass<T> = {
	/** Manager for this channel's per-role and per-member permission overwrites */
	permission_overwrites?: ChannelPermissionManager;
} & T;

/**
 * Mixes a `permission_overwrites` manager into a channel class, created on first `patch()`
 * and updated in place on subsequent ones so existing references stay valid. Applied to
 * channel types that support permission overwrites.
 * @param Base The channel class to extend.
 * @returns A subclass of `Base` with a `permission_overwrites` property.
 */
export function PermissionOverwrites<TBase extends Constructor<BaseChannel>>(
	Base: TBase,
): Constructor<PermissionOverwritesClass<InstanceType<TBase>>> {
	return class extends Base {
		// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
		// es2022+), an emitted initializer would run after super() and wipe the value patch()
		// just set during construction.
		declare permission_overwrites: ChannelPermissionManager;

		patch(data: DiscordChannel): void {
			super.patch(data);
			if (!this.permission_overwrites) {
				this.permission_overwrites = new ChannelPermissionManager(this.client, this, data.permission_overwrites!);
			} else {
				this.permission_overwrites.patch(data.permission_overwrites!);
			}
		}
	} as unknown as Constructor<PermissionOverwritesClass<InstanceType<TBase>>>;
}