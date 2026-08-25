/**
 * RoundSpine — one component, two voices.
 *
 * WHY THIS FILE EXISTS. The turn order is the same fact for both people at the
 * table, so the DM screen uses the PLAYER's spine rather than a second one that
 * looks similar. That is the whole reason the two screens now read as one
 * product — and it is also the risk: a component serving two callers can be
 * changed for one of them and quietly wrong for the other.
 *
 * So both voices are pinned here. The player's half guards against the DM's
 * additions leaking into a player's screen (armour class is a thing a player
 * has not earned about an enemy, and "YOU" is meaningless to somebody who is
 * not in the running order). The DM's half guards the additions themselves.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RoundSpine } from './RoundSpine.js';
import type { SpineEntryVM } from './viewModel.js';

afterEach(cleanup);

const cast: SpineEntryVM[] = [
  { id: 'pc-wren', name: 'Wren', kind: 'ally', initiative: 21, role: 'Rogue · 3', ac: 14, hp: { current: 22, max: 27 }, acted: true, acting: false },
  { id: 'pc-torvald', name: 'Torvald', kind: 'you', initiative: 18, role: 'Fighter · 3', ac: 18, hp: { current: 12, max: 12 }, acted: false, acting: true },
  { id: 'npc-goblin-1', name: 'Skirmisher', kind: 'foe', initiative: 15, ac: 15, hurt: 'Bloodied', acted: false, acting: false },
];

const shell = { round: 3, open: true, onToggle: () => {} };

describe("a player's spine answers when am I up", () => {
  it('counts down to your turn in words rather than in places', () => {
    render(<RoundSpine {...shell} cast={cast} />);
    expect(screen.getByText('Your turn. Take your time.')).toBeDefined();
  });

  it('marks which one is you', () => {
    render(<RoundSpine {...shell} cast={cast} />);
    expect(screen.getByText('YOU')).toBeDefined();
  });

  /* An enemy's armour class is the DM's to reveal. The prop exists on the view
     model for their roster; a player's spine must not print it. */
  it("never prints an enemy's armour class", () => {
    render(<RoundSpine {...shell} cast={cast} />);
    expect(screen.queryByText('AC 15')).toBeNull();
  });
});

describe("a DM's spine answers who needs me", () => {
  it('names who is up and who follows, rather than counting to a turn they do not have', () => {
    render(<RoundSpine {...shell} cast={cast} voice="dm" />);
    expect(screen.getByText('Torvald is up. Skirmisher follows.')).toBeDefined();
  });

  it('marks nobody as you — a DM is not in the running order', () => {
    render(<RoundSpine {...shell} cast={cast} voice="dm" />);
    expect(screen.queryByText('YOU')).toBeNull();
  });

  it('carries armour class for everybody, because it is the number every attack is measured against', () => {
    render(<RoundSpine {...shell} cast={cast} voice="dm" />);
    expect(screen.getByText('AC 15')).toBeDefined();
    expect(screen.getByText('AC 18')).toBeDefined();
  });

  it('stops calling it turn order when no fight is running', () => {
    const resting = cast.map((c) => ({ ...c, acting: false, acted: false }));
    render(<RoundSpine {...shell} cast={resting} voice="dm" />);
    expect(screen.getByText('On the board')).toBeDefined();
    expect(screen.getByText('No fight running. The table is yours.')).toBeDefined();
  });
});

/**
 * The baton: the round is a line and this is the end of it. DM only — a player
 * pressing "next turn" would be ending somebody else's turn.
 */
describe('the baton', () => {
  it('is absent unless a caller asks for one', () => {
    render(<RoundSpine {...shell} cast={cast} />);
    expect(screen.queryByRole('button', { name: 'Next turn' })).toBeNull();
  });

  it('moves the round on', () => {
    const onPress = vi.fn();
    render(<RoundSpine {...shell} cast={cast} voice="dm" baton={{ label: 'Next turn', onPress }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }));
    expect(onPress).toHaveBeenCalledOnce();
  });
});

/**
 * The empty board. This one was found by opening a fresh campaign in the real
 * app with the whole suite already green — the table offered ROLL FOR
 * INITIATIVE with nobody on it, which rolls initiative for nobody.
 */
describe('an empty board', () => {
  it('says what to do next instead of showing a bare rule', () => {
    render(<RoundSpine {...shell} cast={[]} voice="dm" />);
    expect(screen.getByText(/Bring something in from the bar below/)).toBeDefined();
  });

  it('refuses the baton, with the reason on the control', () => {
    const onPress = vi.fn();
    render(
      <RoundSpine
        {...shell}
        cast={[]}
        voice="dm"
        baton={{ label: 'Roll for initiative', onPress, refusal: 'Nobody is on the board yet.' }}
      />,
    );
    const baton = screen.getByRole('button', { name: /Roll for initiative — Nobody is on the board yet\./ });
    expect(baton.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(baton);
    expect(onPress).not.toHaveBeenCalled();
  });
});
