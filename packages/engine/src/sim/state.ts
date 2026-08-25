/**
 * Projection state — Brief 02 §3/§4. The Engine is event-sourced (ADR-0001):
 * game state is the fold of the event log, never stored directly. These types
 * are ENGINE-INTERNAL (not a contract): contracts own the event vocabulary (the
 * wire), and this state is derived from it. The pure pipeline functions read
 * this state; client-side greying re-runs the same functions over the same
 * folded flags (it does not import this type as a shared contract).
 *
 * A Combatant is the minimal per-creature state the d20 pipeline needs. Its
 * ability scores / proficiency come from the character sheet (Brief 03, M2.2);
 * until that lands, callers construct combatants directly (the golden trace does
 * this from the fixture's stated stats).
 */
import type { Ability } from '@questra/contracts';

export interface ActiveCondition {
  conditionId: string;
  /** The seq of the event that applied it (for removal bookkeeping). */
  appliedBySeq?: number;
}

export interface Combatant {
  id: string;
  name: string;
  abilities: Record<Ability, number>;
  /** Proficiency bonus. */
  profBonus: number;
  /** Skills the creature is proficient in (contracts skill slugs). */
  proficientSkills?: string[];
  /** Saving throws the creature is proficient in. */
  proficientSaves?: Ability[];
  maxHp: number;
  hp: number;
  tempHp: number;
  ac: number;
  /** Damage types this creature resists / is vulnerable / immune to. */
  resistances?: string[];
  vulnerabilities?: string[];
  damageImmunities?: string[];
  /** Active conditions on the creature (by contracts condition id). */
  conditions: ActiveCondition[];
  /** Concentration, if any: the spell being concentrated on. */
  concentratingOn?: string;
  /** Whether this creature is a player character (affects the 0-HP branch: unconscious vs dies). */
  isPlayer: boolean;
  /**
   * The death-save ladder, while this creature is dying. Folded from the log
   * rather than held anywhere else — a tally kept beside the events is a second
   * copy free to drift, and the drift here is somebody dying who should not.
   * Both reset to zero on regaining any hit points or becoming Stable (SRD).
   */
  deathSuccesses?: number;
  deathFailures?: number;
}

export interface ProjectionState {
  /** All combatants by id. */
  combatants: Record<string, Combatant>;
  /** Initiative order (creature ids) and whose turn it is, if in combat. */
  round: number;
  activeCreatureId?: string;
  /**
   * Initiative order, highest first — the creature ids in the sequence they
   * act. Empty means nobody has rolled and the table is exploring, which is a
   * different thing from a fight with one combatant in it.
   */
  order?: string[];
  /** The next seq the server would assign (monotonic). */
  nextSeq: number;
}

/** ability modifier from a score: floor((score - 10) / 2). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** A creature is Bloodied at ≤ half max HP (SRD). Derived, not stored. */
export function isBloodied(c: Combatant): boolean {
  return c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2);
}

/** Deep-ish clone of a combatant (arrays copied) so folds don't mutate prior state. */
export function cloneCombatant(c: Combatant): Combatant {
  return {
    ...c,
    abilities: { ...c.abilities },
    conditions: c.conditions.map((x) => ({ ...x })),
    ...(c.proficientSkills ? { proficientSkills: [...c.proficientSkills] } : {}),
    ...(c.proficientSaves ? { proficientSaves: [...c.proficientSaves] } : {}),
    ...(c.resistances ? { resistances: [...c.resistances] } : {}),
    ...(c.vulnerabilities ? { vulnerabilities: [...c.vulnerabilities] } : {}),
    ...(c.damageImmunities ? { damageImmunities: [...c.damageImmunities] } : {}),
    ...(c.deathSuccesses !== undefined ? { deathSuccesses: c.deathSuccesses } : {}),
    ...(c.deathFailures !== undefined ? { deathFailures: c.deathFailures } : {}),
  };
}

export function cloneState(s: ProjectionState): ProjectionState {
  const combatants: Record<string, Combatant> = {};
  for (const [id, c] of Object.entries(s.combatants)) combatants[id] = cloneCombatant(c);
  return {
    combatants,
    round: s.round,
    ...(s.activeCreatureId !== undefined ? { activeCreatureId: s.activeCreatureId } : {}),
    ...(s.order !== undefined ? { order: [...s.order] } : {}),
    nextSeq: s.nextSeq,
  };
}
