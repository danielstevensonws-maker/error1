/**
 * MapCanvas — the one map renderer, after it absorbed the play screen's
 * `TableGround`.
 *
 * These tests guard the three things that merge could quietly break:
 *
 *  1. FOG AND SECRECY. `play` and `table` hide unrevealed cells; `edit` sees
 *     everything. This is presentation on top of server-side filtering, but a
 *     regression here is the kind that ships.
 *  2. NAMES AGREE. The map and the turn order must call a creature the same
 *     thing. `npc-goblin-1` naively initialled to "1" while the spine said
 *     "Skirmisher" — two names for one goblin, and the player does the join.
 *  3. GEOMETRY COMES FROM CONTRACTS. Range rings are `distFt`, AoE cells are
 *     `affectedCells`. If this component ever grows its own maths, the
 *     highlight a player sees stops matching what the engine saves.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { distFt, affectedCells, cellKey, type Room } from '@questra/contracts';
import { MapCanvas } from './MapCanvas.js';
import { ROOM, present, NAMES, castOrder } from './v2/fixtures.js';

afterEach(cleanup);

/** A three-by-three room with one revealed cell, for the fog tests. */
const TINY: Room = {
  id: 'room.tiny',
  terrainImageRef: 'terrain.tiny',
  gridSize: { w: 3, h: 3 },
  cellTags: { '1,1': { difficultTerrain: true } },
  revealed: ['0,0'],
  assets: [],
  tokens: [{ id: 'tok.a', creatureRef: 'npc-goblin-1', cell: { x: 2, y: 2 }, size: 'small', hidden: false, staged: false }],
};

const fogged = () => document.querySelectorAll('.qa2-map-cell.is-fogged');

describe('what the viewer is allowed to see', () => {
  it('play and table fog the cells the room has not revealed', () => {
    render(<MapCanvas room={TINY} mode="play" />);
    expect(fogged().length).toBe(8); // nine cells, one revealed
    cleanup();
    render(<MapCanvas room={TINY} mode="table" />);
    expect(fogged().length).toBe(8);
  });

  it('edit sees the whole room — that is the point of edit', () => {
    render(<MapCanvas room={TINY} mode="edit" />);
    expect(fogged().length).toBe(0);
  });

  it('range numbers are chrome for the people running the game, not the table', () => {
    render(<MapCanvas room={ROOM} mode="play" measureFrom={{ x: 10, y: 8 }} />);
    // The cell one square away is 5 ft, and says so.
    expect(screen.getByLabelText('cell 11,8').textContent).toBe('5');
    cleanup();
    render(<MapCanvas room={ROOM} mode="table" measureFrom={{ x: 10, y: 8 }} />);
    expect(screen.getByLabelText('cell 11,8').textContent).toBe('');
  });
});

describe('the map and the turn order call a creature the same thing', () => {
  it('takes the name from the caller, never from the room reference', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('pc-torvald')} />);
    // `npc-goblin-1` is the ROOM's word for it. "Skirmisher" is the table's.
    expect(screen.getByLabelText(/^Skirmisher/)).toBeTruthy();
    expect(screen.queryByLabelText(/^npc-goblin-1/)).toBeNull();
  });

  it('every disc on the map matches its entry in the spine', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('pc-torvald')} />);
    for (const entry of castOrder('pc-torvald')) {
      expect(screen.getByLabelText(new RegExp(`^${entry.name}`)), `${entry.id} is missing from the map`).toBeTruthy();
    }
  });

  it('no two discs in the cast share initials', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('pc-torvald')} />);
    const discs = [...document.querySelectorAll('.qa2-token-disc')].map((n) => n.textContent);
    expect(new Set(discs).size, `duplicate initials: ${discs.join(', ')}`).toBe(discs.length);
  });

  it('falls back to the reference without producing a bare number', () => {
    // No `present` at all — every creature has to still be legible.
    render(<MapCanvas room={TINY} mode="edit" />);
    const disc = document.querySelector('.qa2-token-disc');
    expect(disc?.textContent).toBe('GO'); // npc-goblin-1, not "1"
  });

  it('the fixture names cover the whole room', () => {
    for (const t of ROOM.tokens) expect(NAMES[t.creatureRef], `${t.creatureRef} is unnamed`).toBeDefined();
  });
});

