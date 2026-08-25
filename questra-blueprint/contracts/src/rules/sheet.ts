/**
 * Character-sheet shapes (Brief 03 §1). The wizard's choices in, the fully
 * computed sheet out — every derived number carrying its derivation so the hub's
 * info-layer-2 "where did this come from?" reads straight off the data.
 *
 * These are contracts (the spine): the wizard writes CharacterChoices, the engine
 * computes ComputedSheet, and the UI reads ComputedSheet — one shared shape, no
 * parallel definitions. The COMPUTATION lives in @questra/engine (pure, AI-free
 * — ADR-0005); this file owns only the shapes + validators.
 */
import { z } from 'zod';
import { AbilitySchema, SkillSchema, RulesExprSchema } from './effects.js';
import { NamedModifierSchema } from '../play/events.js';

const ID = z.string().min(1);
const AbilityRecord = <T extends z.ZodTypeAny>(v: T) =>
  z.object({ str: v, dex: v, con: v, int: v, wis: v, cha: v });

// ---- inputs --------------------------------------------------------------

export const CharacterChoicesSchema = z.object({
  classId: ID,
  level: z.number().int().min(1).max(20), // v1: single class (ADR-0006)
  backgroundId: ID,
  speciesId: ID,
  abilityMethod: z.enum(['standard_array', 'point_buy', 'rolled']),
  baseScores: AbilityRecord(z.number().int()), // before background bonuses
  backgroundBonuses: z.partialRecord(AbilitySchema, z.number().int()), // +2/+1 or +1/+1/+1
  skillChoices: z.array(SkillSchema),
  languageChoices: z.array(z.string()),
  equipment: z.array(ID),
  featChoices: z.record(z.string(), ID), // slot id → feat id
  identity: z.object({
    name: z.string(),
    personality: z.array(z.string()),
    bonds: z.array(z.string()),
    appearanceTokens: z.array(z.string()),
    portraitRef: z.string().optional(),
    voiceId: z.string().optional(),
  }),
});
export type CharacterChoices = z.infer<typeof CharacterChoicesSchema>;

// ---- the Derived wrapper (info-layer 2) ----------------------------------

/** A computed value plus the itemized modifiers that sum to it. */
export const DerivedSchema = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, derivation: z.array(NamedModifierSchema) });
export interface Derived<T> {
  value: T;
  derivation: z.infer<typeof NamedModifierSchema>[];
}

// ---- output cards --------------------------------------------------------

export const AttackCardSchema = z.object({
  name: z.string(),
  toHit: z.number().int(),
  toHitDerivation: z.array(NamedModifierSchema),
  damage: RulesExprSchema,
  damageType: z.string(),
  /** which ability the attack used (finesse records the pick). */
  ability: AbilitySchema,
  riders: z.array(z.object({ when: z.string(), dice: RulesExprSchema, type: z.string() })).optional(),
  tags: z.array(z.string()).optional(),
});
export type AttackCard = z.infer<typeof AttackCardSchema>;

export const FeatureCardSchema = z.object({
  id: ID,
  name: z.string(),
  /** resource pool state derived from setResources + hooks, if the feature has one. */
  resource: z.object({ pool: z.string(), max: z.number().int(), remaining: z.number().int() }).optional(),
});
export type FeatureCard = z.infer<typeof FeatureCardSchema>;

const HpSchema = z.object({ max: z.number().int(), hitDie: z.string(), hitDiceMax: z.number().int() });

const SpellcastingSchema = z.object({
  ability: AbilitySchema,
  saveDc: DerivedSchema(z.number().int()),
  attackBonus: DerivedSchema(z.number().int()),
  slots: z.record(z.string(), z.number().int()),
  prepared: z.array(ID),
});

export const ComputedSheetSchema = z.object({
  abilities: AbilityRecord(DerivedSchema(z.number().int())),
  profBonus: DerivedSchema(z.number().int()),
  hp: DerivedSchema(HpSchema),
  acOptions: z.array(DerivedSchema(z.number().int())).nonempty(),
  /** index into acOptions of the best legal loadout. */
  acDefault: z.number().int().nonnegative(),
  initiative: DerivedSchema(z.number().int()),
  saves: AbilityRecord(DerivedSchema(z.number().int())),
  skills: z.partialRecord(SkillSchema, DerivedSchema(z.number().int())),
  passives: z.object({
    perception: DerivedSchema(z.number().int()),
    investigation: DerivedSchema(z.number().int()),
    insight: DerivedSchema(z.number().int()),
  }),
  speedFt: DerivedSchema(z.number().int()),
  attacks: z.array(AttackCardSchema),
  features: z.array(FeatureCardSchema),
  spellcasting: SpellcastingSchema.optional(),
  coins: z.object({ cp: z.number().int(), sp: z.number().int(), ep: z.number().int(), gp: z.number().int(), pp: z.number().int() }),
});
export type ComputedSheet = z.infer<typeof ComputedSheetSchema>;

/** Property helper (Brief 03 §2 last rule): a Derived's derivation must sum to its value. */
export function derivationSumsToValue(d: { value: number; derivation: { value: number }[] }): boolean {
  return d.derivation.reduce((s, m) => s + m.value, 0) === d.value;
}
