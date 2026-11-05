import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rest, RestEvents, RestRateLimitInfo, RestResponseInfo } from "../Rest.js";
import { Client } from "../Client.js";

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
describe("Rest options", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("sends to Discord's API by default", async () => {
		const rest = new Rest();
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await rest.get("/users/@me");

		expect(fetchMock.mock.calls[0]![0]).toBe("https://discord.com/api/v10/users/@me");
	});

	it("sends to baseUrl when one is given, tolerating a trailing slash", async () => {
		const rest = new Rest({ baseUrl: "http://rest-proxy:8080/api/v10/" });
		rest.setToken("token");
		const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await rest.get("/users/@me");

		expect(rest.baseUrl).toBe("http://rest-proxy:8080/api/v10");
		expect(fetchMock.mock.calls[0]![0]).toBe("http://rest-proxy:8080/api/v10/users/@me");
	});

	it("is configured from ClientOptions.rest", () => {
		const client = new Client({
			token: "token",
			intents: 0,
			rest: { retryAfterRateLimit: false, rateLimitDurationMultiplier: 2, perRouteRateLimits: false, baseUrl: "http://proxy" }
		});

		expect(client.rest.retryAfterRateLimit).toBe(false);
		expect(client.rest.rateLimitDurationMultiplier).toBe(2);
		expect(client.rest.perRouteRateLimits).toBe(false);
		expect(client.rest.baseUrl).toBe("http://proxy");
	});
});

