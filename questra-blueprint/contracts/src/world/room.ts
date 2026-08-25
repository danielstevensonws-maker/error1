/**
 * Room, grid geometry, and fog (Brief 06 §1–§4). The grid metric is locked by
 * ADR-0012: square grid, 5 ft per cell, diagonals cost 5 ft (Chebyshev).
 *
 * `affectedCells` and `distFt` live HERE so the engine (batch saves) and the
 * canvas (highlight) call ONE geometry — never two implementations (§4.5). Fog
 * uses the same visibility choke point as events: `filterRoomForViewer` strips
 * unrevealed cells and hidden/staged tokens BEFORE a player payload is built
 * (non-negotiable #3 — server-side, not client-side hiding).
 */
import { z } from 'zod';
import { CellSchema, type Cell } from '../play/events.js';

const ID = z.string().min(1);

export const CreatureSizeSchema = z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
export type CreatureSize = z.infer<typeof CreatureSizeSchema>;

/** Footprint (in cells) per creature size (§1). */
export function footprintOf(size: CreatureSize): number {
  switch (size) {
    case 'tiny': case 'small': case 'medium': return 1;
    case 'large': return 2;
    case 'huge': return 3;
    case 'gargantuan': return 4;
  }
}

// ---- distance (ADR-0012: Chebyshev, diagonals cost 5 ft) ------------------

/** distFt(a,b) = 5 * max(|dx|,|dy|). */
export function distFt(a: Cell, b: Cell): number {
  return 5 * Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// ---- room shapes (§2) -----------------------------------------------------

export const AssetFlagsSchema = z.object({
  blocking: z.boolean(),
  movable: z.boolean(),
  interactive: z.boolean(),
  difficultTerrain: z.boolean(),
});

export const PlacedAssetSchema = z.object({
  id: ID,
  imageRef: z.string(),
  cell: CellSchema,
  footprint: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
  flags: AssetFlagsSchema,
  state: z.string().optional(),       // 'closed' | 'open' — swap imageRef per state
  prepNote: z.string().optional(),    // pinned manual-trigger reminder (dm_only)
});
export type PlacedAsset = z.infer<typeof PlacedAssetSchema>;

export const PlacedTokenSchema = z.object({
  id: ID,
  creatureRef: ID,
  cell: CellSchema,
  size: CreatureSizeSchema,
  hidden: z.boolean(),
  staged: z.boolean(),
});
export type PlacedToken = z.infer<typeof PlacedTokenSchema>;

export const CellTagSchema = z.object({
  difficultTerrain: z.boolean().optional(),
  light: z.enum(['bright', 'dim', 'dark']).optional(),
});
export type CellTag = z.infer<typeof CellTagSchema>;

export const RoomSchema = z.object({
  id: ID,
  terrainImageRef: z.string(),
  gridSize: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
  /** cellTags keyed by "x,y". */
  cellTags: z.record(z.string(), CellTagSchema),
  /** fog: the revealed cells, as a set of "x,y" keys (a serializable bitmask). */
  revealed: z.array(z.string()),
  assets: z.array(PlacedAssetSchema),
  tokens: z.array(PlacedTokenSchema),
});
export type Room = z.infer<typeof RoomSchema>;

/** "x,y" key for a cell (fog + cellTags use string keys for trivial serialization). */
export function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}

// ---- AoE geometry (§4) — one function, engine + canvas both call it -------

export type AoeShape =
  | { kind: 'sphere' | 'cylinder' | 'emanation'; radiusFt: number }
  | { kind: 'cube'; sizeFt: number }
  | { kind: 'line'; lengthFt: number; widthFt: number; toward: Cell }
  | { kind: 'cone'; lengthFt: number; toward: Cell };

/**
 * The affected-cell rule (§4, locked): a cell is affected if its CENTER lies
 * within the shape. Sphere/cylinder/emanation use Chebyshev distFt ≤ radius
 * (consistent with ADR-0012). Returns cells within a bounding search around the
 * anchor. Pure — the engine batch-save and the canvas overlay both call this.
 */
export function affectedCells(shape: AoeShape, anchor: Cell): Cell[] {
  const out: Cell[] = [];
  const push = (x: number, y: number) => out.push({ x, y });

  if (shape.kind === 'sphere' || shape.kind === 'cylinder' || shape.kind === 'emanation') {
    const r = Math.floor(shape.radiusFt / 5);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (distFt(anchor, { x: anchor.x + dx, y: anchor.y + dy }) <= shape.radiusFt) push(anchor.x + dx, anchor.y + dy);
    }
    return out;
  }
  if (shape.kind === 'cube') {
    const n = Math.floor(shape.sizeFt / 5);
    for (let dx = 0; dx < n; dx++) for (let dy = 0; dy < n; dy++) push(anchor.x + dx, anchor.y + dy);
    return out;
  }
  if (shape.kind === 'line') {
    const len = Math.floor(shape.lengthFt / 5);
    const stepX = Math.sign(shape.toward.x - anchor.x);
    const stepY = Math.sign(shape.toward.y - anchor.y);
    for (let i = 1; i <= len; i++) push(anchor.x + stepX * i, anchor.y + stepY * i);
    return out;
  }
  if (shape.kind !== 'cone') return out;
  // cone: cells within length whose angle from the ray ≤ 45° each side.
  const len = Math.floor(shape.lengthFt / 5);
  const dirX = Math.sign(shape.toward.x - anchor.x);
  const dirY = Math.sign(shape.toward.y - anchor.y);
  for (let dx = -len; dx <= len; dx++) for (let dy = -len; dy <= len; dy++) {
    if (dx === 0 && dy === 0) continue;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > len) continue;
    // within the 90° cone facing (dirX,dirY): the dominant axis must match the direction
    const alignedX = dirX !== 0 && Math.sign(dx) === dirX && Math.abs(dx) >= Math.abs(dy);
    const alignedY = dirY !== 0 && Math.sign(dy) === dirY && Math.abs(dy) >= Math.abs(dx);
    if (alignedX || alignedY) push(anchor.x + dx, anchor.y + dy);
  }
  return out;
}

// ---- fog / player payload (§2, §6.3) — the choke point --------------------

import type { Viewer } from '../play/visibility.js';

/**
 * Strip a room to what a viewer may receive (Brief 06 §2/§6.3). Players get:
 * revealed cells only (cellTags for unrevealed cells removed), NO hidden/staged
 * tokens, and asset prepNotes removed (dm_only). The DM gets the full room. This
 * is the visibility choke point extended to snapshot assembly — server-side.
 */
export function filterRoomForViewer(room: Room, viewer: Viewer): Room {
  if (viewer.role === 'dm') return room;
  const revealedSet = new Set(room.revealed);
  const cellTags: Record<string, CellTag> = {};
  for (const [key, tag] of Object.entries(room.cellTags)) if (revealedSet.has(key)) cellTags[key] = tag;
  return {
    ...room,
    cellTags,
    assets: room.assets
      .filter((a) => revealedSet.has(cellKey(a.cell)))
      .map(({ prepNote, ...rest }) => rest), // drop dm_only prep notes
    tokens: room.tokens.filter((t) => !t.hidden && !t.staged && revealedSet.has(cellKey(t.cell))),
  };
}
