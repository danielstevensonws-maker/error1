/**
 * The d20 pipeline — Brief 02 §3, the exact 8-step algorithm, as pure functions
 * over (rulesData, projectionState, intent). The same code runs server-side for
 * truth and client-side read-only for greying. The Engine never calls an AI
 * model (ADR-0005) — nothing here imports anything AI.
 *
 * Determinism comes from an injected RNG (`rng(sides) → int in [1,sides]`): the
 * server passes a CSPRNG; the golden trace passes a scripted stub returning the
 * fixture's exact rolls. Physical-dice mode passes the manually-entered d20.
 */
import {
  collapseAdvantage,
  COVER_AC_BONUS,
  type RulesEntity,
  type PlayEvent,
  type NamedModifier,
} from '@questra/contracts';
import { abilityMod, type Combatant, type ProjectionState } from './state.js';
import { narration } from './narration.js';

/** RNG contract: return an integer in [1, sides]. */
export type Rng = (sides: number) => number;

/** A monotonic clock/seq/id source, injected so the trace is reproducible. */
export interface EmitContext {
  /** Next sequence number; the emitter increments it. */
  seq: number;
  /** ISO timestamps to stamp events with, consumed in order. */
  timestamps: string[];
  /** Event ids to assign, consumed in order. */
  ids: string[];
  /** The roll id to stamp on the roll_made event. */
  rollId: string;
  /** The actor for the declaring intent (player/dm), and the engine actor for cascades. */
  actor: PlayEvent['actor'];
}

/** The rules dataset the pipeline consults (conditions carry the hooks it reads). */
export interface RulesData {
  conditionsById: Map<string, RulesEntity>;
}

export function buildRulesData(entities: readonly RulesEntity[]): RulesData {
  const conditionsById = new Map<string, RulesEntity>();
  for (const e of entities) if (e.entityType === 'condition') conditionsById.set(e.id, e);
  return { conditionsById };
}

/** An attack intent (the slice's shape; the full Intent union is validated at the wire). */
export interface AttackInput {
  kind: 'attack';
  attackerId: string;
  targetId: string;
  actionName: string;
  /** Attack modifier dice (e.g. "1d8 + 3" for a longsword) — the weapon's damage. */
  damageDice: string;
  damageType: string;
  /** Declared cover on the target. */
  coverDegree?: 'none' | 'half' | 'three_quarters' | 'total';
  /** Active spell effects on the attacker that modify the roll, e.g. Bless (+1d4). */
  attackModHooks?: { label: string; dice: string; sourceId?: string }[];
}

/** Result of collecting adv/disadv from a creature's conditions for an attack roll it makes. */
interface AdvCollection {
  advSources: string[];
  disSources: string[];
}

/**
 * Step 3 (partial) — collect advantage/disadvantage on the ATTACKER's attack
 * roll from its own conditions. Prone → disadvantage on your attack rolls;
 * Poisoned → disadvantage; etc. Reads the condition entities' effect hooks.
 */
function collectAttackerAdv(attacker: Combatant, rules: RulesData): AdvCollection {
  const advSources: string[] = [];
  const disSources: string[] = [];
  const visit = (conditionId: string) => {
    const cond = rules.conditionsById.get(conditionId);
    if (!cond) return;
    for (const hook of cond.effects) {
      if (hook.hook === 'includes_condition') visit(hook.condition);
      if (hook.hook === 'disadvantage' && hook.scope.kind === 'attack_roll' && hook.scope.by === 'self') {
        disSources.push(conditionId);
      }
      if (hook.hook === 'advantage' && hook.scope.kind === 'attack_roll' && hook.scope.by === 'self') {
        advSources.push(conditionId);
      }
    }
  };
  for (const ac of attacker.conditions) visit(ac.conditionId);
  return { advSources, disSources };
}

/** Round a "NdM + K" expression into rolled parts, returning total and itemized dice. */
function rollDice(expr: string, rng: Rng): { total: number; diceTotal: number; flat: number } {
  let diceTotal = 0;
  let flat = 0;
  // tokens like "1d8", "3", "+3", "1d4"
  const parts = expr.replace(/\s+/g, '').match(/[+-]?(\d+d\d+|\d+)/g) ?? [];
  for (const p of parts) {
    const sign = p.startsWith('-') ? -1 : 1;
    const body = p.replace(/^[+-]/, '');
    const dm = body.match(/^(\d+)d(\d+)$/);
    if (dm) {
      const n = Number(dm[1]);
      const sides = Number(dm[2]);
      for (let i = 0; i < n; i++) diceTotal += sign * rng(sides);
    } else {
      flat += sign * Number(body);
    }
  }
  return { total: diceTotal + flat, diceTotal, flat };
}

/**
 * Resolve an attack through the full pipeline, emitting the event cascade
 * (roll_made → damage_applied → narration). Pure: state is read, not mutated;
 * the caller folds the returned events. `causeSeq` is the intent_declared seq
 * that all cascade events carry as causeId.
 */
