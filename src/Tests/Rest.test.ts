import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rest } from "../Rest.js";

describe("Rest request parsing", () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("returns parsed JSON for successful JSON responses", async () => {
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ id: "1" }), {
				status: 200,
				headers: { "Content-Type": "application/json" }
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const payload = await rest.get<{ id: string }>("/users/@me");

		expect(payload).toEqual({ id: "1" });
	});

	it("returns undefined for successful no-content responses", async () => {
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(null, {
				status: 204,
				statusText: "No Content"
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(rest.delete<void>("/channels/1/messages/2")).resolves.toBeUndefined();
	});

	it("throws API errors from JSON response bodies", async () => {
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ message: "Missing Permissions", code: 50013 }), {
				status: 403,
				headers: { "Content-Type": "application/json" }
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(rest.delete<void>("/channels/1/messages/2")).rejects.toThrow(
			"Discord API Error: Missing Permissions (50013)"
		);
	});

	it("falls back to status text when error body is empty", async () => {
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(null, {
				status: 403,
				statusText: "Forbidden"
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(rest.get("/users/@me")).rejects.toThrow("Discord API Error: Forbidden (403)");
	});

	it("retries 429 responses using retry_after from JSON body", async () => {
		vi.useFakeTimers();
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: "Rate limited", retry_after: 1 }), {
					status: 429,
					headers: { "Content-Type": "application/json" }
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				})
			);
		vi.stubGlobal("fetch", fetchMock);

		const request = rest.get<{ ok: boolean }>("/users/@me");
		await vi.advanceTimersByTimeAsync(1000);
		await expect(request).resolves.toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("throws immediately on 429 when retryAfterRateLimit is disabled", async () => {
		const rest = new Rest({ retryAfterRateLimit: false });
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ message: "Rate limited", retry_after: 0.01 }), {
				status: 429,
				headers: { "Content-Type": "application/json" }
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(rest.get("/users/@me")).rejects.toThrow("Discord API Error: Rate limited (429)");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("retries transient 5xx responses and eventually succeeds", async () => {
		vi.useFakeTimers();
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500, statusText: "Internal Server Error" }))
			.mockResolvedValueOnce(new Response(null, { status: 502, statusText: "Bad Gateway" }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ id: "done" }), {
					status: 200,
					headers: { "Content-Type": "application/json" }
				})
			);
		vi.stubGlobal("fetch", fetchMock);

		const request = rest.get<{ id: string }>("/users/@me");
		await vi.advanceTimersByTimeAsync(800);
		await expect(request).resolves.toEqual({ id: "done" });
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("sends requests sharing a bucket one at a time instead of in a burst", async () => {
		const rest = new Rest();
		rest.setToken("token");
		let inFlight = 0;
		let peakInFlight = 0;

		const fetchMock = vi.fn(async (): Promise<Response> => {
			inFlight += 1;
			peakInFlight = Math.max(peakInFlight, inFlight);
			await Promise.resolve();
			inFlight -= 1;

			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json", "X-RateLimit-Bucket": "shared" }
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		// the exact case that used to stampede: ten calls fired in the same tick, all passing the
		// rate limit check together because none of them had come back yet
		await Promise.all(Array.from({ length: 10 }, () => rest.post("/channels/1/messages", { content: "hi" })));

		expect(fetchMock).toHaveBeenCalledTimes(10);
		expect(peakInFlight).toBe(1);
	});

	it("waits out an exhausted bucket before sending, without needing a 429 first", async () => {
		vi.useFakeTimers();
		const rest = new Rest();
		rest.setToken("token");
		const sentAt: number[] = [];

		const fetchMock = vi.fn(async (): Promise<Response> => {
			sentAt.push(Date.now());
			await Promise.resolve();

			// Discord says this was the last request left in the window
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"X-RateLimit-Bucket": "shared",
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset-After": "0.05"
				}
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		await rest.post("/channels/1/messages", { content: "first" });

		const second = rest.post("/channels/1/messages", { content: "second" });
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(50);
		await second;

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(sentAt[1]! - sentAt[0]!).toBeGreaterThanOrEqual(50);
	});

	it("pauses every bucket while a global rate limit is active", async () => {
		vi.useFakeTimers();
		const rest = new Rest();
		rest.setToken("token");
		let limitedAt: number | null = null;
		let unrelatedSentAt: number | null = null;

		const fetchMock = vi.fn(async (input: URL | RequestInfo): Promise<Response> => {
			const url = String(input);

			if (url.endsWith("/channels/1/messages")) {
				if (limitedAt === null) {
					limitedAt = Date.now();
					return new Response(JSON.stringify({ message: "Rate limited", retry_after: 0.05, global: true }), {
						status: 429,
						headers: { "Content-Type": "application/json", "X-RateLimit-Bucket": "messages" }
					});
				}

				return new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json", "X-RateLimit-Bucket": "messages" }
				});
			}

			unrelatedSentAt = Date.now();
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json", "X-RateLimit-Bucket": "users" }
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		const limited = rest.post("/channels/1/messages", { content: "hi" });
		for (let i = 0; i < 10; i += 1) {
			if (limitedAt !== null && rest.routeRateLimits.size > 0) break;
			await Promise.resolve();
		}

		// a different bucket entirely - a global limit still applies to it
		const unrelated = rest.get("/users/@me");

		await vi.advanceTimersByTimeAsync(60);
		await Promise.all([limited, unrelated]);

		expect(unrelatedSentAt).not.toBeNull();
		expect(unrelatedSentAt! - limitedAt!).toBeGreaterThanOrEqual(50);
	});

	it("shares cooldown across routes that resolve to the same rate-limit bucket", async () => {
		vi.useFakeTimers();
		const rest = new Rest();
		rest.setToken("token");
		const bucketHeaders = {
			"Content-Type": "application/json",
			"X-RateLimit-Bucket": "shared"
		};
		const calls = {
			messages: 0,
			pins: 0
		};
		let limitedAt: number | null = null;

		const fetchMock = vi.fn(async (input: URL | RequestInfo): Promise<Response> => {
			const url = String(input);

			if (url.endsWith("/channels/1/messages")) {
				calls.messages += 1;
				if (calls.messages === 2) {
					limitedAt = Date.now();
					return new Response(JSON.stringify({ message: "Rate limited", retry_after: 0.05 }), {
						status: 429,
						headers: bucketHeaders
					});
				}

				if (calls.messages === 3 && limitedAt !== null && Date.now() - limitedAt < 50) {
					throw new Error("message route retried before cooldown elapsed");
				}

				return new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: bucketHeaders
				});
			}

			if (url.endsWith("/channels/1/pins")) {
				calls.pins += 1;
				if (calls.pins === 2 && limitedAt !== null && Date.now() - limitedAt < 50) {
					throw new Error("sibling route ignored shared bucket cooldown");
				}

				return new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: bucketHeaders
				});
			}

			throw new Error(`Unexpected URL: ${url}`);
		});
		vi.stubGlobal("fetch", fetchMock);

		await rest.get<{ ok: boolean }>("/channels/1/messages");
		await rest.get<{ ok: boolean }>("/channels/1/pins");

		const first = rest.get<{ ok: boolean }>("/channels/1/messages");
		for (let i = 0; i < 10; i += 1) {
			if (limitedAt !== null && rest.routeRateLimits.size > 0) break;
			await Promise.resolve();
		}
		const second = rest.get<{ ok: boolean }>("/channels/1/pins");

		await vi.advanceTimersByTimeAsync(60);
		await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
		expect(calls).toEqual({ messages: 3, pins: 2 });
	});
});