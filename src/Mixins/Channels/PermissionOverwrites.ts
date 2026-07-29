import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { ChannelPermissionManager } from "../../Managers/ChannelPermissionManager.js";
import { Constructor, DiscordChannel } from "../../Types/index.js";

type PermissionOverwritesClass<T> = {
	permission_overwrites?: ChannelPermissionManager;
} & T;

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