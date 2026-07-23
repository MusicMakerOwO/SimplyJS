import { JSONObject } from "./Types/Internal.js";
import { TTLCache } from "./DataStructures/TTLCache.js";

const DISCORD_API_BASE = "https://discord.com/api/v9";
const DEFAULT_RETRY_COUNT = 3;
const TRANSIENT_HTTP_STATUS = new Set([500, 502, 503, 504]);
const EMPTY_RESPONSE_STATUS = new Set([204, 205, 304]);

function PerRouteCacheKey(method: string, route: string): string {
	const [category = "global", id = "global"] = route.split("/").filter(Boolean);
	return `${method.toUpperCase()}:${category}/${id}`;
}

function MajorResourceKey(route: string): string {
	const [resource, id, token] = route.split("/").filter(Boolean);

	if (!resource || !id) return "global";
	if (resource === "channels" || resource === "guilds") return `${resource}:${id}`;
	if (resource === "webhooks") return token ? `${resource}:${id}:${token}` : `${resource}:${id}`;

	return "global";
}

type RestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type RestRequestOptions = {
	headers?: Record<string, string>;
	retryCount?: number;
};

type DiscordErrorResponse = {
	message?: string;
	code?: number;
	retry_after?: number;
	global?: boolean;
};

export type RestOptions = {
	/**
	 * If `false`, errors on rate limit instead of waiting
	 * @default `true`
	 */
	retryAfterRateLimit?: boolean;
	/**
	 * Adjusts how long to wait after a limit.
	 * A value of `1.0` is the default, `2.0` means wait twice as long to be safe.
	 *
	 * @warning If you use a value less than `1.0` you are at risk of rate limits and assumed to manage them anually in your logic.
	 *
	 * @default 1.0
	 */
	rateLimitDurationMultiplier?: number;
	/**
	 * Whether to enable per-rate limits.
	 * This enables an additional TTL cache for tracking rate limits for each resource queried.
	 * Otherwise, rate limits are treated globally and/or you are assumed responsibility for them.
	 * @see https://docs.discord.com/developers/topics/rate-limits
	 * @default true
	 */
	perRouteRateLimits?: boolean;
};

export class Rest {
	#token: string | null = null;

	retryAfterRateLimit: boolean;
	rateLimitDurationMultiplier: number;
	perRouteRateLimits: boolean;

	routeRateLimits: TTLCache<string, number>;
	routeToBucket: Map<string, string>;

	constructor(options: RestOptions = {}) {
		this.retryAfterRateLimit = options.retryAfterRateLimit ?? true;
		this.rateLimitDurationMultiplier = options.rateLimitDurationMultiplier ?? 1;
		this.perRouteRateLimits = options.perRouteRateLimits ?? true;
		this.routeRateLimits = new TTLCache({ ttl: 1000 * 60 * 5 });
		this.routeToBucket = new Map();
	}

	/** Sets the token for internal use. Set automatically with `client.login()`, not intended for public use */
	setToken(token: string): void {
		this.#token = token;
	}

	/** Simple check if the token is set, not intended for public use */
	isAuthenticated(): void {
		if (!this.#token) throw new Error("Rest client not authenticated");
	}

	async #sleep(milliseconds: number): Promise<void> {
		if (milliseconds <= 0) return;
		await new Promise<void>((resolve) => {
			setTimeout(resolve, milliseconds).unref();
		});
	}

