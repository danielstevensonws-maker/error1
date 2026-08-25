# ADR-0017 — Vertical-slice metrics (the M2 go/no-go gate)

*Status: OPEN (awaiting slice-environment measurement). Proposed 2026-07-19.*

The Master Plan's M2 exit is a **measured** gate: the Playbook §7 vertical slice
must be exercised on real hardware over two devices, and every flagged AI bet
gets a number recorded here. "Go/no-go on the AI bets happens here, by numbers."

## What is already proven (automated, in CI)

The slice's deterministic spine is assembled and green — `packages/server/test/slice.golden.test.ts`
wires sheet → attack intent → engine pipeline → filtered fan-out → escalation →
AI ruling (fallback) → ruling_decided, end to end:

- **Replay determinism** ✅ — the Torvald trace reproduces `torvald-trace.json`
  byte-for-byte; `fold(log)` matches live projection; the undo property holds
  (`fold(log) === fold(log + cause + undo(cause))`).
- **Fog payload cleanliness** ✅ — `filterRoomForViewer` + `filterStream`: a
  player payload carries zero unrevealed cells and zero hidden/staged tokens
  (contracts tests + the wire golden).
- **AI always has a non-AI fallback** ✅ — a dead/slow/malformed model falls to
  the difficulty ladder; the card still functions (ai tests).

## What must be measured in the slice environment (NOT CI)

Per Brief 09c §5 and 09a §5, these need a live model, real hardware, and (for
image acceptability) human judgment. CI runs only stub-timing/logic. Fill in when
the slice is run on two devices with a real vendor wired behind the seams.

| Metric | Target | How to measure | p50 | p95 | Verdict |
|---|---|---|---|---|---|
| Ruling first-token latency | < 2s (hard 6s → fallback) | `ai_outcome.firstTokenMs` over ≥30 escalations, real model behind `RulingModel` | _TBD_ | _TBD_ | _TBD_ |
| Roll → narration round-trip | feels instant (<~500ms) | timestamp intent_ack → narration event received on the *player* device | _TBD_ | _TBD_ | _TBD_ |
| Asset generation acceptability | usable first try | human rate N generated terrains/assets behind `ImageGen`; % accepted | _TBD_ | — | _TBD_ |
| Map render | 60fps pan, ≤200 sprites | devtools frame timing on the play-mode canvas | _TBD_ | — | _TBD_ |
| Sync load smoke | 6 clients, 500-event replay < 2s | scripted replay against the ws server on dev hardware | _TBD_ | — | _TBD_ |

## The measurement procedure (manual, once the vendors are wired)

1. Wire a real `RulingModel` (prompt prefix cached, recipe pre-warmed on combat
   state change) and a real `ImageGen` behind the existing seams — config only,
   no code outside those implementations (import-graph rule holds).
2. Run `@questra/server`'s `main.ts` on dev hardware; open the DM screen on one
   device and the player embed on a second.
3. Drive the Playbook §7 script: generate a terrain, place an asset + two tokens,
   player attacks (server dice), goblin walks out of reach (OA prompt), player
   declares "I swing on the rope" (ruling streams), DM undoes.
4. Collect `ai_outcome` telemetry (already emitted) for latency; measure the
   round-trip and render with devtools; rate asset acceptability by hand.
5. Fill the table above; set each Verdict and the overall gate.

## Tripwires (Master Plan)

- Ruling p95 > 2s ⇒ walk the 09c ladder (smaller model → trim recipe →
  template-assisted → ladder-only) *before* M3.
- Asset acceptability fails ⇒ library-first, generation demoted to supplement.
- Round-trip laggy on real networks ⇒ prediction work before M3.

## Decision

**Deferred to the slice run.** The automated spine gives high confidence the
architecture is sound; the remaining risk is entirely in the live numbers, which
this ADR is the home for. No milestone-gating decision is recorded until the
table is filled.
