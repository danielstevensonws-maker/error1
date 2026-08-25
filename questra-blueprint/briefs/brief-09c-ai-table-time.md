# Brief 09c — AI Table-Time Tier (Rulings & Roleplay)

*Layer 3. Consumed with contracts + 09b's service + AI Orchestration §2.3. Revalidate at build time. This is the measured product risk — everything here exists to hit <2s first-token.*

> **⚠️ ADR-0013 revalidation note — M2.4 (2026-07-19).** M2.4 builds the **minimal** ruling path (09c §1 one RulingSuggestion + §2 fallback ladder), contract-first. New in contracts: `RulingSuggestionSchema`, `NpcLineSchema` (AI output schemas — Orchestration §4 says every AI output conforms to a published contracts schema), and `table.difficulty-ladder` data. `packages/ai` ships with a **STUBBED streaming model** (ADR: AI always has a non-AI fallback) — the streaming interface, the accept/tweak/reject flow into the existing `AcceptTweakRejectCard`, and the difficulty-ladder fallback are all real; only the model call is stubbed. **Live p95 (§5) is measured in the slice environment, NOT CI** — CI runs stub-timing logic only (§6.5); the go/no-go ADR carries a metrics template + manual-run steps. The engine never calls the model (ADR-0005): escalation emits `escalated_to_ruling`, the AI tier proposes, `ruling_decided{ask_roll}` re-enters the pipeline.

**Scope:** RulingSuggestion and NpcLine end-to-end, the Oracle, the latency stack, the fallback ladder, the difficulty-ladder data.
**Non-goals:** Engine resolution (rulings only *propose*; `ruling_decided{ask_roll}` hands the chosen check to the pipeline).

## 1. RulingSuggestion
Trigger: `escalated_to_ruling` event. Recipe (small, precomputed): {declared action verbatim, actor sheet summary, target/scene combat state, party levels, difficulty ladder}. Output schema: `{check: {kind, ability, skill?}, dc: number, failConsequence: string, rationale: string}` streamed to the DM Assistant panel as the three-button card (**Ask for the roll / Change it / No roll**). Ask ⇒ `ruling_decided{ask_roll, applied}` ⇒ pipeline prompts the player's roll. Change ⇒ inline dc/check editor then same path. Latency budget: context precomputed at combat state changes (pre-warm), prompt prefix cached; first token target <2s, hard timeout 6s ⇒ fallback.

## 2. The difficulty ladder (data, and the fallback)
Rules-data table (`table.difficulty-ladder`): Easy 10 · Moderate 13 · Hard 15 · Very Hard 18 · Nearly Impossible 20, each with a plain-language line. Fallback card on timeout/AI-down: "Pick a difficulty" ladder + ability picker — fully functional, no model. Same ladder feeds the Change-it editor as presets.

## 3. NpcLine (roleplay co-pilot)
On-demand default (proactive = per-campaign toggle, off). Recipe: {NPC motive + attitude value + knows-list with revealed flags, last ~6 table-log lines, digest}. Output `{line: string, attitudeDelta?: -1|0|1, revealsKnowledgeId?: ID}` → card **Speak (TTS) / Another / Tweak**. Speak emits `narration{from:'dm', spoken:true}` + applies attitudeDelta + ticks the knows-item revealed — via the card handler (09b rule: AI never writes state directly). Pre-warm on social-scene entry (prime NPC prefixes). Another = re-fire, cheap by cache.

## 4. Oracle & quick rulings
Oracle button: no model call v1 — weighted table (yes / yes-but / no-but / no, twist lines from a curated list seeded by tone) resolved instantly; a model-flavored twist line is a v2 toggle. Quick rulings = compendium search over rules data (also no model). Both live beside the table log per Session Planner §12 — listed here so nobody "upgrades" them into latency risks.

## 5. Latency instrumentation
Every call emits `ai_outcome` with firstTokenMs/totalMs/cacheHit; the slice report (Master Plan M2) publishes p50/p95 per touchpoint into an ADR. Ladder if p95 >2s: smaller model → trim recipe → template-assisted draft → ladder-only fallback; each step decided by the numbers, recorded in the ADR.

## 6. Acceptance criteria
1. Stubbed-model wire test: escalation → streamed suggestion → Ask ⇒ correct pipeline prompt to the correct player; Change edits apply.
2. Timeout ⇒ fallback ladder card renders and functions with the model stub dead; No roll ⇒ clean close, table log coherent.
3. NpcLine Speak applies attitudeDelta + revealed tick in one causal group; Another does not (proposals are stateless).
4. Pre-warm: entering a social scene primes caches such that the first NpcLine request carries cacheHit=true (stub-verified).
5. p95 assertions run in the slice environment (not CI) with published numbers; CI runs only stub-timing logic tests.
6. Proactive toggle off ⇒ zero unsolicited NpcLine calls in a full scripted scene (call-count assertion).
