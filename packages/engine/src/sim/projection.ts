/**
 * The event-sourced projection — Brief 02 §3/§4. `fold(events)` replays the log
 * into ProjectionState. This is the single definition of "current state"; the
 * server and any client derive state the same way (ADR-0001).
 *
 * Undo folds like any other event: an `undo_applied` reverses the effects of the
 * events it names by re-deriving state from the surviving log. We implement undo
 * by REPLAY-WITHOUT-THE-UNDONE: an undone cause's events (and the undo marker)
 * are skipped when folding. This makes the §4 property hold by construction —
 * `fold(log) === fold(log + cause + undo(cause))` — because the appended cause
 * and its cascade are exactly the events the undo marker removes.
 */
import type { PlayEvent, EventBody } from '@questra/contracts';
import { deathSave } from './cascade.js';
import { cloneState, type Combatant, type ProjectionState } from './state.js';

/** Build the initial state from a set of combatants (pre-combat setup). */
export function initialState(combatants: Combatant[], nextSeq = 0): ProjectionState {
  const byId: Record<string, Combatant> = {};
  for (const c of combatants) byId[c.id] = c;
  return { combatants: byId, round: 0, nextSeq };
}

/** Collect the seqs undone by `undo_applied` events, plus their causes, to skip on replay. */
function undoneSeqs(events: readonly PlayEvent[]): Set<number> {
  const skip = new Set<number>();
  const bySeq = new Map<number, PlayEvent>();
  for (const e of events) bySeq.set(e.seq, e);
  for (const e of events) {
    if (e.body.t === 'undo_applied') {
      skip.add(e.seq); // the undo marker itself doesn't mutate state
      for (const s of e.body.reversedSeqs) skip.add(s);
      // also skip the cause event (the intent_declared) that started the group
      const causeId = e.body.undoneCauseId;
      for (const c of events) if (c.id === causeId) skip.add(c.seq);
    }
  }
  return skip;
}

