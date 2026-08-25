/**
 * The effect-hook vocabulary — Brief 01 §1 as enforceable code.
 * This union IS the routine/novel boundary: if a feature compiles to these
 * hooks, the Engine resolves it; if not, it escalates to a Ruling Suggestion.
 * Grows only by contract PR.
 */
import { z } from 'zod';
import { ABILITIES } from './expr.js';
import { parseExpr } from './expr.js';

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
] as const;
export const DamageTypeSchema = z.enum(DAMAGE_TYPES);
export type DamageType = z.infer<typeof DamageTypeSchema>;

export const CONDITION_IDS = [
  'condition.blinded', 'condition.charmed', 'condition.deafened', 'condition.exhaustion',
  'condition.frightened', 'condition.grappled', 'condition.incapacitated', 'condition.invisible',
  'condition.paralyzed', 'condition.petrified', 'condition.poisoned', 'condition.prone',
  'condition.restrained', 'condition.stunned', 'condition.unconscious',
] as const;
export const ConditionIdSchema = z.enum(CONDITION_IDS);
export type ConditionId = z.infer<typeof ConditionIdSchema>;

export const AbilitySchema = z.enum(ABILITIES);

/** Skills per SRD 5.2.1. */
export const SKILLS = [
  'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival',
] as const;
export const SkillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof SkillSchema>;

/** A string in the closed expression language; validated by actually parsing it. */
export const RulesExprSchema = z.string().superRefine((src, ctx) => {
  try { parseExpr(src); } catch (e) {
    ctx.addIssue({ code: 'custom', message: `Invalid rules expression "${src}": ${(e as Error).message}` });
  }
});
export type RulesExpr = z.infer<typeof RulesExprSchema>;

export const RollScopeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('attack_roll'),
    by: z.enum(['self', 'against_self']).optional(),
    range: z.enum(['melee_5ft', 'melee', 'ranged']).optional(),
  }),
  z.object({
    kind: z.literal('ability_check'),
    ability: AbilitySchema.optional(),
    skill: SkillSchema.optional(),
    sense: z.enum(['sight', 'hearing']).optional(),
  }),
  z.object({
    kind: z.literal('saving_throw'),
    by: z.enum(['self', 'against_self']).optional(),
    ability: AbilitySchema.optional(),
  }),
  z.object({ kind: z.literal('any_d20_test') }),
  z.object({ kind: z.literal('initiative') }),
]);
export type RollScope = z.infer<typeof RollScopeSchema>;

/** Situational tags the DM/players can declare and hooks can be conditioned on. */
export const SituationTagSchema = z.enum([
  'source_visible',        // e.g. Frightened: only while the fear source is visible
  'attacker_can_see_you',  // Invisible carve-out
  'target_is_grappler',    // Grappled: disadvantage vs non-grappler only → hook conditions on the inverse
  'attack_had_advantage',  // 2024 monster riders (Goblin Warrior)
]);
export type SituationTag = z.infer<typeof SituationTagSchema>;

const ModifierTargetSchema = z.union([
  RollScopeSchema,
  z.object({ kind: z.literal('ac') }),
  z.object({ kind: z.literal('speed') }),
  z.object({ kind: z.literal('damage') }),
]);

export const TriggerEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('cast') }),
  z.object({
    event: z.literal('activate'),
    cost: z.enum(['action', 'bonus_action', 'reaction', 'free']),
    spends: z.string().optional(), // resource pool id
  }),
  z.object({ event: z.literal('take_damage') }),
  z.object({ event: z.literal('turn_start') }),
  z.object({ event: z.literal('turn_end') }),
  z.object({ event: z.literal('leave_reach') }),
]);
export type TriggerEvent = z.infer<typeof TriggerEventSchema>;

const AreaSchema = z.object({
  shape: z.enum(['sphere', 'cube', 'cone', 'line', 'emanation', 'cylinder']),
  radiusFt: z.number().int().positive().optional(),
  lengthFt: z.number().int().positive().optional(),
  widthFt: z.number().int().positive().optional(),
  origin: z.enum(['self', 'point_in_range']),
});

