/**
 * Where a creature the DM brings in mid-session stands.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. Until 2026-08-25 `add_creature` wrote a
 * combatant and emitted an event and placed nothing, so a DM brought a goblin
 * in, the turn order gained it, and the map stayed empty — permanently, not
 * just until a reload. The whole combat layer had a creature nobody could point
 * at. The assertions here are the ones that keep that from coming back: a cell
 * is always produced, it is always inside the grid, and it does not land on
 * something already there.
 */
import { describe, it, expect } from 'vitest';
import { RoomSchema, type Room } from '@questra/contracts';
import { starterRoom } from '../src/sim/starter-room.js';
import { arrivalCell, arrivalToken } from '../src/sim/placement.js';

const party = (n = 3): Room =>
  starterRoom({ roomId: 'room_1', creatureIds: Array.from({ length: n }, (_, i) => `char_${String(i)}`) });

/** Put every free square out of reach, so the last-resort branch is the only one left. */
function packed(): Room {
  const room = party(0);
  const { w, h } = room.gridSize;
  return {
    ...room,
    tokens: Array.from({ length: w * h }, (_, i) => ({
      id: `tok_filler_${String(i)}`,
      creatureRef: `filler_${String(i)}`,
      cell: { x: i % w, y: Math.floor(i / w) },
      size: 'medium' as const,
      hidden: false,
      staged: false,
    })),
  };
}

describe('an arriving creature gets a square', () => {
  it('always gets one, and it is inside the grid', () => {
    const room = party();
    const cell = arrivalCell(room);
    expect(cell.x).toBeGreaterThanOrEqual(0);
    expect(cell.y).toBeGreaterThanOrEqual(0);
    expect(cell.x).toBeLessThan(room.gridSize.w);
    expect(cell.y).toBeLessThan(room.gridSize.h);
  });

  it('does not stand on anybody already there', () => {
    const room = party(6);
    const taken = new Set(room.tokens.map((t) => `${String(t.cell.x)},${String(t.cell.y)}`));
    const cell = arrivalCell(room);
    expect(taken.has(`${String(cell.x)},${String(cell.y)}`)).toBe(false);
  });

  /* The party stands near the west edge; something the DM brings in is almost
     always something they are about to meet, so it comes in from the far side
     with a room's width in between. */
  it('arrives on the far side from the party', () => {
    const room = party();
    const partyX = Math.max(...room.tokens.map((t) => t.cell.x));
    expect(arrivalCell(room).x).toBeGreaterThan(partyX);
  });

  it('stacks two arrivals in a column rather than scattering them', () => {
    const room = party();
    const first = arrivalCell(room);
    const withFirst: Room = { ...room, tokens: [...room.tokens, arrivalToken('foe_1', first)] };
    const second = arrivalCell(withFirst);
    expect(second).not.toEqual(first);
    expect(second.x).toBe(first.x);
  });
});

describe('the DM naming a square outranks the heuristic', () => {
  it('uses the square they asked for', () => {
    const room = party();
    expect(arrivalCell(room, { preferred: { x: 7, y: 7 } })).toEqual({ x: 7, y: 7 });
  });

  it('ignores one that is off the map', () => {
    const room = party();
    const cell = arrivalCell(room, { preferred: { x: 999, y: 999 } });
    expect(cell.x).toBeLessThan(room.gridSize.w);
    expect(cell.y).toBeLessThan(room.gridSize.h);
  });

  it('ignores one that is already occupied', () => {
    const room = party();
    const occupied = room.tokens[0]!.cell;
    expect(arrivalCell(room, { preferred: occupied })).not.toEqual(occupied);
  });
});

describe('blocking scenery', () => {
  it('is not stood on, footprint and all', () => {
    const base = party(0);
    const room: Room = {
      ...base,
      assets: [{
        id: 'asset.crate',
        imageRef: 'asset.crate',
        /* The whole east column, which is exactly where an arrival wants to go. */
        cell: { x: base.gridSize.w - 1, y: 0 },
        footprint: { w: 1, h: base.gridSize.h },
        flags: { blocking: true, movable: false, interactive: false, difficultTerrain: false },
      }],
    };
    expect(arrivalCell(room).x).toBeLessThan(base.gridSize.w - 1);
  });

  /* Scenery that does not block is scenery you can stand on. A rug laid across
     the whole staging column changes nothing about where a creature arrives. */
  it('is stood on quite happily when it does not block', () => {
    const base = party(0);
    const bare = arrivalCell(base);
    const room: Room = {
      ...base,
      assets: [{
        id: 'asset.rug',
        imageRef: 'asset.rug',
        cell: { x: bare.x, y: 0 },
        footprint: { w: 1, h: base.gridSize.h },
        flags: { blocking: false, movable: false, interactive: false, difficultTerrain: false },
      }],
    };
    expect(arrivalCell(room)).toEqual(bare);
  });
});

