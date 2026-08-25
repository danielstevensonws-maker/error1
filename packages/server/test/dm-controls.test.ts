/**
 * Who is allowed to move the table, and who is allowed to read a whisper.
 *
 * THE FIRST TEST IS A SECURITY TEST, not a UI one. Hiding the "start the fight"
 * button from players is presentation; a client can send whatever frame it
 * likes. The refusal has to live on the server, next to the state it protects,
 * and the actor has to be the server's own record of the connection rather than
 * anything the client asserted.
 */
import { describe, it, expect } from 'vitest';
import type { Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';
import type { Combatant, ProjectionState } from '@questra/engine';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

function combatant(id: string): Combatant {
  return {
    id, name: id,
    abilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
    profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 12,
    conditions: [], isPlayer: true,
  } as Combatant;
}

const state = (over: Partial<ProjectionState> = {}): ProjectionState => ({
  combatants: { mira: combatant('mira'), goblin: combatant('goblin') },
  round: 1,
  nextSeq: 0,
  ...over,
});

const envelope = (intent: unknown) => ({ idempotencyKey: 'k-' + Math.random().toString(36).slice(2, 10), intent });

describe('the table controls belong to whoever runs the game', () => {
  it('refuses to let a player start the fight', () => {
    const out = makeSliceResolver()(envelope({ kind: 'start_combat' }), state(), PLAYER, { playSessionId: 'ps_test' });
    expect(out.ok, 'a client can send any frame; the server decides').toBe(false);
    if (out.ok) return;
    /* The reason is shown to a person, so it has to read like one wrote it. */
    expect(out.reason).toBe('Only whoever runs the game can do that.');
  });

  it('refuses to let a player skip a turn', () => {
    const s = state({ order: ['mira', 'goblin'], activeCreatureId: 'mira' });
    expect(makeSliceResolver()(envelope({ kind: 'advance_turn' }), s, PLAYER, { playSessionId: 'ps_test' }).ok).toBe(false);
  });

  it('lets the DM start the fight, and opens on somebody', () => {
    const out = makeSliceResolver()(envelope({ kind: 'start_combat' }), state(), DM, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const turn = out.events.find((e) => e.body.t === 'turn_advanced')!.body as { round: number; activeCreatureId: string };
    expect(turn.round).toBe(1);
    expect(['mira', 'goblin']).toContain(turn.activeCreatureId);
  });

  it('will not start a fight in an empty room', () => {
    const out = makeSliceResolver()(envelope({ kind: 'start_combat' }), state({ combatants: {} }), DM, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('There is nobody here to fight.');
  });

  it('ends a fight by clearing the order, so exploring is one state not two', () => {
    const s = state({ order: ['mira', 'goblin'], activeCreatureId: 'mira' });
    const out = makeSliceResolver()(envelope({ kind: 'end_combat' }), s, DM, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const init = out.events.find((e) => e.body.t === 'initiative_rolled')!.body as { order: unknown[] };
    expect(init.order).toEqual([]);
  });

  it('will not end a fight nobody is in', () => {
    expect(makeSliceResolver()(envelope({ kind: 'end_combat' }), state(), DM, { playSessionId: 'ps_test' }).ok).toBe(false);
  });
});

describe('taking your turn', () => {
  it('refuses an attack out of turn, in words that say what to do', () => {
    const s = state({ order: ['mira', 'goblin'], activeCreatureId: 'goblin' });
    const out = makeSliceResolver()(
      envelope({ kind: 'attack', attackerId: 'mira', targetId: 'goblin', actionName: 'Longsword' }),
      s, PLAYER, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('It is not your turn.');
  });

  it('allows it on your own turn', () => {
    const s = state({ order: ['mira', 'goblin'], activeCreatureId: 'mira' });
    const out = makeSliceResolver()(
      envelope({ kind: 'attack', attackerId: 'mira', targetId: 'goblin', actionName: 'Longsword' }),
      s, PLAYER, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(true);
  });

  /**
   * Outside a fight nobody has a turn, so nobody can be out of theirs. This is
   * what makes an ambush possible — the first swing happens before initiative.
   */
  it('allows it while exploring, because that is how a fight starts', () => {
    const out = makeSliceResolver()(
      envelope({ kind: 'attack', attackerId: 'mira', targetId: 'goblin', actionName: 'Longsword' }),
      state(), PLAYER, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(true);
  });
});

describe('whispering', () => {
  it('addresses the whisper through visibility, where the one filter reads it', () => {
    const out = makeSliceResolver()(
      envelope({ kind: 'whisper', toAccountId: 'acct-mira', text: 'The floor is a trap.' }),
      state(), DM, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const e = out.events[0]!;
    expect(e.visibility, 'not a body field a second code path could disagree with')
      .toEqual({ whisperTo: 'acct-mira' });
    expect((e.body as { text: string }).text).toBe('The floor is a trap.');
  });
});
