/**
 * Greying parity (Brief 10 §5.3): the tooltip a player reads before they act
 * must be the same sentence the server sends back if they act anyway.
 *
 * WHY THIS MATTERS MORE THAN IT SOUNDS. A greyed button that says "It is not
 * your turn" and a rejection that says "intent_illegal: turn_mismatch" are the
 * same rule told twice, and the second telling is the one a player sees when
 * something has already gone wrong. Divergence here reads as a bug in the game
 * rather than a rule of it.
 *
 * WHAT THIS FILE CAN AND CANNOT CHECK. The client's greying comes from the
 * engine's `greyingReason` — literally the same function, imported — so for
 * every intent the engine judges, parity is structural rather than tested.
 * What is NOT structural is the resolver's own refusals: the DM-control
 * rejections and the turn check are strings this server writes itself, and
 * nothing but a test stops them drifting into vocabulary no player would use.
 */
import { describe, it, expect } from 'vitest';
import type { Viewer } from '@questra/contracts';
import { violatesPlainLanguage } from '@questra/contracts';
import { greyingReason, type Combatant, type ProjectionState } from '@questra/engine';
import { makeSliceResolver } from '../src/app.js';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

function combatant(id: string, over: Partial<Combatant> = {}): Combatant {
  return {
    id, name: id,
    abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 12,
    conditions: [], isPlayer: true,
    ...over,
  } as Combatant;
}

const state = (over: Partial<ProjectionState> = {}): ProjectionState => ({
  combatants: { mira: combatant('mira'), goblin: combatant('goblin', { isPlayer: false }) },
  round: 1, nextSeq: 0,
  ...over,
});

const envelope = (intent: unknown) => ({ idempotencyKey: 'k-parity-1', intent });

/** Every refusal this resolver can produce, with the situation that causes it. */
const REFUSALS: { what: string; intent: unknown; state: ProjectionState; actor: Viewer }[] = [
  {
    what: 'a player reaching for a DM control',
    intent: { kind: 'start_combat' },
    state: state(), actor: PLAYER,
  },
  {
    what: 'attacking out of turn',
    intent: { kind: 'attack', attackerId: 'mira', targetId: 'goblin', actionName: 'Longsword' },
    state: state({ order: ['mira', 'goblin'], activeCreatureId: 'goblin' }), actor: PLAYER,
  },
  {
    what: 'attacking somebody who is not here',
    intent: { kind: 'attack', attackerId: 'mira', targetId: 'nobody', actionName: 'Longsword' },
    state: state(), actor: PLAYER,
  },
  {
    what: 'starting a fight in an empty room',
    intent: { kind: 'start_combat' },
    state: state({ combatants: {} }), actor: DM,
  },
  {
    what: 'ending a fight nobody is in',
    intent: { kind: 'end_combat' },
    state: state(), actor: DM,
  },
  {
    what: 'an intent the server does not handle yet',
    intent: { kind: 'cast', casterId: 'mira', spellId: 'fireball', slotLevel: 3 },
    state: state(), actor: PLAYER,
  },
  {
    what: 'a death save from somebody on their feet',
    intent: { kind: 'death_save', creatureId: 'mira' },
    state: state(), actor: PLAYER,
  },
];

describe('every refusal is written for a person', () => {
  it.each(REFUSALS)('$what', ({ intent, state: s, actor }) => {
    const out = makeSliceResolver()(envelope(intent), s, actor, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(false);
    if (out.ok) return;

    /* A reason is shown to somebody mid-game, so it has to read like a sentence
       a person wrote — not an error code, not a type name. */
    expect(out.reason).toMatch(/^[A-Z]/);
    expect(out.reason).toMatch(/[.?]$/);
    expect(out.reason, 'no engine vocabulary').not.toMatch(/intent|_|undefined|null|Error/);
    expect(violatesPlainLanguage(out.reason), 'no banned jargon').toBeNull();
  });
});

describe('the turn rule, told the same way twice', () => {
  /**
   * The engine and the server both know "it is not your turn", and a player can
   * meet either one. They do not have to be byte-identical — the engine names
   * the character because it is describing somebody, and the server is
   * answering the person who pressed — but they must be the same RULE, phrased
   * for a reader.
   */
  it('greys and rejects on the same fact', () => {
    const s = state({ order: ['mira', 'goblin'], activeCreatureId: 'goblin' });
    const intent = { kind: 'attack' as const, attackerId: 'mira', targetId: 'goblin', actionName: 'Longsword' };

    const greyed = greyingReason(intent, s, { activeTurnEnforced: true });
    const rejected = makeSliceResolver()(envelope(intent), s, PLAYER, { playSessionId: 'ps_test' });

    expect(greyed, 'the client greys it').not.toBeNull();
    expect(rejected.ok, 'and the server refuses it').toBe(false);
    if (rejected.ok) return;

    /* Both say the same thing about turns, in words rather than codes. */
    expect(greyed!.toLowerCase()).toContain('turn');
    expect(rejected.reason.toLowerCase()).toContain('turn');
    expect(violatesPlainLanguage(greyed!)).toBeNull();
  });

  it('lets it through when it is your turn, on both sides', () => {
    const s = state({ order: ['mira', 'goblin'], activeCreatureId: 'mira' });
    const intent = { kind: 'attack' as const, attackerId: 'mira', targetId: 'goblin', actionName: 'Longsword' };

    expect(greyingReason(intent, s, { activeTurnEnforced: true })).toBeNull();
    expect(makeSliceResolver()(envelope(intent), s, PLAYER, { playSessionId: 'ps_test' }).ok).toBe(true);
  });
});
