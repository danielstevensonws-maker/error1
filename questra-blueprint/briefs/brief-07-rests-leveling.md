# Brief 07 — Rests, Leveling & Downtime

*Layer 3. Consumed with contracts + Briefs 02–03. Parent: Rules Engine §6, §11–§12. Revalidate at build time.*

**Scope:** rest transactions, the level-up flow, milestone/XP modes, the shop transaction.
**Non-goals:** multiclass (ADR-0006), downtime *scene authoring* (planner owns it), crafting (backlog).

## 1. Rest transactions
A rest = DM-confirmed intent → review card ("will regain: …", computed per creature) → commit emits one `rest_completed` + itemized `resource_changed`/`healing_applied` cascade under one causeId (undoable as a group).
- **Short (1h):** interactive Hit-Dice spending — player-side compose-and-roll card per die (`1d{hitDie} + con_mod`, min 1), continue-or-stop after each; then `per-short-rest` recharges + `partialRecharge` pools (Second Wind +1).
- **Long (8h):** requires ≥1 HP; all HP; **all** Hit Dice; exhaustion −1; all slots; `per-long-rest` recharges; HP-max/ability restorations; sets `lastLongRestAt` (16 h lockout, plain-language reject).
- **Interruption:** DM marks interruption cause (initiative auto-marks); if elapsed ≥ 1 h ⇒ commit as `interrupted_partial` applying short-rest benefits, else nothing.

## 2. Advancement
- **Milestone (default):** DM action "Level up the party" ⇒ per-character `character_level_up` offers.
- **XP (toggle):** engine tallies defeated-monster XP (meta.xp) split evenly + DM manual awards; crossing SRD thresholds (table in rules data, levels 1–20) flags the offer. Mode is a campaign setting; switching mid-campaign keeps current levels and just changes the trigger.

## 3. The level-up flow (wizard re-entered for one level)
Steps generated from `class.meta.levels[toLevel]` (+ caster progression):
1. **HP:** roll-or-average choice (average = `ceil(die/2)+1`), + CON mod; recorded per level for the derivation.
2. **Features:** each new feature id renders in the info panel; plain accept (no choice) or choose (subclass at subclassLevel; ASI-or-feat at asiLevels — ASI = +2/+1 split or a feat entity).
3. **Spells:** casters — new known/prepared count + new slot row from the caster tables; picker filtered by classLists.
4. **Diff reveal:** before/after ComputedSheet diff card ("+9 HP, Extra Attack, second_wind.max 3"); confirm ⇒ `character_level_up{choices}` and the sheet recomputes via Brief 03 (never hand-patched).
Homebrew classes flow identically off their builder-enforced level tables. `setResources` rows apply automatically (the Fighter fixture's level-4 Second Wind bump is the golden case).

## 4. Shop (downtime)
Shop card = DM-curated list (co-pilot draftable from location, 09b) of item ids + SRD prices. Buy/sell = one atomic transaction event: coins delta + inventory delta, validated (funds, availability); sell default half price, DM-overridable per line. Campaign Rewards grant items through the same inventory event path.

## 5. Acceptance criteria
1. Long-rest golden (Brief 02 list): all HP, all Hit Dice, exhaustion 3→2, slots full; 16 h lockout rejects with plain string; 90-min interruption ⇒ short-rest benefits.
2. Short-rest interactive: d10+2 sequence with stop-after-two matches fixture; Second Wind 0/2 → 1/2.
3. Fighter 4→5 golden: choices {asi: str+1,con+1 at 4 already spent} — level 5 grants Extra Attack (engine_native) + Tactical Shift; prof 2→3 ripples through every Derived (diff fixture byte-matched).
4. XP: 4-member party defeats CR 1/4 (50 XP) ⇒ +12 each (round down); threshold crossing at 300 flags level 2.
5. Shop atomicity: insufficient funds ⇒ zero deltas; success ⇒ coins and inventory change in one causal group; undo reverses both.
