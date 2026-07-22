import { afterEach, describe, expect, it, vi } from "vitest";
import { TTLCache } from "../Cache/TTLCache.js";

describe("TTLCache", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("expires entries after the default TTL", async () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: 50 });

		cache.set("alpha", "one");
		expect(cache.get("alpha")).toBe("one");
		expect(cache.remainingTTL("alpha")).toBe(50);

		await vi.advanceTimersByTimeAsync(49);
		expect(cache.has("alpha")).toBe(true);

		await vi.advanceTimersByTimeAsync(1);
		expect(cache.get("alpha")).toBeUndefined();
		expect(cache.remainingTTL("alpha")).toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it("reschedules expiry when an entry is overwritten", async () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: 25 });

		cache.set("alpha", "first");
		await vi.advanceTimersByTimeAsync(20);
		cache.set("alpha", "second", 40);

		await vi.advanceTimersByTimeAsync(39);
		expect(cache.get("alpha")).toBe("second");

		await vi.advanceTimersByTimeAsync(1);
		expect(cache.get("alpha")).toBeUndefined();
	});

	it("touch extends the lifetime of an existing entry", async () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: 20 });

		cache.set("alpha", "value");
		await vi.advanceTimersByTimeAsync(15);

		expect(cache.touch("alpha", 30)).toBe(true);
		await vi.advanceTimersByTimeAsync(29);
		expect(cache.get("alpha")).toBe("value");

		await vi.advanceTimersByTimeAsync(1);
		expect(cache.get("alpha")).toBeUndefined();
	});

	it("keeps Infinity TTL entries until they are manually removed", async () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: Infinity });

		cache.set("alpha", "value");
		await vi.advanceTimersByTimeAsync(10_000);

		expect(cache.get("alpha")).toBe("value");
		expect(cache.remainingTTL("alpha")).toBe(Infinity);
		expect(cache.delete("alpha")).toBe(true);
		expect(cache.get("alpha")).toBeUndefined();
	});

	it("invokes onExpire once for natural expiry and filters expired entries from iteration", async () => {
		vi.useFakeTimers();
		const onExpire = vi.fn();
		const cache = new TTLCache<string, string>({ ttl: 10, onExpire });

		cache.set("expired", "gone");
		cache.set("live", "stay", 50);
		await vi.advanceTimersByTimeAsync(10);

		expect([...cache.entries()]).toEqual([["live", "stay"]]);
		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(onExpire).toHaveBeenCalledWith("gone", "expired");
	});

	it("throws for invalid TTL values", () => {
		expect(() => new TTLCache({ ttl: Number.NaN })).toThrow(/TTL must be a finite number/);
		expect(() => new TTLCache({ ttl: -1 })).toThrow(/TTL must be a finite number/);
	});

	it("clear() removes all entries and stops the cleanup timer", async () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: 100 });

		cache.set("alpha", "one");
		cache.set("beta", "two");
		cache.set("gamma", "three");

		expect(cache.size).toBe(3);
		cache.clear();
		expect(cache.size).toBe(0);
		expect(cache.get("alpha")).toBeUndefined();
		expect(cache.get("beta")).toBeUndefined();
		expect(cache.get("gamma")).toBeUndefined();

		await vi.advanceTimersByTimeAsync(100);
		expect(cache.size).toBe(0);
	});

	it("clear() does not invoke onExpire for cleared entries", () => {
		vi.useFakeTimers();
		const onExpire = vi.fn();
		const cache = new TTLCache<string, string>({ ttl: 100, onExpire });

		cache.set("alpha", "one");
		cache.set("beta", "two");
		cache.clear();

		expect(onExpire).not.toHaveBeenCalled();
	});

	it("keys() returns an iterator over all live keys", () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: Infinity });

		cache.set("alpha", "one");
		cache.set("beta", "two");
		cache.set("gamma", "three");

		const keys = Array.from(cache.keys());

		expect(keys).toHaveLength(3);
		expect(keys).toContain("alpha");
		expect(keys).toContain("beta");
		expect(keys).toContain("gamma");
	});

	it("keys() excludes expired entries", async () => {
		vi.useFakeTimers();
		const cache = new TTLCache<string, string>({ ttl: 20 });

		cache.set("expired", "gone");
		cache.set("live", "stay", 100);

		await vi.advanceTimersByTimeAsync(20);

		const keys = Array.from(cache.keys());

		expect(keys).toHaveLength(1);
		expect(keys).toContain("live");
		expect(keys).not.toContain("expired");
	});

	it("keys() returns empty iterator when cache is empty", () => {
		const cache = new TTLCache<string, string>({ ttl: Infinity });

		const keys = Array.from(cache.keys());

		expect(keys).toEqual([]);
	});
});