# Brief 03 — Character Sheet Computation

*Layer 3. Consumed with `@questra/contracts` + ADR index. Parent: Character Wizard spec §5 (choices), Rules Engine §1 (data). Revalidate against contracts at build time (fixtures may have grown).*

> **⚠️ ADR-0013 revalidation note — M2.2 (2026-07-19).** Checked against current `@questra/contracts`. The sheet shapes do NOT yet exist and §1 mandates adding them to contracts — so M2.2 ships as **two commits: a contracts PR (shapes + the 2 fixtures + tests) first, then the engine computation second** (contract-first discipline; user-authorized). Details:
> 1. **Reuse, don't duplicate.** `NamedModifier`, `Ability`/`ABILITIES`, `Skill`/`SKILLS` already exist in contracts — the sheet schemas compose them.
> 2. **Fixtures are new.** `torvald-sheet.json` and `wizard-3-sheet.json` are authored in the contracts PR and become the byte-match golden targets (§3/§4). Torvald's sheet must reconcile with `torvald-trace.json` (+5 to hit = STR 3 + prof 2; longsword `1d8 + 3`).
> 3. **`Derived<T>` derivation sums to value** (§2 last rule) — a property test asserts this across random legal choices.
> 4. **Computation lives in `packages/engine`** (`sim/sheet.ts`), a pure function `(CharacterChoices, rulesData) → ComputedSheet`; contracts owns only the shapes + validators, never the computation (ADR-0005 keeps the engine pure and AI-free).
> 5. **Slot tables.** §2 says the caster slot table comes "from caster type + level … in rules data"; the M1.2 class dataset carries `casterType` + `levels` but not an explicit slot grid, so M2.2 encodes the standard full/half/third slot progression as engine data (a follow-up can move it into the rules dataset if a brief calls for it). Wizard-3 ⇒ slots {1:4, 2:2}.

**Scope:** the pure function from wizard choices + rules data → the fully computed sheet, every value carrying its derivation.
**Non-goals:** wizard UI (Brief 10 owns component work), level-up mutation (Brief 07), homebrew builder.

## 1. Shapes (add to contracts in the same PR)

```ts
interface CharacterChoices {
  classId: ID; level: number;                       // v1: single class (ADR-0006)
  backgroundId: ID; speciesId: ID;
  abilityMethod: 'standard_array' | 'point_buy' | 'rolled';
  baseScores: Record<Ability, number>;              // before background bonuses
  backgroundBonuses: Partial<Record<Ability, number>>; // +2/+1 or +1/+1/+1, sums to 3
  skillChoices: Skill[]; languageChoices: string[];
  equipment: ID[];                                  // item entity ids
  featChoices: Record<string, ID>;                  // slot id → feat id (fighting style etc.)
  identity: { name: string; personality: string[]; bonds: string[]; appearanceTokens: string[]; portraitRef?: string; voiceId?: string };
}

interface Derived<T> { value: T; derivation: NamedModifier[] }  // derivation renders info-layer 2

interface ComputedSheet {
  abilities: Record<Ability, Derived<number>>;      // score + mod, derivation shows base+background
  profBonus: Derived<number>;
  hp: Derived<{ max: number; hitDie: string; hitDiceMax: number }>;
  acOptions: Derived<number>[];                     // one per wearable loadout; best marked default
  initiative: Derived<number>;
  saves: Record<Ability, Derived<number>>;
  skills: Record<Skill, Derived<number>>;
  passives: { perception: Derived<number>; investigation: Derived<number>; insight: Derived<number> };
  speedFt: Derived<number>;
  attacks: AttackCard[];                            // name, toHit, damage expr, riders, tags (action economy + resource)
  features: FeatureCard[];                          // id, resource pool state (from setResources + hooks)
  spellcasting?: { ability: Ability; saveDc: Derived<number>; attackBonus: Derived<number>;
                   slots: Record<number, number>; prepared: ID[] };
  coins: Record<'cp'|'sp'|'ep'|'gp'|'pp', number>;
}
```

## 2. Computation rules (exact)
- Modifier = `floor((score − 10) / 2)`. Round-down everywhere (SRD "Round Down").
- HP level 1 = max hit die + CON mod; per later level: player-chosen roll **or** fixed average `ceil(die/2)+1` (d10→6). Stored per level so the derivation reconstructs.
- AC options from equipment item meta: unarmored `10 + DEX`; light `armor + DEX`; medium `armor + min(DEX, 2)`; heavy `armor` (flag STR requirement shortfall → speed −10); shield `+2` composable with any. Never silently pick — compute all, default the best legal.
- Saves/skills: mod + prof if proficient (class saves; background/class skill choices). Passives via contracts `passiveScore()`.
- Spellcasting (casterType ≠ none): DC `8 + prof + ability mod`, attack `prof + ability mod`, slot table from caster type + level (full/half/third tables in rules data).
- Attacks: weapon item meta → toHit `ability mod + prof (if proficient)`, damage `<die> + ability mod` as a RulesExpr string; finesse picks better of STR/DEX and records which in the derivation; riders attach (Rules Engine: riders attach *to* attack cards).
- Every Derived's derivation list must sum exactly to its value (property test).

## 3. Worked fixture — `torvald-sheet.json` (extends the trace fixture)
Fighter 1, scores STR 16 / DEX 13 / CON 14 / INT 8 / WIS 12 / CHA 10 (array + background), chain mail + shield + longsword. Expected: HP 12 (10+2), AC options [16 chain, 18 chain+shield default, 11 unarmored], init +1, longsword +5 / `1d8 + 3` slashing, Second Wind pool 2/2, passive Perception 11. Must reconcile with the Torvald trace (+5 to hit = STR 3 + prof 2). Second fixture: SRD Wizard 3 (INT 16) → slots {1:4, 2:2}, DC 13, attack +5 — exercises spellcasting.

## 4. Acceptance criteria (→ golden tests)
1. Both fixtures byte-match; derivations sum (property test across random legal choices).
2. Recompute is pure & deterministic: same choices + same rules-data version ⇒ identical sheet.
3. Illegal choices (unproficient save claimed, over-budget point buy: 27 pts, costs 8→0 … 15→9) rejected with plain-language reasons.
4. Every displayed number in the hub traces to a Derived — no orphan math in UI (lint rule: UI imports numbers only from ComputedSheet).
