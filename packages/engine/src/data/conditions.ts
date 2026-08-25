/**
 * The 15 SRD 5.2.1 conditions — VERIFIED (Brief 01 §7, acceptance #2/#3).
 *
 * `srd_text` is verbatim from the ingestion pipeline (pdftotext -raw →
 * extractConditions); `plain`, `effects`, and `meta` are the human QA pass — a
 * rules-lawyer read of each SRD block encoded into the contracts hook
 * vocabulary. Where a rule cannot be expressed as a hook (prose-only clauses
 * like Grappled's drag economy or Petrified's transformation), the entity is
 * tagged `resolution: 'novel'` so the Engine escalates it to a Ruling — that
 * boundary IS the effect-hook union (Brief 01 §1 rule 1).
 *
 * `condition.prone` is byte-identical to the canonical fixture
 * (contracts/src/fixtures/prone.json) — the golden test asserts it.
 *
 * Each entry is annotated with a one-line rules-lawyer sign-off (acceptance #3:
 * 15 manual sign-offs). Composition (Paralyzed ⊃ Incapacitated, etc.) uses the
 * `includes_condition` hook rather than restating the parent's effects.
 */
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';
import { DATASET_VERSION } from '../ingest/pipeline.js';

const V = DATASET_VERSION;

/**
 * Raw (pre-validation) condition records, authored in the rules-lawyer QA pass.
 * Validated against the contracts schema on export below (acceptance #1).
 */
