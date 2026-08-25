# Questra — Build Playbook (Vibe-Coding with Claude Code)

*The tenth and final document. Not a product spec — a construction manual. Its one job: make an LLM-built codebase stay coherent across hundreds of sessions. The failure mode it defends against is drift — the model re-inventing the data model slightly differently each session until the floors stop agreeing. The defense is the same move the design already made: lock a shared spine and make everything a window onto it.*

---

## 1. The order of construction *(the frontend-vs-backend question, answered)*

Neither frontend-first nor backend-first. **Contract-first, slice-second, then parallel:**

1. **Milestone 0 — Contracts.** The shared types package (§2) + the repo scaffolding (§6) + the ADR doc (§5). No features. This is one focused week that saves ten.
2. **Milestone 1 — Rules data.** SRD 5.2.1 ingested into the schema (Rules spec §1), with the golden test suite (§4) growing alongside it. The largest content task and the first dependency of everything.
3. **Milestone 2 — The vertical slice** (§7). One room, one asset, one token, one auto-resolved combat round, one Ruling Suggestion, synced to a second screen. All four hard bets measured at once.
4. **Milestone 3 — Parallel build-out.** Frontend teams/sessions build every surface against the *real* contract with a stubbed Engine; Engine and data work fills in behind. The contract being fixed is what stops the halves drifting.
5. **Onboarding last**, exactly as designed — it's the capstone and needs finished floors to gate.

Frontend *early* is right (the "game, not tool" magic is UX, and Claude Code is strong there); frontend against **improvised mocks** is the trap. Mocks are generated *from* the contract package, never hand-rolled.

---

## 2. The contracts package (the repo's spine)

One workspace package, e.g. `@questra/contracts`, imported by client, server, and tests alike. It contains, as code:

- **Entity schemas** — the full data model (Architecture §3) as TypeScript types + runtime validators (zod or equivalent; validators matter because AI-written code trusts itself too much).
- **The event vocabulary** — every play event (Architecture §4.1) as a discriminated union. Adding an event type is a reviewed contract change, never an inline improvisation.
- **The effect-hook vocabulary** — the Rules spec §1.2 hooks as types. This is the routine/novel boundary *as a type system*.
- **AI output schemas** — the §4 orchestration schemas (RulingSuggestion, SeededPool, …).
- **The API + channel surface** — intents in, events out, per-viewer visibility scopes.
- **Fixtures** — canonical sample data (one campaign, one party, one session, one combat log) used by tests, mocks, storybook, and demos. The campaign-export format doubles as the fixture format (Architecture §6).

Rule for every Claude Code session: **types change by deliberate contract PR; features conform to types, never the reverse.**

---

## 3. The primitives library (build the repeats once)

The specs already told us the reusable parts — they repeat by design. Extract each as one component/module *before* the features that use it, then compose:

| Primitive | Reused by (per the specs) |
|---|---|
| **Sequence + pool + review** shell | Campaign, Session, (Scene internals) — the one-pattern-three-floors shape as an actual generic component |
| **Info panel** (3-layer "?", Choose inside) | wizard, compendium, planner, library, level-up |
| **Accept/tweak/reject card** | every AI touchpoint (Orchestration §4) |
| **Public/secret split field** | scene notes, bonds, cast, secrets, locations |
| **"Pull from campaign" picker** | cast→scene, locations, rewards, recurring maps |
| **Reorderable card sequencer** | scenes in a session, sessions in a campaign |
| **Map canvas (edit/play/table modes)** | room editor, DM table, player view, table display |
| **Prompt-the-holder interrupt card** | reactions/OAs, legendary actions, lair actions, ruling decisions, rest confirmations |
| **Presets-above-free-form input** | wizard steps, premise chips, scene creation, onboarding Floor 1 |
| **Chip/token prompt assembler** | portraits, NPC art, map assets (Portrait spec §1's four layers as a function) |

This table is the answer to "what do I ask Claude Code to build first after the contracts" — and each primitive gets a storybook entry against fixtures, so UI work needs no backend at all.

---

## 4. The rules golden-test suite (non-negotiable)

The Engine is where an LLM introduces *silent* wrongness — a mis-collapsed advantage, a save DC off by proficiency. Tests are the only defense that scales past human review. Structure:

- **Golden scenario tests**, written as data against the fixtures, one per rule behavior. Seed examples (grow to hundreds):
  - Adv + adv + dis ⇒ straight roll (never "net advantage").
  - Prone attacker with Bless: disadvantage flag + 1d4 both applied.
  - Exhaustion 3: −6 on the check, −15 ft speed; level 6 ⇒ death event.
  - Damage 18 vs 6 current / 12 max HP ⇒ instant death (massive damage).
  - Nat 1 death save ⇒ two failures; nat 20 ⇒ 1 HP and conscious.
  - Concentration: 22 damage ⇒ CON save DC 11 prompted; Incapacitated ⇒ concentration ends, linked conditions cascade off targets.
  - Long Rest ⇒ all HP, **all** Hit Dice (2024), exhaustion −1, slots full; interrupted at 90 min by damage ⇒ short-rest benefits.
  - Half + three-quarters cover ⇒ ¾ only (+5), never +7.
  - Forced movement out of reach ⇒ no OA prompt; Disengage ⇒ no prompt; walk-out ⇒ prompt.
  - Undo of an attack reverses damage + applied condition + broken concentration as one causal group.
- **Property tests** on the pipeline (modifiers commute; collapse is order-independent; event replay is deterministic: fold(log) always equals live state).
- **Contract tests**: every event the server can emit validates against the vocabulary; every AI schema round-trips.
- CI gate: **no Engine PR merges red.** When a table finds a rules bug, the fix ships *with* its golden test — the suite is the app's accumulated rules memory.

---

## 5. Architecture Decision Records (the repo remembers so sessions don't re-litigate)

`/docs/adr/` with one-pagers; every Claude Code session reads them via CLAUDE.md. Seed set, all already decided across the ten documents: server-authoritative event-sourced Engine; contract-first; effects-as-data (no rules if-statements outside the dataset); secrets never transmitted to player clients; Engine never calls a model / AI always has a non-AI fallback; suggests-never-commits at every AI surface; milestone-default leveling, multiclass deferred; assisted-manual cover and DM-revealed fog in v1; server dice with manual-entry mode; plain-language UI vocabulary (beat→scene, node→member — ban list lives here); CC-BY attribution screen ships in v1.

---

## 6. Repo hygiene for Claude Code specifically

- **CLAUDE.md at repo root** — the standing brief every session inherits: pointer to the ten specs, the contracts package, the ADR index, the primitives table, the plain-language ban list, and the standing orders ("conform to contracts; contract changes are their own PR; Engine changes require golden tests; check the primitives table before writing new UI").
- **Specs live in the repo** (`/docs/specs/`) — the source documents *are* the context; don't make the model work from paraphrase.
- **One vertical concern per session/PR.** "Build the bonds web UI against fixtures" is a session. "Improve the campaign area" is drift bait.
- **Make the model prove state, not recall it** — sessions start by reading contracts/ADRs, not by summarizing memory of them. Cheap to enforce in CLAUDE.md, huge coherence payoff.
- **Regenerate mocks from contracts** whenever contracts change (a script, run in CI), so stale mocks can't teach the frontend lies.
- **Storybook + fixtures as the frontend workspace** — most UI sessions never need a running backend.

---

## 7. The vertical slice (Milestone 2, precisely)

One end-to-end path exercising all four flagged hard bets for the price of a prototype:

> A DM generates **one base-terrain map**, places **one generated asset** (tagged, draggable, deletable) and **two tokens** (one PC from a fixture sheet, one goblin from the rules data). A second device joins as the player. The player taps an attack: composes, rolls (server dice), Engine applies + narrates on the DM screen, player HP/greying update live. The goblin walks out of reach ⇒ OA prompt fires. The player declares "I swing on the rope" ⇒ a **Ruling Suggestion** streams to the DM in under 2 seconds. DM taps Undo ⇒ both screens roll back the causal group.

Measured, not vibed: first-token latency on the ruling, roll→narration round-trip, asset-generation acceptability, replay determinism. Every number lands in an ADR. If the slice feels like magic, the remaining ~80% of the app is, by the specs' own audit, ordinary engineering on a pattern that repeats three times. If it doesn't — that's the cheapest possible place to have learned it.

---

*End of the Build Playbook, and of the ten-document set: six product specs, three system specs, one construction manual. The design is now closed top to bottom — every floor, the rules under the floors, the pipes behind the walls, and the order of the scaffolding.*