const DamageSpecSchema = z.object({ dice: RulesExprSchema, type: DamageTypeSchema });

export const TriggerActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('area_save'),
    area: AreaSchema,
    save: z.object({ ability: AbilitySchema, dc: z.union([z.number().int(), z.literal('spell_save_dc')]) }),
    onFail: z.object({ damage: DamageSpecSchema.optional(), applyCondition: ConditionIdSchema.optional() }),
    onSuccess: z.union([z.literal('none'), z.object({ damage: z.literal('half') })]),
    upcast: z.object({ perSlotAbove: z.number().int(), add: z.object({ dice: RulesExprSchema }) }).optional(),
    environment: z.array(z.object({ tag: z.string() })).optional(),
  }),
  z.object({
    action: z.literal('heal'),
    target: z.enum(['self', 'touch', 'ranged']),
    amount: RulesExprSchema,
  }),
  z.object({
    action: z.literal('prompt_save'),
    save: z.object({ ability: AbilitySchema, dc: z.union([z.number().int(), RulesExprSchema]) }),
    onFail: z.object({ applyCondition: ConditionIdSchema.optional(), endConcentration: z.boolean().optional() }),
  }),
  z.object({ action: z.literal('take_action'), allowed: z.array(z.enum(['disengage', 'hide', 'dash', 'dodge'])) }),
]);
export type TriggerAction = z.infer<typeof TriggerActionSchema>;

export const EffectHookSchema = z.discriminatedUnion('hook', [
  z.object({ hook: z.literal('modifier'), scope: ModifierTargetSchema, value: z.union([z.number().int(), RulesExprSchema]) }),
  z.object({ hook: z.literal('advantage'), scope: RollScopeSchema, condition: SituationTagSchema.optional() }),
  z.object({ hook: z.literal('disadvantage'), scope: RollScopeSchema, condition: SituationTagSchema.optional() }),
  z.object({ hook: z.literal('speed'), op: z.enum(['set', 'reduce', 'multiply']), value: z.union([z.number(), RulesExprSchema]) }),
  z.object({ hook: z.literal('movement_mode'), mode: z.enum(['crawl_only']) }),
  z.object({
    hook: z.literal('action_restriction'),
    restrict: z.array(z.enum(['action', 'bonus_action', 'reaction', 'movement', 'speech'])).nonempty(),
    // Brief 04 §1: Charmed can't attack/target the SOURCE of the condition. When
    // present, the restriction applies only to actions aimed at `source` (the
    // charmer), not to all actions.
    restrictTarget: z.literal('source').optional(),
  }),
  z.object({
    hook: z.literal('auto_state'),
    state: z.enum(['auto_fail_save', 'auto_crit_against', 'untargetable']),
    qualifier: z.object({
      abilities: z.array(AbilitySchema).optional(),
      range: z.literal('melee_5ft').optional(),
    }).optional(),
  }),
  z.object({ hook: z.literal('trigger'), on: TriggerEventSchema, do: TriggerActionSchema }),
  z.object({
    hook: z.literal('resource'),
    pool: z.string().min(1),
    op: z.enum(['grant', 'spend', 'restore']),
    amount: z.union([z.number().int(), RulesExprSchema]),
    recharge: z.enum(['short_rest', 'long_rest', 'turn_start', 'dawn']).optional(),
    partialRecharge: z.object({ on: z.enum(['short_rest']), amount: z.number().int().positive() }).optional(),
  }),
  z.object({ hook: z.literal('includes_condition'), condition: ConditionIdSchema }),
  z.object({ hook: z.literal('immunity'), to: z.union([z.array(DamageTypeSchema).nonempty(), z.array(ConditionIdSchema).nonempty()]) }),
  // Brief 04 §1: Petrified resists ALL damage — `'all'` avoids enumerating every type.
  z.object({ hook: z.literal('resistance'), to: z.union([z.literal('all'), z.array(DamageTypeSchema).nonempty()]) }),
  z.object({ hook: z.literal('vulnerability'), to: z.array(DamageTypeSchema).nonempty() }),
]);
export type EffectHook = z.infer<typeof EffectHookSchema>;
