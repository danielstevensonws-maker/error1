# Questra — Rules Engine & Rules Data Spec

*The seventh spec. Closes every rules-coverage gap flagged in the audit, and designs the layer all of them share: the machine-readable encoding of SRD 5.2.1. Extends Part 0 of the In-Play spec — everything here is Engine territory ("decides facts"), with escalation points to the Assistant marked explicitly. All rules text verified against the SRD 5.2.1 PDF, not memory. Where 2024 changed a rule from 2014, the 2024 version is authoritative (e.g. a Long Rest restores* all *spent Hit Point Dice, not half).*

---

## 1. The rules data layer (the foundation everything reads)

### 1.1 What it is
A single canonical, machine-readable encoding of SRD 5.2.1: classes (with full level tables), subclasses, species, backgrounds, feats, spells, monsters, magic items, equipment, and conditions. Every rules-aware feature — the Engine, the wizard's auto-calculated sheet, encounter balancing, token stat blocks, the compendium, the "?" info-layer — is a *reader* of this one dataset. Nothing hard-codes a rule outside it.

### 1.2 The core design decision — effects as data, not code
The naive build encodes each rule as an if-statement ("if prone then disadvantage"). That path dies at scale — conditions, features, spells, and homebrew all modify the same rolls, and hand-written interactions combinatorially explode. Instead, **every mechanical effect is declarative data** in a small shared vocabulary of effect hooks:

- `modifier` — add/subtract from a roll, AC, DC, speed, or HP (flat or dice; e.g. Bless = `+1d4 to attack rolls and saves`).
- `advantage_source` / `disadvantage_source` — on a scoped roll type (e.g. Prone attacker = disadvantage on attack rolls; Restrained target = incoming attacks gain advantage).
- `speed` — set, reduce, or zero speed (Grappled = speed 0).
- `action_restriction` — can't take actions / reactions / move (Incapacitated, Stunned).
- `auto_state` — auto-fail or auto-crit conditions (Paralyzed: melee hits within 5 ft are crits; auto-fail STR/DEX saves).
- `trigger` — "when X happens, do Y" (concentration: on damage → prompt CON save; Exhaustion 6 → death).
- `resource` — spend/restore a tracked pool (slots, Hit Dice, per-rest feature uses, legendary actions).

The Engine's resolution pipeline (§2) never knows what "Prone" *is* — it collects active effect hooks and applies them. This is what makes **homebrew renderable by the same machinery**: a homebrew feature either compiles to these hooks (→ routine, Engine-resolvable) or it doesn't (→ novel, escalates as a Ruling Suggestion — the rule the In-Play spec already locked). The hook vocabulary is the *formal definition* of the routine/novel boundary.

### 1.3 Schema shape (per content entity)
Every entity carries three parallel representations, which map one-to-one onto the "?" info-layer's three layers — the schema *is* the info panel's data source:
1. **`plain`** — one-sentence plain-language summary (info-layer 1).
2. **`derivation`** — structured provenance for computed values (info-layer 2: "15 = 11 base + 2 Dex + 2 shield").
3. **`srd_text`** — the full SRD rules text (info-layer 3).
Plus **`effects[]`** — the machine hooks from §1.2 (what the Engine reads), and **`meta`** (level, school, CR, rarity, tags for search/filter).

### 1.4 Sourcing & licensing *(locked)*
- Source of truth is the SRD 5.2.1 document, released under **CC-BY-4.0**. This is genuinely permissive — but attribution is mandatory. The app **must display the SRD's required attribution statement** (the license text block from the document's front matter) on an accessible credits/legal screen. Ship this from day one; it's a checkbox now and a legal problem later.
- Only SRD content ships. No Product Identity terms (no beholders, no named settings) — the SRD's species/class/monster roster is the roster (which the existing specs already conform to: the wizard's 9 species and 12 classes are exactly the SRD's).
- Ingestion is a one-time structured-data project (PDF → schema), then hand-QA'd. Budget it as its own build milestone; it is the largest single content task in the app and the first dependency of everything else.

