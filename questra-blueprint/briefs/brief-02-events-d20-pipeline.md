# Brief 02 — Event Vocabulary & the d20 Pipeline

*Layer 3 implementation brief. Consumed with: `@questra/contracts` + Brief 01 (the hook vocabulary it evaluates). Parent specs: Rules Engine §2–§3, Architecture §4–§5 — this brief is the buildable version; sessions read this, not those.*

> **⚠️ ADR-0013 revalidation note — M2.1 (2026-07-19).** Checked against current `@questra/contracts`. **Ingest to the contracts + the `torvald-trace.json` fixture, which are the authority.** No contract changes for M2.1. Drift/clarifications:
> 1. **`roll_made.sources`.** The brief §2 types it `RollSourceTag[]`; the contract is `z.array(z.string())` and the fixture uses plain ids (`["condition.prone"]`). Emit strings.
> 2. **Loose payload types.** `PromptContext`, `RestSummary`, `LevelUpChoices`, `RulingContext` referenced in §1–§2 are loose in contracts (`z.record`/`z.unknown`) — deliberate, tightened per their own briefs. M2.1 only emits the trace's events (`intent_declared`, `roll_made`, `damage_applied`, `narration`, `undo_applied`, `whisper_sent`); it does not need those shapes.
> 3. **Projection state is engine-internal, NOT a contract.** Contracts own the *event vocabulary* (the wire); the folded game state (`ProjectionState`/`Combatant`) is derived and lives in `packages/engine` (ADR-0001 event-sourcing; Rules-Engine spec confirms greying reads the same *flags*, via the same pure functions, not a shared state type). If client-side greying later needs the shape shared, that is a deliberate contract PR then.
> 4. **No Torvald sheet fixture exists.** `torvald-trace.json` is the expected *event output* only; Torvald's stats live in its prose (STR 16, prof +2, longsword 1d8+3, Prone, Bless). The M2.1 golden test constructs his combatant state from those stated values (structured sheet computation is Brief 03 / M2.2). The Goblin's stats come from `goblin-warrior.json`.
> 5. **Determinism via injected RNG.** The pipeline's dice use the contracts `evaluateExpr` RNG seam (`rng(sides) → int`); the golden test injects a scripted RNG that returns the fixture's exact rolls (Bless d4=3, d20 14/9, damage d8=6), so `roll_made`/`damage_applied` reproduce byte-for-byte. The Engine never calls an AI model (ADR-0005).

**Scope:** the exact event types, the resolution algorithm step by step, one fully worked trace, acceptance criteria.
**Non-goals:** transport/websockets (Brief 05), UI rendering of events, the Assistant's Ruling Suggestions (Brief 10 — this brief only defines the `escalated_to_ruling` event that hands off to it).

---

## 1. Event envelope

```ts
// @questra/contracts — play/events.ts
export interface PlayEvent<T extends EventBody = EventBody> {
  seq: number;                 // per-PlaySession, monotonic, server-assigned
  id: string;                  // uuid
  causeId?: string;            // causal parent → undo groups (see §4)
  at: string;                  // ISO timestamp, server clock
  actor: ActorRef;             // { kind: 'player'|'dm'|'engine', accountId?, creatureId? }
  visibility: 'public' | 'dm_only' | { whisperTo: string };
  body: T;                     // discriminated union below
}
```
Server assigns `seq`; the permission filter operates on `visibility` **before** fan-out (a player client never receives a `dm_only` event — not received-and-hidden, *not received*). Intents from clients carry a client `idempotencyKey`; replaying an intent must not re-emit events.

## 2. The event union (v1 complete list)

