/**
 * The room, with the log applied.
 *
 * THE TWO BUGS THIS FILE EXISTS TO STOP COMING BACK are the same bug at two
 * ages. The room arrives once over HTTP while the log flows past on the socket,
 * so anything that only exists in the log is invisible on the map: first that
 * was movement (tokens sat frozen wherever they were at page load), and then it
 * was arrivals (a DM brought a goblin in, the server accepted it, the turn
 * order gained it, and the board stayed empty through reloads and restarts).
 *
 * The placement itself is NOT tested here, because it is not decided here — the
 * server chooses the square and puts it in the event, so every screen at the
 * table replays the same one. See the engine's placement suite for the choosing.
 */
import { describe, it, expect } from 'vitest';
import type { PlayEvent, Room } from '@questra/contracts';
import { roomWithMoves } from './roomWithMoves.js';

const room: Room = {
  id: 'room_1',
  terrainImageRef: 'steading.png',
  gridSize: { w: 10, h: 8 },
  cellTags: {},
  revealed: ['0,0', '1,1', '2,2'],
  assets: [],
  tokens: [
    { id: 'tok_char_a', creatureRef: 'char_a', cell: { x: 2, y: 2 }, size: 'medium', hidden: false, staged: false },
  ],
};

let seq = 0;
const ev = (body: unknown): PlayEvent => ({
  seq: seq++,
  id: `e${String(seq)}`,
  at: '2026-08-25T00:00:00.000Z',
  causeId: `c${String(seq)}`,
  actor: { kind: 'dm', accountId: 'acc_1' },
  visibility: 'public',
  body,
} as PlayEvent);

const cellOf = (r: Room | null, creatureRef: string) =>
  r?.tokens.find((t) => t.creatureRef === creatureRef)?.cell;

describe('nothing in the log', () => {
  it('hands the room back untouched', () => {
    expect(roomWithMoves(room, [])).toBe(room);
  });

  it('has nothing to say about a room that is not there yet', () => {
    expect(roomWithMoves(null, [])).toBeNull();
  });
});

describe('a creature the DM brought in', () => {
  it('stands on the square the server chose', () => {
    const live = roomWithMoves(room, [ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } })]);
    expect(cellOf(live, 'foe_1')).toEqual({ x: 9, y: 0 });
  });

  /* The whole reason the server emits the cell: two screens replaying one log
     must not each invent a position. */
  it('lands on the same square for everybody replaying the same log', () => {
    const log = [ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 8, y: 3 } })];
    expect(roomWithMoves(room, log)).toEqual(roomWithMoves(room, log));
  });

  it('does not disturb who was already on the board', () => {
    const live = roomWithMoves(room, [ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } })]);
    expect(cellOf(live, 'char_a')).toEqual({ x: 2, y: 2 });
    expect(live?.tokens).toHaveLength(2);
  });

  /* An event with no cell is one from before the server placed arrivals. It is
     dropped rather than guessed at, because a guess here is exactly the
     disagreement between screens the server placement exists to prevent. */
  it('is left off the board if the event never said where', () => {
    const live = roomWithMoves(room, [ev({ t: 'creature_added', creatureId: 'foe_old', name: 'Goblin', maxHp: 7, ac: 15 })]);
    expect(live?.tokens).toHaveLength(1);
  });

  it('is not doubled once the room itself has been refetched with them on it', () => {
    const refetched: Room = {
      ...room,
      tokens: [...room.tokens, { id: 'tok_foe_1', creatureRef: 'foe_1', cell: { x: 9, y: 0 }, size: 'medium', hidden: false, staged: false }],
    };
    const live = roomWithMoves(refetched, [ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } })]);
    expect(live?.tokens.filter((t) => t.creatureRef === 'foe_1')).toHaveLength(1);
  });
});

describe('a creature the DM took away', () => {
  it('leaves the board', () => {
    const live = roomWithMoves(room, [ev({ t: 'creature_removed', creatureId: 'char_a' })]);
    expect(live?.tokens).toHaveLength(0);
  });

  it('leaves it even if they arrived during this same session', () => {
    const live = roomWithMoves(room, [
      ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } }),
      ev({ t: 'creature_removed', creatureId: 'foe_1' }),
    ]);
    expect(cellOf(live, 'foe_1')).toBeUndefined();
  });

  /* A DM who removes something by mistake adds it back, and it must return. */
  it('comes back if the DM brings them in again', () => {
    const live = roomWithMoves(room, [
      ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } }),
      ev({ t: 'creature_removed', creatureId: 'foe_1' }),
      ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 5, y: 5 } }),
    ]);
    expect(cellOf(live, 'foe_1')).toEqual({ x: 5, y: 5 });
  });
});

describe('moving', () => {
  it('still moves whoever was already there', () => {
    const live = roomWithMoves(room, [ev({ t: 'token_moved', tokenId: 'char_a', from: { x: 2, y: 2 }, to: { x: 4, y: 4 }, path: [{ x: 3, y: 3 }, { x: 4, y: 4 }], forced: false, costFt: 10 })]);
    expect(cellOf(live, 'char_a')).toEqual({ x: 4, y: 4 });
  });

  it('reveals the squares walked through', () => {
    const live = roomWithMoves(room, [ev({ t: 'token_moved', tokenId: 'char_a', from: { x: 2, y: 2 }, to: { x: 4, y: 4 }, path: [{ x: 3, y: 3 }, { x: 4, y: 4 }], forced: false, costFt: 10 })]);
    expect(live?.revealed).toContain('3,3');
    expect(live?.revealed).toContain('4,4');
  });

  /**
   * The ordering guarantee that matters: a creature added and then walked
   * somewhere must end up where it was WALKED to, not back at the square it
   * arrived on. Arrivals are folded first and then moved, so the move wins.
   */
  it('moves a creature that arrived during this session', () => {
    const live = roomWithMoves(room, [
      ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } }),
      ev({ t: 'token_moved', tokenId: 'foe_1', from: { x: 9, y: 0 }, to: { x: 6, y: 2 }, path: [{ x: 6, y: 2 }], forced: false, costFt: 15 }),
    ]);
    expect(cellOf(live, 'foe_1')).toEqual({ x: 6, y: 2 });
  });

  /* A move names the CREATURE where the room names the token that stands for
     it, so both spellings have to hit. */
  it('finds the token whether the move names the creature or the token', () => {
    const live = roomWithMoves(room, [
      ev({ t: 'creature_added', creatureId: 'foe_1', name: 'Goblin', maxHp: 7, ac: 15, cell: { x: 9, y: 0 } }),
      ev({ t: 'token_moved', tokenId: 'tok_foe_1', from: { x: 9, y: 0 }, to: { x: 1, y: 1 }, path: [{ x: 1, y: 1 }], forced: false, costFt: 5 }),
    ]);
    expect(cellOf(live, 'foe_1')).toEqual({ x: 1, y: 1 });
  });
});
