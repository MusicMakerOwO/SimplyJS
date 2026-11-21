/** Discord allows one `IDENTIFY` per rate limit bucket per this many milliseconds */
export const IDENTIFY_INTERVAL = 5_000;

/**
 * Paces `IDENTIFY` across the shards one process runs. Discord allows one per 5 seconds per rate
 * limit bucket, and a shard's bucket is `shardId % max_concurrency`; going faster gets the extra
 * connections closed, and still counts them against the daily session start limit.
 *
 * Slots are reserved when a shard asks, not when it sends, so a shard whose connection drops while
 * it waits still holds its slot. That only ever makes the queue slower, never too fast.
 *
 * Internal: `Client` builds one when it runs more than one shard, and hands each shard's
 * `WSOptions.beforeIdentify` a call to {@link wait}. Coordinating identifies across processes is
 * the user's job.
 */
export class IdentifyQueue {
	/**
	 * Identifies allowed at once, one per bucket - `max_concurrency` from `GET /gateway/bot`.
	 * `1` (every shard shares one bucket) for every bot below Discord's large-bot sharding.
	 */
	readonly concurrency: number;
	/** The earliest time each bucket may identify next */
	#nextSlot = new Map<number, number>();

	constructor(concurrency: number = 1) {
		if (!Number.isInteger(concurrency) || concurrency < 1) {
			throw new RangeError(`Identify concurrency must be a positive integer, received ${concurrency}`);
		}
		this.concurrency = concurrency;
	}

	/**
	 * Resolves when `shardId` may send its `IDENTIFY`: at once if its bucket has not identified in
	 * the last 5 seconds, otherwise 5 seconds after the bucket's last reserved slot.
	 * @param shardId The shard about to identify.
	 */
	wait(shardId: number): Promise<void> {
		const bucket = shardId % this.concurrency;
		const now = Date.now();
		const slot = Math.max(now, this.#nextSlot.get(bucket) ?? 0);
		this.#nextSlot.set(bucket, slot + IDENTIFY_INTERVAL);

		const delay = slot - now;
		if (delay <= 0) return Promise.resolve();
		// unref'd: the shard waiting on it holds an open connection, which keeps the process alive
		return new Promise((resolve) => setTimeout(resolve, delay).unref());
	}

	/**
	 * How long the last of `shardIds` waits when they all identify at once from an empty queue: the
	 * most shards any one bucket holds, less one, times 5 seconds. What `login()` adds to its timeout.
	 * @param shardIds The shards about to identify.
	 */
	longestWait(shardIds: Iterable<number>): number {
		const perBucket = new Map<number, number>();
		let deepest = 0;
		for (const id of shardIds) {
			const depth = (perBucket.get(id % this.concurrency) ?? 0) + 1;
			perBucket.set(id % this.concurrency, depth);
			deepest = Math.max(deepest, depth);
		}
		return Math.max(0, deepest - 1) * IDENTIFY_INTERVAL;
	}
}
