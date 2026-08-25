# Brief 04 — Conditions, Durations & Dying (Engine)

*Layer 3. Consumed with contracts + Briefs 01–02. Parent: Rules Engine §3–§5. Revalidate at build time.*

> **⚠️ ADR-0013 revalidation note — M3.1 (2026-07-19).** Much of this brief already landed in earlier milestones; M3.1 completes the rest. Status:
> - **§1 fifteen encodings** — all 15 conditions are already ingested + verified (M1.1/M1.2, `data/conditions.ts`). The two small **contract PRs §1 mandates are the genuine new work** (user-authorized): add `restrict_target` to the `action_restriction` hook (Charmed's "can't target the charmer") and allow `resistance: 'all'` (Petrified). Done first, with the Charmed/Petrified encodings + tests updated to use them (Charmed/Petrified move from `resolution:'novel'` toward `routine`).
> - **Duration schema** — `DurationSchema` (save_ends / while_concentrating / rounds / end_of_next_turn / start_of_turn / until_removed) already exists in contracts (M2.1). §2's **state machine** (the fold-time expiry logic: save_ends auto-prompt, while_concentrating cascade, stacking rule) is new engine work.
> - **§3 dying** — the death-save + 0-HP-branch **helpers** already exist (`sim/cascade.ts`, M2.1: `deathSave`, `deathOutcome`, the result enum). The **dying state machine** that orchestrates the full ladder (0 HP → death-save card → stabilize → damage → died) is new engine work.
> - No Torvald-fixture changes; new golden fixtures for Hold Person + the dying ladder are authored here. Engine stays pure/AI-free (ADR-0005).

**Scope:** the full 15-condition dataset, the duration/expiry state machine, the dying state machine.
**Non-goals:** dying UI (Brief 10), condition *sources* like spells (their own entities apply conditions via hooks — already expressible).

## 1. The fifteen encodings
`condition.prone` fixture is the pattern; produce the other fourteen the same way. Encoding notes per condition (hooks abbreviated; full SRD text verbatim in each entity):
- **blinded**: auto-fail `ability_check{sense:sight}`; adv against_self; dis by self (attacks).
- **charmed**: cannot target charmer with attacks/harmful (action_restriction variant `restrict_target: source`) — add `restrict_target` field to action_restriction hook (contract PR); charmer adv on social checks vs you.
- **deafened**: auto-fail `ability_check{sense:hearing}`.
- **exhaustion**: `cumulative: true`; modifier `-2 * exhaustion_level` on any_d20_test; speed reduce `5 * exhaustion_level`; trigger level=6 → death.
- **frightened**: dis on checks+attacks with `condition: source_visible`; movement restriction: cannot end closer to source (validator rule, not hook — engine_native).
- **grappled**: speed set 0; dis attacks with condition target≠grappler; movable-by-grappler (engine_native movement rule).
- **incapacitated**: action_restriction [action, bonus_action, reaction, speech]; concentration ends (trigger); initiative dis if applied when rolling.
- **invisible**: adv by self, dis against_self, both with `attacker_can_see_you` carve-out; hide/surprise tags.
- **paralyzed**: includes incapacitated; speed 0; auto_fail_save {str,dex}; adv against_self; auto_crit_against {melee_5ft}.
- **petrified**: includes incapacitated; resistance all damage (expand `resistance.to` to allow 'all'); immunity poison; weight×10 (meta).
- **poisoned**: dis attacks + ability checks.
- **prone**: (fixture, done).
- **restrained**: speed 0; adv against_self; dis by self; dis dex saves.
- **stunned**: includes incapacitated; speed 0; auto_fail_save {str,dex}; adv against_self.
- **unconscious**: includes incapacitated + prone-behavior; speed 0; drops items (event); auto_fail {str,dex}; adv against_self; auto_crit melee_5ft; unaware.
Two small contract PRs fall out (restrict_target; resistance:'all') — do them first, with fixtures.

## 2. Duration state machine
Per applied condition instance: `{conditionId, duration, appliedAtSeq}`. Transitions, all emitting `condition_removed{reason}`:
- `end_of_next_turn(of)` / `start_of_turn(of)` → expire when `turn_advanced` matches (track "next" = first matching turn strictly after application).
- `save_ends` → on the repeat point, Engine auto-prompts the save through the d20 pipeline; success → removed{reason:'save'}; failure → persists (log the roll either way).
- `while_concentrating` → subscribe to caster's `concentration_ended` → cascade removal on **all** linked instances, one causal group.
- `until_removed` → only action ("stand" for prone), Override, or effect removes.
- `rounds(n)` → decrement on the applier's turn start; 0 → expired.
Stacking rule: same condition twice = one instance, keep the **longer** duration (exhaustion is the sole cumulative exception).

## 3. Dying state machine (characters)
States: `up → unconscious_dying → stable → up | dead`. Transitions:
- hp→0 (not massive) ⇒ `creature_unconscious` + apply unconscious; death-save counters 0/0.
- turn start while dying ⇒ player-side death-save card (Brief 10); `death_save_rolled` per contracts result enum (10+ success; 1 ⇒ double_failure; 20 ⇒ revive_1hp + `healing_applied 1`).
- damage while at 0 ⇒ auto failure (crit ⇒ two); damage ≥ hpMax ⇒ `creature_died{cause:'massive_damage'}`.
- 3 successes ⇒ `creature_stabilized` (counters cleared; still unconscious at 0); stable + damage ⇒ back to dying; stable 1d4 hours unhealed ⇒ heal 1.
- Help action on dying target ⇒ DC 10 WIS(Medicine) via pipeline ⇒ stabilized.
- Knock-out branch: melee reduce-to-0 confirmation offers 1 HP + unconscious(short-rest duration).
Monsters: hp→0 ⇒ `creature_died` unless DM per-monster "treat as character" flag.

## 4. Acceptance criteria
1. Fourteen new condition fixtures validate; the 15-row rules-lawyer sign-off checklist ships in the PR.
2. Hold Person end-to-end golden test: paralyzed applied (save_ends WIS) → melee crit within 5 ft → target saves at turn end → removed{reason:'save'}.
3. Incapacitated cascade golden test (Brief 02 acceptance #3) passes through this machine.
4. Full dying ladder golden test: 0 HP → fail, double-fail (nat 1) → Help stabilize → damage → dying again → nat 20 → up with 1 HP; event sequence byte-matched.
5. Same-condition reapplication keeps longer duration; exhaustion stacks to 6 ⇒ died.
