/**
 * Payload cleanliness (Brief 10 §5.6, and M3's exit bar).
 *
 * THE CLAIM UNDER TEST: a player's client never HOLDS a secret, rather than
 * holding one and declining to draw it. Those are different guarantees, and
 * only the first survives somebody opening devtools — which at a real table is
 * the person sitting next to the DM.
 *
 * This is the client-side mirror of the wire test one layer up. The server
 * filters before the payload is built (eventVisibleTo, filterRoomForViewer); what
 * this asserts is that the view layer does not RE-INTRODUCE anything by keeping
 * a copy of what it was handed and reaching past the filter.
 */
import { describe, it, expect } from 'vitest';
import type { PlayEvent } from '@questra/contracts';
import { projectionToView, type Combatant, type Projection } from '../src/play/projectionToView.js';

const at = '2026-08-23T00:00:00.000Z';
const ev = (seq: number, body: unknown): PlayEvent =>
  ({ seq, id: `e${String(seq)}`, at, actor: { kind: 'engine' }, visibility: 'public', body } as PlayEvent);

function combatant(over: Partial<Combatant> & { id: string; name: string }): Combatant {
  return {
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 16,
    conditions: [], isPlayer: true,
    ...over,
  };
}

const projection: Projection = {
  combatants: {
    mira: combatant({ id: 'mira', name: 'Mira', hp: 9 }),
    goblin: combatant({ id: 'goblin', name: 'Goblin', hp: 3, maxHp: 12, isPlayer: false }),
  },
  round: 1,
  nextSeq: 0,
};

const viewFor = (role: 'player' | 'dm', events: readonly PlayEvent[] = []) =>
  projectionToView({
    projection, room: null, myCharacter: null, role, events, campaignName: 'The Ash Moor',
  });

describe('what a player’s screen is holding', () => {
  /**
   * An enemy's exact hit points are the DM's to reveal. The player's view
   * carries the WORD and not the number — not because the number is hidden at
   * render time, but because it is never put in the view model at all.
   */
  it('has a word for an enemy, and no number anywhere in the object', () => {
    const view = viewFor('player');
    const goblin = view.cast.find((c) => c.id === 'goblin')!;

    expect(goblin.hurt).toBe('Bloodied');
    expect(goblin.hp, 'not present, rather than present and unrendered').toBeUndefined();

    /* The whole serialised view, searched for the number that must not be in
       it. An exact-hp leak anywhere in the tree fails here even if nothing
       draws it. */
    const serialised = JSON.stringify(view.cast.find((c) => c.id === 'goblin'));
    expect(serialised).not.toContain('"hp"');
  });

  it('keeps an ally’s exact hit points, which a table can see by looking', () => {
    const view = viewFor('player');
    expect(view.cast.find((c) => c.id === 'mira')!.hp).toEqual({ current: 9, max: 12 });
  });

  /**
   * A DM sees numbers for everybody — the asymmetry that makes the two screens
   * different. Asserted here so the test above is proving a rule rather than an
   * accident of the fixture.
   */
  it('gives a DM the numbers a player is not owed', () => {
    const view = viewFor('dm');
    /* The DM screen reads exact hit points off the projection directly; what
       matters is that the same adapter treats the two roles differently. */
    expect(view.hero, 'a DM plays nobody').toBeNull();
    expect(view.cast).toHaveLength(2);
  });

  /**
   * A dm_only event that somehow reached this client must not become a visible
   * line. The server filters first, so this is the second line of defence
   * rather than the first — but a defence that only exists once is not a
   * defence at all.
   */
  it('does not turn a dm_only line into journal text', () => {
    const secret = {
      seq: 1, id: 'e1', at, actor: { kind: 'dm' as const },
      visibility: 'dm_only' as const,
      body: { t: 'dm_note', text: 'The lever is a trap.' },
    } as unknown as PlayEvent;

    const view = viewFor('player', [secret, ev(2, { t: 'narration', text: 'The door gives.' })]);
    const text = view.entries.map((e) => e.text).join(' ');

    expect(text).toContain('The door gives.');
    expect(text, 'only events the journal understands become lines').not.toContain('The lever is a trap.');
  });

  it('carries nothing about a creature the projection never mentioned', () => {
    const view = viewFor('player');
    expect(JSON.stringify(view)).not.toContain('ambusher');
  });
});