```ts
export type EventBody =
  // declaration & resolution
  | { t: 'intent_declared'; creatureId: ID; intent: Intent }            // Intent = attack | cast | move | use_feature | free_text
  | { t: 'roll_made'; rollId: ID; kind: RollKind; d20: number; secondD20?: number;
      collapsed: 'advantage'|'disadvantage'|'straight'; sources: RollSourceTag[];
      modifiers: NamedModifier[]; total: number; vs?: { type: 'ac'|'dc'; value: number };
      outcome: 'hit'|'miss'|'success'|'failure'|'crit'|'fumble'; entry: 'server'|'manual' }
  | { t: 'damage_applied'; creatureId: ID; amount: number; type: DamageType;
      breakdown: NamedModifier[]; adjusted: { resistance?: true; vulnerability?: true; immunity?: true };
      tempHpAbsorbed?: number; resultingHp: number }
  | { t: 'healing_applied'; creatureId: ID; amount: number; resultingHp: number }
  // state
  | { t: 'condition_applied'; creatureId: ID; conditionId: ID; duration: Duration; sourceRef?: ID }
  | { t: 'condition_removed'; creatureId: ID; conditionId: ID; reason: 'expired'|'save'|'action'|'cascade'|'override' }
  | { t: 'exhaustion_changed'; creatureId: ID; level: number }
  | { t: 'resource_changed'; creatureId: ID; pool: string; delta: number; remaining: number }
  | { t: 'concentration_started'|'concentration_ended'; creatureId: ID; spellId: ID; reason?: 'damage_save_failed'|'incapacitated'|'new_concentration'|'voluntary' }
  | { t: 'token_moved'; tokenId: ID; from: Cell; to: Cell; path: Cell[]; forced: boolean; costFt: number }
  // turn structure
  | { t: 'initiative_rolled'; order: { creatureId: ID; total: number }[] }
  | { t: 'turn_advanced'; round: number; activeCreatureId: ID }        // resets that creature's reaction + action economy
  | { t: 'reaction_prompted'; promptId: ID; creatureId: ID; kind: 'opportunity_attack'|'feature'|'legendary'|'lair'; context: PromptContext }
  | { t: 'reaction_taken'|'reaction_declined'; promptId: ID }
  // dying
  | { t: 'death_save_rolled'; creatureId: ID; d20: number; successes: number; failures: number;
      result: 'success'|'failure'|'double_failure'|'revive_1hp'|'stable'|'dead' }
  | { t: 'creature_died'|'creature_stabilized'|'creature_unconscious'; creatureId: ID; cause?: string }
  // rests & advancement
  | { t: 'rest_completed'; creatureIds: ID[]; kind: 'short'|'long'|'interrupted_partial'; applied: RestSummary }
  | { t: 'character_level_up'; characterId: ID; toLevel: number; choices: LevelUpChoices }
  // DM layer
  | { t: 'override_set'; path: string; value: unknown }               // dm_only
  | { t: 'undo_applied'; undoneCauseId: ID; reversedSeqs: number[] }
  | { t: 'whisper_sent'; text: string }                                // visibility: whisperTo
  | { t: 'escalated_to_ruling'; intentSeq: number; context: RulingContext }   // handoff to Assistant
  | { t: 'ruling_decided'; decision: 'ask_roll'|'changed'|'no_roll'; applied?: { kind: RollKind; dc: number } }
  // scene & narration
  | { t: 'scene_changed'; sceneId: ID }
  | { t: 'narration'; text: string; from: 'engine'|'dm'; spoken?: boolean };
```
Rule: **this union grows only by contract PR.** A feature that needs a new event proposes it; nothing emits ad-hoc shapes.

## 3. The d20 pipeline (exact algorithm)

Input: a validated `Intent` (or an Engine-internal trigger like a prompted save). Steps — implement as pure functions over `(rulesData, projectionState, intent)`; the same code runs server-side for truth and client-side read-only for contextual greying:

