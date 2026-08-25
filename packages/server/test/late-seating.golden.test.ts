/**
 * A character made after the table opened still gets a seat.
 *
 * WHY THIS EXISTS. A session's base state was built exactly once — when the
 * first person said hello — so the ordinary case broke it: the DM opens the
 * lobby, the session comes into being empty, and every character created from
 * that moment on is invisible to it. The table showed "There is nobody here to
 * fight" with a full party standing in the room (found by running it,
 * 2026-08-23, after the whole test suite passed).
 *
 * ONLY ADDING IS SAFE, and the second test is the one that protects it. The log
 * has folded on top of the base since the session opened, so re-seating a
 * combatant that is already there would silently undo every wound the fight has
 * applied. A newcomer has no history to lose; anybody else does.
 */
import { describe, it, expect } from 'vitest';
import type { ServerMsg } from '@questra/contracts';
import { SyncCore, type ResolvedToken } from '../src/sync-core.js';
import { connectMemory } from '../src/transport.js';
import type { Combatant } from '@questra/engine';

const PS = 'ps-late';

const TOKENS: Record<string, ResolvedToken> = {
  'tok-dm': { accountId: 'acct-dm', role: 'dm', playSessionId: PS },
  'tok-mira': { accountId: 'acct-mira', role: 'player', playSessionId: PS },
};

function combatant(id: string, over: Partial<Combatant> = {}): Combatant {
  return {
    id, name: id,
    abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 14,
    conditions: [], isPlayer: true,
    ...over,
  } as Combatant;
}

const snapshotOf = (received: ServerMsg[]) => {
  const welcome = received.find((m): m is Extract<ServerMsg, { m: 'welcome' }> => m.m === 'welcome');
  return (welcome?.snapshot ?? { combatants: {} }) as { combatants: Record<string, Combatant> };
};

describe('seating somebody who arrived late', () => {
  it('gives a character made after the table opened a place at it', () => {
    /* The roster the server can see, which grows as people make characters. */
    let roster: Combatant[] = [];
    const core = new SyncCore({
      resolveToken: (t, ps) => (TOKENS[t]?.playSessionId === ps ? TOKENS[t]! : null),
      resolveIntent: () => ({ ok: false, reason: 'not used' }),
      initialCombatants: () => roster,
    });

    /* The ordering that broke it: the DM opens the table first. */
    const dm = connectMemory(core);
    dm.send({ m: 'hello', playSessionId: PS, token: 'tok-dm' });
    expect(Object.keys(snapshotOf(dm.received).combatants), 'nobody has made one yet').toHaveLength(0);

    /* ...and only now does a player finish their character. */
    roster = [combatant('mira')];

    const mira = connectMemory(core);
    mira.send({ m: 'hello', playSessionId: PS, token: 'tok-mira' });

    expect(
      Object.keys(snapshotOf(mira.received).combatants),
      'a player who made a character after the lobby opened was invisible to the table',
    ).toEqual(['mira']);
  });

  /**
   * THE GUARD ON THE FIX: re-seating adds, it never replaces.
   *
   * This asserts on what the roster hands over versus what the session already
   * holds, because a snapshot cannot show the difference — it is fold(base,
   * log), so a damage event re-applies itself over a clobbered base and hides
   * the damage. The danger is real anyway and lives one layer down: the base is
   * what a fold STARTS from, so overwriting a combatant there discards
   * everything the log cannot replay — a character rebuilt mid-session, an
   * ability the DM edited, anything set before the first event.
   */
  it('adds a newcomer without touching anybody already seated', () => {
    const core = new SyncCore({
      resolveToken: (t, ps) => (TOKENS[t]?.playSessionId === ps ? TOKENS[t]! : null),
      resolveIntent: () => ({ ok: false, reason: 'not used' }),
      /* Rebuilt per call, exactly as the real one is: primeCampaignRoster
         recomputes each character from stored choices, so the roster hands over
         FRESH objects rather than the ones the session is holding. Returning
         the same references would make an overwrite a no-op and hide the bug
         this test exists to catch. */
      initialCombatants: () => [combatant('mira', { hp: 12 }), combatant('bren')],
    });

    const dm = connectMemory(core);
    dm.send({ m: 'hello', playSessionId: PS, token: 'tok-dm' });

    /* Something the log cannot replay — the state a session accrues outside its
       own events, which is exactly what an overwrite would throw away. */
    const session = (core as unknown as { sessions: Map<string, { base: { combatants: Record<string, Combatant> } }> })
      .sessions.get(PS)!;
    session.base.combatants.mira!.hp = 3;

    /* A later hello re-reads the roster, where Mira is still at 12. */
    const mira = connectMemory(core);
    mira.send({ m: 'hello', playSessionId: PS, token: 'tok-mira' });

    expect(session.base.combatants.mira!.hp, 'the roster does not know what happened here').toBe(3);
    expect(session.base.combatants.bren, 'and the newcomer still gets a seat').toBeDefined();
  });
});