describe("Rest rate limit keys", () => {
	// snowflake-shaped ids, since route templates collapse 17-20 digit segments
	const CHANNEL = "400000000000000001";
	const GUILD = "400000000000000002";
	// base64 of the application id, as the first segment of a bot token
	const APP_ID = "500000000000000000";
	const TOKEN = `${Buffer.from(APP_ID).toString("base64")}.x.y`;

	type Script = (path: string, init: RequestInit) => Response;
	const limitHeaders = (bucket: string, remaining: number, resetAfter: number): Record<string, string> => ({
		"X-RateLimit-Bucket": bucket,
		"X-RateLimit-Remaining": String(remaining),
		"X-RateLimit-Reset-After": String(resetAfter)
	});

	/** Stubs fetch with `script`, recording the fake-clock time each path was sent at */
	function stubFetch(script: Script): { sent: { path: string; at: number }[] } {
		const sent: { path: string; at: number }[] = [];
		vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo, init: RequestInit): Promise<Response> => {
			const path = new URL(String(input)).pathname.replace("/api/v10", "");
			sent.push({ path, at: Date.now() });
			return script(path, init);
		}));
		return { sent };
	}

	function createRest(): Rest {
		const rest = new Rest();
		rest.setToken(TOKEN);
		return rest;
	}

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		vi.useFakeTimers();
	});

	it("does not hold an interaction callback behind an active global limit", async () => {
		const rest = createRest();
		let tripped = false;
		const { sent } = stubFetch((path) => {
			if (!tripped && path === "/users/@me") {
				tripped = true;
				return new Response(JSON.stringify({ message: "global", retry_after: 2.5, global: true }), { status: 429 });
			}
			return new Response(null, { status: 204 });
		});

		const unrelated = rest.get("/users/@me");
		await vi.advanceTimersByTimeAsync(10);
		const started = Date.now();
		await rest.post(`/interactions/${APP_ID}1/token-a/callback`, { type: 5 });
		const followUp = rest.post(`/webhooks/${APP_ID}/token-a`, { content: "hi" });
		await vi.advanceTimersByTimeAsync(0);
		await followUp;

		// both interaction routes go straight through; the 2.5s window only applies to everything else
		expect(sent.find((s) => s.path.startsWith("/interactions/"))!.at).toBe(started);
		expect(sent.find((s) => s.path.startsWith("/webhooks/"))!.at).toBe(started);

		await vi.advanceTimersByTimeAsync(2_500);
		await unrelated;
	});

	it("still holds an unrelated webhook behind an active global limit", async () => {
		const rest = createRest();
		let tripped = false;
		const { sent } = stubFetch(() => {
			if (!tripped) {
				tripped = true;
				return new Response(JSON.stringify({ message: "global", retry_after: 1, global: true }), { status: 429 });
			}
			return new Response(null, { status: 204 });
		});

		const first = rest.get("/users/@me");
		await vi.advanceTimersByTimeAsync(10);
		const webhook = rest.post("/webhooks/600000000000000000/other-token", { content: "hi" });
		await vi.advanceTimersByTimeAsync(1_000);
		await Promise.all([first, webhook]);

		expect(sent.find((s) => s.path.startsWith("/webhooks/"))!.at).toBeGreaterThanOrEqual(1_000);
	});

	it("does not grow routeToBucket with every interaction", async () => {
		const rest = createRest();
		stubFetch(() => new Response(null, { status: 204, headers: limitHeaders("callback", 0, 5) }));

		for (let i = 0; i < 50; i += 1) {
			await rest.post(`/interactions/${600000000000000000n + BigInt(i)}/token-${i}/callback`, { type: 5 });
		}

		expect(rest.routeToBucket.size).toBe(1);
		expect([...rest.routeToBucket.keys()]).toEqual(["POST /interactions/:id/:token/callback"]);
	});

	it("keeps an exhausted interaction bucket from delaying a different interaction", async () => {
		const rest = createRest();
		const { sent } = stubFetch(() => new Response(null, { status: 204, headers: limitHeaders("callback", 0, 5) }));

		await rest.post("/interactions/600000000000000001/token-1/callback", { type: 5 });
		await rest.post("/interactions/600000000000000002/token-2/callback", { type: 5 });

		// each interaction is its own major resource, so one exhausting its window does not hold the next
		expect(sent[1]!.at).toBe(sent[0]!.at);
	});

	it("does not hold a message send behind an exhausted typing bucket in the same channel", async () => {
		const rest = createRest();
		const { sent } = stubFetch((path) => path.endsWith("/typing")
			? new Response(null, { status: 204, headers: limitHeaders("typing", 0, 3) })
			: new Response("{}", { status: 200, headers: limitHeaders("messages", 4, 5) }));

		await rest.post(`/channels/${CHANNEL}/messages`, { content: "a" });
		await rest.post(`/channels/${CHANNEL}/typing`, {});
		await rest.post(`/channels/${CHANNEL}/messages`, { content: "b" });

		expect(sent[2]!.at).toBe(sent[1]!.at);
	});

	it("does not hold a ban behind a role backfill in the same guild", async () => {
		const rest = createRest();
		const { sent } = stubFetch((path) => path.includes("/roles/")
			? new Response(null, { status: 204, headers: limitHeaders("roles", 0, 1) })
			: new Response(null, { status: 204, headers: limitHeaders("bans", 4, 5) }));

		const backfill = rest.put(`/guilds/${GUILD}/members/700000000000000001/roles/700000000000000002`, null);
		await vi.advanceTimersByTimeAsync(0);
		await backfill;
		const second = rest.put(`/guilds/${GUILD}/members/700000000000000003/roles/700000000000000002`, null);
		await rest.put(`/guilds/${GUILD}/bans/700000000000000004`, {});

		const ban = sent.find((s) => s.path.includes("/bans/"))!;
		expect(ban.at).toBe(sent[0]!.at);

		await vi.advanceTimersByTimeAsync(1_000);
		await second;
		// while the backfill itself still respects its own exhausted window
		expect(sent.at(-1)!.at - sent[0]!.at).toBeGreaterThanOrEqual(1_000);
	});

	it("gives deletes of messages older than two weeks a bucket of their own", async () => {
		const rest = createRest();
		const oldId = String((BigInt(Date.now() - 1_420_070_400_000 - 15 * 24 * 60 * 60 * 1000) << 22n));
		const newId = String((BigInt(Date.now() - 1_420_070_400_000) << 22n));
		const { sent } = stubFetch((path) => path.endsWith(oldId)
			? new Response(null, { status: 204, headers: limitHeaders("old-delete", 0, 5) })
			: new Response(null, { status: 204, headers: limitHeaders("delete", 4, 5) }));

		await rest.delete(`/channels/${CHANNEL}/messages/${oldId}`);
		await rest.delete(`/channels/${CHANNEL}/messages/${newId}`);

		expect(sent[1]!.at).toBe(sent[0]!.at);
		expect(rest.routeToBucket.get("DELETE /channels/:id/messages/:id:old")).toBe("old-delete");
		expect(rest.routeToBucket.get("DELETE /channels/:id/messages/:id")).toBe("delete");
	});

	it("keeps old and recent deletes apart even when Discord reports the same bucket for both", async () => {
		const rest = createRest();
		const oldId = String((BigInt(Date.now() - 1_420_070_400_000 - 15 * 24 * 60 * 60 * 1000) << 22n));
		const newId = String((BigInt(Date.now() - 1_420_070_400_000) << 22n));
		const { sent } = stubFetch((path) => path.endsWith(oldId)
			? new Response(null, { status: 204, headers: limitHeaders("shared", 0, 5) })
			: new Response(null, { status: 204, headers: limitHeaders("shared", 4, 5) }));

		// learn the bucket for both routes first, so the second round is keyed by hash
		await rest.delete(`/channels/${CHANNEL}/messages/${newId}`);
		const firstOld = rest.delete(`/channels/${CHANNEL}/messages/${oldId}`);
		await vi.advanceTimersByTimeAsync(0);
		await firstOld;
		await rest.delete(`/channels/${CHANNEL}/messages/${newId}`);

		// the old delete exhausted its window, which must not hold the recent one behind it
		expect(sent[2]!.at).toBe(sent[1]!.at);
	});

	it("keeps the interaction exemption when per-route limits are off", async () => {
		const rest = new Rest({ perRouteRateLimits: false });
		rest.setToken(TOKEN);
		let tripped = false;
		const { sent } = stubFetch((path) => {
			if (!tripped && path === "/users/@me") {
				tripped = true;
				return new Response(JSON.stringify({ message: "global", retry_after: 2.5, global: true }), { status: 429 });
			}
			return new Response(null, { status: 204 });
		});

		const unrelated = rest.get("/users/@me");
		await vi.advanceTimersByTimeAsync(10);
		const started = Date.now();
		await rest.post(`/interactions/${APP_ID}1/token-a/callback`, { type: 5 });

		expect(sent.find((s) => s.path.startsWith("/interactions/"))!.at).toBe(started);

		await vi.advanceTimersByTimeAsync(2_500);
		await unrelated;
	});

	it("does not let a throwing listener reject a request or skip its rate limit bookkeeping", async () => {
		const rest = createRest();
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		stubFetch(() => new Response("{}", { status: 200, headers: limitHeaders("messages", 0, 5) }));
		rest.on(RestEvents.Response, () => { throw new Error("broken metrics"); });

		await expect(rest.post(`/channels/${CHANNEL}/messages`, { content: "a" })).resolves.toEqual({});
		expect(rest.routeToBucket.get("POST /channels/:id/messages")).toBe("messages");
		expect(rest.routeRateLimits.remainingTTL(`bucket:messages:channels:${CHANNEL}`)).toBeGreaterThan(0);
		expect(error).toHaveBeenCalledTimes(1);
	});
});