/**
 * A full board is still a board a DM may add to — they may be about to move
 * things, or the pile may be the point. Refusing would mean "nothing happened",
 * which is the failure this whole function exists to end.
 */
describe('a board with nowhere free', () => {
  it('still produces a legal square rather than refusing', () => {
    const room = packed();
    const cell = arrivalCell(room);
    expect(cell.x).toBeGreaterThanOrEqual(0);
    expect(cell.x).toBeLessThan(room.gridSize.w);
    expect(cell.y).toBeGreaterThanOrEqual(0);
    expect(cell.y).toBeLessThan(room.gridSize.h);
  });
});

describe('the token an arrival stands on', () => {
  it('is a valid Room member', () => {
    const room = party();
    const token = arrivalToken('foe_1', arrivalCell(room));
    expect(() => RoomSchema.parse({ ...room, tokens: [...room.tokens, token] })).not.toThrow();
  });

  /* Derived from the creature id, so two clients replaying the same event
     arrive at the same token instead of each minting their own. */
  it('has an id anybody can recompute from the event', () => {
    expect(arrivalToken('foe_1', { x: 1, y: 1 }).id).toBe(arrivalToken('foe_1', { x: 9, y: 9 }).id);
  });

  it('is visible, because a DM who wanted it hidden has no control to say so yet', () => {
    const token = arrivalToken('foe_1', { x: 1, y: 1 });
    expect(token.hidden).toBe(false);
    expect(token.staged).toBe(false);
  });
});

/**
 * Arrivals come in level with the party, not in the corner.
 *
 * Two reasons, and the second is the one that bit. A monster in the corner
 * reads as a mistake where one facing the party reads as staged — and the map
 * is drawn full-bleed and letterboxed to the grid, so on a wide viewport the
 * top row sits exactly on the window edge and a token centred there is clipped
 * in half. The first three arrivals looked like that before this (2026-08-25).
 */
describe('arrivals come in level with the party', () => {
  it('does not use the clipped top row while the middle is free', () => {
    const room = party();
    expect(arrivalCell(room).y).not.toBe(0);
  });

  it('lands within a square or two of the middle row', () => {
    const room = party();
    const middle = Math.floor((room.gridSize.h - 1) / 2);
    expect(Math.abs(arrivalCell(room).y - middle)).toBeLessThanOrEqual(1);
  });

  /* A pack fills outward from the middle: middle, one above, one below… */
  it('spreads a pack outward from the middle rather than downward', () => {
    let room = party();
    const ys: number[] = [];
    for (let i = 0; i < 5; i++) {
      const cell = arrivalCell(room);
      ys.push(cell.y);
      room = { ...room, tokens: [...room.tokens, arrivalToken(`foe_${String(i)}`, cell)] };
    }
    const middle = Math.floor((room.gridSize.h - 1) / 2);
    expect(ys[0]).toBe(middle);
    expect(new Set(ys).size).toBe(5);
    /* Every one of them is nearer the middle than the edges. */
    for (const y of ys) expect(Math.abs(y - middle)).toBeLessThanOrEqual(2);
  });

  it('still uses the edge rows once the middle is full', () => {
    const base = party(0);
    const { h } = base.gridSize;
    const staging = arrivalCell(base).x;
    /* Everything in the staging column except its top row. */
    const room: Room = {
      ...base,
      tokens: Array.from({ length: h - 1 }, (_, i) => ({
        id: `tok_f${String(i)}`,
        creatureRef: `f${String(i)}`,
        cell: { x: staging, y: i + 1 },
        size: 'medium' as const,
        hidden: false,
        staged: false,
      })),
    };
    expect(arrivalCell(room)).toEqual({ x: staging, y: 0 });
  });
});

/**
 * Not against the wall. The play screens float their panels over a full-bleed
 * map, so the outermost columns sit underneath the journal — a DM who brought a
 * goblin in against the east wall could not see it behind their own log. It
 * also just reads better: a creature on the boundary has nowhere to have come
 * from, and starts the fight already cornered.
 */
describe('arrivals stand in the room, not against the wall', () => {
  it('leaves clear board on the far side of them', () => {
    const room = party();
    expect(arrivalCell(room).x).toBeLessThan(room.gridSize.w - 1);
  });

  it('is still well clear of the party', () => {
    const room = party();
    const partyX = Math.max(...room.tokens.map((t) => t.cell.x));
    expect(arrivalCell(room).x - partyX).toBeGreaterThanOrEqual(6);
  });

  it('keeps a whole pack off the boundary', () => {
    let room = party();
    for (let i = 0; i < 4; i++) {
      const cell = arrivalCell(room);
      expect(cell.x).toBeLessThan(room.gridSize.w - 1);
      room = { ...room, tokens: [...room.tokens, arrivalToken(`foe_${String(i)}`, cell)] };
    }
  });
});
