import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { Constructor, DiscordChannel } from "../../Types/index.js";

type PositionClass<T> = {
	/** Sort position of this channel within its guild's channel list, among channels of the same type/parent */
	position?: number;
} & T;

/**
 * Mixes a `position` property into a channel class, patched from the channel's `position`
 * field on every update. Applied to channel types that appear in the guild's sortable
 * channel list.
 * @param Base The channel class to extend.
 * @returns A subclass of `Base` with a `position` property.
 */
export function Moveable<TBase extends Constructor<BaseChannel>>(
	Base: TBase,
): Constructor<PositionClass<InstanceType<TBase>>> {
	return class extends Base {
		// `declare` avoids emitting a field initializer — with useDefineForClassFields (target
		// es2022+), an emitted initializer would run after super() and wipe the value patch()
		// just set during construction.
		declare position: number;

		patch(data: DiscordChannel): void {
			super.patch(data);
			if (data.position !== undefined) this.position = data.position;
		}
	} as unknown as Constructor<PositionClass<InstanceType<TBase>>>;
}