	#parseResponseBody(rawBody: string): DiscordErrorResponse | null {
		if (rawBody.length === 0) return null;
		try {
			return JSON.parse(rawBody) as DiscordErrorResponse;
		} catch {
			return null;
		}
	}

	#resolveRateLimitCacheKey(method: RestMethod, route: string): string {
		if (!this.perRouteRateLimits) return "global";

		const routeKey = PerRouteCacheKey(method, route);
		const bucket = this.routeToBucket.get(routeKey);
		if (!bucket) return routeKey;

		return `bucket:${bucket}:${MajorResourceKey(route)}`;
	}

	#rememberBucket(method: RestMethod, route: string, response: Response): string | null {
		if (!this.perRouteRateLimits) return null;

		const bucket = response.headers.get("X-RateLimit-Bucket");
		if (!bucket) return null;

		this.routeToBucket.set(PerRouteCacheKey(method, route), bucket);
		return `bucket:${bucket}:${MajorResourceKey(route)}`;
	}

	#resolveRateLimitWaitMilliseconds(response: Response, body: DiscordErrorResponse | null): number {
		const fromBody = body?.retry_after;
		if (typeof fromBody === "number" && Number.isFinite(fromBody)) {
			return Math.max(0, Math.ceil(fromBody * 1000 * this.rateLimitDurationMultiplier));
		}

		const parseSecondsHeader = (name: string): number | null => {
			const value = response.headers.get(name);
			if (value === null) return null;
			const seconds = Number.parseFloat(value);
			if (!Number.isFinite(seconds)) return null;
			return Math.max(0, Math.ceil(seconds * 1000 * this.rateLimitDurationMultiplier));
		};

		const fromResetAfter = parseSecondsHeader("X-RateLimit-Reset-After");
		if (fromResetAfter !== null) return fromResetAfter;

		const fromRetryAfter = parseSecondsHeader("Retry-After");
		if (fromRetryAfter !== null) return fromRetryAfter;

		const resetEpoch = response.headers.get("X-RateLimit-Reset");
		if (resetEpoch !== null) {
			const epochSeconds = Number.parseFloat(resetEpoch);
			if (Number.isFinite(epochSeconds)) {
				const resetMilliseconds = epochSeconds * 1000;
				return Math.max(
					0,
					Math.ceil((resetMilliseconds - Date.now()) * this.rateLimitDurationMultiplier)
				);
			}
		}

		return 1000;
	}

	#createApiError(response: Response, rawBody: string, parsedBody: DiscordErrorResponse | null): Error {
		const message =
			parsedBody?.message && parsedBody.message.length > 0
				? parsedBody.message
				: (response.statusText || rawBody || "Unknown error");

		const code = parsedBody?.code ?? response.status;
		return new Error(`Discord API Error: ${message} (${code})`);
	}

	async #request<T>(
		method: RestMethod,
		route: string,
		data: JSONObject | null,
		options: RestRequestOptions = {}
	): Promise<T> {
		this.isAuthenticated();

		const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
		let retriesRemaining = options.retryCount ?? DEFAULT_RETRY_COUNT;
		let transientRetryAttempt = 0;

		while (true) {
			const rateLimitCacheKey = this.#resolveRateLimitCacheKey(method, normalizedRoute);
			const rateLimitTTL = this.routeRateLimits.remainingTTL(rateLimitCacheKey);

			if (typeof rateLimitTTL === "number" && rateLimitTTL > 0) {
				await this.#sleep(rateLimitTTL);
			}

			const response = await fetch(`${DISCORD_API_BASE}${normalizedRoute}`, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bot ${this.#token}`,
					...options.headers
				},
				body: data ? JSON.stringify(data) : null
			});

			const rawBody = await response.text();
			const parsedBody = this.#parseResponseBody(rawBody);
			const bucketCacheKey = this.#rememberBucket(method, normalizedRoute, response);

			if (response.status === 429) {
				if (!this.retryAfterRateLimit || retriesRemaining <= 0) {
					throw this.#createApiError(response, rawBody, parsedBody);
				}

				const waitMilliseconds = this.#resolveRateLimitWaitMilliseconds(response, parsedBody);
				const waitKey = parsedBody?.global === true ? "global" : (bucketCacheKey ?? rateLimitCacheKey);

				this.routeRateLimits.set(waitKey, waitMilliseconds, waitMilliseconds);
				retriesRemaining -= 1;

				await this.#sleep(waitMilliseconds);
				continue;
			}

			if (TRANSIENT_HTTP_STATUS.has(response.status) && retriesRemaining > 0) {
				const retryDelay = Math.max(100, 250 * 2 ** transientRetryAttempt);
				transientRetryAttempt += 1;
				retriesRemaining -= 1;

				await this.#sleep(retryDelay);
				continue;
			}

			if (!response.ok) {
				throw this.#createApiError(response, rawBody, parsedBody);
			}

			if (rawBody.length === 0 || EMPTY_RESPONSE_STATUS.has(response.status)) {
				return undefined as T;
			}

			return JSON.parse(rawBody) as T;
		}
	}

	/** Sends a GET request to the provided path. This can only be used for discord requests */
	get<T>(path: string, headers?: Record<string, string>): Promise<T> {
		return this.#request<T>("GET", path, null, headers ? { headers } : {});
	}

	/** Sends a POST request to the provided path. This can only be used for discord requests */
	post<T>(path: string, data: JSONObject, headers?: Record<string, string>): Promise<T> {
		return this.#request<T>("POST", path, data, headers ? { headers } : {});
	}

	/** Sends a PATCH request to the provided path. This can only be used for discord requests */
	patch<T>(path: string, data: JSONObject | null, headers?: Record<string, string>): Promise<T> {
		return this.#request<T>("PATCH", path, data, headers ? { headers } : {});
	}

	/** Sends a DELETE request to the provided path. This can only be used for discord requests */
	delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
		return this.#request<T>("DELETE", path, null, headers ? { headers } : {});
	}

	/** Sends a PUT request to the provided path. This can only be used for discord requests */
	put<T>(path: string, data: JSONObject | null, headers?: Record<string, string>): Promise<T> {
		return this.#request<T>("PUT", path, data, headers ? { headers } : {});
	}
}