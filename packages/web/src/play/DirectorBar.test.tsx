/**
 * DirectorBar — the four guarantees that make the DM's screen usable, rather
 * than the ones that make it render.
 *
 * WHY THESE FOUR. The bar replaced a five-tab console plus a roster plus a
 * panel of private verbs, and the thing that makes the replacement worth having
 * is not that it is smaller. It is that a control on it either works or says
 * why it does not, in a sentence, in the same place every time — the promise
 * the player's action rows already made and this screen did not.
 *
 * A refusal here is never about the RULES (the server owns those). It is about
 * the table: whose character this is, and whether a fight is running. Both are
 * things a DM would otherwise find out by pressing a button and watching
 * nothing happen.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DirectorBar, type BarSeat } from './DirectorBar.js';
import type { SpineEntryVM } from '../primitives/v2/viewModel.js';

afterEach(cleanup);

const mira: SpineEntryVM = {
  id: 'pc-mira', name: 'Mira', kind: 'ally', initiative: 12, role: 'Cleric · 3',
  ac: 13, hp: { current: 18, max: 24 }, acted: false, acting: false,
};
const goblin: SpineEntryVM = {
  id: 'npc-goblin-1', name: 'Skirmisher', kind: 'foe', initiative: 15,
  ac: 15, hp: { current: 4, max: 10 }, acted: false, acting: true,
};

const seats: BarSeat[] = [
  { accountId: 'a3', displayName: 'Priya', characterName: 'Mira', here: true },
];

const noop = (): void => undefined;

function bar(over: Partial<Parameters<typeof DirectorBar>[0]> = {}) {
  return render(
    <DirectorBar
      cast={[goblin, mira]}
      seats={seats}
      focusedId={null}
      onFocus={noop}
      exploring
      voice={null}
      onVoice={noop}
      onEffect={noop}
      onRest={noop}
      onAddCreature={noop}
      onRemoveCreature={noop}
      onAskCheck={noop}
      onRules={noop}
      onMoveCreature={noop}
      onWhisper={noop}
      onShowScreenLink={noop}
      {...over}
    />,
  );
}

describe('with nobody chosen it is the table', () => {
  it('teaches the screen instead of going blank', () => {
    bar();
    expect(screen.getByText(/Tap anybody in the turn order/)).toBeDefined();
  });

  it('offers the mood to everybody at the table, not from behind a tab', () => {
    bar();
    for (const name of ['Thunder', 'Rain', 'Torchlight', 'Tremor', 'Blood', 'Blackout']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}\\.`) }), name).toBeDefined();
    }
  });

  it('pushes an effect to the table when one is pressed', () => {
    const onEffect = vi.fn();
    bar({ onEffect });
    fireEvent.click(screen.getByRole('button', { name: /^Thunder\./ }));
    expect(onEffect).toHaveBeenCalledWith('thunder');
  });
});

/**
 * The rests are the plainest case of the promise: a rest is a fiction decision,
 * but you cannot take one mid-swing, and the bar says which it is rather than
 * letting a DM press a control that quietly does nothing.
 */
describe('a control that will not work says why', () => {
  it('refuses a rest while a fight is running, in words', () => {
    bar({ exploring: false });
    const short = screen.getByRole('button', { name: /^Short rest —/ });
    expect(short.getAttribute('aria-disabled')).toBe('true');
    expect(short.getAttribute('aria-label')).toContain('End it before anybody rests');
  });

  it('lets both rests through once the fight is over', () => {
    bar({ exploring: true });
    expect(screen.getByRole('button', { name: /^Short rest\./ }).getAttribute('aria-disabled')).toBe('false');
    expect(screen.getByRole('button', { name: /^Long rest\./ }).getAttribute('aria-disabled')).toBe('false');
  });

  it('does not fire the callback of a refused control', () => {
    const onRest = vi.fn();
    bar({ exploring: false, onRest });
    fireEvent.click(screen.getByRole('button', { name: /^Short rest —/ }));
    expect(onRest).not.toHaveBeenCalled();
  });
});

describe('with somebody chosen it becomes them', () => {
  it('names them and shows the numbers a DM needs, monsters included', () => {
    bar({ focusedId: goblin.id });
    expect(screen.getByText('Skirmisher')).toBeDefined();
    expect(screen.getByText(/AC 15/)).toBeDefined();
    // A player would get the word "Bloodied" here; a DM gets the arithmetic.
    expect(screen.getByLabelText(/4 of 10 hit points/)).toBeDefined();
  });

  /**
   * The one refusal that is about manners rather than rules. A DM CAN speak as
   * anybody the protocol allows; the screen declines to help them speak as
   * somebody else's character, and says whose it is.
   */
  it("will not speak as a character somebody else is playing", () => {
    bar({ focusedId: mira.id });
    const speak = screen.getByRole('button', { name: /^Speak as them —/ });
    expect(speak.getAttribute('aria-disabled')).toBe('true');
    expect(speak.getAttribute('aria-label')).toContain("Priya's to speak for");
  });

  it('speaks as a creature the DM runs', () => {
    const onVoice = vi.fn();
    bar({ focusedId: goblin.id, onVoice });
    fireEvent.click(screen.getByRole('button', { name: /^Speak as them\./ }));
    expect(onVoice).toHaveBeenCalledWith({ creatureId: 'npc-goblin-1', name: 'Skirmisher' });
  });

  it('has nobody to whisper to about a creature with no player', () => {
    bar({ focusedId: goblin.id });
    expect(
      screen.getByRole('button', { name: /^Whisper their player —/ }).getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('whispers the player who is actually holding the character', () => {
    const onWhisper = vi.fn();
    bar({ focusedId: mira.id, onWhisper });
    fireEvent.click(screen.getByRole('button', { name: /^Whisper their player\./ }));
    expect(onWhisper).toHaveBeenCalledWith('a3');
  });

  it('keeps a played character on the board', () => {
    bar({ focusedId: mira.id });
    expect(
      screen.getByRole('button', { name: /^Take off the board —/ }).getAttribute('aria-disabled'),
    ).toBe('true');
  });
});

/**
 * A creature can be in the running order and not on the map. The server's
 * add_creature writes a combatant and emits the event but never writes a token
 * into the room, so anything a DM brings in mid-session has no token — and the
 * Move tile used to accept the press and silently do nothing.
 *
 * Found by running the app. When the server starts placing tokens this test
 * keeps its value: it pins the behaviour for any creature that genuinely has
 * none, which a staged or off-board NPC still will.
 */
describe('a creature with no token on the map', () => {
  it('refuses to move them, and says why', () => {
    const onMoveCreature = vi.fn();
    bar({ focusedId: goblin.id, onBoard: () => false, onMoveCreature });
    const move = screen.getByRole('button', { name: /^Move them —/ });
    expect(move.getAttribute('aria-disabled')).toBe('true');
    expect(move.getAttribute('aria-label')).toContain('no token on the map');
    fireEvent.click(move);
    expect(onMoveCreature).not.toHaveBeenCalled();
  });

  it('moves them once they are on the board', () => {
    const onMoveCreature = vi.fn();
    bar({ focusedId: goblin.id, onBoard: () => true, onMoveCreature });
    fireEvent.click(screen.getByRole('button', { name: /^Move them\./ }));
    expect(onMoveCreature).toHaveBeenCalledWith('npc-goblin-1');
  });
});
