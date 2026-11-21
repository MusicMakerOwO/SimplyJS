import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentifyQueue } from "../IdentifyQueue.js";

describe("IdentifyQueue", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Starts a wait and records when it resolves, in fake-clock milliseconds since the test began */
	function track(queue: IdentifyQueue, shardId: number, released: Map<number, number>, start: number): void {
		void queue.wait(shardId).then(() => released.set(shardId, Date.now() - start));
	}

	it("spaces one bucket's identifies 5 seconds apart", async () => {
		const queue = new IdentifyQueue(1);
		const start = Date.now();
		const released = new Map<number, number>();
		for (const id of [0, 1, 2]) track(queue, id, released, start);

		await vi.advanceTimersByTimeAsync(0);
		expect([...released]).toEqual([[0, 0]]);

		await vi.advanceTimersByTimeAsync(4_999);
		expect(released.has(1)).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(released.get(1)).toBe(5_000);

		await vi.advanceTimersByTimeAsync(5_000);
		expect(released.get(2)).toBe(10_000);
	});

	it("lets each max_concurrency bucket identify independently", async () => {
		const queue = new IdentifyQueue(2);
		const start = Date.now();
		const released = new Map<number, number>();
		// buckets are id % 2: shards 0 and 2 share one, 1 and 3 the other
		for (const id of [0, 1, 2, 3]) track(queue, id, released, start);

		await vi.advanceTimersByTimeAsync(0);
		expect([...released.keys()].sort()).toEqual([0, 1]);

		await vi.advanceTimersByTimeAsync(5_000);
		expect(released.get(2)).toBe(5_000);
		expect(released.get(3)).toBe(5_000);
	});

	it("does not hold back an identify once the bucket's last one is 5 seconds old", async () => {
		const queue = new IdentifyQueue(1);
		await queue.wait(0);
		await vi.advanceTimersByTimeAsync(6_000);

		const start = Date.now();
		const released = new Map<number, number>();
		track(queue, 1, released, start);
		await vi.advanceTimersByTimeAsync(0);

		expect(released.get(1)).toBe(0);
	});

	it("keeps its timers from holding the process open", () => {
		const queue = new IdentifyQueue(1);
		void queue.wait(0);
		const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

		void queue.wait(1);

		const timer = setTimeoutSpy.mock.results.at(-1)!.value as NodeJS.Timeout;
		expect(timer.hasRef()).toBe(false);
	});

	it("says how long the last shard waits from an empty queue", () => {
		expect(new IdentifyQueue(1).longestWait([0])).toBe(0);
		expect(new IdentifyQueue(1).longestWait([0, 1, 2, 3])).toBe(15_000);
		expect(new IdentifyQueue(2).longestWait([0, 1, 2, 3])).toBe(5_000);
		expect(new IdentifyQueue(16).longestWait([0, 1, 2, 3])).toBe(0);
	});

	it("rejects a concurrency that is not a positive integer", () => {
		expect(() => new IdentifyQueue(0)).toThrow(RangeError);
		expect(() => new IdentifyQueue(1.5)).toThrow(RangeError);
	});
});
