# Questra — Master Build Plan (Start to End)

*The one document that sequences everything. Each milestone lists: its briefs, its exit criteria, and what runs in parallel. Rule from ADR-0013: the first task of every milestone is revalidating its brief(s) against current contracts.*

*Amended 2026-07-19 after the GAP-AUDIT: infrastructure (persistence, AI-vendor wiring, deploy — ADR-0015), accounts/shell (brief-14), voice (brief-15), and several assumed-but-unscheduled tasks are now sequenced explicitly. The feature spine was verified sound; these additions are platform/content/product, not rules or gameplay.*

## M0 — Foundation *(done)*
Contracts package (typed, tested, 19 green), fixtures, CLAUDE.md, ADRs 0001–0016, specs + all 15 briefs in-repo.
**Exit:** `npm run check` green. ✅

### M0-retro — CI *(immediate, closes GAP-AUDIT A4)*
GitHub Actions running `npm run check:all` + the engine golden suites on every PR (Playbook §4: "no Engine PR merges red"). Prerequisite for the deploy pipeline.
**Exit:** CI green-gates PRs; a red check blocks merge.

## M1 — Rules Data
Briefs: 01 (+ 04's fourteen condition fixtures fold in here). Build the ingestion pipeline, ingest SRD 5.2.1 to `verified` (classes, species, backgrounds, feats, spells, monsters, items+prices, conditions, XP + difficulty-ladder tables), grow the golden suite alongside.
**Parallel:** Claude Design produces the visual direction + mockups for player hub, DM screen, wizard, map (ADR-0014); token set lands in the repo theme.
**Exit:** counts complete; 15 condition sign-offs; fixtures byte-stable; attribution screen content ready (ADR-0010).

## M2 — The Vertical Slice *(the measured gate)*
Briefs: 02 (engine), 03 (sheet), 05 (sync), 06 (map), 09c minimal (one Ruling path + fallback ladder), 09a minimal (one terrain + one asset generation), **14 §1 (accounts + session tokens — sync needs real tokens)**.
Build exactly the Playbook §7 slice: room → asset → two tokens → player attack (server dice) → auto-narration → OA prompt → novel action → streamed Ruling <2s → Undo, on two devices.

**Infrastructure this milestone (ADR-0015 — required to *measure*, not deferrable):**
- **Persistence (start):** Postgres append-only event table `(playSessionId, seq)` + core entity tables + migrations tooling (GAP-AUDIT A6); the `SyncCore` store seam swaps from in-memory to Postgres. Undo/recap/replay stop being in-memory-only.
- **AI-vendor wiring:** one real `RulingModel` + one real `ImageGen` behind the config seams (ADR-0011) — the slice needs one real ruling call + one real image call to measure anything; object storage + CDN provisioning (GAP-AUDIT A3) lands with the image work.
- **Deploy (minimal dev env):** server + web reachable over the network on a real host, env-config for vendor keys + DB URL — so "a second device joins as the player" is a real device, not localhost.
- **Content:** narration template pack (the Engine's plain-English voice — GAP-AUDIT A5), paired with the engine work; seed art set attached to generations (owner deliverable C1) before the image measurement.

**Exit:** every Playbook metric measured against the real vendors and published to **ADR-0017** (first-token p95, roll→narration round trip, replay determinism, fog payload cleanliness); the event log **survives a server restart** (replayed session == pre-restart state, ADR-0015); the slice runs on **two physical devices** against the dev environment. *Go/no-go on the AI bets happens here, by numbers.*

## M3 — Full Combat & the Play Screens
Briefs: 04 (complete), 07, 08, 10 (**+ compendium browser scope — GAP-AUDIT B4, reads rules data + InfoPanel**), **14 §2–4 (membership plumbing + minimal app shell: landing → home → join → nav → settings)**. Everything Part-1/Part-2 of the In-Play spec, dying, rests, leveling, bosses, both screens to Design-matched polish, table_display mode.
**Persistence (complete, ADR-0015):** entity persistence for accounts/campaigns/memberships/characters/rooms finished here as the shell needs durable accounts.
**Responsive (ADR-0016 A7):** the player hub, death-save card, and dice surface ship responsive (in-person mode is v1, played on phones); prep surfaces stay desktop-first.
**Exit:** a real table can run a full multi-session fight arc with zero spreadsheet fallback; the join link is a player's entire front door (brief-14 golden); all golden suites green; greying-parity and payload-cleanliness tests green.

## M4 — Prep: Wizard, Planner, Campaign
Briefs: 11, 09b, **14 §3–5 (full app shell + notifications — GAP-AUDIT B3)**, plus the wizard/planner UI work (Design-matched, built from the primitives). Character Wizard steps 0–5 + reveal (09a full), Session Planner (sequencer, room editor reusing M2's canvas edit mode, session kit, Your Players), Campaign Wrapper (premise chips, pools, bonds web, promotions, secrets, story-so-far jobs). Full home, settings surface, and the in-app notifications bell/list land here (each producing brief's "notifies X" now targets brief-14 §5).
**Owner decisions due END OF M5** (ADR-0016): pricing tiers + billing provider (DP-1), TTS/STT vendor + budget (DP-2). Flagged so M5/M6 don't improvise them.
**Exit:** the experienced-DM loop (Campaign spec §12 build order) works end to end: create → invite → wizard → plan → play → recap.

## M5 — Homebrew & Community
Briefs: 12 + the homebrew builder flow (wizard spec §6 over the Brief 01 schema). Builder, balance check, library, moderation queue, approval gate.
**Exit:** publish→import→approve→build→play a homebrew class end to end; gate lint green; moderation single-entry-point lint green.

## M6 — Voice & Immersion
Brief: **15 (voice & audio — closes GAP-AUDIT B1–B2)**. TTS voice library (curated, no cloning), NPC Become, narrator read-aloud, STT dictation, voice-transform behind a flag; immersion console effects complete; reduce-motion + accessibility pass. *Depends on ADR-0016 DP-2 (TTS vendor) being resolved by end of M5.* Immersion audio-library license (brief-15 DP-2) is an owner decision at M6 start.
**Exit:** a social scene runs with per-NPC voices; accessibility checklist signed.

## M7 — Onboarding *(last, by design)*
Brief: 13. The ramp, gating flags wired through every surface, silent scaffolding, the authored demo party + tuned fight, veteran skip, the pyramid motif.
**Exit:** a brand-new account reaches the Floor 1 payoff in ≤5 minutes and Floor 4 reveal in one sitting (scripted usability runs, n≥5); a veteran lands on the wrapper in two clicks.

## M8 — Hardening & Launch
**Full production deploy (ADR-0015):** CI/CD, prod hardening, scaling, secrets management, incident runbook (the minimal dev env from M2/M3 graduates to production). Load/soak on sync (target: 8-player table, 4-hour session, zero desyncs), backup/export GA, **quotas + billing implemented against the ADR-0016 DP-1 tiers**, legal review (ADR-0010: SRD attribution, AI-art policy, UGC terms, privacy) — engage counsel by M6, incl. the minors/age policy (C5), name/trademark + domain (C7), legal review (ADR-0010: SRD attribution, AI-art policy, UGC terms, privacy), moderation staffing plan, telemetry dashboards (ai_outcome, cost per touchpoint), incident runbook.
**Exit:** launch checklist signed.

## Owner deliverables *(GAP-AUDIT Class C — no session prompt surfaces these; calendar them)*
These are owner-only; Claude Code will stop at the decisions rather than improvise. Deadlines are hard because downstream milestones depend on them.
- [ ] **C1 — Seed art set** (10–20 owned/commissioned originals in house style). **Due: before M2's image measurement** — every generation attaches them as the style anchor; without them M2 measures placeholder style.
- [ ] **C2 — Real preset-token tables** for the SRD species/class roster (the Portrait spec's fae tables are examples). **Due: M2 minimal (slice's species) → M4 full.** Co-draftable with AI; owner approves.
- [ ] **C3 — Claude Design token set + prototype handoff** (ADR-0014). **Due: before M3 screens.**
- [ ] **C4 — Legal counsel** (SRD attribution check, AI-art policy, UGC terms, privacy/ToS). **Engage by M6, review M8** (ADR-0010).
- [ ] **C5 — Minors / age policy** (account age handling, content standards, parental posture). **Decision by end of M5** (shapes brief-14 signup — `ageBracket` field reserved), legal review M8.
- [ ] **C6 — Pricing model (DP-1) + TTS vendor budget (DP-2).** **Due end of M5** (ADR-0016).
- [ ] **C7 — Name/trademark check ("Questra") + domain.** **Due before any public launch;** cheap now, expensive later.

## Standing risks & their tripwires
- **Table-time AI latency** — tripwire: M2 p95 >2s ⇒ walk the 09c ladder before M3.
- **Asset generation quality** — tripwire: M2 asset acceptability fails ⇒ library-first strategy leads (curated packs), generation demoted to supplement.
- **Multiplayer feel** — tripwire: M2 round-trip feels laggy on real networks ⇒ prediction work before M3, not after launch.
- **Ingestion underestimation** — M1 is the schedule's long pole; parallelize QA sign-offs, never skip them.
- **Infra-light plan (fixed 2026-07-19)** — persistence, AI-vendor wiring, and deploy were assumed (ADR-0011) but unscheduled; now sequenced (ADR-0015). Watch for the next "assumes X exists" that lacks a plan line — the correction rule: *when a brief says "assumes X exists," X gets a Master Plan line (or a GAP-AUDIT successor entry) in the same PR.*

*Definition of "app built start to end": M8 exit. Everything needed to get there now exists in this repo: 10 specs, 15 briefs, 17 ADRs, the GAP-AUDIT, tested contracts, canonical fixtures, this plan.*
