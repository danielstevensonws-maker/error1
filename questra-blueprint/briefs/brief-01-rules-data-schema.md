# Brief 01 — Rules Data Schema & Ingestion

*Layer 3 implementation brief. Consumed with: `@questra/contracts` + ADR index. Parent specs: Rules Engine §1 (design rationale — do not re-read per session; this brief is self-contained). All example data below is transcribed from the SRD 5.2.1 PDF, not invented — treat it as the QA reference for ingestion.*

> **⚠️ ADR-0013 revalidation note — M1.1 (2026-07-18).** The JSON examples in §3–§6 predate the hardened `@questra/contracts` and have drifted. **The contracts are the authority (non-negotiable #1); ingest to the contracts shapes, not to this prose.** The four canonical fixtures in `packages/contracts/src/fixtures/` already conform and are byte-compared by the green contract tests — they, not the snippets below, are the byte-match target (acceptance #2). Drift points:
> 1. **Envelope fields.** Contracts `BaseEntity` requires `version` and `qa: 'draft'|'verified'`, and carries `resolution` (default `'routine'`). §2/§3–§6 omit them. Canonical field order (see `fixtures/prone.json`): `id, entityType, name, source, version, qa, plain, srd_text, effects, resolution, meta`.
> 2. **Prone's speed/movement (§3).** The brief writes `{ hook: 'modifier', scope: { kind: 'speed' }, value: 'movement_mode:crawl' }`. Contracts uses a dedicated hook: `{ hook: 'movement_mode', mode: 'crawl_only' }`. There is no `movement_mode:crawl` string value.
> 3. **Fireball (§4).** `area_save.onSuccess` is the union `'none' | { damage: 'half' }` (not a bare object); `onFail` is `{ damage?, applyCondition? }`; `upcast.add` is `{ dice }` only. `TriggerEvent` for a spell is `{ event: 'cast' }`. Otherwise aligned.
> 4. **Second Wind (§6).** `resource.partialRecharge` exists in contracts (`{ on: 'short_rest', amount }`) — the brief's shape is honoured. `activate` trigger cost enum is `action|bonus_action|reaction|free` and `spends` is a pool-id string.
> 5. **`entityType` for features** is `'feat'` (no separate `feature` type); `feature.fighter.extra-attack` uses `resolution: 'engine_native'`.
> 6. **Expression language** omits division (§expr grammar) — "round down" stays in prose/`meta`, never in a `Formula`.
>
> No contract changes are required for M1.1; this is a documentation-only reconciliation.

**Scope:** the exact shapes of the rules dataset, the effect-hook vocabulary, and four fully worked entity encodings.
**Non-goals:** the resolution pipeline (Brief 02), the ingestion *tooling* UX, homebrew builder UI (separate brief — homebrew *conforms to this schema*, nothing more is needed here).

---

## 1. The effect-hook vocabulary (the core types)

```ts
// @questra/contracts — rules/effects.ts
export type RollScope =
  | { kind: 'attack_roll'; by?: 'self' | 'against_self'; range?: 'melee_5ft' | 'melee' | 'ranged' }
  | { kind: 'ability_check'; ability?: Ability; skill?: Skill; sense?: 'sight' | 'hearing' }
  | { kind: 'saving_throw'; by?: 'self' | 'against_self'; ability?: Ability }
  | { kind: 'any_d20_test' }
  | { kind: 'initiative' };

export type EffectHook =
  | { hook: 'modifier'; scope: RollScope | { kind: 'ac' } | { kind: 'speed' } | { kind: 'damage' };
      value: DiceExpr | number | Formula }            // Formula: e.g. "-2 * exhaustion_level"
  | { hook: 'advantage'; scope: RollScope; condition?: SituationTag }
  | { hook: 'disadvantage'; scope: RollScope; condition?: SituationTag }
  | { hook: 'speed'; op: 'set' | 'reduce' | 'multiply'; value: number | Formula }
  | { hook: 'action_restriction'; restrict: ('action'|'bonus_action'|'reaction'|'movement'|'speech')[] }
  | { hook: 'auto_state'; state: 'auto_fail_save' | 'auto_crit_against' | 'untargetable';
      qualifier?: { abilities?: Ability[]; range?: 'melee_5ft' } }
  | { hook: 'trigger'; on: TriggerEvent; do: TriggerAction }     // e.g. on damage → prompt CON save
  | { hook: 'resource'; pool: ResourceRef; op: 'grant'|'spend'|'restore'; amount: number | Formula; recharge?: 'short_rest'|'long_rest'|'turn_start'|'dawn' }
  | { hook: 'includes_condition'; condition: ConditionId }       // composition, e.g. Paralyzed ⊃ Incapacitated
  | { hook: 'immunity'; to: DamageType[] | ConditionId[] }
  | { hook: 'resistance' | 'vulnerability'; to: DamageType[] };
```

**Rules that keep this sane (enforce in validators):**
1. A hook never references another entity by prose — only by id. If it can't be expressed here, the entity's feature is tagged `resolution: 'novel'` and the Engine escalates it (the routine/novel boundary *is* this type).
2. `Formula` is a tiny closed expression language over a fixed variable set (`level`, `exhaustion_level`, `prof_bonus`, `str_mod` … `cha_mod`, `spell_mod`). No arbitrary code. Parser + evaluator live in contracts; both client (display) and server (truth) use the same one.
3. Every entity carries the three-layer text (`plain` / `derivation` template / `srd_text`) *alongside* `effects[]` — display and mechanics are siblings, never derived from each other.

## 2. Entity envelope (shared by every content type)

```ts
export interface RulesEntity {
  id: string;                    // 'condition.prone', 'spell.fireball', 'monster.goblin-warrior', 'class.fighter'
  entityType: 'class'|'subclass'|'species'|'background'|'feat'|'spell'|'monster'|'item'|'condition';
  name: string;
  source: 'srd-5.2.1' | 'homebrew';
  version: string;               // dataset version; PlaySessions pin this
  plain: string;                 // info-layer 1
  srd_text: string;              // info-layer 3 (verbatim)
  effects: EffectHook[];         // what the Engine reads
  meta: Record<string, unknown>; // per-type typed extension below
}
```

---

## 3. Worked example — a condition (`condition.prone`)

SRD text (verbatim, abridged): *"Restricted Movement. Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself… Attacks Affected. You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage."*

```json
{
  "id": "condition.prone",
  "entityType": "condition",
  "name": "Prone",
  "source": "srd-5.2.1",
  "plain": "You're on the ground: your attacks are worse, melee attacks against you are better, and standing up costs half your movement.",
  "srd_text": "<verbatim SRD block>",
  "effects": [
    { "hook": "disadvantage", "scope": { "kind": "attack_roll", "by": "self" } },
    { "hook": "advantage",    "scope": { "kind": "attack_roll", "by": "against_self", "range": "melee_5ft" } },
    { "hook": "disadvantage", "scope": { "kind": "attack_roll", "by": "against_self", "range": "ranged" } },
    { "hook": "modifier",     "scope": { "kind": "speed" }, "value": "movement_mode:crawl" }
  ],
  "meta": { "endedBy": [{ "action": "stand", "cost": "half_speed_round_down", "requires": "speed > 0" }] }
}
```
Note the three attack hooks: prone is the proof case that one condition emits *multiple scoped hooks*, including opposing ones (melee-adv vs ranged-disadv against you). If the schema can express Prone, it can express nearly everything.

## 4. Worked example — a spell (`spell.fireball`)

SRD: level 3 Evocation, 150 ft, V/S/M, Instantaneous. *"Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much on a successful one… Using a Higher-Level Spell Slot: the damage increases by 1d6 for each spell slot level above 3."*

```json
{
  "id": "spell.fireball",
  "entityType": "spell",
  "name": "Fireball",
  "source": "srd-5.2.1",
  "plain": "A 20-foot explosion of fire. Everyone in it dodges or takes heavy fire damage.",
  "srd_text": "<verbatim>",
  "effects": [
    { "hook": "trigger", "on": { "event": "cast" }, "do": {
        "action": "area_save",
        "area": { "shape": "sphere", "radiusFt": 20, "origin": "point_in_range" },
        "save": { "ability": "dex", "dc": "spell_save_dc" },
        "onFail": { "damage": { "dice": "8d6", "type": "fire" } },
        "onSuccess": { "damage": "half" },
        "upcast": { "perSlotAbove": 3, "add": { "dice": "1d6" } },
        "environment": [{ "tag": "ignite_unattended_flammables" }]
    } }
  ],
  "meta": {
    "level": 3, "school": "evocation", "castingTime": "action",
    "rangeFt": 150, "components": ["v","s","m"], "materials": "a ball of bat guano and sulfur",
    "duration": "instantaneous", "concentration": false, "ritual": false,
    "classLists": ["sorcerer","wizard"]
  }
}
```
This is the template for every damaging save-based AoE spell — the `area_save` trigger action is one Engine handler serving dozens of spells.

## 5. Worked example — a monster (`monster.goblin-warrior`)

Transcribed from the SRD stat block:

```json
{
  "id": "monster.goblin-warrior",
  "entityType": "monster",
  "name": "Goblin Warrior",
  "source": "srd-5.2.1",
  "plain": "A small, sneaky skirmisher that darts in, stabs, and slips away.",
  "srd_text": "<verbatim>",
  "effects": [
    { "hook": "resource", "pool": "hp", "op": "grant", "amount": 10 }
  ],
  "meta": {
    "size": "small", "type": "fey", "tags": ["goblinoid"], "alignment": "chaotic neutral",
    "ac": 15, "hp": { "average": 10, "dice": "3d6" }, "speedFt": 30,
    "abilities": { "str": 8, "dex": 15, "con": 10, "int": 10, "wis": 8, "cha": 8 },
    "skills": { "stealth": 6 },
    "senses": { "darkvisionFt": 60, "passivePerception": 9 },
    "languages": ["Common", "Goblin"],
    "cr": "1/4", "xp": 50, "profBonus": 2,
    "gear": ["leather armor", "scimitar", "shield", "shortbow"],
    "actions": [
      { "name": "Scimitar", "attack": { "kind": "melee", "bonus": 4, "reachFt": 5 },
        "hit": { "dice": "1d6+2", "type": "slashing",
                 "rider": { "when": "attack_had_advantage", "dice": "1d4", "type": "slashing" } } },
      { "name": "Shortbow", "attack": { "kind": "ranged", "bonus": 4, "rangeFt": [80, 320] },
        "hit": { "dice": "1d6+2", "type": "piercing",
                 "rider": { "when": "attack_had_advantage", "dice": "1d4", "type": "piercing" } } }
    ],
    "bonusActions": [
      { "name": "Nimble Escape", "effect": { "takeAction": ["disengage", "hide"] } }
    ]
  }
}
```
The `rider.when: "attack_had_advantage"` field matters: 2024 monsters routinely key damage off advantage state, so the d20 pipeline must expose *whether the collapsed flag was advantage* to the damage step — a contract requirement Brief 02 inherits.

## 6. Worked example — a class excerpt (`class.fighter`, levels 1–5)

Level table transcribed from the SRD (Second Wind uses: 2/2/2/3/3 at levels 1–5; Weapon Mastery 3/3/3/4/4):

```json
{
  "id": "class.fighter",
  "entityType": "class",
  "name": "Fighter",
  "source": "srd-5.2.1",
  "plain": "The master of weapons and armor. Simple to play, hard to kill.",
  "srd_text": "<verbatim>",
  "effects": [],
  "meta": {
    "complexity": "low",
    "hitDie": "d10", "primaryAbility": "str_or_dex",
    "saves": ["str", "con"],
    "casterType": "none",
    "subclassLevel": 3, "asiLevels": [4, 6, 8, 12, 14, 16],
    "levels": {
      "1": { "profBonus": 2, "features": ["feature.fighter.fighting-style", "feature.fighter.second-wind", "feature.fighter.weapon-mastery"] },
      "2": { "profBonus": 2, "features": ["feature.fighter.action-surge", "feature.fighter.tactical-mind"] },
      "3": { "profBonus": 2, "features": ["choice.fighter.subclass"] },
      "4": { "profBonus": 2, "features": ["choice.asi-or-feat"], "setResources": { "second_wind.max": 3, "weapon_mastery.count": 4 } },
      "5": { "profBonus": 3, "features": ["feature.fighter.extra-attack", "feature.fighter.tactical-shift"] }
    }
  }
}
```
And one feature entity to show the pattern (SRD: *"As a Bonus Action… regain Hit Points equal to 1d10 plus your Fighter level. You can use this feature twice. You regain one expended use when you finish a Short Rest, and all expended uses when you finish a Long Rest."*):
```json
{
  "id": "feature.fighter.second-wind",
  "entityType": "feat",
  "name": "Second Wind",
  "plain": "Once in a while, catch your breath as a bonus action and heal 1d10 + your Fighter level.",
  "effects": [
    { "hook": "resource", "pool": "feature.second_wind", "op": "grant", "amount": 2,
      "recharge": "long_rest", "partialRecharge": { "on": "short_rest", "amount": 1 } },
    { "hook": "trigger", "on": { "event": "activate", "cost": "bonus_action", "spends": "feature.second_wind" },
      "do": { "action": "heal", "target": "self", "amount": "1d10 + level" } }
  ]
}
```
Second Wind is deliberately the worked feature because it exercises the ugliest recharge shape (2 uses, 1 back per short rest, all per long rest) — if the resource hook handles this, per-rest features generally are covered. `feature.fighter.extra-attack` is the canonical *non*-hook feature in v1: tag it `resolution: 'engine_native'` (the attack-count rule lives in the pipeline, not data) — the third tag alongside routine/novel, used sparingly and listed exhaustively in the contracts.

---

## 7. Ingestion plan & acceptance criteria

- Pipeline: `pdftotext -layout` → section splitters per entity type → structured drafts → **human QA pass against the PDF page** (the drafts will be ~95% right; the 5% is exactly the stuff that breaks tables). QA state tracked per entity (`draft / verified`); the Engine refuses `draft` entities outside dev.
- Counts to hit (completeness check): 12 classes, 9 species, all SRD backgrounds/feats, all conditions (15), the full SRD spell list, the full monster roster, equipment tables with prices (Brief: economy reads these).
- **Acceptance criteria (map 1:1 to golden tests):**
  1. Every entity validates against the contracts schema; zero `any`.
  2. `condition.prone`, `spell.fireball`, `monster.goblin-warrior`, `class.fighter` match this brief byte-for-byte (they are the fixtures).
  3. Every condition's hooks reproduce its SRD text under a rules-lawyer read (15 manual sign-offs, checklist in the PR).
  4. Every class level 1–20 grants ≥1 feature id (the homebrew builder's rule, applied to official data too — it'll catch transcription holes).
  5. All `plain` lines pass the plain-language ban list (no beat, no node, no jargon).
  6. Dataset is versioned; bumping version does not mutate prior versions (append-only releases).
