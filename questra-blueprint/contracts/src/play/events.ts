/**
 * The play event vocabulary — Brief 02 §1–§2 as enforceable code.
 * This union grows only by contract PR. The server assigns seq;
 * the visibility filter runs BEFORE fan-out (see visibility.ts).
 */
import { z } from 'zod';
import { AbilitySchema, DamageTypeSchema } from '../rules/effects.js';

const ID = z.string().min(1);

export const ActorRefSchema = z.object({
  kind: z.enum(['player', 'dm', 'engine']),
  accountId: ID.optional(),
  creatureId: ID.optional(),
});
export type ActorRef = z.infer<typeof ActorRefSchema>;

export const VisibilitySchema = z.union([
  z.literal('public'),
  z.literal('dm_only'),
  z.object({ whisperTo: ID }),
]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const CellSchema = z.object({ x: z.number().int(), y: z.number().int() });
export type Cell = z.infer<typeof CellSchema>;

/** The five SRD coin denominations. A shop delta is signed per denomination
 *  (buying spends ⇒ negative gp; selling earns ⇒ positive). Mirrors the coins
 *  bag on ComputedSheet (rules/sheet.ts). */
export const CoinsSchema = z.object({
  cp: z.number().int(), sp: z.number().int(), ep: z.number().int(), gp: z.number().int(), pp: z.number().int(),
});
export type Coins = z.infer<typeof CoinsSchema>;

export const RollKindSchema = z.enum([
  'attack_roll', 'ability_check', 'saving_throw', 'initiative', 'death_save', 'concentration_save',
]);
export type RollKind = z.infer<typeof RollKindSchema>;

export const NamedModifierSchema = z.object({
  label: z.string(),          // "STR", "Proficiency", "Bless (1d4)", "Exhaustion 3"
  value: z.number().int(),    // resolved value (dice already rolled, itemized here)
  sourceId: ID.optional(),    // rules entity or effect source
});
export type NamedModifier = z.infer<typeof NamedModifierSchema>;

export const DurationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('until_removed') }),
  z.object({ kind: z.literal('end_of_next_turn'), of: ID }),
  z.object({ kind: z.literal('start_of_turn'), of: ID }),
  z.object({ kind: z.literal('save_ends'), save: z.object({ ability: AbilitySchema, dc: z.number().int() }), repeatAt: z.enum(['turn_end', 'turn_start']) }),
  z.object({ kind: z.literal('while_concentrating'), casterId: ID, spellId: ID }),
  z.object({ kind: z.literal('rounds'), n: z.number().int().positive() }),
]);
export type Duration = z.infer<typeof DurationSchema>;

// ---- prompt context (Brief 08 §1: one component, six ways) ---------------

/** A single legendary/lair option the holder can spend on. */
export const PromptOptionSchema = z.object({
  name: z.string(),
  cost: z.number().int().positive().optional(),  // legendary-action cost in pool points
});
export type PromptOption = z.infer<typeof PromptOptionSchema>;

/**
 * The typed context carried by a `reaction_prompted` event — a discriminated
 * union over `kind` (Brief 08 §1, replacing the v0.1 loose record). The same six
 * kinds the one PromptCard component renders. The engine builds the context; the
 * holder's screen formats it into plain lines.
 */
export const PromptContextSchema = z.discriminatedUnion('kind', [
  // Opportunity attack: a mover left a threatened square.
  z.object({
    kind: z.literal('opportunity_attack'),
    moverId: ID, provokerId: ID,
    pathStep: z.object({ from: CellSchema, to: CellSchema }),
    attackOptions: z.array(z.string()).nonempty(),   // action names the holder may swing with
  }),
  // Reaction feature (Shield, Redirect Attack…): a trigger the engine matched.
  z.object({
    kind: z.literal('feature'),
    featureId: ID,
    trigger: z.enum(['take_damage', 'targeted_by_attack', 'custom']),
    triggerText: z.string().optional(),
  }),
  // Readied action: authored at ready-time; the DM marked the trigger met.
  z.object({
    kind: z.literal('readied'),
    triggerText: z.string(),
    response: z.string(),           // the prepared response (an action or spell)
    spellId: ID.optional(),         // set if the readied response is a spell (slot already spent)
  }),
  // Legendary actions: the affordable options at a turn boundary.
  z.object({
    kind: z.literal('legendary_action'),
    poolRemaining: z.number().int().nonnegative(),
    options: z.array(PromptOptionSchema).nonempty(),
  }),
  // Legendary resistance: a failed save the boss may flip to a success.
  z.object({
    kind: z.literal('legendary_resistance'),
    save: z.object({ ability: AbilitySchema, dc: z.number().int() }),
    usesLeft: z.number().int().positive(),
  }),
  // Lair action: the lair's initiative-20 turn.
  z.object({
    kind: z.literal('lair'),
    options: z.array(PromptOptionSchema),   // may be empty ⇒ the only choice is skip
  }),
]);
export type PromptContext = z.infer<typeof PromptContextSchema>;