const RAW: unknown[] = [
  // 1. Blinded — SIGN-OFF: attack disadv (self) + advantage (against self) are hooks; sight-check auto-fail is prose → novel.
  {
    id: 'condition.blinded',
    entityType: 'condition',
    name: 'Blinded',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "You can't see: sight-based checks fail, your attacks are worse, and attacks against you are better.",
    srd_text:
      "While you have the Blinded condition, you experience the following effects. Can't See. You can't see and automatically fail any ability check that requires sight. Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.",
    effects: [
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'self' } },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self' } },
    ],
    resolution: 'novel', // "auto-fail any ability check requiring sight" has no hook; Engine escalates that clause.
    meta: {},
  },
  // 2. Charmed — SIGN-OFF: both clauses (can't-harm-charmer; charmer social advantage) are relational/prose → novel.
  {
    id: 'condition.charmed',
    entityType: 'condition',
    name: 'Charmed',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "You can't attack or harm the one who charmed you, and they have the upper hand talking to you.",
    srd_text:
      "While you have the Charmed condition, you experience the following effects. Can't Harm the Charmer. You can't attack the charmer or target the charmer with damaging abilities or magical effects. Social Advantage. The charmer has Advantage on any ability check to interact with you socially.",
    effects: [], // both clauses reference "the charmer" (a specific creature) — no hook expresses per-target restriction.
    resolution: 'novel',
    meta: {},
  },
  // 3. Deafened — SIGN-OFF: single clause, auto-fail hearing checks — prose-only (no auto-fail-check hook) → novel.
  {
    id: 'condition.deafened',
    entityType: 'condition',
    name: 'Deafened',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "You can't hear: any check that needs hearing automatically fails.",
    srd_text:
      "While you have the Deafened condition, you experience the following effect. Can't Hear. You can't hear and automatically fail any ability check that requires hearing.",
    effects: [],
    resolution: 'novel',
    meta: {},
  },
  // 4. Exhaustion — SIGN-OFF: cumulative; every D20 Test -2×level (modifier over any_d20_test); Speed -5×level (formula);
  //    death at 6 and long-rest removal are lifecycle prose (meta.cumulative + novel death clause).
  {
    id: 'condition.exhaustion',
    entityType: 'condition',
    name: 'Exhaustion',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: 'A stacking toll: every d20 roll and your Speed drop the more exhausted you are. At level 6 you die.',
    srd_text:
      "While you have the Exhaustion condition, you experience the following effects. Exhaustion Levels. This condition is cumulative. Each time you receive it, you gain 1 Exhaustion level. You die if your Exhaustion level is 6. D20 Tests Affected. When you make a D20 Test, the roll is reduced by 2 times your Exhaustion level. Speed Reduced. Your Speed is reduced by a number of feet equal to 5 times your Exhaustion level. Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
    effects: [
      { hook: 'modifier', scope: { kind: 'any_d20_test' }, value: '-2 * exhaustion_level' },
      { hook: 'speed', op: 'reduce', value: '5 * exhaustion_level' },
    ],
    resolution: 'novel', // death-at-6 and long-rest removal are lifecycle rules the Engine owns, not hooks.
    meta: { cumulative: true },
  },
  // 5. Frightened — SIGN-OFF: disadvantage on checks AND attacks while source in sight (conditioned on source_visible);
  //    "can't approach the source" is movement geometry → prose/novel.
  {
    id: 'condition.frightened',
    entityType: 'condition',
    name: 'Frightened',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "While you can see what scares you, your rolls suffer and you can't move closer to it.",
    srd_text:
      "While you have the Frightened condition, you experience the following effects. Ability Checks and Attacks Affected. You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight. Can't Approach. You can't willingly move closer to the source of fear.",
    effects: [
      { hook: 'disadvantage', scope: { kind: 'ability_check' }, condition: 'source_visible' },
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'self' }, condition: 'source_visible' },
    ],
    resolution: 'novel', // "can't willingly move closer to the source" is movement geometry, not a hook.
    meta: {},
  },
  // 6. Grappled — SIGN-OFF: Speed 0 (set); disadvantage vs non-grappler targets (conditioned target_is_grappler inverse);
  //    the drag/carry movement-cost clause is prose → novel.
  {
    id: 'condition.grappled',
    entityType: 'condition',
    name: 'Grappled',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "You're held fast: your Speed is 0 and you attack at a disadvantage against anyone but your grappler.",
    srd_text:
      "While you have the Grappled condition, you experience the following effects. Speed 0. Your Speed is 0 and can't increase. Attacks Affected. You have Disadvantage on attack rolls against any target other than the grappler. Movable. The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it.",
    effects: [
      { hook: 'speed', op: 'set', value: 0 },
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'self' }, condition: 'target_is_grappler' },
    ],
    resolution: 'novel', // the drag/carry extra-foot economy is prose the Engine escalates.
    meta: {},
  },
  // 7. Incapacitated — SIGN-OFF: no action/BA/reaction (action_restriction); concentration break + speechless are prose;
  //    disadvantage on Initiative if incapacitated when rolling (conditioned initiative disadvantage).
  {
    id: 'condition.incapacitated',
    entityType: 'condition',
    name: 'Incapacitated',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "You can't act: no action, bonus action, or reaction, no concentration, and no speaking.",
    srd_text:
      "While you have the Incapacitated condition, you experience the following effects. Inactive. You can't take any action, Bonus Action, or Reaction. No Concentration. Your Concentration is broken. Speechless. You can't speak. Surprised. If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll.",
    effects: [
      { hook: 'action_restriction', restrict: ['action', 'bonus_action', 'reaction', 'speech'] },
      { hook: 'disadvantage', scope: { kind: 'initiative' } },
    ],
    resolution: 'novel', // "Concentration is broken" is an engine state transition, not a standing hook.
    meta: {},
  },
  // 8. Invisible — SIGN-OFF: advantage on Initiative (surprise); attack advantage (self) + disadvantage (against self);
  //    the see-through carve-out (attacker_can_see_you) conditions the attack hooks; concealment is prose.
  {
    id: 'condition.invisible',
    entityType: 'condition',
    name: 'Invisible',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "Unseen: you roll Initiative with advantage, attack with advantage, and are attacked with disadvantage.",
    srd_text:
      "While you have the Invisible condition, you experience the following effects. Surprise. If you're Invisible when you roll Initiative, you have Advantage on the roll. Concealed. You aren't affected by any effect that requires its target to be seen unless the effect's creator can somehow see you. Any equipment you are wearing or carrying is also concealed. Attacks Affected. Attack rolls against you have Disadvantage, and your attack rolls have Advantage. If a creature can somehow see you, you don't gain this benefit against that creature.",
    effects: [
      { hook: 'advantage', scope: { kind: 'initiative' } },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'self' }, condition: 'attacker_can_see_you' },
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'against_self' }, condition: 'attacker_can_see_you' },
    ],
    resolution: 'novel', // "not affected by effects requiring you be seen" concealment is prose.
    meta: {},
  },
  // 9. Paralyzed — SIGN-OFF: ⊃ Incapacitated (includes_condition); Speed 0; auto-fail STR/DEX saves (auto_state);
  //    attacks vs you have advantage; melee-5ft hits auto-crit (auto_state melee_5ft).
  {
    id: 'condition.paralyzed',
    entityType: 'condition',
    name: 'Paralyzed',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "Frozen stiff: you can't act or move, auto-fail Strength and Dexterity saves, and nearby hits are critical.",
    srd_text:
      "While you have the Paralyzed condition, you experience the following effects. Incapacitated. You have the Incapacitated condition. Speed 0. Your Speed is 0 and can't increase. Saving Throws Affected. You automatically fail Strength and Dexterity saving throws. Attacks Affected. Attack rolls against you have Advantage. Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.",
    effects: [
      { hook: 'includes_condition', condition: 'condition.incapacitated' },
      { hook: 'speed', op: 'set', value: 0 },
      { hook: 'auto_state', state: 'auto_fail_save', qualifier: { abilities: ['str', 'dex'] } },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self' } },
      { hook: 'auto_state', state: 'auto_crit_against', qualifier: { range: 'melee_5ft' } },
    ],
    resolution: 'routine',
    meta: {},
  },
  // 10. Petrified — SIGN-OFF: ⊃ Incapacitated; Speed 0; attacks vs you have advantage; auto-fail STR/DEX saves;
  //    resistance to all damage; immunity to Poisoned; the transformation/weight/aging clauses are prose → novel.
  {
    id: 'condition.petrified',
    entityType: 'condition',
    name: 'Petrified',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: 'Turned to stone: you can\'t act or move, resist all damage, and can\'t be poisoned.',
    srd_text:
      "While you have the Petrified condition, you experience the following effects. Turned to Inanimate Substance. You are transformed, along with any nonmagical objects you are wearing and carrying, into a solid inanimate substance (usually stone). Your weight increases by a factor of ten, and you cease aging. Incapacitated. You have the Incapacitated condition. Speed 0. Your Speed is 0 and can't increase. Attacks Affected. Attack rolls against you have Advantage. Saving Throws Affected. You automatically fail Strength and Dexterity saving throws. Resist Damage. You have Resistance to all damage. Poison Immunity. You have Immunity to the Poisoned condition.",
    effects: [
      { hook: 'includes_condition', condition: 'condition.incapacitated' },
      { hook: 'speed', op: 'set', value: 0 },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self' } },
      { hook: 'auto_state', state: 'auto_fail_save', qualifier: { abilities: ['str', 'dex'] } },
      {
        hook: 'resistance',
        to: [
          'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
          'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
        ],
      },
      { hook: 'immunity', to: ['condition.poisoned'] },
    ],
    resolution: 'novel', // transformation, ×10 weight, and ceased aging are prose the Engine escalates.
    meta: {},
  },
  // 11. Poisoned — SIGN-OFF: disadvantage on attack rolls AND ability checks. Two hooks, no prose remainder → routine.
  {
    id: 'condition.poisoned',
    entityType: 'condition',
    name: 'Poisoned',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: 'Sickened: you roll attacks and ability checks at a disadvantage.',
    srd_text:
      "While you have the Poisoned condition, you experience the following effect. Ability Checks and Attacks Affected. You have Disadvantage on attack rolls and ability checks.",
    effects: [
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'self' } },
      { hook: 'disadvantage', scope: { kind: 'ability_check' } },
    ],
    resolution: 'routine',
    meta: {},
  },
  // 12. Prone — SIGN-OFF: BYTE-MATCHES fixtures/prone.json. Attack disadv (self); adv (against, melee_5ft);
  //    disadv (against, ranged); crawl-only movement; stand-up cost in meta.endedBy.
  {
    id: 'condition.prone',
    entityType: 'condition',
    name: 'Prone',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain:
      "You're on the ground: your attacks are worse, melee attacks against you are better, and standing up costs half your movement.",
    srd_text:
      "While you have the Prone condition, you experience the following effects. Restricted Movement. Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and thereby end the condition. If your Speed is 0, you can't right yourself. Attacks Affected. You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage.",
    effects: [
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'self' } },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self', range: 'melee_5ft' } },
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'against_self', range: 'ranged' } },
      { hook: 'movement_mode', mode: 'crawl_only' },
    ],
    resolution: 'routine',
    meta: { endedBy: [{ action: 'stand', cost: 'half_speed_round_down', requires: 'speed > 0' }] },
  },
  // 13. Restrained — SIGN-OFF: Speed 0; attacks vs you advantage + your attacks disadvantage; DEX saves disadvantage.
  {
    id: 'condition.restrained',
    entityType: 'condition',
    name: 'Restrained',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "Bound in place: Speed 0, attacks against you are better, your attacks are worse, and Dexterity saves suffer.",
    srd_text:
      "While you have the Restrained condition, you experience the following effects. Speed 0. Your Speed is 0 and can't increase. Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage. Saving Throws Affected. You have Disadvantage on Dexterity saving throws.",
    effects: [
      { hook: 'speed', op: 'set', value: 0 },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self' } },
      { hook: 'disadvantage', scope: { kind: 'attack_roll', by: 'self' } },
      { hook: 'disadvantage', scope: { kind: 'saving_throw', by: 'self', ability: 'dex' } },
    ],
    resolution: 'routine',
    meta: {},
  },
  // 14. Stunned — SIGN-OFF: ⊃ Incapacitated; auto-fail STR/DEX saves; attacks vs you have advantage.
  {
    id: 'condition.stunned',
    entityType: 'condition',
    name: 'Stunned',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "Reeling: you can't act, auto-fail Strength and Dexterity saves, and attacks against you have advantage.",
    srd_text:
      "While you have the Stunned condition, you experience the following effects. Incapacitated. You have the Incapacitated condition. Saving Throws Affected. You automatically fail Strength and Dexterity saving throws. Attacks Affected. Attack rolls against you have Advantage.",
    effects: [
      { hook: 'includes_condition', condition: 'condition.incapacitated' },
      { hook: 'auto_state', state: 'auto_fail_save', qualifier: { abilities: ['str', 'dex'] } },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self' } },
    ],
    resolution: 'routine',
    meta: {},
  },
  // 15. Unconscious — SIGN-OFF: ⊃ Incapacitated AND ⊃ Prone; Speed 0; attacks vs you advantage; auto-fail STR/DEX;
  //    melee-5ft auto-crit; drop-held-items / unaware / remain-prone-on-end are prose → novel.
  {
    id: 'condition.unconscious',
    entityType: 'condition',
    name: 'Unconscious',
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: "Out cold: you can't act or move, drop what you hold, auto-fail Strength and Dexterity saves, and nearby hits are critical.",
    srd_text:
      "While you have the Unconscious condition, you experience the following effects. Inert. You have the Incapacitated and Prone conditions, and you drop whatever you're holding. When this condition ends, you remain Prone. Speed 0. Your Speed is 0 and can't increase. Attacks Affected. Attack rolls against you have Advantage. Saving Throws Affected. You automatically fail Strength and Dexterity saving throws. Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you. Unaware. You're unaware of your surroundings.",
    effects: [
      { hook: 'includes_condition', condition: 'condition.incapacitated' },
      { hook: 'includes_condition', condition: 'condition.prone' },
      { hook: 'speed', op: 'set', value: 0 },
      { hook: 'advantage', scope: { kind: 'attack_roll', by: 'against_self' } },
      { hook: 'auto_state', state: 'auto_fail_save', qualifier: { abilities: ['str', 'dex'] } },
      { hook: 'auto_state', state: 'auto_crit_against', qualifier: { range: 'melee_5ft' } },
    ],
    resolution: 'novel', // drop-held-items, unaware, and "remain Prone when it ends" are prose the Engine escalates.
    meta: {},
  },
];

/** The verified conditions, validated against the contracts schema at module load. */
export const CONDITIONS: RulesEntity[] = RAW.map((r) => RulesEntitySchema.parse(r));
