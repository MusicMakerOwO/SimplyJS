import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { Constructor, DiscordChannel } from "../../Types/index.js";

type PositionClass<T> = {
	position?: number;
} & T;

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
			this.position = data.position!;
		}
	} as unknown as Constructor<PositionClass<InstanceType<TBase>>>;
}