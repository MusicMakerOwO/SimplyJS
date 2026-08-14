import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { awaitEvent, createCollector } from "../Collector.js";

type TestEvents = {
	ping: [value: number];
};

describe("Collector", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("collects events that pass the filter and ignores the rest", () => {
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", {
			filter: (value) => value % 2 === 0,
		});

		emitter.emit("ping", 1);
		emitter.emit("ping", 2);
		emitter.emit("ping", 3);
		emitter.emit("ping", 4);

		expect(collector.collected).toEqual([[2], [4]]);
		collector.stop();
	});

	it("stops after reaching max and emits end with reason limit", () => {
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", { max: 2 });
		const endSpy = vi.fn();
		collector.on("end", endSpy);

		emitter.emit("ping", 1);
		emitter.emit("ping", 2);
		emitter.emit("ping", 3);

		expect(collector.ended).toBe(true);
		expect(collector.collected).toEqual([[1], [2]]);
		expect(endSpy).toHaveBeenCalledWith([[1], [2]], "limit");
		expect(emitter.listenerCount("ping")).toBe(0);
	});

	it("auto-stops after the time limit even if the event never fires", async () => {
		vi.useFakeTimers();
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", { time: 100 });
		const endSpy = vi.fn();
		collector.on("end", endSpy);

		await vi.advanceTimersByTimeAsync(100);

		expect(collector.ended).toBe(true);
		expect(endSpy).toHaveBeenCalledWith([], "time");
		expect(emitter.listenerCount("ping")).toBe(0);
	});

	it("resets the idle timer on each collected item and stops after inactivity", async () => {
		vi.useFakeTimers();
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", { idle: 50 });

		await vi.advanceTimersByTimeAsync(30);
		emitter.emit("ping", 1);
		await vi.advanceTimersByTimeAsync(30);
		emitter.emit("ping", 2);
		await vi.advanceTimersByTimeAsync(49);
		expect(collector.ended).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(collector.ended).toBe(true);
		expect(collector.collected).toEqual([[1], [2]]);
	});

	it("stop() is idempotent and detaches the listener", () => {
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", {});
		const endSpy = vi.fn();
		collector.on("end", endSpy);

		collector.stop("user");
		collector.stop("user");

		expect(endSpy).toHaveBeenCalledTimes(1);
		expect(emitter.listenerCount("ping")).toBe(0);
	});

	it("next resolves with the next collected item", async () => {
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", {});

		const nextPromise = collector.next;
		emitter.emit("ping", 42);

		await expect(nextPromise).resolves.toEqual([42]);
		collector.stop();
	});

	it("next rejects if the collector ends before collecting", async () => {
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", {});

		const nextPromise = collector.next;
		collector.stop("user");

		await expect(nextPromise).rejects.toThrow();
	});

	it("awaitEvent resolves with matching args and cleans up the listener", async () => {
		const emitter = new EventEmitter<TestEvents>();

		const promise = awaitEvent(emitter, "ping", {
			filter: (value) => value > 10,
		});

		emitter.emit("ping", 1);
		emitter.emit("ping", 20);

		await expect(promise).resolves.toEqual([20]);
		expect(emitter.listenerCount("ping")).toBe(0);
	});

	it("awaitEvent rejects and cleans up the listener on timeout", async () => {
		vi.useFakeTimers();
		const emitter = new EventEmitter<TestEvents>();

		const promise = awaitEvent(emitter, "ping", { time: 50 });
		const expectation = expect(promise).rejects.toThrow();

		await vi.advanceTimersByTimeAsync(50);
		await expectation;

		expect(emitter.listenerCount("ping")).toBe(0);
	});

	it("supports async filters", async () => {
		const emitter = new EventEmitter<TestEvents>();
		const collector = createCollector(emitter, "ping", {
			filter: async (value) => {
				await Promise.resolve();
				return value === 5;
			},
		});

		emitter.emit("ping", 5);
		await new Promise((resolve) => setImmediate(resolve));

		expect(collector.collected).toEqual([[5]]);
		collector.stop();
	});
});