export function resolveAttack(
  input: AttackInput,
  state: ProjectionState,
  rules: RulesData,
  rng: Rng,
  ctx: EmitContext,
  causeId: string,
): PlayEvent[] {
  const attacker = state.combatants[input.attackerId];
  const target = state.combatants[input.targetId];
  if (!attacker || !target) throw new Error('resolveAttack: attacker or target not in state');

  const events: PlayEvent[] = [];
  let tsIdx = 0;
  let idIdx = 0;
  const engineActor: PlayEvent['actor'] = { kind: 'engine' };
  const emit = (body: PlayEvent['body']): void => {
    events.push({
      seq: ctx.seq++,
      id: ctx.ids[idIdx++]!,
      causeId,
      at: ctx.timestamps[tsIdx++]!,
      actor: engineActor,
      visibility: 'public',
      body,
    });
  };

  // Step 4 — collapse advantage from the attacker's conditions.
  const { advSources, disSources } = collectAttackerAdv(attacker, rules);
  const collapsed = collapseAdvantage(advSources, disSources);
  const sources = collapsed === 'disadvantage' ? disSources : collapsed === 'advantage' ? advSources : [];

  // Step 5 — sum modifiers: STR (or attack ability) + proficiency + attack-mod hooks (Bless).
  const strMod = abilityMod(attacker.abilities.str);
  const modifiers: NamedModifier[] = [
    { label: 'STR', value: strMod },
    { label: 'Proficiency', value: attacker.profBonus },
  ];
  for (const h of input.attackModHooks ?? []) {
    const rolled = rollDice(h.dice, rng);
    modifiers.push({ label: h.label, value: rolled.total, ...(h.sourceId ? { sourceId: h.sourceId } : {}) });
  }
  const modTotal = modifiers.reduce((s, m) => s + m.value, 0);

  // Step 6 — roll d20 (two if not straight, keep per advantage/disadvantage).
  const rollA = rng(20);
  let d20 = rollA;
  let secondD20: number | undefined;
  if (collapsed !== 'straight') {
    const rollB = rng(20);
    d20 = collapsed === 'advantage' ? Math.max(rollA, rollB) : Math.min(rollA, rollB);
    // secondD20 is the die that was NOT kept (the log records both).
    secondD20 = d20 === rollA ? rollB : rollA;
  }
  const total = d20 + modTotal;

  // Cover applies to the TARGET's AC (step 5 note); best degree only.
  const cover = input.coverDegree && input.coverDegree !== 'total' ? COVER_AC_BONUS[input.coverDegree] : 0;
  const targetAc = target.ac + cover;

  // Step 6/7 — outcome. Nat 20 crit, nat 1 fumble; ties hit.
  let outcome: 'hit' | 'miss' | 'crit' | 'fumble';
  if (d20 === 20) outcome = 'crit';
  else if (d20 === 1) outcome = 'fumble';
  else outcome = total >= targetAc ? 'hit' : 'miss';

  emit({
    t: 'roll_made',
    rollId: ctx.rollId,
    kind: 'attack_roll',
    d20,
    ...(secondD20 !== undefined ? { secondD20 } : {}),
    collapsed,
    sources,
    modifiers,
    total,
    vs: { type: 'ac', value: targetAc },
    outcome,
    entry: 'server',
  } as PlayEvent['body']);

  // Step 7 — damage cascade on a hit/crit.
  if (outcome === 'hit' || outcome === 'crit') {
    const dmg = rollDice(input.damageDice, rng);
    const breakdown: NamedModifier[] = [
      { label: `${input.actionName} (${input.damageDice.split(/[+ ]/)[0]})`, value: dmg.diceTotal },
      ...(dmg.flat !== 0 ? [{ label: 'STR', value: dmg.flat }] : []),
    ];
    const amount = dmg.total;
    // resistance/vulnerability/immunity adjustment (SRD order; no stacking).
    const adjusted: { resistance?: true; vulnerability?: true; immunity?: true } = {};
    let finalAmount = amount;
    if (target.damageImmunities?.includes(input.damageType)) { adjusted.immunity = true; finalAmount = 0; }
    else if (target.resistances?.includes(input.damageType)) { adjusted.resistance = true; finalAmount = Math.floor(amount / 2); }
    else if (target.vulnerabilities?.includes(input.damageType)) { adjusted.vulnerability = true; finalAmount = amount * 2; }

    const absorbed = Math.min(target.tempHp, finalAmount);
    const afterTemp = finalAmount - absorbed;
    const resultingHp = Math.max(0, target.hp - afterTemp);

    emit({
      t: 'damage_applied',
      creatureId: target.id,
      amount: finalAmount,
      type: input.damageType,
      breakdown,
      adjusted,
      ...(absorbed > 0 ? { tempHpAbsorbed: absorbed } : {}),
      resultingHp,
    } as PlayEvent['body']);

    // Step 8 — narration, from the template pack (deterministic; never an AI call).
    const narrator = { name: attacker.name, maxHp: attacker.maxHp, prone: attacker.conditions.some((c) => c.conditionId === 'condition.prone') };
    const victim = { name: target.name, maxHp: target.maxHp };
    const text = outcome === 'crit'
      ? narration.crit(narrator, victim, finalAmount, input.damageType, resultingHp)
      : narration.hit(narrator, victim, finalAmount, input.damageType, resultingHp);
    emit({ t: 'narration', text, from: 'engine' } as PlayEvent['body']);
  } else {
    const narrator = { name: attacker.name, maxHp: attacker.maxHp };
    const victim = { name: target.name, maxHp: target.maxHp };
    const text = outcome === 'fumble' ? narration.fumble(narrator, victim) : narration.miss(narrator, victim);
    emit({ t: 'narration', text, from: 'engine' } as PlayEvent['body']);
  }

  return events;
}
