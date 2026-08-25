# Questra — Build-From-Scratch Blueprint

Everything required to reconstruct Questra from zero: the standing orders, the sequenced
plan, every decision that's already been made, the per-feature briefs, the design specs,
copy-paste build prompts, and the contract spine as real code.

This folder is **self-contained**. A person — or a fresh Claude Code session — can rebuild
the app working only from what's here. Nothing points back into the parent repo.

> **What Questra is:** a single desktop web app that lets five friends who've never played
> D&D finish a real session together, remotely, on the night they decide to try. Not a
> toolbox — a session, start to finish. Read `CLAUDE.md` before anything else; it holds the
> five laws that override every other instruction.

---

## Read in this order

1. **`CLAUDE.md`** — the standing orders. The five laws, the non-goals, how to work,
   definition of done. *If a request conflicts with this file, that conflict wins — stop
   and say so.*
2. **`adr/INDEX.md`** then skim **`adr/0001`–`0017`** — the decisions already made. These
   are settled; never re-litigate them in a build session. Each is a one-pager.
3. **`plan/questra-build-playbook.md`** — the *method*: contract-first, slice-second, then
   parallel. Why the build is sequenced the way it is, and how to keep an LLM-built
   codebase from drifting. Read this before you write any code.
4. **`plan/MASTER-PLAN.md`** — the *sequence*: milestones **M0 → M8**, each with its briefs,
   exit criteria, and what runs in parallel. This is the step-by-step build order.
5. **`plan/briefs-roadmap.md`** — the index of every implementation brief, mapped to scope,
   dependencies, and non-goals.
6. **`plan/GAP-AUDIT.md`** — the seams that were assumed-but-unscheduled (accounts, storage,
   deploy…) and how they were dispositioned. Read so you don't re-open a closed gap.

Then, **per task**, read *only* the brief(s) the current milestone names — not all the
specs. That's the Playbook rule: one session = CLAUDE.md + the ADR index + one brief.

**Designing the UI from scratch?** Read **`design-handoff/00-COMPONENT-LIST.md`** — the
complete inventory of every primitive, screen, and sub-component to design, each with its
intent, concrete design details, source doc, and milestone. The full per-component detail
docs travel alongside it in `design-handoff/detail-docs/`.

---

## What each folder is

| Folder | What it is | When you touch it |
|---|---|---|
| `CLAUDE.md` | Standing orders — the five laws. | Every session, first. |
| `plan/` | The sequenced plan, the method, the roadmap, the gap audit. | Planning & at each milestone boundary. |
| `adr/` | 17 architecture decisions, already made. | Reference; never re-decide. |
| `briefs/` | 15 build-ready implementation briefs (01–15; 09 splits a/b/c, 14 splits §1 + shell). Each is self-contained: exact shapes, worked example, acceptance tests, non-goals. | The unit of one build session. |
| `specs/` | The 10 design specs the briefs are drawn from (architecture, rules engine, in-play, wizard, planner, campaign, AI orchestration, portraits, onboarding, + the playbook). | Deep reference when a brief points to one. |
| `prompts/` | `CLAUDE-CODE-PROMPTS.md` — copy-paste session prompts, one per milestone task. | To actually drive the build. |
| `design-handoff/` | **The complete component & screen list to design from scratch.** Every primitive, screen, and sub-component the blueprint calls for — with intent, concrete design details, source doc, and milestone. Plus `detail-docs/` (the full per-component storybook docs + the Player View / dice-tray design requests). | When prototyping the design. Start at `design-handoff/00-COMPONENT-LIST.md`. |
| `scaffold/` | Root `package.json` (workspace layout + `check`/`build` scripts) and `docker-compose.yml` (Postgres for the event store). | When standing up the repo. |
| `contracts/` | The **`@questra/contracts`** package as real source: entity schemas, the event vocabulary, effect hooks, AI output schemas, wire/visibility types, and canonical fixtures. **This is the spine every other package imports.** | First code you build; changes only by deliberate contract PR. |

---

## The one rule that keeps the build coherent

**Types change by deliberate contract PR; features conform to types, never the reverse.**

The `contracts/` package is the shared spine. Client, server, and tests all import it.
If you need a new shape, propose it as a contracts change first (types + fixtures + tests),
*then* build the feature. This is what stops a from-scratch rebuild from re-inventing the
data model slightly differently each session until the pieces stop agreeing.

---

## The construction order, in one screen

*(from `plan/MASTER-PLAN.md` — full exit criteria live there)*

- **M0 — Foundation.** The `contracts/` package (types + validators + fixtures) + repo
  scaffold + the ADRs. No features. One focused week that saves ten.
- **M1 — Rules Data.** SRD 5.2.1 ingested into the schema, golden test suite growing
  alongside. The long pole; the first dependency of everything.
- **M2 — The Vertical Slice.** One room → one asset → two tokens → player attack (server
  dice) → auto-narration → opportunity-attack prompt → novel action → streamed Ruling <2s
  → Undo, on two devices. All four AI bets measured at once. **The go/no-go gate.**
- **M3 — Full Combat & Play Screens.** Complete combat, dying, rests, leveling, bosses;
  both play screens to design-matched polish; minimal app shell.
- **M4 — Prep.** Character Wizard, Session Planner, Campaign Wrapper; full shell + notifications.
- **M5 — Homebrew & Community.** Builder, balance check, library, moderation.
- **M6 — Voice & Immersion.** TTS voices, narrator read-aloud, dictation, accessibility pass.
- **M7 — Onboarding.** The ramp, gating, the demo party. Last, by design.
- **M8 — Hardening & Launch.** Production deploy, load/soak, billing, legal, launch checklist.

"App built start to end" = **M8 exit**.

---

## Bootstrapping from this folder (M0)

1. Recreate the monorepo: a root with `scaffold/package.json` (npm workspaces, `packages/*`)
   and `scaffold/docker-compose.yml` at the root.
2. Drop `contracts/` in as `packages/contracts`. `npm install`, then `npm run build:contracts`
   and its tests — the fixtures in `contracts/src/fixtures/` are the acceptance test.
3. From there, follow `prompts/CLAUDE-CODE-PROMPTS.md` milestone by milestone, reading the
   brief each prompt names. Per **ADR-0013**, the first task of every milestone is
   revalidating its brief against the current contracts — the planning docs are allowed to
   lag the code, so the contracts are the source of truth, not the prose.

---

*Snapshot note: this is a point-in-time extract of the design corpus. The live repo's code
may be ahead of these documents (that's expected and intended — ADR-0013). Treat the
`contracts/` source here as the shape to conform to; treat the prose as the reasoning behind
it. `README.original.md` is the repo's original top-level README, kept for reference.*