### 1.5 Homebrew lives in the same schema
A homebrew class from the wizard's builder is a row in the same tables, flagged `source: homebrew`, with the same `plain/derivation/srd_text/effects` shape (the builder's scaffold guarantees the level table and chassis fields are populated). This is what makes "homebrew renders identically" (Character Wizard §4) true at the data level, not just the UI level.

---

## 2. The d20 pipeline & advantage/disadvantage aggregation

Every d20 Test (attack roll, ability check, saving throw) resolves through one pipeline:

1. **Assemble context** — roller, target, roll type, relevant ability/skill/proficiency.
2. **Collect effect hooks** — from the roller's conditions/features/active spells, the target's conditions, environment tags (cover, obscurement), and situational sources (Help, flanking if enabled).
3. **Collapse advantage/disadvantage** *(the rule that must never be wrong)*: count is irrelevant — **any** advantage sources + **any** disadvantage sources cancel to a straight roll; only-advantage = roll twice take high; only-disadvantage = roll twice take low. Three advantages and one disadvantage = straight roll. The Engine stores *which* sources applied (for the log and the "?" derivation), but collapses to a single tri-state flag.
4. **Sum flat modifiers** — ability mod + proficiency + effect modifiers (Bless dice, Exhaustion's −2 × level, cover's +2/+5 to the *target's* AC and DEX saves).
5. **Roll** (server-side, §Dice Trust in the Architecture spec), **compare** vs AC/DC, apply `auto_state` overrides (nat 1 / nat 20; Paralyzed auto-crit within 5 ft), **emit outcome events** (damage applied, condition applied, concentration check triggered).
6. **Narrate** — the Engine log line, in plain English, with the derivation stored behind a "?" tap.

**Roll handoff preserved:** for player-side rolls the player still composes and rolls on their screen (In-Play Part 0); the pipeline is the same — steps 1–4 pre-compute what their dice card shows, step 5's roll happens on their tap, steps 5–6 apply on the Engine. Monster rolls run the whole pipeline Engine-side.

---

## 3. Conditions — the full fifteen

All SRD conditions encode as effect-hook bundles (§1.2). The Engine applies/removes them via events; both views render them from the same state (In-Play sync contract). Summary of the encoding (full hook data lives in the rules dataset):

| Condition | Key hooks (abbreviated) |
|---|---|
| Blinded | auto-fail sight checks; incoming attacks advantage; own attacks disadvantage |
| Charmed | can't attack the charmer; charmer has advantage on social checks |
| Deafened | auto-fail hearing checks |
| Exhaustion | *cumulative — see §4* |
| Frightened | disadvantage on checks/attacks while source visible; can't willingly approach source |
| Grappled | speed 0; disadvantage on attacks vs non-grappler; movable by grappler |
| Incapacitated | no actions/bonus/reactions; concentration broken; no speaking; initiative disadvantage if incapacitated when rolling it |
| Invisible | unseen (surprise/hiding hooks); incoming attacks disadvantage; own attacks advantage (unless the attacker can see you) |
| Paralyzed | incapacitated + speed 0; auto-fail STR/DEX saves; incoming attacks advantage; hits within 5 ft are crits |
| Petrified | incapacitated; resistance to all damage; immune poison; weight ×10 |
| Poisoned | disadvantage on attacks and ability checks |
| Prone | own attacks disadvantage; incoming melee within 5 ft advantage, incoming ranged disadvantage; crawl at half cost; stand = half speed |
| Restrained | speed 0; incoming attacks advantage; own attacks disadvantage; DEX saves disadvantage |
| Stunned | incapacitated + speed 0; auto-fail STR/DEX saves; incoming attacks advantage |
| Unconscious | incapacitated + prone + speed 0; drops held items; auto-fail STR/DEX saves; incoming attacks advantage; hits within 5 ft are crits; unaware of surroundings |

**Composition, not special-casing:** Paralyzed literally *includes* Incapacitated's hooks; Unconscious includes Incapacitated + Prone behavior. The dataset expresses this as condition-includes-condition, so fixing Incapacitated once fixes everything built on it.

**Duration model:** conditions carry an expiry — end of next turn / start of turn / save-ends (repeat the save, Engine auto-prompts) / until removed / while-concentrating (linked to the caster's concentration object, so a broken concentration cascades removals). This is the piece "conditions are tracked" was silently missing.

---

## 4. Exhaustion (2024 model)

A cumulative condition with its own arithmetic, per SRD: each level applies **−2 × level to every D20 Test** and **−5 ft × level to Speed**; **death at level 6**; **a Long Rest removes 1 level**. Engine treatment:
- Stored as an integer 0–6 on the creature, feeding a single `modifier` hook into the d20 pipeline (so it composes with everything else automatically).
- Sources emit `gain_exhaustion` events (dehydration, malnutrition, spells, homebrew); the DM can add/remove manually via Override.
- At 6, the Engine fires the death event — surfaced to the DM, never silently.
- Both views badge it as "Exhaustion 3 (−6 to d20 rolls, −15 ft speed)" — the derivation is the display.

---

## 5. Death, dying, and 0 HP

The most emotionally loaded rules in the game, and (deliberately) the one place the Engine slows down instead of speeding up.

- **Monsters at 0 HP die instantly** (SRD default) — Engine narrates it and clears the token to a corpse marker. DM Override can keep one alive ("treat it like a character").
- **Knock-out option:** when a melee attack would drop a creature to 0, the attacker's confirmation card offers "Knock out instead?" → 1 HP + Unconscious (ends on a Short Rest, healing, or DC 10 WIS (Medicine) first aid). This is a routine rule, so it's an Engine toggle, not a Ruling.
- **Characters at 0 HP:** Unconscious + Prone applied; the player's hub flips to a **dying state** — hotbar replaced by a single Death Saving Throw card with three-pip success/failure trackers. **The player rolls their own death saves** (compose-and-roll philosophy: this roll carries the most drama in the game and is never automated away). DC 10 flat; nat 1 = two failures; nat 20 = regain 1 HP and pop back up; three successes = Stable; three failures = dead. Counters reset on regaining HP or stabilizing.
- **Damage while at 0:** one automatic death-save failure (two if a crit); if a single hit's damage ≥ HP max → **instant death** (massive damage — also applies from full health: remainder past 0 ≥ max = dead). Engine computes this; it must never be a surprise the app got wrong.
- **Stabilizing:** the Help action targeting a dying creature = DC 10 WIS (Medicine) check (routine, Engine-resolved). Stable = no more saves, still Unconscious at 0 HP; regains 1 HP after 1d4 hours if unhealed; damage breaks Stable.
- **Secrecy option:** a DM toggle to make death-save results DM-visible-only (a common table style) — implemented via the existing Secret Roll machinery.
- **Character demise:** on death, the sheet flips to a memorial state; the Campaign party roster logs it (Campaign §5.7 already reserved this); revival spells restore via normal healing events.

---

## 6. Rests

Rests are **Engine transactions** — one confirmed action that applies a bundle of resource events, with a review card ("here's what you'll regain") before commit.

- **Short Rest (1 hour):** spend Hit Point Dice one at a time (roll die + CON mod each, min 1 HP, player chooses to continue after each roll — this is a player-side compose-and-roll card); recharge all `per-short-rest` features (read from the rules data). Requires ≥1 HP to start.
- **Long Rest (8 hours):** regain **all** HP and **all** spent Hit Point Dice (2024 rule); HP-max reductions and ability-score reductions restored; **Exhaustion −1**; recharge `per-long-rest` features and all spell slots; 16-hour wait before the next one. Interruptions per SRD (initiative, a leveled spell cast, any damage, 1+ hour of exertion); if ≥1 hour was rested before the interruption, the Engine grants Short Rest benefits instead of nothing.
- **Where it lives:** a Rest button on the player hub *and* as the resolution action of a **Downtime scene** — the Session Planner's Downtime type gains "offer a rest" as its default scene action, closing the seam between prep container and rules resolution. The DM confirms rests (they own the fiction of whether the night is safe); the confirmation is a whisper-style prompt, not a player self-serve.

---

## 7. Reactions & Opportunity Attacks

Reaction economy is real state: one reaction per round per creature, reset at the start of its turn (the In-Play action bar's Reaction row already displays this; this section defines what refills it).

- **OA detection:** when a token the Engine can attribute movement to *leaves the reach* of a hostile creature that can see it, and that creature has its reaction available, the Engine **prompts the reaction holder** — player-side card ("Goblin is fleeing — take your Opportunity Attack?") or DM-side for monsters (with a per-monster "auto-take OAs" toggle so the DM isn't tapping constantly). Prompt, don't auto-swing: taking an OA is a choice in the rules, and choices belong to humans.
- **Exemptions the Engine knows:** Disengage (an action card that sets a no-OA flag for the turn), teleportation, and forced movement (movement events carry a `forced` flag; the shove/thunderwave path sets it).
- **Other reactions** (Shield, readied actions, opportunity-adjacent features): same prompt machinery, triggered by their `trigger` hooks. A Readied action is authored as a trigger at ready-time ("when the door opens → I shoot") and the Engine prompts when the DM marks the trigger met — the trigger *matching* is a human call (novel territory), the resolution is routine.

---

## 8. Movement, cover, and areas of effect

- **Movement:** speed budget per turn, tracked as the token drags (path cost shown live); difficult terrain tiles cost double (a terrain tag on map cells/assets — the asset metadata from Session Planner §6.2 gains a `difficult_terrain` flag); standing from prone costs half speed.
- **Cover** *(v1 decision: assisted-manual)*: the SRD grades are Half (+2 AC & DEX saves), Three-Quarters (+5), Total (untargetable) — only the best degree applies, never summed. V1 does **not** compute cover from geometry: when an attack is composed, the target's card offers a one-tap cover selector (none / half / ¾ / total), remembered per attacker-target pair per turn, and blocking-flagged assets on the line between tokens make the Engine *suggest* a degree the human confirms. Full geometric auto-cover is a v2 upgrade behind the same interface. (Same philosophy as manual triggers: the DM is the engine until automation earns its keep.)
- **AoE templates:** the caster's spell card places a shaped overlay — Sphere, Cube, Cone, Line, Emanation, Cylinder, with size read from the spell's data — snapped to the grid; the Engine lists affected tokens, batch-rolls their saves through the d20 pipeline, applies half-damage-on-save where the spell says so, and writes one consolidated log line ("Fireball: 4 goblins save DC 14 DEX — 2 fail — 28/14 fire"). This is the single biggest quality-of-life win for casters and pure routine resolution.

---

## 9. Vision, light, and fog of war *(the scoping decision)*

The honest call: wall-aware per-token line-of-sight is the deepest engineering pit in VTT-dom, and the app's philosophy ("the DM is the engine; automate when it earns it") licenses deferring it.

- **V1 — DM-revealed fog:** maps start covered; the DM reveals regions (brush + room-shaped quick-reveal from the base terrain's room metadata); revealed areas persist per-map. Player view renders only revealed regions; token visibility follows region visibility plus a per-token hidden flag (the "staged boss" from Session Planner §6.3 uses this same flag).
- **V1 — light as area tags:** rooms/areas carry a light level (bright / dim / dark). Dim = Lightly Obscured (disadvantage on sight-based Perception checks); darkness = Heavily Obscured (effectively Blinded for creatures without darkvision looking in). These feed the d20 pipeline as environment hooks; species darkvision (from the rules data) negates them at the creature level. Contextual greying's "they've already seen you" reads the same flags.
- **V2 — computed LOS:** wall-aware sightlines, token-carried light sources, auto-fog. Same interface (a visibility flag per token per viewer), richer computation behind it — so v1 UI doesn't get rebuilt.

---

## 10. Passive scores, legendary bosses

- **Passive Perception** (10 + Perception modifier, ±5 for adv/dis) computed on every sheet and **surfaced on the DM's combatant list** — it's the number the DM checks constantly against stealth and hidden things. Passive Investigation/Insight available on tap.
- **Legendary Actions:** boss stat blocks carry a legendary action pool (typically 3/round, refreshing at the start of the boss's turn, usable at the end of other creatures' turns). The Engine tracks the pool and, at each end-of-turn, surfaces a quiet DM prompt listing the affordable legendary options — the DM taps one or dismisses. **Legendary Resistance** ("choose to succeed on a failed save," X/day) appears as a DM-only interrupt card whenever the boss fails a save, with uses tracked.
- **Lair Actions:** where present, an initiative-20 pseudo-combatant in the turn order that prompts the DM with the lair's options. (Same prompt pattern three times — build it once.)

---

## 11. Leveling up *(the biggest gap, closed)*

### 11.1 Advancement model
**Milestone is the default; XP is a toggle.** Milestone: the DM taps **"Level up the party"** in the campaign/session view (typically at session end — the co-pilot may suggest it after arc-significant sessions, suggest-never-commit). XP mode: the Engine tallies XP from defeated monsters (CR→XP from the rules data) plus DM manual awards, and flags threshold crossings. Either way, the *result* is the same event: `character_level_up`.

### 11.2 The level-up flow — the wizard, re-entered for one level
No new tool. A level-up notification on the player's hub opens a **short guided flow built from the same step components as the Character Wizard**, scoped to exactly what this level grants (read from the class's level table in the rules data):
1. **HP increase** — roll the hit die or take the fixed average (player choice, table-style toggle), + CON mod.
2. **New features** — presented as info-panel cards (read → understand → accept in one motion, same component).
3. **Choices where the level has them** — subclass at 3, ASI-or-feat at 4/8/12/16/19, new spells/preparation changes, per the class table.
4. **Sheet recompute** — proficiency bonus, slots, save DCs, feature uses all re-derive; a before/after diff card is the reveal beat ("you gained: 9 HP, Extra Attack, 2nd-level slots").
Homebrew classes level through the *same* flow — their builder-enforced level table (every level grants something) is exactly what makes this possible; the builder's constraint was quietly load-bearing for this feature.

### 11.3 Multiclassing *(locked decision: v2)*
Multiclassing is in SRD 5.2.1, so it's licensable — but it multiplies wizard complexity, sheet math, and Engine edge cases (slot stacking, prerequisite checks) for a minority of users. **V1 is single-class**; the level-up flow's step architecture leaves room for a "take a level in another class" branch later behind an advanced toggle. Say no for now, on purpose, in writing.

---

## 12. Economy & shopping (light strand)

Coins (CP/SP/EP/GP/PP) live on the character sheet; the wizard's "buy with coins" advanced toggle already references them. Downtime scenes gain a **shop card**: a DM-curated (or co-pilot-drafted, from the location) list of items with SRD prices; player taps to buy, Engine moves coins and inventory atomically. Selling at half price as the default convention, DM-overridable. Campaign Rewards (Campaign §8) flow into inventory through this same inventory-event path. That's the whole feature — it's an address book with a transaction, not a marketplace.

---

## 13. Escalation boundary (restated precisely)

With this spec, the routine/novel line from In-Play Part 0 gets its formal definition: **routine = expressible in the effect-hook vocabulary of §1.2 and resolvable by the pipeline of §2; novel = everything else, escalated to a Ruling Suggestion.** When a homebrew feature, a weird spell interaction, or an improvised stunt doesn't compile to hooks, the Engine doesn't guess — it hands the Assistant the context and the human the call. The vocabulary will grow over time; each addition moves a class of rulings from novel to routine, which is the app quietly getting better at its core promise.

---

## 14. Gap-closure checklist (rules)

| Flagged gap | Closed by |
|---|---|
| Rules data layer | §1 — one schema, effects-as-data, CC-BY attribution |
| Advantage/disadvantage stacking | §2 step 3 — collapse to tri-state |
| Full condition interactions | §3 — 15 conditions as hook bundles + durations |
| Exhaustion (2024) | §4 |
| Death, dying, 0 HP, massive damage | §5 — player-rolled death saves, dying state |
| Short/Long rests, Hit Dice | §6 — rest transactions (2024: all Hit Dice back) |
| OAs & reaction timing | §7 — prompt-the-holder machinery |
| Cover, AoE, difficult terrain | §8 — assisted-manual cover, template batch-saves |
| Vision / light / fog of war | §9 — v1 DM-revealed fog, v2 LOS behind same interface |
| Passive scores | §10 |
| Legendary / lair actions | §10 — one prompt pattern, three uses |
| Leveling up | §11 — milestone default, wizard re-entered per level |
| Multiclassing | §11.3 — explicit v2 deferral |
| Economy / shopping | §12 |

*End of Rules Engine spec. Companion: the Architecture spec (where this Engine's state lives and syncs).*
