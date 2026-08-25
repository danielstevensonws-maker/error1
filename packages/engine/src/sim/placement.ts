/**
 * Where something the DM brings in mid-session stands.
 *
 * WHY THE SERVER DECIDES THIS AND NOT THE CLIENT. A creature arriving needs a
 * square, and picking one means knowing what is already on the board: the other
 * tokens, the blocking scenery, the edges of the grid. That is exactly the
 * knowledge a client is not the authority on — two DMs adding at once, or one
 * DM on a stale room, would each pick confidently and disagree. So the arrival
 * event carries the cell, and every screen replays it. Same division as a move:
 * the server settles where, the clients draw it.
 *
 * WHY IT ARRIVES ON THE FAR SIDE, BUT NOT AGAINST THE WALL. `starterRoom`
 * stands the party in a column near the WEST edge, because that is what a group
 * who has just walked in looks like. Anything the DM brings in is,
 * overwhelmingly, something the party is about to meet — so it comes in from
 * the far side, with most of the room between them.
 *
 * About two thirds across rather than hard against the east wall, for two
 * reasons that happen to agree. A creature pinned to the boundary reads as
 * parked rather than placed: it has nowhere to have come FROM, and a fight
 * starts with it already cornered. And the play screens float their panels over
 * a full-bleed map, so the outermost columns sit underneath the journal — a DM
 * who brought a goblin in against the east wall could not see it behind their
 * own log (2026-08-25).
 *
 * All of it is staging, not rules: a DM who wants the goblin behind the party
 * moves it, which takes one tap.
 *
 * WHAT IT WILL NOT DO IS REFUSE. A board with no free square is a board the DM
 * is still allowed to add to — they may be about to move things, or the pile
 * may be the point. When nothing is free the last resort is a legal in-grid
 * cell that merely shares space, because a monster standing on another monster
 * is a thing a DM can see and fix, and "nothing happened" is not.
 */
import type { Cell, PlacedToken, Room } from '@questra/contracts';

const key = (c: Cell): string => `${String(c.x)},${String(c.y)}`;

/** Every cell a blocking asset covers, from its origin and its footprint. */
function blockedCells(room: Room): Set<string> {
  const out = new Set<string>();
  for (const a of room.assets) {
    if (!a.flags.blocking) continue;
    const w = a.footprint?.w ?? 1;
    const h = a.footprint?.h ?? 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) out.add(key({ x: a.cell.x + dx, y: a.cell.y + dy }));
    }
  }
  return out;
}

export interface ArrivalOptions {
  /**
   * A square the DM named. Honoured when it is inside the grid and free —
   * their choice outranks the heuristic, and always did in the intent schema.
   */
  preferred?: Cell | undefined;
  /**
   * Squares taken since the room was read.
   *
   * THE ROOM IS A SNAPSHOT AND ARRIVALS ARE A STREAM. Whoever calls this holds
   * a room loaded once — on the server, when the connection said hello — while
   * creatures keep arriving on top of it. Without this, the second monster of a
   * pack lands exactly where the first did, because the room has not heard
   * about the first yet. The caller knows what it has already placed; this is
   * where it says so.
   */
  taken?: readonly Cell[] | undefined;
}

/**
 * The rows of a grid, ordered from the middle outward: 7, 6, 8, 5, 9…
 *
 * WHY NOT SIMPLY TOP TO BOTTOM. Two reasons, and the second is the one that
 * bit. A monster arriving in the corner reads as a mistake, where one arriving
 * level with the party reads as staged — and the party stands centred on the
 * west edge, so the middle of the east edge is the square directly facing them.
 *
 * The other reason is that row zero is half off the screen. The map is drawn
 * full-bleed and letterboxed to the grid's aspect, so on a wide viewport the
 * top row sits exactly on the window edge and a token centred there is clipped
 * in half — which is what the first three arrivals looked like before this
 * (2026-08-25). Placing outward from the middle means the edge rows are the
 * last ones used rather than the first.
 */
function rowsFromMiddle(h: number): number[] {
  return outward(h, Math.floor((h - 1) / 2));
}

/**
 * The columns of a grid, ordered outward from where things are staged: about
 * two thirds across, which is the far side of the room from the party without
 * being the wall itself. See the header for why not the wall.
 */
function columnsFromStaging(w: number): number[] {
  return outward(w, Math.round((w - 1) * 0.7));
}

/** Indices 0…n-1, nearest `from` first: from, from-1, from+1, from-2… */
function outward(n: number, from: number): number[] {
  const out: number[] = [];
  for (let d = 0; out.length < n; d++) {
    if (from - d >= 0) out.push(from - d);
    if (d > 0 && from + d < n) out.push(from + d);
  }
  return out;
}

/**
 * A square for an arriving creature.
 *
 * The scan runs from the east edge inward, and within a column from the middle
 * outward, so a second and third monster land beside the first rather than
 * scattering. Unrevealed cells are allowed: a DM staging an ambush in fog is
 * doing the thing fog is for, and `filterRoomForViewer` keeps it off a
 * player's map until the ground around it is revealed.
 */
export function arrivalCell(room: Room, opts: ArrivalOptions = {}): Cell {
  const { w, h } = room.gridSize;
  const inGrid = (c: Cell): boolean => c.x >= 0 && c.y >= 0 && c.x < w && c.y < h;

  const taken = new Set([
    ...room.tokens.map((t) => key(t.cell)),
    ...(opts.taken ?? []).map(key),
  ]);
  const blocked = blockedCells(room);
  const free = (c: Cell): boolean => !taken.has(key(c)) && !blocked.has(key(c));

  if (opts.preferred !== undefined && inGrid(opts.preferred) && free(opts.preferred)) {
    return opts.preferred;
  }

  const rows = rowsFromMiddle(h);
  const columns = columnsFromStaging(w);
  for (const x of columns) {
    for (const y of rows) {
      const c = { x, y };
      if (free(c)) return c;
    }
  }

  /* Every square is spoken for. Stack rather than refuse — see the header. */
  return opts.preferred !== undefined && inGrid(opts.preferred)
    ? opts.preferred
    : { x: columns[0] ?? 0, y: rows[0] ?? 0 };
}

/**
 * The token an arriving creature stands on.
 *
 * The id is derived from the creature id rather than minted from a counter so
 * that two clients replaying the same event arrive at the same token — the
 * whole point of putting the cell in the event is that nobody has to guess, and
 * a random id would put the guessing straight back.
 *
 * Neither hidden nor staged. A DM who wants either has to say so, and neither
 * has a control yet; defaulting to hidden would mean a DM adds a goblin, sees
 * nothing on the players' screens, and has no way to find out why.
 */
export function arrivalToken(creatureId: string, cell: Cell): PlacedToken {
  return {
    id: `tok_${creatureId}`,
    creatureRef: creatureId,
    cell,
    size: 'medium',
    hidden: false,
    staged: false,
  };
}
