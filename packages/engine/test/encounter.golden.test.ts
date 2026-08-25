/**
 * Starting a fight, and going round.
 *
 * The assertions are about ORDER and BOUNDARIES, which is where turn systems
 * actually break: a round that increments halfway through, a turn handed to a
 * creature nobody can play, an order lost on reconnect. The arithmetic of a
 * d20 is the pipeline's business and is tested there.
 */
import { describe, it, expect } from 'vitest';
import type { PlayEvent } from '@questra/contracts';
import { rollInitiative, advanceTurn, inCombat } from '../src/sim/encounter.js';
import { fold } from '../src/sim/projection.js';
import type { Combatant, ProjectionState } from '../src/sim/state.js';

/** `dex` is a SCORE, not a modifier — 14 means +2, the way a sheet reads. */
function combatant(id: string, dex: number, over: Partial<Combatant> = {}): Combatant {
  return {
    id,
    name: id,
    abilities: { str: 10, dex, con: 10, int: 10, wis: 10, cha: 10 },
    profBonus: 2,
    maxHp: 10,
    hp: 10,
    tempHp: 0,
    ac: 12,
    conditions: [],
    isPlayer: true,
    ...over,
  } as Combatant;
}

const state = (cs: Combatant[], over: Partial<ProjectionState> = {}): ProjectionState => ({
  combatants: Object.fromEntries(cs.map((c) => [c.id, c])),
  round: 1,
  nextSeq: 0,
  ...over,
});

const opts = { seq: 0, ids: [], at: '2026-08-23T00:00:00.000Z', causeId: 'c1' };

/** A fixed sequence of "d20 rolls", as fractions the rng returns. */
const scripted = (...d20s: number[]) => {
  let i = 0;
  return () => ((d20s[i++] ?? 1) - 1) / 20;
};

describe('rolling initiative', () => {
  it('orders everyone highest first and opens round one on the leader', () => {
    const s = state([combatant('mira', 12), combatant('bren', 10), combatant('goblin', 14)]);
    /* Mira rolls 10 (+1 = 11), Bren 18 (+0 = 18), the goblin 5 (+2 = 7). */
    const events = rollInitiative(s, scripted(10, 18, 5), opts);

    const order = events.find((e) => e.body.t === 'initiative_rolled')!.body as { order: { creatureId: string }[] };
    expect(order.order.map((o) => o.creatureId)).toEqual(['bren', 'mira', 'goblin']);

    const turn = events.find((e) => e.body.t === 'turn_advanced')!.body as { round: number; activeCreatureId: string };
    expect(turn.round).toBe(1);
    expect(turn.activeCreatureId, 'the highest roll acts first').toBe('bren');
  });

  it('shows the arithmetic for every roll, so a new player can read why', () => {
    const s = state([combatant('mira', 12)]);
    const events = rollInitiative(s, scripted(10), opts);
    const roll = events.find((e) => e.body.t === 'roll_made')!.body as {
      d20: number; modifiers: { label: string; value: number }[]; total: number;
    };
    expect(roll.d20).toBe(10);
    expect(roll.modifiers).toEqual([{ label: 'DEX', value: 1 }]);
    expect(roll.total, 'the total is the die plus the modifier, out loud').toBe(11);
  });

  /**
   * The order arrives BEFORE the turn that points into it. A client folding
   * these in sequence must never see a turn referring to an order it does not
   * have yet — that is a crash on reconnect, not a cosmetic ordering nicety.
   */
  it('never hands out a turn before the order it points into', () => {
    const events = rollInitiative(state([combatant('a', 10), combatant('b', 10)]), scripted(5, 9), opts);
    const iOrder = events.findIndex((e) => e.body.t === 'initiative_rolled');
    const iTurn = events.findIndex((e) => e.body.t === 'turn_advanced');
    expect(iOrder).toBeGreaterThanOrEqual(0);
    expect(iTurn).toBeGreaterThan(iOrder);
  });

  it('breaks a tie on dexterity, deterministically', () => {
    /* Both total 12: quick rolls 10 (+2), slow rolls 12 (+0). */
    const s = state([combatant('slow', 10), combatant('quick', 14)]);
    const events = rollInitiative(s, scripted(12, 10), opts);
    const order = events.find((e) => e.body.t === 'initiative_rolled')!.body as { order: { creatureId: string }[] };
    expect(order.order.map((o) => o.creatureId)).toEqual(['quick', 'slow']);
  });

  it('survives the fold, so the order is still there after a reconnect', () => {
    const s = state([combatant('mira', 12), combatant('bren', 10)]);
    const events = rollInitiative(s, scripted(10, 18), opts);
    const folded = fold(s, events as PlayEvent[]);
    expect(folded.order, 'a snapshot alone must be able to draw the round spine').toEqual(['bren', 'mira']);
    expect(folded.activeCreatureId).toBe('bren');
  });
});

describe('going round', () => {
  const three = () => state(
    [combatant('a', 10), combatant('b', 10), combatant('c', 10)],
    { order: ['a', 'b', 'c'], activeCreatureId: 'a', round: 1 },
  );
  const turn = (s: ProjectionState) =>
    advanceTurn(s, { seq: 9, id: 'e9', at: opts.at, causeId: 'c2' })[0]!.body as
      { round: number; activeCreatureId: string };

  it('hands the turn along without touching the round', () => {
    const b = turn(three());
    expect(b).toEqual({ t: 'turn_advanced', round: 1, activeCreatureId: 'b' });
  });

  /** Wrapping past the last creature IS the new round — there is no separate event. */
  it('starts the next round when the order wraps', () => {
    const s = three();
    s.activeCreatureId = 'c';
    expect(turn(s)).toEqual({ t: 'turn_advanced', round: 2, activeCreatureId: 'a' });
  });

  it('skips a creature that has left the fight', () => {
    const s = three();
    delete s.combatants.b;
    expect(turn(s).activeCreatureId, 'nobody gets a turn they cannot take').toBe('c');
  });

  it('produces nothing when the fight is over', () => {
    const s = state([], { order: [] });
    expect(advanceTurn(s, { seq: 1, id: 'e', at: opts.at, causeId: 'c' })).toEqual([]);
  });
});

describe('exploring versus fighting', () => {
  it('is exploring until somebody rolls', () => {
    expect(inCombat(state([combatant('mira', 12)]))).toBe(false);
  });

  it('is a fight once there is an order and a turn', () => {
    const s = state([combatant('mira', 12)], { order: ['mira'], activeCreatureId: 'mira' });
    expect(inCombat(s)).toBe(true);
  });
});
