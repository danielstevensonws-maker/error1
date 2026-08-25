/**
 * The workbench — the left column below the turn order, where every tool opens.
 *
 * FOUR GUARANTEES, all of them about the same thing: that a DM always knows
 * what is on their screen and how to get rid of it.
 *
 *   at rest        the glossary, so the best space on the screen is never blank
 *   one at a time  opening a tool closes the last one, by construction
 *   press to close the tile that opened it closes it, and lands back on the glossary
 *   escape         the same, from the keyboard, mid-sentence
 *
 * The one-at-a-time rule used to be five independent booleans, two of which
 * could be true together — which is how the compendium ended up over the ask
 * sheet over the map. It is now a single value, and these tests are what stop
 * it quietly becoming five again.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DmScreen } from './DmScreen.js';
import { castOrder, ROOM, ENTRIES } from '../primitives/v2/fixtures.js';
import type { PlayView } from './projectionToView.js';

afterEach(cleanup);

const cast = castOrder('pc-torvald').map((c) => ({
  ...c,
  ac: 14,
  ...(c.kind === 'foe' ? { hp: { current: 4, max: 10 } } : {}),
}));

const view: PlayView = {
  scene: { title: 'The Ruined Steading', subtitle: 'Round 3', round: 3, elapsed: '' },
  hero: null,
  cast,
  room: ROOM,
  entries: ENTRIES,
  turn: { active: false, activeName: 'Torvald', exploring: false },
};

const noop = (): void => undefined;

function dm(over: Partial<Parameters<typeof DmScreen>[0]> = {}) {
  return render(
    <DmScreen
      view={view}
      room={ROOM}
      campaignName="The Ruined Steading"
      seats={[{ accountId: 'a2', displayName: 'Dan', characterName: 'Torvald', here: true }]}
      prompts={[]}
      rulings={[]}
      effect={null}
      fetchJson={(async () => ({ entries: [], types: [] })) as <T>(p: string) => Promise<T>}
      onLeave={noop} onSay={noop} onSpeakAs={noop} onWhisper={noop}
      onStartCombat={noop} onEndCombat={noop} onAdvanceTurn={noop} onRest={noop}
      onAnswerPrompt={noop} onAskCheck={noop} onRule={noop}
      onAddCreature={noop} onRemoveCreature={noop} onEffect={noop} onMove={noop}
      {...over}
    />,
  );
}

/**
 * The tiles that open tools, found by their own label on the bar.
 *
 * SCOPED TO THE BAR AND QUERIED BY ATTRIBUTE, not by role across the whole
 * document. The DM screen renders a button per map cell — 360 of them on the
 * fixture room — and getByRole computes an accessible name for every one of
 * them on every call. That is invisible in a single test and pushes a
 * four-press loop past the five-second timeout once the suite runs in
 * parallel, which is exactly how it first failed.
 */
const tile = (name: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`.qa2-desk .qa2-tile[aria-label^="${name}."]`);
  if (!el) throw new Error(`no tile labelled ${name}`);
  return el;
};

/** Something inside the workbench, by its text. Same reasoning. */
const onBench = (text: string): HTMLElement => {
  const els = [...document.querySelectorAll<HTMLElement>('.qa2-bench-body *')];
  const el = els.find((e) => e.textContent?.trim() === text);
  if (!el) throw new Error(`no ${text} on the bench`);
  return el;
};
const heading = () => document.querySelector('.qa2-bench-head')?.textContent ?? '';
const openTiles = () => document.querySelectorAll('.qa2-tile.is-open').length;

describe('at rest', () => {
  it('shows the glossary rather than an empty column', () => {
    dm();
    expect(heading()).toContain('What the words mean');
    expect(screen.getByText('Armour Class')).toBeDefined();
  });

  it('has no tile lit, because nothing is open', () => {
    dm();
    expect(openTiles()).toBe(0);
  });

  /* The glossary says the real word and then explains it. Renaming the game's
     vocabulary would teach a DM something no other table uses. */
  it('keeps the real terms rather than inventing friendlier ones', () => {
    dm();
    for (const term of ['Armour Class', 'Advantage', 'Saving Throw', 'Concentration']) {
      expect(screen.getByText(term), term).toBeDefined();
    }
  });
});

describe('opening a tool', () => {
  it('puts it on the workbench and lights its tile', () => {
    dm();
    fireEvent.click(tile('Ask for a roll'));
    expect(heading()).toContain('Ask for a roll');
    expect(openTiles()).toBe(1);
  });

  it('takes the glossary away while it is open', () => {
    dm();
    fireEvent.click(tile('Ask for a roll'));
    expect(screen.queryByText('Armour Class')).toBeNull();
  });

  /**
   * THE ONE THAT MATTERS. Two tools open at once is the failure this whole
   * arrangement replaced — a compendium over an ask sheet over the map.
   */
  it('closes the last one when another opens', () => {
    dm();
    fireEvent.click(tile('Ask for a roll'));
    fireEvent.click(tile('Bring something in'));
    expect(heading()).toContain('Bring something in');
    expect(openTiles(), 'never two at once').toBe(1);
  });

  it('never lights more than one tile however many are pressed', () => {
    dm();
    for (const t of ['Ask for a roll', 'Bring something in', 'Look up a rule', 'Put it on the TV']) {
      fireEvent.click(tile(t));
      expect(openTiles(), t).toBe(1);
    }
  });
});

describe('closing it', () => {
  it('goes back to the glossary when its own tile is pressed again', () => {
    dm();
    fireEvent.click(tile('Look up a rule'));
    expect(heading()).toContain('Rules');
    fireEvent.click(tile('Look up a rule'));
    expect(heading()).toContain('What the words mean');
    expect(openTiles()).toBe(0);
  });

  /* A DM's hands are on the keyboard between sentences; reaching for a small
     close button mid-fight is a tax. */
  it('closes on escape', () => {
    dm();
    fireEvent.click(tile('Ask for a roll'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(heading()).toContain('What the words mean');
  });

  it('closes itself once the tool has done its job', () => {
    const onAskCheck = vi.fn();
    dm({ onAskCheck });
    fireEvent.click(tile('Ask for a roll'));
    fireEvent.click(onBench('Perception'));
    expect(onAskCheck).toHaveBeenCalled();
    expect(heading(), 'asking for the roll is finishing with the tool').toContain('What the words mean');
  });
});
