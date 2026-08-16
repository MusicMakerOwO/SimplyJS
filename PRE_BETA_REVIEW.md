# Pre-Beta Code Review — 2026-08-15

Full read of `src/` at `d7e352b` (v1.2.0-alpha). Baseline at time of review: `tsc --noEmit` clean,
666 tests passing across 18 files — **none of the items below are caught by the existing suite.**

60 items total: ~34 genuine defects (15 high severity), ~18 consistency/dead-code/API-surface
issues, 8 typos. The 15 highs collapse into roughly 8–10 distinct pieces of work, because the
gateway lifecycle items are one broken subsystem and the REST route items are the same mistake
repeated.

Ordered by suggested triage. Sections 1–3 are the ones that get harder to change once
backwards-compatibility tests land.

---

## 1. Gateway lifecycle (one coherent piece of work)

This cluster is the difference between a library that survives a night and one that doesn't.
Worth fixing as a single pass over `WSClient.ts` rather than item by item.

- [x] **HIGH — A dropped connection is permanent.** `src/WSClient.ts:115-123`
  The `close` handler nulls the socket and clears the heartbeat but never reconnects, and
  `initialize()` is never re-entered.
  *Trigger:* any network drop, Discord-initiated close (4000/1001), or process suspend. The bot
  goes silent forever with no error and no event. Only the three explicit paths (op 7, op 9,
  missed ACK) reconnect.

- [ ] **HIGH — No `error` listener on the socket.** `src/WSClient.ts:114`
  `ws` emits `error` on ECONNRESET / TLS failure / bad handshake. With no listener, Node's
  `EventEmitter` throws it and takes the process down.
  *Trigger:* DNS blip or Discord 5xx during handshake.

- [ ] **HIGH — `#reconnect()` is an unbounded, un-delayed retry loop.** `src/WSClient.ts:127-139`
  No backoff, no attempt counter, no cap.
  *Trigger:* a bad token (close 4004) or revoked intent (4014) → hello → identify → close → spin.
  Also: op 9 with `d: false` reconnects immediately, but Discord requires a 1–5s randomized wait
  before re-identifying. Hammering IDENTIFY burns the session-start rate limit.

- [ ] **HIGH — Jitter is applied as the heartbeat *period*, not the first-beat offset.**
  `src/WSClient.ts:218`
  `setInterval(..., heartbeatInterval * this.jitter)` with `jitter = Math.random()` (`:89`). The
  gateway contract is: first heartbeat after `interval * jitter`, then every `interval`.
  *Trigger:* every connection. With `jitter ≈ 0.05` and Discord's 41.25s interval the client
  heartbeats every ~2s forever → gateway rate limit (120 payloads/60s) → forced disconnect.
  The JSDoc at `:68` already describes the intended behavior; code and doc disagree.

- [x] **HIGH — `ready` never becomes true again after a resume.**
  `src/WSClient.ts:190-195`, `src/Client.ts:88-94`
  `ready = true` is only set on a `READY` dispatch. A successful resume yields `RESUMED`, which
  isn't in `GatewayEvents` (`src/Types/DiscordGateway.ts:317`) at all — not typed, not handled,
  and it trips the `console.warn` in `EventDispatcher.ts:40`.
  *Trigger:* op 7 → `#reconnect()` (sets `ready = false` at `:137`) → hello → resume → `RESUMED`.
  `client.socket.ready` stays `false` for the rest of the process. `Client.destroy()`
  (`Client.ts:100-103`) reads the same flag, so its "wait for close" loop returns instantly on a
  live socket.

- [ ] **HIGH — `login()` can never fail.** `src/Client.ts:88-94`
  A 1ms busy-poll on `socket.ready` with no timeout and no rejection path.
  *Trigger:* bad token, missing privileged intent, or unreachable gateway. `await client.login()`
  hangs forever at ~1000 wakeups/sec instead of throwing. Combined with the two items above, the
  failure is completely silent.

- [ ] **HIGH — Gateway URL has no version or encoding.** `src/WSClient.ts:111`
  Missing `?v=10&encoding=json` on both the initial connect and the resume URL. Unversioned
  connections get Discord's legacy default.

- [ ] **MED — Sequence number survives a session it no longer belongs to.**
  `src/WSClient.ts:155,172-180`
  On op 9 with `d: false`, `#sessionId`/`#resumeGatewayUrl` are cleared but `#sequence` is not.
  *Trigger:* invalid-session → fresh IDENTIFY → the first heartbeat (`:255`) sends
  `d: <old session's sequence>`. Sequence is session-scoped; a stale value on a new session is a
  protocol violation. Reset `#sequence` to `null` alongside the session id.

- [x] **MED — `JSON.parse` in the message handler is unguarded.** `src/WSClient.ts:152`
  A malformed frame throws inside the `ws` `message` callback.

- [x] **LOW — Wrong error message.** `src/WSClient.ts:272`
  The websocket client's own guard throws `"Rest client not initialized"`.

- [x] **LOW — Identify `properties` are joke strings.** `src/WSClient.ts:239-241`
  `"i use arch btw"` / `"python sucks"` / `"ur mom"` are sent to Discord on every connect. Worth
  a decision before 1.0.

---

## 5. Correctness and state bugs

- [ ] **MED — Rate limiting is reactive-only, with no request serialization.** `src/Rest.ts:241-276`
  `routeRateLimits` is written *only* on a 429 (`:271`). The `X-RateLimit-Remaining: 0` +
  `X-RateLimit-Reset-After` headers are read in `#resolveRateLimitWaitMilliseconds`, but that runs
  only in the 429 branch, so the client never pre-emptively backs off.
  *Trigger:* fire 10 concurrent `channel.send()` calls. All 10 pass the empty TTL check and hit
  Discord; ~5 come back 429, then all `#sleep(waitMs)` and wake in the same tick — a second
  thundering herd. With `retriesRemaining` starting at 3, a sustained burst throws rather than
  queueing. A per-bucket serialized queue is the missing piece.

- [ ] **MED — Builder serialization depends on an implicit `JSON.stringify` hook.**
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

- [x] **LOW-MED — Presence set before login throws the wrong error.** `src/Client.ts:107-142`
  `#updatePressence` → `socket.send` → `#checkInitialization` → `"Rest client not initialized"`.
  The natural call order (construct → `setStatus` → `login`) hits this. And `Client.status`/
  `activity` are never included in the IDENTIFY payload (`src/WSClient.ts:234-247`), so state set
  before connect is dropped even if you reorder around the throw.