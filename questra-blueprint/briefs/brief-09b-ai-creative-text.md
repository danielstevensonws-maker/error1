# Brief 09b — AI Creative-Text Tier

*Layer 3. Consumed with contracts + AI Orchestration §2.2, §3–§5. Revalidate at build time.*

**Scope:** the context-assembly service, the campaign digest job, every creative-text schema end-to-end, the accept/tweak/reject loop, telemetry.
**Non-goals:** table-time calls (09c), image prompts (09a), model choice (config).

## 1. Context assembly service (one, with recipes)
`assembleContext(recipeId, refs) → { cachedPrefix: Msg[]; volatile: Msg[] }` — deterministic ordering: system voice + campaign digest (cacheable) first, task-specific volatile state last. Recipes as data (`ai/recipes.ts`), one per touchpoint, each declaring exactly which entities/fields it reads. **The visibility filter applies here**: recipes are tagged dm_side (may read secrets) — a player-side recipe (none exist v1) mechanically cannot select dm_only fields (type-level: recipe field paths checked against a visibility map). Player free-text always enters as delimited data fields, never as instruction position (injection posture).

## 2. The campaign digest (background job)
Rolling summary {premise, story-so-far ≤400 words, cast one-liners, dangling hooks list, party one-liners}; regenerated when sources change (debounced) and after each session; stored + versioned; every creative call includes the current digest in the cached prefix. This is the cohesion mechanism — "in the key of the premise" for the price of one cached block.

## 3. Schemas end-to-end (each = schema in contracts + recipe + prompt + card wiring)
`PremiseDraft` (chips→paragraph), `SeededPool` (cast/locations/first secret from premise), `WizardSuggestions` (personality/appearance/describe-a-character fan-out), `BondProposal` + `OpenThreadHook` (vague hooks, never named villains — the prompt encodes the genesis guardrail; a validator rejects proposals containing proper-noun antagonists at genesis), `SceneSequenceDraft`, `ReadAloudDraft`, `TieInSuggestion`, `RecapDraft` + `StorySoFar` (from the event log filtered to narratively significant kinds), `LevelUpNudge`, `ShopDraft`. Output contract: model instructed JSON-only; parse → on failure one repair retry → on second failure typed fallback (blank-page card with a plain-language note). Streaming into the card where the schema is a single text field; buffered for structured lists.

## 4. The one card + telemetry
Accept/tweak/reject card semantics: accept applies via the normal CRUD/event path (AI never writes state directly — the card's accept handler is ordinary app code); tweak opens the draft editable; reject discards. Every closure emits `ai_outcome{touchpoint, action: accepted|tweaked|rejected, latencyMs, model}` per the analytics schema (contract PR: `telemetry/events.ts` — also carries slice latency metrics and image cost counters). Acceptance-rate per touchpoint is the model-routing dashboard.

## 5. Acceptance criteria
1. Recipe determinism: same refs ⇒ identical prefix bytes (cache-hit guarantee).
2. Visibility: a recipe attempting a dm_only field path fails at compile/validation, with a test proving the Seraphine secret never appears in any player-side assembly.
3. Genesis guardrail: seeded BondProposal containing a named antagonist ⇒ validator rejects (golden prompts + adversarial fixture).
4. Malformed-JSON ladder: bad → repaired → fallback, all three paths tested with canned model stubs (no live model in CI).
5. Digest job idempotent + debounced; digest version pinned into each ai_outcome for attribution.
6. Zero direct state writes from AI code paths (import-graph lint: ai/* cannot import event emitters except via card handlers).
