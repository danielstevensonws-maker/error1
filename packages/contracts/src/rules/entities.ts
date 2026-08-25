/**
 * The rules entity envelope (Brief 01 §2) + typed per-entityType meta.
 * Display and mechanics are siblings: plain/derivation/srd_text alongside effects[].
 */
import { z } from 'zod';
import { AbilitySchema, EffectHookSchema, DamageTypeSchema, RulesExprSchema, SkillSchema } from './effects.js';

const IdSchema = z.string().regex(/^[a-z0-9_.-]+$/, 'entity ids are lowercase dotted slugs');

export const EntityTypeSchema = z.enum([
  'class', 'subclass', 'species', 'background', 'feat', 'spell', 'monster', 'item', 'condition',
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

/** Resolution tag: how the Engine treats a feature it encounters. */
export const ResolutionSchema = z.enum(['routine', 'novel', 'engine_native']);

const BaseEntity = z.object({
  id: IdSchema,
  entityType: EntityTypeSchema,
  name: z.string().min(1),
  source: z.enum(['srd-5.2.1', 'homebrew']),
  version: z.string().min(1),
  qa: z.enum(['draft', 'verified']),
  plain: z.string().min(1).max(220), // info-layer 1: one sentence
  srd_text: z.string(),              // info-layer 3: verbatim
  effects: z.array(EffectHookSchema),
  resolution: ResolutionSchema.default('routine'),
});

// ---- per-type meta -------------------------------------------------------

export const ConditionMetaSchema = z.object({
  endedBy: z.array(z.object({
    action: z.string(),
    cost: z.string().optional(),
    requires: z.string().optional(),
  })).optional(),
  cumulative: z.boolean().optional(), // exhaustion
});

export const SpellMetaSchema = z.object({
  level: z.number().int().min(0).max(9),
  school: z.enum(['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation']),
  castingTime: z.enum(['action', 'bonus_action', 'reaction', 'minute_1', 'minute_10', 'hour_1', 'hour_8', 'hour_12', 'hour_24']),
  rangeFt: z.union([z.number().int().nonnegative(), z.enum(['self', 'touch', 'sight', 'unlimited'])]),
  components: z.array(z.enum(['v', 's', 'm'])).nonempty(),
  materials: z.string().optional(),
  duration: z.string(),
  concentration: z.boolean(),
  ritual: z.boolean(),
  classLists: z.array(z.string()),
});

const AttackSchema = z.object({
  kind: z.enum(['melee', 'ranged', 'melee_or_ranged']),
  bonus: z.number().int(),
  reachFt: z.number().int().positive().optional(),
  rangeFt: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
});

const HitSchema = z.object({
  dice: RulesExprSchema,
  type: DamageTypeSchema,
  rider: z.object({
    when: z.enum(['attack_had_advantage']),
    dice: RulesExprSchema,
    type: DamageTypeSchema,
  }).optional(),
});

export const MonsterMetaSchema = z.object({
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
  type: z.string(),
  tags: z.array(z.string()).optional(),
  alignment: z.string(),
  ac: z.number().int().positive(),
  hp: z.object({ average: z.number().int().positive(), dice: RulesExprSchema }),
  speedFt: z.number().int().nonnegative(),
  abilities: z.object({
    str: z.number().int(), dex: z.number().int(), con: z.number().int(),
    int: z.number().int(), wis: z.number().int(), cha: z.number().int(),
  }),
  skills: z.partialRecord(SkillSchema, z.number().int()).optional(),
  senses: z.object({
    darkvisionFt: z.number().int().optional(),
    blindsightFt: z.number().int().optional(),
    passivePerception: z.number().int(),
  }),
  languages: z.array(z.string()),
  cr: z.string(),
  xp: z.number().int().nonnegative(),
  profBonus: z.number().int().positive(),
  gear: z.array(z.string()).optional(),
  actions: z.array(z.object({
    name: z.string(),
    attack: AttackSchema.optional(),
    hit: HitSchema.optional(),
    text: z.string().optional(),
  })),
  bonusActions: z.array(z.object({ name: z.string(), effect: z.unknown() })).optional(),
  reactions: z.array(z.object({ name: z.string(), text: z.string() })).optional(),
  // Boss machinery (Brief 08 §2). A legendary pool resets at the boss's turn
  // start; options are offered at other creatures' turn ends. Legendary
  // resistance flips a limited number of failed saves to successes.
  legendary: z.object({
    pool: z.number().int().positive(),
    options: z.array(z.object({ name: z.string(), cost: z.number().int().positive(), action: z.string() })).nonempty(),
    resistance: z.number().int().positive().optional(),  // uses per day, if any
  }).optional(),
  // A lair acts on initiative 20 (losing ties) — a pseudo-combatant.
  lair: z.object({
    initiative: z.literal(20),
    options: z.array(z.object({ name: z.string(), text: z.string() })).nonempty(),
  }).optional(),
});

const LevelRowSchema = z.object({
  profBonus: z.number().int().positive(),
  features: z.array(IdSchema).nonempty(), // Brief 01 acceptance #4: every level grants something
  setResources: z.record(z.string(), z.number().int()).optional(),
});

export const ClassMetaSchema = z.object({
  complexity: z.enum(['low', 'average', 'high']),
  hitDie: z.enum(['d6', 'd8', 'd10', 'd12']),
  primaryAbility: z.union([AbilitySchema, z.enum(['str_or_dex'])]),
  saves: z.tuple([AbilitySchema, AbilitySchema]),
  // How the class gets spell slots. 'pact' is the Warlock's Pact Magic: fewer
  // slots, all at one level, back on a Short Rest — not a weaker 'full'.
  casterType: z.enum(['none', 'third', 'half', 'full', 'pact']),
  /**
   * The ability the class casts with. Distinct from `primaryAbility` and NOT
   * derivable from it: a Paladin's primary ability is Strength but it casts on
   * Charisma, a Ranger's is Dexterity but it casts on Wisdom. Absent on
   * non-casters (and on homebrew that hasn't declared one).
   */
  spellcastingAbility: AbilitySchema.optional(),
  subclassLevel: z.number().int(),
  asiLevels: z.array(z.number().int()),
  levels: z.record(z.string().regex(/^([1-9]|1[0-9]|20)$/), LevelRowSchema),
});

// ---- assembled entity ----------------------------------------------------

export const RulesEntitySchema = z.discriminatedUnion('entityType', [
  BaseEntity.extend({ entityType: z.literal('condition'), meta: ConditionMetaSchema }),
  BaseEntity.extend({ entityType: z.literal('spell'), meta: SpellMetaSchema }),
  BaseEntity.extend({ entityType: z.literal('monster'), meta: MonsterMetaSchema }),
  BaseEntity.extend({ entityType: z.literal('class'), meta: ClassMetaSchema }),
  // feats/features, species, backgrounds, subclasses, items: loose meta in v0.1,
  // tightened per-brief as those briefs are written (deliberate — don't invent shapes ahead of their brief).
  BaseEntity.extend({ entityType: z.literal('feat'), meta: z.record(z.string(), z.unknown()).default({}) }),
  BaseEntity.extend({ entityType: z.literal('species'), meta: z.record(z.string(), z.unknown()).default({}) }),
  BaseEntity.extend({ entityType: z.literal('background'), meta: z.record(z.string(), z.unknown()).default({}) }),
  BaseEntity.extend({ entityType: z.literal('subclass'), meta: z.record(z.string(), z.unknown()).default({}) }),
  BaseEntity.extend({ entityType: z.literal('item'), meta: z.record(z.string(), z.unknown()).default({}) }),
]);
export type RulesEntity = z.infer<typeof RulesEntitySchema>;

/** Plain-language ban list (ADR: beat→scene, node→member). Checked against `plain` fields. */
export const PLAIN_LANGUAGE_BANLIST = ['beat', 'node', 'entity', 'schema', 'affordance'] as const;

export function violatesPlainLanguage(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const word of PLAIN_LANGUAGE_BANLIST) {
    if (lower.includes(` ${word} `) || lower.includes(` ${word}s `)) return word;
  }
  return null;
}
