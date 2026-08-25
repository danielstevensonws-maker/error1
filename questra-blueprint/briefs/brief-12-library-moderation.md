# Brief 12 — Community Library, Balance Check & Moderation

*Layer 3. Consumed with contracts + Briefs 01, 09a/b, 11. Parent: Character Wizard §6–§7, AI Orchestration §6. Revalidate at build time.*

**Scope:** publish pipeline, versioning/lineage, the DM-approval gate enforcement, the balance-check math, moderation queue.
**Non-goals:** the homebrew *builder* UI (wizard brief territory), ratings-algorithm sophistication (sort = plain aggregates v1).

## 1. Publish pipeline (states)
`private → submitted → in_review → published | rejected` (+ `takedown(version)` post-publish). Submit runs: contracts validation (the entity must parse — homebrew is schema-legal by construction), plain-language check on player-visible strings, automated text+image moderation (09a/b's shared pipeline) ⇒ clean ⇒ auto-publish; flagged ⇒ human review queue with reasons. Report button on every entry ⇒ re-enters review. Strikes on creators per policy (config).

## 2. Versioning & lineage
Publishing again = new immutable version; characters built on v1 keep v1 (PlaySession pinning already covers play; the character stores its content version). Fork = new entity with `lineage: {fromEntity, fromVersion}` displayed as attribution; forks re-enter the pipeline independently.

## 3. The DM-approval gate (enforcement points, exactly two)
1. **Wizard pick-time:** class/species pickers for a campaign-seated character show only SRD + `campaign_approved_content` rows; anything else renders with a "request approval" action (notifies DM).
2. **Import-time convenience:** DM importing from the library gets an "approve for my campaign" toggle in the same motion.
No third path: the Engine never checks approval (it only ever sees content already on a sheet) — approval is a *creation-time* gate, kept to two auditable code sites (import-graph lint pins them).

## 4. Balance check (the math, pinned)
Scope: **damage output**, benchmarked at levels 1, 5, 11, 17, 20 (tier breakpoints). Metric: sustained round DPR = expected damage of the class's best simple attack routine assuming 65% hit chance, primary ability 16/18/20 at tiers 1/2/3+, features that compile to damage hooks included; expected value uses the expression evaluator with dice EVs (d6=3.5 …). Baseline: the 12 SRD classes' DPR band per level (computed once from rules data, stored). Flags: > band max × 1.25 ⇒ "flagged: high damage" + one-tap tone-down suggestions (reduce die size / uses); < band min × 0.6 ⇒ soft note. Badge {verified | flagged | unchecked} surfaces in the library and the info panel. *Honest-caveat line from the Wizard spec renders with the badge verbatim* — the check is a smart assistant, the DM gate is the authority.

## 5. Acceptance criteria
1. Pipeline goldens: clean publish auto-passes; a flagged fixture routes to queue; takedown targets one version, older characters unaffected.
2. Gate: a non-approved homebrew id in a wizard submission for a seated character ⇒ 403 with the request-approval affordance; the two enforcement sites are the only importers of the gate check (lint).
3. Balance math goldens: SRD Fighter 5 DPR fixture number; a deliberately overpowered fixture class (3d12 at level 1) flags high; band computation is deterministic from rules-data version.
4. Fork lineage renders and survives export/import; attribution never strippable via edit.
5. Moderation pipeline is the same module as 09's generation moderation (import-graph: one moderation entry point).
