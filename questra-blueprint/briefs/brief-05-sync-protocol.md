# Brief 05 — Sync Channel & Wire Protocol

*Layer 3. Consumed with contracts (events + visibility). Parent: Architecture §5. Revalidate at build time.*

> **⚠️ ADR-0013 revalidation note — M2.3 (2026-07-19).** Checked against current `@questra/contracts`. Ships as **two commits: a contracts PR (play/wire.ts + tests) first, then packages/server** (contract-first; user-authorized). Details:
> 1. **Wire types are new** — `play/wire.ts` (ClientMsg/ServerMsg) added to contracts, composing existing `ClientIntentEnvelopeSchema`, `PlayEventSchema`, `ViewerRole`, `ID`.
> 2. **`ProjectionSnapshot` is opaque in the wire** — `welcome.snapshot` is a generic JSON value in contracts; the server fills it with the engine's `ProjectionState` (`fold(log)`), keeping projection engine-internal (M2.1 decision intact). Snapshot content is the engine's concern, not the wire schema's.
> 3. **Visibility reuse (non-negotiable #3)** — all fan-out filtering uses the existing contracts `eventVisibleTo`/`filterStream`. No second implementation.
> 4. **`fold(log)` reuse** — snapshots come from the engine's `fold` (M2.1), never a hand-maintained state (§2.8).
> 5. **Transport seam (ADR-0011)** — `ws` on Node behind a thin transport interface so the wire logic is testable over an in-memory socket pair (the golden test drives that, no real network needed).
> 6. **Reject == greying string (§2.4/§4.4)** — the server's `intent_rejected.reason` comes from the same engine legality function the client uses for greying; asserted by a shared-function test.

**Scope:** the WebSocket wire protocol, join/replay/reconnect, idempotent intents, presence, the three viewer roles.
**Non-goals:** game logic (Brief 02), prep-surface CRUD (Brief 11 — plain HTTP + light subscriptions), transport vendor choice (ADR-0011: `ws` on Node; interface keeps it swappable).

## 1. Wire messages (add `play/wire.ts` to contracts)
```ts
type ClientMsg =
  | { m: 'hello'; playSessionId: ID; token: string; lastSeq?: number }   // auth token → server derives Viewer role
  | { m: 'intent'; envelope: ClientIntentEnvelope }                       // from contracts
  | { m: 'ruling_response' | 'prompt_response'; promptId: ID; response: unknown }
  | { m: 'ping' };
type ServerMsg =
  | { m: 'welcome'; viewer: { role: ViewerRole }; snapshotSeq: number; snapshot: ProjectionSnapshot }
  | { m: 'event'; event: PlayEvent }                                     // post-visibility-filter
  | { m: 'intent_ack'; idempotencyKey: string; accepted: true; firstSeq: number }
  | { m: 'intent_rejected'; idempotencyKey: string; reason: string }     // reason string == greying text
  | { m: 'presence'; connected: { accountId: ID; role: ViewerRole }[]; activeCreatureId?: ID }
  | { m: 'pong' } | { m: 'error'; code: 'auth'|'not_member'|'bad_message'|'rate_limited'; detail?: string };
```

## 2. Protocol rules
1. **Join:** `hello` with `lastSeq` absent ⇒ `welcome` carries a *viewer-filtered* projection snapshot + snapshotSeq; then live events. With `lastSeq` present (reconnect) ⇒ server replays filtered events `(lastSeq, now]` then live. If the gap exceeds retention, fall back to snapshot.
2. **Ordering:** events arrive seq-ascending per connection. Non-DM viewers see gaps (filtered events) — expected, never an error (contracts test already asserts). Client applies strictly ascending; out-of-order ⇒ request replay.
3. **Idempotency:** server keeps `{playSessionId, idempotencyKey} → firstSeq` for the session; duplicate intent ⇒ re-ack, no re-emit.
4. **Validation before emission:** intent → contracts schema parse → Engine legality (Brief 02 step 1) → cascade or `intent_rejected{reason}`. The identical legality function ships to the client for greying; the reject string and the grey tooltip are the same string by construction.
5. **Backpressure/rate:** per-connection intent rate limit (burst 5 / sustained 2/s); over ⇒ `rate_limited`, never disconnect mid-combat.
6. **Presence** is ephemeral (not events); emitted on join/leave/turn change; DM additionally sees per-player connection health.
7. **Prompts** (`reaction_prompted`, ruling handoff) time out server-side (config, default 60s) ⇒ auto `reaction_declined` so a dropped player never stalls the table; DM can answer any prompt on a player's behalf (Override doctrine).
8. **Snapshot = fold(log)** — one projection function in the engine package, reused by welcome, tests, and recovery. Never a second hand-maintained state.

## 3. Roles & auth
`token` = short-lived signed session token minted at HTTP login, carrying accountId + campaign membership; server derives `Viewer{role}` (dm / player / table_display — table_display minted by the DM as a shareable spectator token). All filtering via contracts `eventVisibleTo` — no second implementation.

## 4. Acceptance criteria
1. Wire golden test: scripted Torvald-trace session over a real socket pair; player capture == contracts `filterStream` output (byte-level, incl. seq gaps).
2. Reconnect test: kill player socket mid-cascade, reconnect with lastSeq ⇒ state equals never-disconnected control.
3. Duplicate intent envelope ⇒ single cascade (Brief 02 acceptance #8, now wire-level).
4. Reject reason equals client greying string for the same illegal intent (shared-function assertion).
5. Prompt timeout ⇒ auto-decline event; table proceeds.
6. Load smoke: 6 clients, 500-event replay < 2s on dev hardware (slice metric, logged to ADR).
