/**
 * MapCanvas — THE map. One renderer, three modes, two fits.
 *
 * It calls the ONE contracts geometry — distFt / affectedCells / cellKey —
 * never a second implementation (Brief 06 §4.5), so the highlight a player
 * sees is the same maths the engine batch-saves. That is the whole reason
 * there is one of these and not one per screen.
 *
 * WHAT THIS ABSORBED. The play screen had grown its own `TableGround`: a
 * decorative CSS grid with tokens positioned by percentage, standing in for a
 * map because this component could not fill a viewport. That gap is now a
 * `fit` prop rather than a second component, so the play screen draws the REAL
 * room — real fog, real cell tags, real geometry — instead of wallpaper that
 * merely looked like one.
 *
 *   fit="contain"  an element on a page: keeps its radius, border and shadow.
 *   fit="fill"     the ground beneath a floating HUD: edge to edge, no chrome,
 *                  and a vignette so glass panels keep contrast at the corners.
 *
 * CELLS STAY SQUARE IN BOTH, which is why `fill` centres the grid rather than
 * stretching it. Stretching would make cells rectangular, and `distFt` assumes
 * square cells — a stretched map would draw range rings that disagree with the
 * engine's own answer, which is exactly the class of bug the shared-geometry
 * rule exists to prevent. Pick a room whose proportions suit the screen and
 * the fill is edge to edge anyway.
 *
 * FOG IS SERVER-SIDE (CLAUDE.md non-negotiable #3): the caller passes a room
 * already run through `filterRoomForViewer` for player/table viewers, so this
 * component never receives unrevealed cells or hidden/staged tokens to leak.
 * `isFogged` below is presentation only — if a hidden token DID reach the
 * client this would happily draw it, which is why the filtering happens
 * upstream, not here.
 *
 * ALLEGIANCE IS NOT IN THE ROOM. A `Room` holds positions; it has no idea who
 * is on your side, and it should not — the same room renders differently for
 * every viewer. The caller supplies `present` from the projection, which is
 * also where the enemy-secrecy rule lands: allies may carry numbers, enemies
 * get a WORD (Unhurt, Bloodied, Down), because an enemy's exact hit points are
 * the DM's to reveal.
 */
import { useMemo, type ReactElement, type ReactNode } from 'react';
import { distFt, affectedCells, cellKey, type Room, type Cell, type AoeShape } from '@questra/contracts';
import { DesignStyles, Eyebrow, micro, statMeta } from '../design/index.js';

export type MapMode = 'edit' | 'play' | 'table';

/** Contained element, or full-bleed ground under a floating HUD. */
export type MapFit = 'contain' | 'fill';

/**
 * How one creature should read to THIS viewer. Supplied by the caller from the
 * projection, never by the room.
 */
export interface TokenPresentation {
  /**
   * What this creature is CALLED to this viewer — "Skirmisher", not
   * `npc-goblin-1`. Names live with allegiance, for the same reason: a room
   * stores a `creatureRef`, and the DM may have named that goblin for the
   * table without renaming it in the room. Absent ⇒ initials off the ref,
   * which is a fallback, not a plan.
   */
  name?: string;
  /** drives the ring colour. Absent ⇒ a neutral disc. */
  side?: 'you' | 'ally' | 'foe';
  /** the one word under the disc — Unhurt, Bloodied, Down, Dying. */
  tag?: string;
  /** this creature is taking its turn right now. */
  acting?: boolean;
  down?: boolean;
}

export interface MapCanvasProps {
  room: Room;
  mode: MapMode;
  /** Default "contain". */
  fit?: MapFit;
  /** Max cell size in px, as a ceiling on the map's rendered width. Contain only. */
  cellPx?: number;
  /** an AoE template to preview (anchor + shape) — highlights affected cells. */
  aoe?: { shape: AoeShape; anchor: Cell };
  /** measure-from cell: highlights range rings (distFt) from here, e.g. an attacker. */
  measureFrom?: Cell;
  /** per-creature presentation, keyed by `creatureRef`. */
  present?: Record<string, TokenPresentation>;
  /** token click (play/edit): select or begin a move. */
  onTokenClick?: (creatureRef: string) => void;
  /** cell click (edit: paint / play: move target). */
  onCellClick?: (cell: Cell) => void;
}

