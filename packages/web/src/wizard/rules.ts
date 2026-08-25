/**
 * wizard/rules — the rules data the wizard offers, and the sheet it computes.
 *
 * One module so the wizard has a single source for "what can I pick" and "what
 * does that add up to". Everything here comes from @questra/engine; nothing is
 * restated. A class blurb, a species speed, a background's ability options —
 * all of it is engine data with a golden test behind it, because a wizard that
 * hardcoded any of it would drift from the sheet the same character computes.
 */
import {
  CLASSES,
  DRAFT_ITEMS,
  DRAFT_SPELLS,
  VERIFIED_BACKGROUNDS,
  VERIFIED_SPECIES,
  buildSheetRulesData,
  computeSheet,
  speciesSpeedFt,
} from '@questra/engine';
import type { Ability, CharacterChoices, ComputedSheet, RulesEntity } from '@questra/contracts';

export interface ClassOption {
  id: string;
  name: string;
  plain: string;
  /** What the class leans on — the randomiser gives it the highest score. */
  primaryAbility: string;
  complexity: 'low' | 'average' | 'high';
  hitDie: string;
  casterType: 'none' | 'third' | 'half' | 'full' | 'pact';
}

export interface SpeciesOption {
  id: string;
  name: string;
  plain: string;
  sizeLabel: string;
  speedFt: number;
  traits: string[];
}

export interface BackgroundOption {
  id: string;
  name: string;
  plain: string;
  abilityOptions: Ability[];
  skills: string[];
}

function metaOf<T>(e: RulesEntity): T {
  return e.meta as T;
}

/**
 * The twelve classes, ordered by how much they ask of a new player.
 *
 * The spec puts low-complexity first and that ordering is the teaching: a
 * beginner scanning this list meets Fighter and Barbarian before Warlock, so
 * the first thing they read is something they could actually run. Alphabetical
 * would put Bard — a high-complexity full caster — in position two.
 */
const COMPLEXITY_RANK: Record<string, number> = { low: 0, average: 1, high: 2 };

export const CLASS_OPTIONS: ClassOption[] = CLASSES.map((c) => {
  const m = metaOf<{ complexity: ClassOption['complexity']; hitDie: string; casterType: ClassOption['casterType']; primaryAbility: string }>(c);
  return { id: c.id, name: c.name, plain: c.plain, complexity: m.complexity, hitDie: m.hitDie, casterType: m.casterType, primaryAbility: m.primaryAbility };
}).sort((a, b) => (COMPLEXITY_RANK[a.complexity]! - COMPLEXITY_RANK[b.complexity]!) || a.name.localeCompare(b.name));

export const SPECIES_OPTIONS: SpeciesOption[] = VERIFIED_SPECIES.map((s) => {
  const m = metaOf<{ sizeLabel: string; speedFt: number; traits: string[] }>(s);
  return { id: s.id, name: s.name, plain: s.plain, sizeLabel: m.sizeLabel, speedFt: m.speedFt, traits: m.traits };
});

export const BACKGROUND_OPTIONS: BackgroundOption[] = VERIFIED_BACKGROUNDS.map((b) => {
  const m = metaOf<{ abilityOptions: Ability[]; skills: string[] }>(b);
  return { id: b.id, name: b.name, plain: b.plain, abilityOptions: m.abilityOptions, skills: m.skills };
});

export function classById(id: string | null): ClassOption | undefined {
  return id ? CLASS_OPTIONS.find((c) => c.id === id) : undefined;
}
export function speciesById(id: string | null): SpeciesOption | undefined {
  return id ? SPECIES_OPTIONS.find((s) => s.id === id) : undefined;
}
export function backgroundById(id: string | null): BackgroundOption | undefined {
  return id ? BACKGROUND_OPTIONS.find((b) => b.id === id) : undefined;
}

/**
 * Compute the sheet for a finished set of choices.
 *
 * The rules bundle is rebuilt per call because `speciesSpeedFt` is baked into
 * it — the Goliath's 35 feet is the case that proves a cached bundle would be
 * wrong. Cheap enough at wizard cadence (one call per keystroke at worst) and
 * correct by construction, which is the right trade for rules.
 */
export function sheetFor(choices: CharacterChoices): ComputedSheet {
  const rules = buildSheetRulesData(
    [...CLASSES, ...DRAFT_ITEMS, ...DRAFT_SPELLS],
    speciesSpeedFt(choices.speciesId),
  );
  return computeSheet(choices, rules);
}