/** Apply one event body to a mutable state (the reducer step). */
function apply(state: ProjectionState, event: PlayEvent): void {
  const b: EventBody = event.body;
  const c = (id: string): Combatant | undefined => state.combatants[id];
  switch (b.t) {
    case 'damage_applied': {
      const t = c(b.creatureId);
      if (t) t.hp = b.resultingHp;
      break;
    }
    case 'healing_applied': {
      const t = c(b.creatureId);
      if (!t) break;
      t.hp = b.resultingHp;
      /* SRD: "The number of both is reset to zero when you regain any Hit
         Points." Any healing at all wipes the ladder — one hit point off a
         natural 20 counts exactly as much as a full heal. */
      if (b.resultingHp > 0) {
        t.deathSuccesses = 0;
        t.deathFailures = 0;
        /* And you are no longer unconscious from dropping. */
        t.conditions = t.conditions.filter((x) => x.conditionId !== 'condition.unconscious');
      }
      break;
    }
    case 'condition_applied': {
      const t = c(b.creatureId);
      if (t && !t.conditions.some((x) => x.conditionId === b.conditionId)) {
        t.conditions.push({ conditionId: b.conditionId, appliedBySeq: event.seq });
      }
      break;
    }
    case 'condition_removed': {
      const t = c(b.creatureId);
      if (t) t.conditions = t.conditions.filter((x) => x.conditionId !== b.conditionId);
      break;
    }
    case 'concentration_started': {
      const t = c(b.creatureId);
      if (t) t.concentratingOn = b.spellId;
      break;
    }
    case 'concentration_ended': {
      const t = c(b.creatureId);
      if (t) delete t.concentratingOn;
      break;
    }
    case 'creature_unconscious': {
      const t = c(b.creatureId);
      if (t && !t.conditions.some((x) => x.conditionId === 'condition.unconscious')) {
        t.conditions.push({ conditionId: 'condition.unconscious', appliedBySeq: event.seq });
      }
      break;
    }
    case 'initiative_rolled': {
      /* The order IS the fight. Without it folded, a reconnecting client knows
         whose turn it is but not who is next, and the round spine cannot be
         drawn from a snapshot alone. The event carries totals; the projection
         keeps only the resulting sequence, because the totals are a roll
         result the log already holds. */
      state.order = [...b.order]
        .sort((x, y) => y.total - x.total)
        .map((e) => e.creatureId);
      /**
       * AN EMPTY ORDER ENDS THE FIGHT, and that has to release the turn too.
       *
       * Clearing the order while leaving activeCreatureId pointing at whoever
       * was last up left the table permanently mid-combat: every screen asks
       * "is anybody's turn happening?" to decide whether we are fighting, so
       * the DM's "Roll for initiative" never came back after the first fight
       * (owner, 2026-08-25 — "it only appeared for the first time").
       */
      if (state.order.length === 0) delete state.activeCreatureId;
      break;
    }
    /**
     * The death-save ladder, kept where every other derived number is kept.
     *
     * The SRD: "The number of both is reset to zero when you regain any Hit
     * Points or become Stable." Healing and stabilising are handled in their
     * own cases; this one only counts.
     */
    case 'roll_made': {
      if (b.kind !== 'death_save') break;
      const dying = b.sources?.[0] === undefined ? undefined : state.combatants[b.sources[0]];
      if (!dying) break;
      const result = deathSave(b.d20, dying.deathSuccesses ?? 0, dying.deathFailures ?? 0);
      dying.deathSuccesses = result.successes;
      dying.deathFailures = result.failures;
      break;
    }

    case 'creature_stabilized': {
      const t = state.combatants[b.creatureId];
      if (!t) break;
      /* Stable is not dying: the ladder is cleared and the SRD's unconscious
         condition stays until they are healed or come round. */
      t.deathSuccesses = 0;
      t.deathFailures = 0;
      break;
    }

    case 'creature_died': {
      const t = state.combatants[b.creatureId];
      if (!t) break;
      t.hp = 0;
      break;
    }

    case 'turn_advanced': {
      state.round = b.round;
      state.activeCreatureId = b.activeCreatureId;
      break;
    }

    /**
     * A creature the DM put on the board. Folded rather than seated at session
     * start, because monsters arrive mid-session — that is what an encounter
     * IS — and a base that could only be set once would never see them.
     */
    case 'creature_added': {
      state.combatants[b.creatureId] = {
        id: b.creatureId,
        name: b.name,
        /* A monster's own scores are the compendium's; these are the SRD's
           "average" defaults, used only when the DM invents something. The
           add_creature intent supplies real ones when it has them. */
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        profBonus: 2,
        maxHp: b.maxHp,
        hp: b.maxHp,
        tempHp: 0,
        ac: b.ac,
        conditions: [],
        /* Not a player character: this is what makes the 0-HP branch kill it
           outright rather than knocking it unconscious, and what makes a
           player's screen show it as a word rather than a number. */
        isPlayer: false,
      };
      break;
    }

    case 'creature_removed': {
      delete state.combatants[b.creatureId];
      /* Also out of the turn order, or the fight hands a turn to somebody who
         is no longer on the board. */
      if (state.order) state.order = state.order.filter((id) => id !== b.creatureId);
      if (state.activeCreatureId === b.creatureId) delete state.activeCreatureId;
      break;
    }
    default:
      // events that don't mutate combatant/turn state (intent_declared, roll_made,
      // narration, whisper_sent, escalated_to_ruling, …) leave the projection as-is.
      break;
  }
  if (event.seq >= state.nextSeq) state.nextSeq = event.seq + 1;
}

/**
 * Fold an event log into state, starting from `base`. Undone events (and their
 * causes / undo markers) are skipped, so the fold reflects the net state.
 */
export function fold(base: ProjectionState, events: readonly PlayEvent[]): ProjectionState {
  const skip = undoneSeqs(events);
  const state = cloneState(base);
  for (const e of events) {
    if (skip.has(e.seq)) {
      if (e.seq >= state.nextSeq) state.nextSeq = e.seq + 1; // seqs still advance
      continue;
    }
    apply(state, e);
  }
  return state;
}
