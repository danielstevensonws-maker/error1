/**
 * Asking for a check, rolling one, ruling on a description, and putting a
 * creature on the board.
 *
 * These are the four things a real table does constantly and the app could not
 * do at all (owner, 2026-08-25). "Give me a perception check" is the single
 * most common sentence a DM says; there was no way to say it.
 */
import { describe, it, expect } from 'vitest';
import type { Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';
import type { Combatant, ProjectionState } from '@questra/engine';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

function combatant(id: string, over: Partial<Combatant> = {}): Combatant {
  return {
    id, name: id,
    /* WIS 14 ⇒ +2, so a perception check is +2 before proficiency. */
    abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 14, cha: 10 },
    profBonus: 3,
    proficientSkills: ['perception'],
    maxHp: 12, hp: 12, tempHp: 0, ac: 14,
    conditions: [], isPlayer: true,
    ...over,
  } as Combatant;
}

const state = (over: Partial<ProjectionState> = {}): ProjectionState => ({
  combatants: { mira: combatant('mira'), bren: combatant('bren', { proficientSkills: [] }) },
  round: 1, nextSeq: 0,
  ...over,
});

const envelope = (intent: unknown) => ({ idempotencyKey: 'k-' + Math.random().toString(36).slice(2, 12), intent });
const resolve = (intent: unknown, actor: Viewer, s = state()) => makeSliceResolver()(envelope(intent), s, actor, { playSessionId: 'ps_test' });

describe('asking for a check', () => {
  it('is the DM\'s to ask, not a player\'s', () => {
    const out = resolve({ kind: 'ask_for_check', skill: 'perception', creatureIds: ['mira'] }, PLAYER);
    expect(out.ok).toBe(false);
  });

  /**
   * PUBLIC BY DEFAULT, and that is the point. At a real table "Mira, give me a
   * perception check" is said out loud — everyone hears it and everyone
   * watches the roll. Hiding it would be stranger than showing it.
   */
  it('is heard by the whole table', () => {
    const out = resolve({ kind: 'ask_for_check', skill: 'perception', creatureIds: ['mira'] }, DM);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.events[0]!.visibility).toBe('public');
  });

  /** A secret check is a real DM tool: players must not know they failed to spot the ambush. */
  it('can be kept to the DM when it needs to be', () => {
    const out = resolve({ kind: 'ask_for_check', skill: 'perception', creatureIds: ['mira'], secret: true }, DM);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.events[0]!.visibility).toBe('dm_only');
  });

  it('asks everybody when nobody is named', () => {
    const out = resolve({ kind: 'ask_for_check', skill: 'perception', creatureIds: [] }, DM);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { creatureIds: string[] };
    expect(body.creatureIds.sort()).toEqual(['bren', 'mira']);
  });
});

describe('rolling the check', () => {
  /**
   * THE LEARN-WHILE-PLAYING PROMISE, made concrete. A bare 17 teaches nothing;
   * "10 +2 WIS +3 Proficiency" teaches the game while it is being played.
   */
  it('shows the arithmetic, ability and proficiency itemised', () => {
    const out = resolve({ kind: 'roll_check', creatureId: 'mira', skill: 'perception' }, PLAYER);
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    const body = out.events[0]!.body as {
      kind: string; d20: number; modifiers: { label: string; value: number }[]; total: number;
    };
    expect(body.kind).toBe('ability_check');
    expect(body.modifiers).toEqual([
      { label: 'WIS', value: 2 },
      { label: 'Proficiency', value: 3 },
    ]);
    expect(body.total, 'the die plus everything named above it').toBe(body.d20 + 5);
  });

  it('leaves proficiency off for somebody untrained in it', () => {
    const out = resolve({ kind: 'roll_check', creatureId: 'bren', skill: 'perception' }, PLAYER);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { modifiers: { label: string }[] };
    expect(body.modifiers.map((m) => m.label)).toEqual(['WIS']);
  });

  it('uses the right ability for the skill', () => {
    const out = resolve({ kind: 'roll_check', creatureId: 'mira', skill: 'athletics' }, PLAYER);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { modifiers: { label: string; value: number }[] };
    expect(body.modifiers[0], 'athletics is STR, not WIS').toEqual({ label: 'STR', value: 2 });
  });

  /**
   * A check with no target number is the DM deciding after the fact, which is
   * legitimate and common — showing "against undefined" would not be.
   */
  it('names no target number when the DM set none', () => {
    const out = resolve({ kind: 'roll_check', creatureId: 'mira', skill: 'perception' }, PLAYER);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect((out.events[0]!.body as { vs?: unknown }).vs).toBeUndefined();
  });

  it('says pass or fail when there is one', () => {
    const out = resolve({ kind: 'roll_check', creatureId: 'mira', skill: 'perception', dc: 30 }, PLAYER);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { outcome: string; vs: { value: number } };
    expect(body.vs.value).toBe(30);
    expect(body.outcome, 'the best possible roll here is 25').toBe('failure');
  });
});

describe('ruling on what a player described', () => {
  /**
   * This is what makes Law 2's escape hatch real rather than decorative: a
   * typed line stops being a message in a log and becomes a request somebody
   * answered.
   */
  it('ties the answer to the thing it answers', () => {
    const out = resolve({ kind: 'rule_on', onSeq: 7, verdict: 'allow', note: 'The floor is slick.' }, DM);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { onSeq: number; verdict: string; note: string };
    expect(body.onSeq, 'a reader later can see what was asked').toBe(7);
    expect(body.verdict).toBe('allow');
    expect(body.note).toBe('The floor is slick.');
  });

  it('is the DM\'s call alone', () => {
    expect(resolve({ kind: 'rule_on', onSeq: 7, verdict: 'allow' }, PLAYER).ok).toBe(false);
  });
});

describe('putting a creature on the board', () => {
  it('adds one at full health', () => {
    const out = resolve({ kind: 'add_creature', name: 'Goblin', maxHp: 7, ac: 15, monsterId: 'monster.goblin' }, DM);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { t: string; name: string; maxHp: number; ac: number };
    expect(body.t).toBe('creature_added');
    expect(body.name).toBe('Goblin');
    expect(body.maxHp).toBe(7);
    expect(body.ac).toBe(15);
  });

  it('is the DM\'s board to populate', () => {
    expect(resolve({ kind: 'add_creature', name: 'Goblin', maxHp: 7, ac: 15 }, PLAYER).ok).toBe(false);
  });

  it('refuses to remove something that is not there', () => {
    const out = resolve({ kind: 'remove_creature', creatureId: 'nobody' }, DM);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('That creature is not on the board.');
  });
});