describe("Rest events", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		vi.useFakeTimers();
	});

	it("reports each response with the route template, never the token", async () => {
		const rest = new Rest();
		rest.setToken("token");
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
		const responses: RestResponseInfo[] = [];
		rest.on(RestEvents.Response, (info) => responses.push(info));

		await rest.post("/interactions/600000000000000001/secret-token/callback?with_response=true", { type: 5 });

		expect(responses).toEqual([{
			method: "POST",
			route: "/interactions/:id/:token/callback",
			status: 204,
			attempt: 1,
			waitedMs: 0,
			durationMs: expect.any(Number)
		}]);
		expect(JSON.stringify(responses)).not.toContain("secret-token");
	});

	it("reports a 429 and the retry that follows it", async () => {
		const rest = new Rest();
		rest.setToken("token");
		vi.stubGlobal("fetch", vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ message: "slow down", retry_after: 0.5 }), { status: 429 }))
			.mockResolvedValueOnce(new Response("{}", { status: 200 })));
		const limits: RestRateLimitInfo[] = [];
		const responses: RestResponseInfo[] = [];
		rest.on(RestEvents.RateLimited, (info) => limits.push(info));
		rest.on(RestEvents.Response, (info) => responses.push(info));

		const request = rest.get("/users/@me");
		await vi.advanceTimersByTimeAsync(500);
		await request;

		expect(limits).toEqual([{ method: "GET", route: "/users/@me", global: false, retryAfterMs: 500 }]);
		expect(responses.map((r) => [r.status, r.attempt, r.waitedMs])).toEqual([[429, 1, 0], [200, 2, 500]]);
	});
});