// ---- intents (client → server) ------------------------------------------

export const IntentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('attack'),
    attackerId: ID, targetId: ID, actionName: z.string(),
    declared: z.object({ coverDegree: z.enum(['none', 'half', 'three_quarters', 'total']).optional() }).optional(),
  }),
  z.object({
    kind: z.literal('cast'),
    casterId: ID, spellId: ID, slotLevel: z.number().int().min(0).max(9),
    targetIds: z.array(ID).optional(), point: CellSchema.optional(),
  }),
  z.object({ kind: z.literal('move'), tokenId: ID, path: z.array(CellSchema).nonempty() }),
  z.object({ kind: z.literal('use_feature'), creatureId: ID, featureId: ID }),
  z.object({ kind: z.literal('free_text'), creatureId: ID, text: z.string().min(1) }),
]);
export type Intent = z.infer<typeof IntentSchema>;

export const ClientIntentEnvelopeSchema = z.object({
  idempotencyKey: z.string().min(8),
  intent: IntentSchema,
});

// ---- event bodies --------------------------------------------------------

export const EventBodySchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('intent_declared'), creatureId: ID, intent: IntentSchema }),
  z.object({
    t: z.literal('roll_made'),
    rollId: ID, kind: RollKindSchema,
    d20: z.number().int().min(1).max(20),
    secondD20: z.number().int().min(1).max(20).optional(),
    collapsed: z.enum(['advantage', 'disadvantage', 'straight']),
    sources: z.array(z.string()),
    modifiers: z.array(NamedModifierSchema),
    total: z.number().int(),
    vs: z.object({ type: z.enum(['ac', 'dc']), value: z.number().int() }).optional(),
    outcome: z.enum(['hit', 'miss', 'success', 'failure', 'crit', 'fumble']),
    entry: z.enum(['server', 'manual']),
  }),
  z.object({
    t: z.literal('damage_applied'),
    creatureId: ID, amount: z.number().int().nonnegative(), type: DamageTypeSchema,
    breakdown: z.array(NamedModifierSchema),
    adjusted: z.object({
      resistance: z.literal(true).optional(),
      vulnerability: z.literal(true).optional(),
      immunity: z.literal(true).optional(),
    }),
    tempHpAbsorbed: z.number().int().nonnegative().optional(),
    resultingHp: z.number().int().nonnegative(),
  }),
  z.object({ t: z.literal('healing_applied'), creatureId: ID, amount: z.number().int().positive(), resultingHp: z.number().int().positive() }),
  z.object({ t: z.literal('condition_applied'), creatureId: ID, conditionId: ID, duration: DurationSchema, sourceRef: ID.optional() }),
  z.object({ t: z.literal('condition_removed'), creatureId: ID, conditionId: ID, reason: z.enum(['expired', 'save', 'action', 'cascade', 'override']) }),
  z.object({ t: z.literal('exhaustion_changed'), creatureId: ID, level: z.number().int().min(0).max(6) }),
  z.object({ t: z.literal('resource_changed'), creatureId: ID, pool: z.string(), delta: z.number().int(), remaining: z.number().int() }),
  z.object({ t: z.literal('concentration_started'), creatureId: ID, spellId: ID }),
  z.object({ t: z.literal('concentration_ended'), creatureId: ID, spellId: ID, reason: z.enum(['damage_save_failed', 'incapacitated', 'new_concentration', 'voluntary']) }),
  z.object({ t: z.literal('token_moved'), tokenId: ID, from: CellSchema, to: CellSchema, path: z.array(CellSchema), forced: z.boolean(), costFt: z.number().int().nonnegative() }),
  z.object({ t: z.literal('initiative_rolled'), order: z.array(z.object({ creatureId: ID, total: z.number().int() })) }),
  z.object({ t: z.literal('turn_advanced'), round: z.number().int().positive(), activeCreatureId: ID }),
  z.object({
    t: z.literal('reaction_prompted'),
    promptId: ID,
    /** the holder who must answer (a PC's account for player reactions, or the DM). */
    creatureId: ID,
    /** the typed context; its `kind` is the prompt kind (Brief 08 §1, the six ways). */
    context: PromptContextSchema,
    /** seconds until auto-decline (Brief 05 rule 7 default 60). */
    timeoutSec: z.number().int().positive().optional(),
  }),
  z.object({ t: z.literal('reaction_taken'), promptId: ID, choice: z.string().optional() }),
  z.object({ t: z.literal('reaction_declined'), promptId: ID, reason: z.enum(['holder', 'timeout', 'dm']).optional() }),
  z.object({
    t: z.literal('death_save_rolled'),
    creatureId: ID, d20: z.number().int().min(1).max(20),
    successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3),
    result: z.enum(['success', 'failure', 'double_failure', 'revive_1hp', 'stable', 'dead']),
  }),
  z.object({ t: z.literal('creature_died'), creatureId: ID, cause: z.string().optional() }),
  z.object({ t: z.literal('creature_stabilized'), creatureId: ID }),
  z.object({ t: z.literal('creature_unconscious'), creatureId: ID }),
  z.object({
    t: z.literal('rest_completed'),
    creatureIds: z.array(ID).nonempty(),
    kind: z.enum(['short', 'long', 'interrupted_partial']),
    applied: z.record(z.string(), z.unknown()),
  }),
  z.object({ t: z.literal('character_level_up'), characterId: ID, toLevel: z.number().int().min(2).max(20), choices: z.record(z.string(), z.unknown()) }),
  // Brief 07 §2 — XP mode. Defeated-monster XP split evenly + DM manual awards;
  // the engine tallies and flags a level offer when a threshold is crossed.
  z.object({
    t: z.literal('xp_awarded'),
    characterIds: z.array(ID).nonempty(),
    perCharacter: z.number().int().nonnegative(),
    source: z.enum(['defeat', 'manual']),
    reason: z.string().optional(),
  }),
  // Brief 07 §4 — shop. Buy/sell as ONE atomic transaction: a signed coins
  // delta + the itemized inventory lines, committed together under one causeId
  // (undo reverses both). `unitPrice` is in copper for a single lossless integer.
  z.object({
    t: z.literal('shop_transaction'),
    characterId: ID,
    direction: z.enum(['buy', 'sell']),
    lines: z.array(z.object({ itemId: ID, qty: z.number().int().positive(), unitPriceCp: z.number().int().nonnegative() })).nonempty(),
    coinsDelta: CoinsSchema,
  }),
  z.object({ t: z.literal('override_set'), path: z.string(), value: z.unknown() }),
  z.object({ t: z.literal('undo_applied'), undoneCauseId: ID, reversedSeqs: z.array(z.number().int()) }),
  z.object({ t: z.literal('whisper_sent'), text: z.string() }),
  z.object({ t: z.literal('escalated_to_ruling'), intentSeq: z.number().int(), context: z.record(z.string(), z.unknown()) }),
  z.object({
    t: z.literal('ruling_decided'),
    decision: z.enum(['ask_roll', 'changed', 'no_roll']),
    applied: z.object({ kind: RollKindSchema, dc: z.number().int() }).optional(),
  }),
  z.object({ t: z.literal('scene_changed'), sceneId: ID }),
  z.object({ t: z.literal('narration'), text: z.string(), from: z.enum(['engine', 'dm']), spoken: z.boolean().optional() }),
]);
export type EventBody = z.infer<typeof EventBodySchema>;

