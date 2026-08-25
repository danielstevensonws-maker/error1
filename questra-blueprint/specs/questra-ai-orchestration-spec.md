# Questra — AI Orchestration Spec

*The ninth spec. The portrait system was the only AI touchpoint with a spec; this document covers the other eleven, and the shared machinery that keeps them coherent, fast where it matters, and affordable everywhere. Governing principle inherited unchanged: the Assistant suggests, the human decides — which turns out to be a cost and safety architecture, not just a philosophy (§5).*

---

## 1. The touchpoint inventory

Every AI call in the app, sorted into the three tiers that determine how each is built:

| # | Touchpoint | Tier | Latency need |
|---|---|---|---|
| 1 | Character portrait (reveal) | Image | seconds OK — it's the drama |
| 2 | NPC portraits | Image | seconds OK |
| 3 | Map base terrain | Image | seconds OK (prep-time) |
| 4 | Room assets (sprites) | Image | seconds OK (prep-time) |
| 5 | Premise drafting (chips → paragraph) | Creative text | relaxed |
| 6 | Pool seeding from premise (cast, locations, first secret) | Creative text | relaxed |
| 7 | Wizard suggestions (personality, appearance, homebrew features, describe-a-character fan-out) | Creative text | relaxed |
| 8 | Bond proposals / open-thread hooks | Creative text | relaxed |
| 9 | Scene-sequence drafting; read-aloud drafts; tie-in suggestions ("Your players" panel) | Creative text | relaxed |
| 10 | Recaps, "story so far," party history lines | Creative text | background |
| 11 | **Ruling Suggestions** (check + DC + fail consequence) | Table-time text | **< ~2s to first token** |
| 12 | **Roleplay co-pilot** (in-character lines) + Oracle | Table-time text | **< ~2s to first token** |

Not AI at all, worth stating: the Engine (all of it), contextual greying, encounter difficulty math, sheet computation, balance-check arithmetic. **The Engine never calls a model.** Determinism stays deterministic; if every AI vendor is down, the app still runs a full combat.

---

## 2. The three tiers