1. **Legality check** → reject with reason string (the greying text) if: not your turn (unless reaction), action-economy slot spent, resource missing, target invalid, `action_restriction` hook active.
2. **Classify** — does the intent compile to hooks + a known RollKind? Yes → routine, continue. No → emit `escalated_to_ruling`, stop.
3. **Collect hooks** from: roller's active conditions (expanded through `includes_condition`), features/active spells, exhaustion, target's conditions, environment tags on cells (light, difficult terrain), declared situational tags (cover degree, Help, hidden). Each collected hook keeps a `NamedModifier`/`RollSourceTag` label — the derivation *is* this list.
4. **Collapse advantage:** `adv = anyAdvSources && !anyDisSources; dis = anyDisSources && !anyAdvSources;` counts never matter. Record `collapsed` + all `sources` (the goblin's rider and the log both need them).
5. **Sum modifiers:** ability mod + proficiency (if proficient) + flat hooks + dice hooks (roll them now, itemized) + formula hooks evaluated (exhaustion: `-2 * level`). Cover applies to the **target's** AC/DEX-save side, not the roll.
6. **Roll:** server CSPRNG d20 (two if collapsed ≠ straight, keep high/low), or accept `manual_entry` raw die in physical-dice mode. Apply nat-1/nat-20 and `auto_state` overrides (auto-fail, auto-crit-in-5ft).
7. **Compare & emit:** `roll_made`, then cascade — `damage_applied` (order per SRD: flat adjustments → resistance → vulnerability; no-stacking on resistances), riders (`when: attack_had_advantage` reads step 4's record), condition applications, concentration trigger (damage → CON save DC `max(10, floor(damage/2))`, itself re-entering this pipeline at step 3), death processing (0 HP → Brief 01's monster-dies / character-unconscious branch, massive-damage check `remainder >= hpMax`).
8. **Narrate:** one `narration` event in plain English from a template per outcome, derivation attached for the "?".

## 4. Undo semantics

Every cascade event carries `causeId` = the `intent_declared` (or trigger) seq that started it. **Undo targets a cause, not an event:** collect all events with that causal ancestor, emit compensating reversals in reverse order inside one `undo_applied`, fan out through the same visibility filter. Undo never rewrites the log (append-only); projections fold reversals like any event. Property that must hold: `fold(log) === fold(log + cause + undo(cause))`.

## 5. Worked trace (the canonical fixture)

Setup: Torvald (Fighter 1, STR 16, prof +2, longsword 1d8+3, **Prone**, **Bless** active) attacks the Goblin Warrior (AC 15) **behind half cover**, from 5 ft.

1. Legality: his turn, action free → pass.
2. Routine (attack roll) → continue.
3. Hooks: Prone→`disadvantage(attack_roll by self)`; Bless→`modifier(+1d4 attack)`; cover(half)→target-side `+2 AC`.
4. Collapse: dis only → `collapsed: 'disadvantage'`, sources `[prone]`.
5. Modifiers: +3 STR, +2 prof, +1d4 Bless (rolls 3) → +8 itemized.
6. Rolls 14 and 9, keep 9 → total 17 vs AC 15+2 = 17 → **hit** (ties hit).
7. Emits: `roll_made {d20:9, secondD20:14, collapsed:'disadvantage', total:17, vs:{ac:17}, outcome:'hit'}` → damage 1d8+3 (rolls 6) → `damage_applied {amount:9, resultingHp:1}` → goblin not bloodied? 1/10 HP → bloodied tag true in projection. Goblin's own advantage-rider is irrelevant here (it keys off the *goblin's* attacks).
8. Narration: *"Torvald, fighting from the ground, still lands it — 9 slashing. The goblin is barely standing."*

DM taps Undo → all four events reverse as one group; goblin back to 10 HP; Bless still ticking (it wasn't in the cascade).

## 6. Acceptance criteria (→ golden tests, verbatim)

1. adv+adv+dis ⇒ `straight`; the trace above ⇒ exactly the events listed, byte-comparable fixture.
2. Half + three-quarters cover declared ⇒ +5 only.
3. 22 damage to a concentrating caster ⇒ nested CON save DC 11 event chain; Incapacitated ⇒ `concentration_ended{reason:'incapacitated'}` + cascade `condition_removed{reason:'cascade'}` on all linked targets.
4. Damage 18 vs 6/12 HP ⇒ `creature_died{cause:'massive_damage'}`; nat-1 death save ⇒ `result:'double_failure'`; nat-20 ⇒ `revive_1hp` + `healing_applied`.
5. `forced:true` movement out of reach ⇒ no `reaction_prompted`; Disengage flag ⇒ none; normal walk-out ⇒ prompt for each eligible hostile with reaction available.
6. Replay determinism: `fold(events)` equals live projection after every test; undo property in §4 holds.
7. A `dm_only` event never appears in a player channel capture (test at the filter, with a wire-level assertion).
8. Idempotency: same intent key twice ⇒ one cascade.