export const PlayEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  id: ID,
  causeId: ID.optional(),
  at: z.string().datetime(),
  actor: ActorRefSchema,
  visibility: VisibilitySchema,
  body: EventBodySchema,
});
export type PlayEvent = z.infer<typeof PlayEventSchema>;

// ---- shared pure functions (same code, client greying + server truth) ----

/**
 * Advantage collapse — Brief 02 step 4. Counts never matter.
 */
export function collapseAdvantage(
  advSources: readonly string[],
  disSources: readonly string[],
): 'advantage' | 'disadvantage' | 'straight' {
  const adv = advSources.length > 0;
  const dis = disSources.length > 0;
  if (adv && !dis) return 'advantage';
  if (dis && !adv) return 'disadvantage';
  return 'straight';
}

/** Cover — SRD: only the best degree applies, never summed. */
export const COVER_AC_BONUS = { none: 0, half: 2, three_quarters: 5 } as const;
export function bestCover(
  degrees: readonly (keyof typeof COVER_AC_BONUS | 'total')[],
): 'none' | 'half' | 'three_quarters' | 'total' {
  if (degrees.includes('total')) return 'total';
  if (degrees.includes('three_quarters')) return 'three_quarters';
  if (degrees.includes('half')) return 'half';
  return 'none';
}

/** Concentration save DC on damage — SRD: 10 or half the damage, whichever is higher. */
export function concentrationDc(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));
}

/** Passive score — SRD: 10 + bonus, ±5 for advantage/disadvantage on such checks. */
export function passiveScore(bonus: number, state: 'advantage' | 'disadvantage' | 'straight' = 'straight'): number {
  return 10 + bonus + (state === 'advantage' ? 5 : state === 'disadvantage' ? -5 : 0);
}