### 2.1 Image tier — expensive, rare, amortized
- **One generation, many uses:** the "generate-then-save-to-library" pattern is recognized here as the image-cost strategy. Portraits generate once at the reveal; maps and assets generate at prep and land in the library; campaigns re-pull, never re-generate. Images are immutable artifacts on a CDN (Architecture §6).
- The prompt engine is the Portrait Style spec, unchanged; NPC portraits and assets use its same locked-block + preset-token pattern with their own token tables.
- **Budget lever:** per-account generation quotas by plan tier are the pricing model's natural seam — meter here first (image gen is ~90% of raw AI cost in an app like this).
- Vendor note: the Portrait spec targets GPT Image today; keep the generation call behind one internal interface so the vendor is swappable (the spec's §6 already writes the Midjourney/SDXL translations — that portability is now an architectural requirement, not a footnote).

### 2.2 Creative-text tier — quality over speed
- Strong general model, streaming into the accept/tweak/reject card so drafts feel alive.
- All drafts that populate UI return **structured JSON against published schemas** (§4) — a seeded pool is `{cast[], locations[], secret}`, not prose to parse.
- Recaps/"story so far" run as **background jobs** after a session ends (event log in → draft out → editable), never blocking anyone.

### 2.3 Table-time tier — the product risk, engineered down
The two calls made *while people wait at the table* (Rulings, roleplay lines). The flagged hard bet, and the full mitigation stack:
- **Fast model class**, streaming, first token < ~2s target, hard timeout ~6s with a graceful fallback (for rulings: a rules-data-derived default — "Ability check, DC by difficulty ladder: 10/13/15/18" — so the DM always gets *something*; for roleplay: "Another" just re-fires).
- **Tight, precomputed context** (§3): the NPC's motive/attitude/knows block and the scene state are assembled *before* the player finishes talking, so the call carries a small prompt, not the campaign.
- **Prompt-cache the stable prefix** (system prompt + campaign premise + NPC definition) so each table-time call pays only for the delta.
- **Pre-warm at scene entry:** opening a social scene primes the cache for its NPCs; starting combat primes the ruling context. The table never pays cold-start.
- This tier is *the* thing the vertical slice measures. If < 2s can't be hit, the fallback ladder (smaller model → template-assisted drafts → rules-data defaults) is the plan, decided by measurement, not vibes.

---

## 3. The context assembly service (build once, everyone reads it)

Every co-pilot across six specs claims to "read context." That's one service, not twelve ad-hoc prompt builders:

- **Input:** a context *recipe* per touchpoint — which entities, which fields, how summarized. E.g. Ruling Suggestion = {scene type, active combatant states, the declared action verbatim, party levels}; bond proposal = {every seated character's backstory/bonds/goals}; tie-in suggestion = {session draft + Your Players hooks + dangling-hooks list}.
- **Output:** a deterministic, ordered prompt assembly — stable prefix first (cacheable), volatile state last.
- **The campaign digest:** a maintained rolling summary of the campaign (premise + story-so-far + cast one-liners + open hooks), regenerated as a background job when its sources change. This is what makes suggestion #9's "drafted in the key of the premise" true *cheaply* — every call includes the digest, the digest is cached, coherence comes standard.
- **Secrecy rule:** the context service enforces the same visibility filter as the sync layer — a *player-facing* AI surface (if any ever exists) can never receive dm-only fields. Co-pilot calls are DM-side today, but write the filter in now; it's the cheap version of the mistake.

---

## 4. Structured outputs & the one card

Any AI output that populates UI conforms to a published JSON schema in the shared contracts package, rendering into the **single accept/tweak/reject card component** (already the app's universal AI grammar). Schemas to ship v1: `RulingSuggestion`, `NpcLine`, `PremiseDraft`, `SeededPool`, `BondProposal`, `SceneSequenceDraft`, `ReadAloudDraft`, `TieInSuggestion`, `RecapDraft`, `LevelUpNudge`. Malformed output → one silent retry with a repair instruction → fallback (§2.3). The card logs accept/tweak/reject outcomes — that acceptance-rate telemetry is the quality metric for every prompt and the evidence for any model downgrade.

---

## 5. Cost architecture

- **The human gate is the cost lever.** Because every output is a *draft a human reviews*, no single call has to be perfect — which licenses cheaper/faster models than a fully-autonomous design would need, monitored by the acceptance telemetry (§4). Downgrade until acceptance dips, then step back up.
- **Cache aggressively:** stable-prefix prompt caching everywhere; the campaign digest amortizes context cost across all calls; image immutability + library reuse amortizes the expensive tier.
- **Meter at the seams:** per-account image quotas (2.1), soft rate limits on creative drafts (regenerate-spam is the realistic abuse case), no metering on table-time calls (never nickel-and-dime the live table — cap upstream instead).
- **Batch the background:** recaps, digests, library maintenance run off-peak/batched where the vendor prices it lower.
- Cost dashboard per touchpoint from day one — the inventory table in §1 is the dashboard's row list.

---

## 6. Safety & moderation

- **Generation-side:** all image prompts pass the locked style block *and* a safety instruction layer; text and image outputs run vendor safety settings + a moderation pass before display. The app's content standard (age-appropriate fantasy violence, no explicit content) is written once and referenced by every touchpoint's system prompt.
- **UGC-side (community library):** publish triggers automated review (text + images) → human review queue for flags; report button on every library entry; versioning means a takedown can target a version; creator strikes policy. This was already sketched in the Wizard spec §7 — it now owns the *same* moderation pipeline as generation, not a second one.
- **Prompt-injection posture:** player free-text (declared actions, backstories) is *data* inside structured prompts, never trusted as instructions; the context service wraps it in delimited fields. The DM-side human gate is the final backstop.
- **Provenance honesty:** AI-generated portraits/maps/drafts are labeled as such in metadata (quietly — a "?" away, not a watermark shout), which also future-proofs against disclosure requirements.

---

## 7. Failure doctrine (restated as a rule)

**AI down ⇒ app degraded, never broken.** Prep works blank-page (every co-pilot surface is optional by design — the philosophy again doing architecture's job); play works fully (Engine is AI-free); rulings fall back to the difficulty ladder; portraits fall back to the silhouette until regeneration succeeds. Every AI surface ships its non-AI fallback in the same PR, or it doesn't ship.

## 8. Gap-closure checklist (AI)

| Flagged gap | Closed by |
|---|---|
| No unified AI spec | this document |
| Model routing / cohesion | §1–§2 tiers + §3 digest |
| Table-time latency risk | §2.3 mitigation stack + slice measurement |
| Cost efficiency | §5 — human-gate lever, caching, quotas at seams |
| Context "reads context" duplication | §3 — one assembly service + recipes |
| Structured outputs | §4 — schemas + the one card + telemetry |
| Moderation & safety | §6 — one pipeline for gen + UGC |
| Server-side keys | implied throughout; no client ever holds a model key |

*End of AI Orchestration spec. Companion: the Build Playbook (how all ten documents become a repo Claude Code can build coherently).*
