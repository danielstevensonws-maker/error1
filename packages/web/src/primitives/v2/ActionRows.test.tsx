/**
 * ActionRows — the property that matters most: nothing is ever hidden without
 * a door back to it. `MAX_SLOTS` is ONE ceiling per economy, run both
 * directions: under it, dashed growth sockets pad the row out; over it, one
 * overflow tile replaces the excess. An earlier pass used two different
 * constants for those two jobs and produced rows that showed a growth socket
 * and an overflow tile at once — nonsense, since sockets and real tiles are
 * the same size, so "room to grow" and "too much to fit" can't both be true
 * of the same row at once. The tests below hold that mutual exclusivity, and
 * the overflow tile's promise that it always opens a real way to reach what
 * it is hiding.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ActionRows } from './ActionRows.js';
import { MAX_SLOTS, type TileVM } from './viewModel.js';

afterEach(cleanup);

const tile = (id: string, economy: TileVM['economy']): TileVM => ({
  id, name: id, economy, glyph: 'spark', detail: `${id} detail`, greyReason: null,
  explain: { id, kicker: '', title: id, value: '', rows: [], rule: '' },
});

/**
 * Exactly one more than the cap, so this can never silently stop testing
 * anything when `MAX_SLOTS` is retuned — the fixture derives from the same
 * constant the component reads, rather than a number copied out of it.
 */
const oneOverTheCap = (economy: TileVM['economy']): TileVM[] =>
  Array.from({ length: MAX_SLOTS[economy] + 1 }, (_, i) => tile(`${economy}${i}`, economy));

describe('ActionRows — the overflow tile', () => {
  it('a thin economy gets growth sockets, no overflow tile', () => {
    render(<ActionRows tiles={[tile('a', 'action')]} onUse={() => {}} />);
    expect(screen.queryByRole('button', { name: /more.*abilities|more.*ability/i })).toBeNull();
  });

  it('an economy exactly at MAX_SLOTS still gets zero overflow tiles', () => {
    const tiles = Array.from({ length: MAX_SLOTS.bonus }, (_, i) => tile(`b${i}`, 'bonus'));
    render(<ActionRows tiles={tiles} onUse={() => {}} />);
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('one tile past MAX_SLOTS gets exactly one overflow tile with the right count', () => {
    render(<ActionRows tiles={oneOverTheCap('bonus')} onUse={() => {}} />);
    expect(screen.getByText('+1')).toBeDefined();
    // Sockets and overflow are mutually exclusive within one economy.
    expect(screen.queryByRole('button', { name: /empty bonus slot/i })).toBeNull();
  });

  it('clicking the overflow tile calls onShowMore, never onUse', () => {
    const onUse = vi.fn();
    const onShowMore = vi.fn();
    render(<ActionRows tiles={oneOverTheCap('bonus')} onUse={onUse} onShowMore={onShowMore} />);
    fireEvent.click(screen.getByText('+1'));
    expect(onShowMore).toHaveBeenCalledOnce();
    expect(onUse).not.toHaveBeenCalled();
  });

  it('the overflow tile explains itself in the detail strip on focus, same discipline as every other tile', () => {
    render(<ActionRows tiles={oneOverTheCap('bonus')} onUse={() => {}} onShowMore={() => {}} />);
    fireEvent.mouseEnter(screen.getByText('+1'));
    expect(screen.getByText(/open your character sheet to use the rest/i)).toBeDefined();
  });

  it('without onShowMore wired, the tile still renders — it is a display fact, not a feature flag', () => {
    render(<ActionRows tiles={oneOverTheCap('bonus')} onUse={() => {}} />);
    expect(screen.getByText('+1')).toBeDefined();
  });

  /**
   * MAX_SLOTS.reaction is pinned to real data (see viewModel.ts): no SRD class
   * has more than 3 reaction-cast spells (Wizard/Sorcerer top out at Shield,
   * Counterspell, Feather Fall). Plus the universal Opportunity Attack, that is
   * 4 — the actual ceiling for any single-class character. This fixture is
   * that exact worst case, by name, not a synthetic count, and it must NOT
   * overflow: if it does, the cap is wrong again.
   */
  it("a Wizard holding every reaction spell in the SRD fits without overflowing", () => {
    const wizardsReactions: TileVM[] = [
      tile('universal.opportunity-attack', 'reaction'),
      tile('spell.shield', 'reaction'),
      tile('spell.counterspell', 'reaction'),
      tile('spell.feather-fall', 'reaction'),
    ];
    render(<ActionRows tiles={wizardsReactions} onUse={() => {}} />);
    expect(screen.queryByRole('button', { name: /more.*reaction/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /empty reaction slot/i })).toBeNull();
  });

  /**
   * THE REGRESSION TEST FOR THE EXACT BUG THAT HAPPENED. When sockets padded
   * up to a separate, bigger constant than the overflow cap, an empty row's
   * socket count silently stopped matching `MAX_SLOTS` — the two only agreed
   * by coincidence for whichever economy a given test happened to check. This
   * asserts the identity directly, for all three economies at once: an empty
   * row shows exactly `MAX_SLOTS[economy]` sockets and no overflow tile, and
   * one more than the cap shows exactly one overflow tile and zero sockets.
   * If a future change reintroduces two different constants, this fails
   * immediately rather than waiting on an economy-specific test to notice.
   */
  it.each(['action', 'bonus', 'reaction'] as const)(
    'empty %s row: sockets === MAX_SLOTS, never more; one-over-cap: overflow only, zero sockets',
    (economy) => {
      const { unmount } = render(<ActionRows tiles={[]} onUse={() => {}} />);
      expect(screen.getAllByRole('button', { name: new RegExp(`empty ${economy} slot`, 'i') })).toHaveLength(MAX_SLOTS[economy]);
      unmount();

      render(<ActionRows tiles={oneOverTheCap(economy)} onUse={() => {}} />);
      expect(screen.getByText('+1')).toBeDefined();
      expect(screen.queryByRole('button', { name: new RegExp(`empty ${economy} slot`, 'i') })).toBeNull();
    },
  );
});
