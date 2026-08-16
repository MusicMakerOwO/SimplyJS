# Pre-Beta Code Review — 2026-08-15

Full read of `src/` at `d7e352b` (v1.2.0-alpha). Baseline at time of review: `tsc --noEmit` clean,
666 tests passing across 18 files — **none of the items below are caught by the existing suite.**

60 items total: ~34 genuine defects (15 high severity), ~18 consistency/dead-code/API-surface
issues, 8 typos. The 15 highs collapse into roughly 8–10 distinct pieces of work, because the
gateway lifecycle items are one broken subsystem and the REST route items are the same mistake
repeated.

Ordered by suggested triage. 

---

- [x] **HIGH — `#reconnect()` is an unbounded, un-delayed retry loop.** `src/WSClient.ts:127-139`
  *Fixed: `#reconnect()` now schedules the retry instead of reconnecting inline. The first attempt
  still fires immediately (a one-off blip costs no downtime), each consecutive failure backs off
  exponentially with full jitter (1s base, 60s cap), and the client gives up after
  `maxReconnectAttempts` (new `WSOptions` field, default 10). The counter resets on `READY`/`RESUMED`,
  so the cap is on consecutive failures, not lifetime reconnects. Op 9 passes a mandated randomized
  1–5s floor. Close codes are now read off the `ws` `close` event and split via the new
  `GatewayCloseCodes`: 4004/4010–4014 are terminal (emit the new `WSEvents.Disconnect` and stay down
  rather than replaying a bad IDENTIFY), 4007/4009 drop the session so the next HELLO identifies
  instead of resuming. `Client.login()` races Ready against Disconnect so a bad token rejects with
  Discord's actual reason instead of "Discord may be having an outage" ten seconds later.*

  No backoff, no attempt counter, no cap.
  *Trigger:* a bad token (close 4004) or revoked intent (4014) → hello → identify → close → spin.
  Also: op 9 with `d: false` reconnects immediately, but Discord requires a 1–5s randomized wait
  before re-identifying. Hammering IDENTIFY burns the session-start rate limit.

- [ ] **MED — Rate limiting is reactive-only, with no request serialization.** `src/Rest.ts:241-276`
  `routeRateLimits` is written *only* on a 429 (`:271`). The `X-RateLimit-Remaining: 0` +
  `X-RateLimit-Reset-After` headers are read in `#resolveRateLimitWaitMilliseconds`, but that runs
  only in the 429 branch, so the client never pre-emptively backs off.
  *Trigger:* fire 10 concurrent `channel.send()` calls. All 10 pass the empty TTL check and hit
  Discord; ~5 come back 429, then all `#sleep(waitMs)` and wake in the same tick — a second
  thundering herd. With `retriesRemaining` starting at 3, a sustained burst throws rather than
  queueing. A per-bucket serialized queue is the missing piece.

- [x] **MED — Builder serialization depends on an implicit `JSON.stringify` hook.**
  *Fixed by removing serialization entirely: every builder now `implements` its payload type and
  stores wire names (`custom_id`, `min_values`, `default_values`, ...), so there is no `toJSON()`
  and nothing to forget to call. `showModal()` takes an `InteractionCallbackModal`, the `as unknown
  as` casts are gone, and `src/Tests/Components.test.ts` pins the wire shape of every builder.
  This also surfaced a latent leak: `selectLabel` was an own enumerable field on the select
  builders, so it would have been sent to Discord as an unknown key - it's a prototype accessor now.*

  `src/Mixins/Interactions/ModalShowable.ts:29` sends `modal as unknown as
  InteractionCallbackModal` — the builder itself, whose fields are `customId`/`title`, not
  `custom_id`. Likewise `src/Builders/SlashCommandBuilder.ts:445` emits `options: this.options`,
  which may hold `SlashCommandSubcommandBuilder` instances rather than `SubCommandOption`
  payloads, and `LabelBuilder.toJSON` nests raw child builders.
  All three work *today* only because `Rest.#request` (`src/Rest.ts:256`) calls
  `JSON.stringify(data)`, which invokes nested `toJSON()` for free. But `validate()` and every
  static `validate` read the wire format, so `ModalBuilder.validate()` inspects camelCase fields
  the wire payload won't have — and any future path that inspects, clones, or logs the payload
  before stringifying gets the camelCase object. The `as unknown as` casts are what hide this
  from `tsc`. Make the `toJSON()` calls explicit before compat tests pin the behavior.