describe('allegiance and status come from the projection', () => {
  it('rings you, your allies and your enemies differently', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('pc-torvald')} />);
    expect(document.querySelectorAll('.qa2-token.is-you').length).toBe(1);
    expect(document.querySelectorAll('.qa2-token.is-foe').length).toBe(2);
    expect(document.querySelectorAll('.qa2-token.is-ally').length).toBe(3);
  });

  it('the same room reads differently for a different viewer', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('pc-mira', { yourId: 'pc-mira' })} />);
    expect(screen.getByLabelText(/^Mira/).className).toContain('is-you');
    expect(screen.getByLabelText(/^Torvald/).className).toContain('is-ally');
  });

  it('enemies carry a word, never a number', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('pc-torvald')} />);
    expect(screen.getByLabelText('Skirmisher, Bloodied')).toBeTruthy();
    expect(screen.getByLabelText('Lookout, Unhurt')).toBeTruthy();
  });

  it('marks exactly one creature as acting', () => {
    render(<MapCanvas room={ROOM} mode="play" present={present('npc-goblin-1')} />);
    const acting = document.querySelectorAll('.qa2-token.is-acting');
    expect(acting.length).toBe(1);
    expect(acting[0]?.getAttribute('aria-label')).toBe('Skirmisher, Bloodied');
  });
});

describe('geometry is the contracts geometry', () => {
  it('highlights exactly the cells affectedCells names', () => {
    const aoe = { shape: { kind: 'sphere', radiusFt: 20 } as const, anchor: { x: 12, y: 8 } };
    render(<MapCanvas room={ROOM} mode="play" aoe={aoe} />);
    const lit = new Set(
      [...document.querySelectorAll('.qa2-map-cell.is-aoe')].map((n) => n.getAttribute('aria-label')?.replace('cell ', '')),
    );
    const expected = affectedCells(aoe.shape, aoe.anchor)
      .map(cellKey)
      .filter((k) => k.split(',').every((n, i) => Number(n) >= 0 && Number(n) < (i === 0 ? ROOM.gridSize.w : ROOM.gridSize.h)));
    for (const key of expected) expect(lit.has(key.replace(',', ',')), `${key} should be lit`).toBe(true);
    expect(lit.size).toBe(expected.length);
  });

  it('the ring numbers are distFt, not a re-derivation', () => {
    const from = { x: 10, y: 8 };
    render(<MapCanvas room={ROOM} mode="play" measureFrom={from} />);
    for (const cell of [{ x: 11, y: 8 }, { x: 12, y: 8 }, { x: 12, y: 10 }]) {
      const ft = distFt(from, cell);
      expect(screen.getByLabelText(`cell ${cell.x},${cell.y}`).textContent).toBe(ft <= 15 && ft > 0 ? String(ft) : '');
    }
  });
});

describe('fit: an element on a page, or the ground under a HUD', () => {
  it('contain keeps its chrome and its width ceiling', () => {
    const { container } = render(<MapCanvas room={ROOM} mode="edit" cellPx={40} />);
    const map = container.querySelector('.qa2-map');
    expect(map?.className).toContain('is-contain');
    expect(container.querySelector<HTMLElement>('.qa2-map-grid')?.style.maxWidth).toBe(`${ROOM.gridSize.w * 40}px`);
  });

  it('fill goes edge to edge and drops the ceiling', () => {
    const { container } = render(<MapCanvas room={ROOM} mode="play" fit="fill" />);
    const map = container.querySelector('.qa2-map');
    expect(map?.className).toContain('is-fill');
    expect(container.querySelector<HTMLElement>('.qa2-map-grid')?.style.maxWidth).toBe('');
  });

  it('cells stay square in both fits — distFt assumes they are', () => {
    // The grid asks for the room's own aspect ratio rather than stretching to
    // the viewport. A stretched map would draw range rings the engine disagrees
    // with, which is the bug the shared-geometry rule exists to prevent.
    const ratio = `${ROOM.gridSize.w} / ${ROOM.gridSize.h}`;
    for (const fit of ['contain', 'fill'] as const) {
      const { container } = render(<MapCanvas room={ROOM} mode="play" fit={fit} />);
      expect(container.querySelector<HTMLElement>('.qa2-map-grid')?.style.aspectRatio).toBe(ratio);
      cleanup();
    }
  });
});

describe('assets say one thing: can I walk through it', () => {
  it('blocking footprints are marked, passable ones are not', () => {
    render(<MapCanvas room={ROOM} mode="play" />);
    const assets = [...document.querySelectorAll('.qa2-map-asset')];
    expect(assets.length).toBe(ROOM.assets.length);
    const blocking = assets.filter((n) => n.classList.contains('is-blocking'));
    expect(blocking.length).toBe(ROOM.assets.filter((a) => a.flags.blocking).length);
  });

  it('carries no glyph — a speck at map scale needs a legend nobody has', () => {
    render(<MapCanvas room={ROOM} mode="play" />);
    for (const n of document.querySelectorAll('.qa2-map-asset')) expect(n.textContent).toBe('');
  });
});
