/**
 * A creature the DM brings in has to land somewhere.
 *
 * WHAT WAS BROKEN. `add_creature` wrote a combatant and emitted an event and
 * chose no square — the `cell` was forwarded only when the client had named
 * one, and no client ever did. So a DM brought a goblin in, the turn order
 * gained it, and the map stayed empty: not until a reload, but permanently,
 * because there was never a square in the log for anyone to replay. The whole
 * combat layer had a creature nobody could point at (found by running the app,
 * 2026-08-25).
 *
 * WHY THE SERVER CHOOSES IT. Picking a square means knowing what is already on
 * the board, and two clients with different ideas of the room would each pick
 * confidently and disagree. The server settles where; the clients draw it. That
 * is the same division a move already uses.
 *
 * The GEOMETRY of the choice is the engine's and is tested there. What is
 * tested here is the part this file owns: that a square is always chosen, that
 * it reaches the log, and that a second monster does not land on the first.
 */
import { describe, it, expect } from 'vitest';
import type { Cell, Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';
import { starterRoom, type Combatant, type ProjectionState } from '@questra/engine';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };
const SESSION = { playSessionId: 'ps_test' };

const room = starterRoom({ roomId: 'room_1', creatureIds: ['char_a', 'char_b'] });

function combatant(id: string): Combatant {
  return {
    id, name: id,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 12,
    conditions: [], isPlayer: true,
  } as Combatant;
}

const state = (): ProjectionState => ({ combatants: { mira: combatant('mira') }, round: 1, nextSeq: 0 });
const envelope = (intent: unknown) => ({ idempotencyKey: 'k-' + Math.random().toString(36).slice(2, 10), intent });

const goblin = (over: Record<string, unknown> = {}) =>
  ({ kind: 'add_creature', name: 'Goblin Warrior', maxHp: 10, ac: 15, ...over });

/** A resolver wired to a real room, as the live server wires it. */
const seated = () => makeSliceResolver({ roomFor: () => room });

function addedBody(out: ReturnType<ReturnType<typeof seated>>): { creatureId: string; cell?: Cell } {
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error('refused');
  return out.events[0]!.body as unknown as { creatureId: string; cell?: Cell };
}

describe('bringing a creature in', () => {
  it('is the DM\'s to do, not a player\'s', () => {
    expect(seated()(envelope(goblin()), state(), PLAYER, SESSION).ok).toBe(false);
  });

  it('puts a square in the event, so every screen replays the same one', () => {
    const body = addedBody(seated()(envelope(goblin()), state(), DM, SESSION));
    expect(body.cell).toBeDefined();
  });

  it('lands inside the grid', () => {
    const body = addedBody(seated()(envelope(goblin()), state(), DM, SESSION));
    expect(body.cell!.x).toBeGreaterThanOrEqual(0);
    expect(body.cell!.y).toBeGreaterThanOrEqual(0);
    expect(body.cell!.x).toBeLessThan(room.gridSize.w);
    expect(body.cell!.y).toBeLessThan(room.gridSize.h);
  });

  it('does not stand on a character already on the board', () => {
    const taken = new Set(room.tokens.map((t) => `${String(t.cell.x)},${String(t.cell.y)}`));
    const body = addedBody(seated()(envelope(goblin()), state(), DM, SESSION));
    expect(taken.has(`${String(body.cell!.x)},${String(body.cell!.y)}`)).toBe(false);
  });

  it('honours a square the DM named', () => {
    const body = addedBody(seated()(envelope(goblin({ cell: { x: 7, y: 3 } })), state(), DM, SESSION));
    expect(body.cell).toEqual({ x: 7, y: 3 });
  });
});

/**
 * THE ONE THAT BIT. The room is read once, when the connection said hello, and
 * never hears about what has been placed on top of it — so without the
 * resolver's own record of what it has handed out, every monster of a pack
 * lands on the square the first one took.
 */
describe('a pack of them', () => {
  it('does not stack the second on the first', () => {
    const resolve = seated();
    const first = addedBody(resolve(envelope(goblin()), state(), DM, SESSION));
    const second = addedBody(resolve(envelope(goblin({ name: 'Goblin Boss' })), state(), DM, SESSION));
    expect(second.cell).not.toEqual(first.cell);
  });

  it('keeps every one of six on its own square', () => {
    const resolve = seated();
    const cells = Array.from({ length: 6 }, () =>
      JSON.stringify(addedBody(resolve(envelope(goblin()), state(), DM, SESSION)).cell));
    expect(new Set(cells).size).toBe(6);
  });

  /* Two tables adding at once must not share a tally — the squares taken at one
     have nothing to do with the squares taken at the other. */
  it('keeps one table\'s squares out of another\'s', () => {
    const resolve = seated();
    const here = addedBody(resolve(envelope(goblin()), state(), DM, SESSION));
    const there = addedBody(resolve(envelope(goblin()), state(), DM, { playSessionId: 'ps_other' }));
    expect(there.cell).toEqual(here.cell);
  });
});

describe('taking one off the board', () => {
  it('gives its square back to the next arrival', () => {
    const resolve = seated();
    const first = addedBody(resolve(envelope(goblin()), state(), DM, SESSION));

    /* The removal has to name a creature the projection knows about, which is
       what the live server's folded state would carry by now. */
    const withFoe: ProjectionState = {
      ...state(),
      combatants: { ...state().combatants, [first.creatureId]: combatant(first.creatureId) },
    };
    const removed = resolve(envelope({ kind: 'remove_creature', creatureId: first.creatureId }), withFoe, DM, SESSION);
    expect(removed.ok).toBe(true);

    const next = addedBody(resolve(envelope(goblin()), state(), DM, SESSION));
    expect(next.cell).toEqual(first.cell);
  });
});

/**
 * A session whose room was never primed — the cache is filled on hello, and a
 * resolver called before that, or in a golden, has nothing to read. It places
 * by the grid's own defaults rather than refusing: a creature standing
 * somewhere plain can be moved, and one that never arrived cannot.
 */
describe('a table with no room loaded', () => {
  it('still puts the creature somewhere', () => {
    const body = addedBody(makeSliceResolver()(envelope(goblin()), state(), DM, SESSION));
    expect(body.cell).toBeDefined();
  });

  it('still honours a square the DM named', () => {
    const body = addedBody(makeSliceResolver()(envelope(goblin({ cell: { x: 4, y: 4 } })), state(), DM, SESSION));
    expect(body.cell).toEqual({ x: 4, y: 4 });
  });
});
