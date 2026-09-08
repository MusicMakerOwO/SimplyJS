import { BaseChannel } from "../../Structures/Channels/BaseChannel.js";
import { ThreadManager } from "../../Managers/Threads.js";
import { Constructor } from "../../Types/Internal.js";

type ThreadableClass<T> = {
	readonly threads: ThreadManager;
} & T;

/**
 * Lazily created thread managers, keyed by channel.
 *
 * Held out here rather than in a `#private` field so that `clone()` - which copies own properties
 * onto a bare instance and cannot carry private fields across - produces a usable channel. A clone
 * simply starts with no manager and builds its own on first access.
 */
const threadManagers = new WeakMap<BaseChannel, ThreadManager>();

/**
 * Mixes a {@link ThreadManager} into a channel class. Applied to every channel type that can
 * parent threads (text, announcement, forum, media).
 * @param Base The channel class to extend.
 * @returns A subclass of `Base` with a `threads` manager.
 */
export function Threadable<TBase extends Constructor<BaseChannel>>(
	Base: TBase,
): Constructor<ThreadableClass<InstanceType<TBase>>> {
	return class extends Base {
		/**
		 * This manager creates and lists this channel's threads. It holds no cache of its own -
		 * threads it returns are upserted into the guild's channel cache.
		 */
		get threads(): ThreadManager {
			let manager = threadManagers.get(this);
			if (!manager) {
				manager = new ThreadManager(this.client, this.guild, this);
				threadManagers.set(this, manager);
			}
			return manager;
		}
	} as unknown as Constructor<ThreadableClass<InstanceType<TBase>>>;
}
