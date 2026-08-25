/**
 * The map a new campaign opens onto.
 *
 * WHY THIS EXISTS AT ALL. A play session needs a room, and the DM cannot draw
 * one until the room editor lands (M4, with the Session Planner). Rather than
 * let "begin the session" open into nothing, a campaign gets one plain lit room
 * with the party standing on it. It is honest about being a starting point: no
 * scenery, no monsters, nothing pretending to be authored content.
 *
 * FULLY REVEALED, DELIBERATELY. Fog is the mechanism that makes the DM's view
 * and a player's view genuinely different — `filterRoomForViewer` strips
 * unrevealed cells from a player payload server-side. Seeding a map with
 * hidden areas would mean inventing a dungeon nobody designed, so every cell
 * starts revealed and the fog machinery runs with nothing yet to hide. The
 * moment a DM draws a real map, it has something to do.
 *
 * The party stands near the west edge in a column, which is the arrangement a
 * group takes when they have walked in through a door and nothing has happened
 * yet — not a combat formation, because there is no combat.
 */
import type { Cell, Room, PlacedToken } from '@questra/contracts';

/** Twenty by fourteen: a room, not a field. Big enough that movement means something. */
const DEFAULT_GRID = { w: 20, h: 14 } as const;

export interface StarterRoomInput {
  roomId: string;
  /** Creature ids to place — character ids, in roster order. */
  creatureIds: readonly string[];
}

/**
 * Every cell of a w×h grid as "x,y" keys — the room's `revealed` set.
 *
 * Stored as keys rather than a bitmask because that is what RoomSchema takes:
 * trivially serializable and diffable, and the brush and quick-reveal both
 * just add or remove keys (Brief 06 §2).
 */
function allCells(w: number, h: number): string[] {
  const keys: string[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) keys.push(`${String(x)},${String(y)}`);
  }
  return keys;
}

/**
 * Where the party stands: a column near the west edge, centred vertically.
 *
 * Deliberately spread one cell apart rather than packed — adjacent tokens read
 * as a huddle, and a five-foot gap is what a group walking into a room
 * actually looks like. Wraps to a second column past six, so a large party
 * does not run off the map.
 */
function partyCells(count: number, grid: { w: number; h: number }): Cell[] {
  const cells: Cell[] = [];
  const perColumn = 6;
  const startY = Math.max(0, Math.floor((grid.h - Math.min(count, perColumn) * 2) / 2));
  for (let i = 0; i < count; i++) {
    const column = Math.floor(i / perColumn);
    const row = i % perColumn;
    cells.push({ x: 2 + column * 2, y: Math.min(grid.h - 1, startY + row * 2) });
  }
  return cells;
}

export function starterRoom({ roomId, creatureIds }: StarterRoomInput): Room {
  const grid = { ...DEFAULT_GRID };
  const cells = partyCells(creatureIds.length, grid);

  const tokens: PlacedToken[] = creatureIds.map((creatureRef, i) => ({
    id: `tok_${creatureRef}`,
    creatureRef,
    cell: cells[i] ?? { x: 2, y: 2 },
    size: 'medium',
    /* Neither hidden nor staged: these are the players' own characters, and a
       player who could not see their own token would have nothing to move. */
    hidden: false,
    staged: false,
  }));

  return {
    id: roomId,
    /**
     * The steading the party starts at.
     *
     * A bare id rather than a path: the renderer resolves it under /maps, so a
     * DM can drop a different picture in without a rebuild. The grid is 20×14
     * (1.43:1) and the art is close enough to that ratio that stretching it to
     * the grid is imperceptible — which matters, because the GRID is the
     * coordinate system and distances are measured in cells, not pixels.
     */
    terrainImageRef: 'steading.png',
    gridSize: grid,
    /* No difficult terrain and no darkness: an empty room has no features to
       tag, and inventing some would be inventing a dungeon. */
    cellTags: {},
    revealed: allCells(grid.w, grid.h),
    assets: [],
    tokens,
  };
}
