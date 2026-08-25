# ADR-0015 — Infrastructure milestones (persistence, AI-vendor wiring, deploy)

*Status: Accepted. 2026-07-19.*

## Context

ADR-0011 decided the infrastructure — Postgres append-only event table + entities,
object storage + CDN, `ws` behind a transport seam, vendor code behind config
seams, any-Node-host deployment. But the Master Plan sequenced *features* and
never scheduled *building* that infrastructure. The gap surfaced concretely at
M2→M3: the sync server, Undo, recap, and replay are all **defined against a
durable event log**, yet the M2 slice holds the log in memory — so those features
are, today, meaningless past a process restart. This ADR sequences the three
already-decided infra pieces. It is a **scheduling decision, not a
re-architecture**: every technology choice was made in ADR-0011.

## Decision

### 1. Persistence lands with the sync server — M2/M3, NOT M8

The Postgres layer is not a launch-hardening task; it is load-bearing for the
core loop. **Insert a persistence task at the M2/M3 boundary**, when the sync
server becomes real (brief-05 + brief-14 tokens):

- **Append-only event table**, indexed by `(playSessionId, seq)` — the single
  source of truth the engine `fold`s. Writes are the only mutation; reads rebuild
  state. This makes `undo_applied`, recap, and reconnect-replay actually durable.
- **Entity persistence** — accounts, campaigns, memberships, characters, rooms,
  library assets — relational, per ADR-0011.
- **Migrations tooling** chosen here (closes gap A6); first migration = the event
  table + core entities. (Candidate: a lightweight SQL migrator; decide at build,
  no new ADR.)
- **Snapshotting** (optional optimization): periodic `fold` checkpoints so long
  logs don't replay from zero — deferred until a session's log is long enough to
  matter; the interface (`SyncCore` already folds from a `base`) is ready.

The `SyncCore` (M2.3) was deliberately built transport- and store-agnostic: it
holds the log through an in-memory store today; persistence swaps a `Postgres`
store behind the same seam, no protocol change.

**Exit criterion:** the event log survives a server restart — a session replayed
after a restart equals its pre-restart projection byte-for-byte (`fold(reloaded
log) === fold(pre-restart log)`), and a reconnecting client reaches identical
state. This is a golden test against a real (or testcontainer) Postgres.

### 2. AI-vendor wiring — M2 (the slice needs one real call to measure anything)

ADR-0017's go/no-go gate measures AI latency and asset acceptability. You cannot
measure a stub. **Schedule the concrete "implement the seam against one real
vendor" task in M2**, behind the config seams ADR-0011 and briefs 09a/09c already
define:

- One real `RulingModel` implementation (streaming, prompt-prefix cache) — enough
  for one real ruling call.
- One real `ImageGen` implementation — enough for one real terrain + one asset
  generation.
- Object storage + CDN provisioning (closes gap A3) lands here, since generated
  images must be written to immutable storage before any UI sees them (09a §2).

Vendor code stays inside the implementation module — the import-graph rule
(09a §5.4 / 09c) holds; swapping vendors is config. **These implementations are
what ADR-0017's measurement runs against**; until they exist, ADR-0017 stays OPEN.

**Exit criterion:** ADR-0017's metrics table can be filled — one real ruling call
emits real `ai_outcome` latency, one real image generation writes to storage with
provenance. (Cost/quota enforcement is separate and stays M8.)

### 3. Deploy — a minimal dev environment at M2/M3, full deploy at M8

The slice's whole point is "a second device joins as the player." Two devices
cannot hit `localhost`. **Schedule a minimal deployable dev environment at the
M2/M3 boundary:**

- The server (Fastify + ws) reachable over the network on a real host (ADR-0011:
  any Node host — Fly.io/Railway/etc.), the web app served (Vercel or same host),
  env-config for the vendor keys + database URL. Just enough to run the Playbook
  §7 script on two real devices and take ADR-0017's measurements.
- **Full production deploy** (CI/CD, prod hardening, scaling, secrets management,
  incident runbook) stays **M8** where the Master Plan already puts launch
  hardening.

**Exit criterion (M2/M3):** the slice runs on two physical devices against the
deployed dev environment. **Exit criterion (M8):** production deploy on the launch
checklist.

## Consequences

- The Master Plan is amended to carry these three as explicit tasks (this ADR is
  the rationale; the plan is the schedule).
- CI (gap A4) is a prerequisite for the deploy pipeline and is scheduled as an
  immediate task, separately.
- No code is re-architected: the seams (`SyncCore` store, `RulingModel`,
  `ImageGen`, `ws` transport) all already exist from M2. This ADR fills the
  calendar, not the codebase.

## Related

ADR-0011 (the technology decisions being scheduled) · ADR-0017 (the slice metrics
these unblock) · Brief-14 (accounts/auth — supplies the tokens the persisted
sessions filter for) · GAP-AUDIT Class A (A1–A3, A6).