export function MapCanvas({
  room,
  mode,
  fit = 'contain',
  cellPx = 40,
  aoe,
  measureFrom,
  present,
  onTokenClick,
  onCellClick,
}: MapCanvasProps): ReactElement {
  const { w, h } = room.gridSize;
  const cellPctX = 100 / w;
  const cellPctY = 100 / h;
  const revealed = useMemo(() => new Set(room.revealed), [room.revealed]);
  const affected = useMemo(() => {
    if (aoe === undefined) return new Set<string>();
    return new Set(affectedCells(aoe.shape, aoe.anchor).map(cellKey));
  }, [aoe]);

  // Range numbers and the table badge are chrome for the people running the
  // game; the spectator view stays clean.
  /**
   * Where the terrain art lives. A bare id becomes a file under /maps so a DM
   * can drop a picture in without a build step; anything already looking like a
   * path or a URL is used as it stands.
   */
  const terrainUrl = room.terrainImageRef
    ? (/^(https?:|\/|data:)/.test(room.terrainImageRef)
        ? room.terrainImageRef
        : `/maps/${room.terrainImageRef}`)
    : null;

  const chrome = mode !== 'table';
  const filling = fit === 'fill';

  const grid = (
    <div
      className="qa2-map-grid"
      style={{
        aspectRatio: `${w} / ${h}`,
        ...(filling ? { width: `min(100%, calc(100vh * ${w / h}))` } : { maxWidth: w * cellPx }),
        /**
         * THE TERRAIN ART, UNDER THE GRID.
         *
         * `terrainImageRef` has been in the room schema from the beginning and
         * nothing ever drew it, so every table played on bare grid lines over a
         * dark ground — which is why the game looked unfinished no matter what
         * was built on top of it (owner, 2026-08-25: "the game looks plain
         * without a map involved").
         *
         * The image is stretched to the grid deliberately: the grid IS the
         * coordinate system, five feet a square, and `distFt` assumes square
         * cells. A map drawn for a different aspect gets distorted rather than
         * silently breaking every distance on the board.
         */
        /*
         * FOUR LINE LAYERS, NOT TWO. The first pair is every cell; the second
         * is every FIFTH cell, drawn in the same token so it costs no new
         * value. A grid of uniform hairlines reads as graph paper, and a
         * battle mat is what a table actually plays on — five feet a square,
         * twenty-five to a major block, which is also how anybody counts
         * distance by eye. It is the cheapest thing on either play screen that
         * makes the ground look like somewhere.
         *
         * The major lines come FIRST so the terrain art, when there is any,
         * paints over the lot of them.
         */
        backgroundImage: [
          'linear-gradient(to right, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline)))',
          'linear-gradient(to bottom, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline)))',
          'linear-gradient(to right, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline)))',
          'linear-gradient(to bottom, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline)))',
          ...(terrainUrl ? [`url("${terrainUrl}")`] : []),
        ].join(', '),
        backgroundSize: [
          `${cellPctX * 5}% ${cellPctY * 5}%`,
          `${cellPctX * 5}% ${cellPctY * 5}%`,
          `${cellPctX}% ${cellPctY}%`,
          `${cellPctX}% ${cellPctY}%`,
          ...(terrainUrl ? ['100% 100%'] : []),
        ].join(', '),
      }}
    >
      {/* cell states: fog, AoE, difficult terrain, and the measure rings */}
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => {
          const cell = { x, y };
          const key = cellKey(cell);
          const isFogged = mode !== 'edit' && !revealed.has(key); // edit sees all
          const tag = room.cellTags[key];
          const ring = measureFrom !== undefined ? distFt(measureFrom, cell) : undefined;
          const cls = [
            'qa2-map-cell',
            isFogged ? 'is-fogged' : '',
            !isFogged && affected.has(key) ? 'is-aoe' : '',
            !isFogged && tag?.difficultTerrain === true ? 'is-difficult' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={key}
              type="button"
              className={cls}
              onClick={onCellClick !== undefined ? () => onCellClick(cell) : undefined}
              aria-label={`cell ${x},${y}`}
              style={{
                left: `${x * cellPctX}%`,
                top: `${y * cellPctY}%`,
                width: `${cellPctX}%`,
                height: `${cellPctY}%`,
                cursor: onCellClick !== undefined ? 'pointer' : 'default',
                ...micro,
              }}
            >
              {chrome && ring !== undefined && ring > 0 && ring <= 15 ? ring : ''}
            </button>
          );
        }),
      )}

      {/*
        Assets: a footprint you can read at a glance. Blocking ones are solid
        and outlined — you cannot walk there; passable ones stay dashed and
        empty. That used to be a tiny glyph in the middle of the rectangle,
        which at map scale was a speck of dust with a legend nobody has.
      */}
      {room.assets.map((a) => (
        <div
          key={a.id}
          className={`qa2-map-asset${a.flags.blocking ? ' is-blocking' : ''}`}
          aria-label={`asset ${a.id}${a.state !== undefined ? ` (${a.state})` : ''}`}
          style={{
            left: `${a.cell.x * cellPctX}%`,
            top: `${a.cell.y * cellPctY}%`,
            width: `${a.footprint.w * cellPctX}%`,
            height: `${a.footprint.h * cellPctY}%`,
          }}
        />
      ))}

      {room.tokens.map((t) => {
        const p = present?.[t.creatureRef];
        const called = p?.name ?? t.creatureRef;
        const cls = [
          'qa2-token',
          p?.side !== undefined ? `is-${p.side}` : '',
          p?.acting === true ? 'is-acting' : '',
          p?.down === true ? 'is-down' : '',
          t.staged ? 'is-staged' : '',
        ].filter(Boolean).join(' ');
        const tagCls = [
          'qa2-token-tag',
          p?.tag === 'Bloodied' || p?.tag === 'Dying' ? 'is-hurt' : '',
          p?.down === true || p?.tag === 'Down' ? 'is-down' : '',
        ].filter(Boolean).join(' ');
        return (
          <button
            key={t.id}
            type="button"
            className={cls}
            onClick={onTokenClick !== undefined ? () => onTokenClick(t.creatureRef) : undefined}
            aria-label={`${called}${p?.tag !== undefined ? `, ${p.tag}` : ''}${t.staged ? ' (staged)' : ''}`}
            style={{
              left: `${t.cell.x * cellPctX}%`,
              top: `${t.cell.y * cellPctY}%`,
              width: `${cellPctX}%`,
              height: `${cellPctY}%`,
              cursor: onTokenClick !== undefined ? 'pointer' : 'default',
            }}
          >
            <span className="qa2-token-disc" style={statMeta}>{initials(called)}</span>
            {p?.tag !== undefined && <span className={tagCls}>{p.tag}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`qa2-map ${filling ? 'is-fill' : 'is-contain'}`}
      role="img"
      aria-label={`Map ${room.id} (${mode} view)`}
      style={filling ? {} : { width: '100%' }}
    >
      <DesignStyles />
      <span className="qa2-map-ground" aria-hidden="true" />
      {grid}
      {mode === 'table' && <TableBadge />}
    </div>
  );
}

/**
 * Two letters for the disc. Deliberately dumb — a real portrait replaces this
 * the moment the asset pipeline lands, and until then initials beat a coloured
 * blob for telling six creatures apart.
 *
 * It takes a NAME when the caller supplied one and a raw `creatureRef` when it
 * did not, so it has to survive both. Bookkeeping segments are dropped — the
 * kind prefix and the disambiguating number — because `npc-goblin-1` naively
 * reduced to "1", and a map of discs reading 1 and 2 next to a turn order
 * reading Skirmisher and Lookout is a map you cannot use.
 */
function initials(label: string): string {
  const words = label
    .split(/[.\-_\s]+/)
    .filter((p) => p !== '' && !/^\d+$/.test(p) && !/^(pc|npc|mon|tok)$/i.test(p));
  return (words[words.length - 1] ?? label).slice(0, 2).toUpperCase();
}

function TableBadge(): ReactNode {
  return (
    <span style={{ position: 'absolute', top: 6, right: 8, zIndex: 1 }}>
      <Eyebrow>Table view</Eyebrow>
    </span>
  );
}
