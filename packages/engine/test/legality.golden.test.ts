/**
 * Brief 10 §5 #3 — greying parity. The client greys an action using the SAME
 * function the server rejects with, so the tooltip string == the reject string
 * BY CONSTRUCTION (one implementation, two callers). These tests pin the reject
 * strings for a scripted set of illegal intents, and assert every one is plain
 * language (§1) — the same ban-list the UI string tests use.
 */
import { describe, it, expect } from 'vitest';
import { violatesPlainLanguage, type Intent } from '@questra/contracts';
import { checkIntent, greyingReason } from '../src/sim/legality.js';
import type { Combatant, ProjectionState } from '../src/sim/state.js';

const torvald: Combatant = {
  id: 'pc-torvald', name: 'Torvald',
  abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [], isPlayer: true,
};
const goblin: Combatant = {
  id: 'npc-goblin-1', name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};
const state = (over: Partial<ProjectionState> = {}, combatants: Combatant[] = [torvald, goblin]): ProjectionState => ({
  combatants: Object.fromEntries(combatants.map((c) => [c.id, c])),
  round: 1, activeCreatureId: 'pc-torvald', nextSeq: 1, ...over,
});

const attack = (over: Partial<Extract<Intent, { kind: 'attack' }>> = {}): Intent =>
  ({ kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword', ...over });

describe('Brief 10 §5 #3 — the shared legality function: reject strings for illegal intents', () => {
  it('a legal attack on your turn is not greyed', () => {
    expect(greyingReason(attack(), state(), { activeTurnEnforced: true })).toBeNull();
  });

  it('it isn’t your turn', () => {
    const r = checkIntent(attack(), state({ activeCreatureId: 'npc-goblin-1' }), { activeTurnEnforced: true });
    expect(r).toEqual({ legal: false, reason: "It isn't Torvald's turn." });
  });

  it('the attacker is incapacitated', () => {
    const stunned = { ...torvald, conditions: [{ conditionId: 'condition.stunned' }] };
    const r = checkIntent(attack(), state({}, [stunned, goblin]));
    expect(r).toEqual({ legal: false, reason: "Torvald can't take actions right now." });
  });

  it('the attacker is downed', () => {
    const downed = { ...torvald, hp: 0 };
    const r = checkIntent(attack(), state({}, [downed, goblin]));
    expect(r).toEqual({ legal: false, reason: 'Torvald is down and can\'t act.' });
  });

  it('the target is already down', () => {
    const deadGoblin = { ...goblin, hp: 0 };
    const r = checkIntent(attack(), state({}, [torvald, deadGoblin]));
    expect(r).toEqual({ legal: false, reason: 'the goblin is already down.' });
  });

  it('the target is out of reach', () => {
    const r = checkIntent(attack(), state(), { targetInRange: false });
    expect(r).toEqual({ legal: false, reason: 'That target is out of reach.' });
  });

  it('a feature with no uses left', () => {
    const intent: Intent = { kind: 'use_feature', creatureId: 'pc-torvald', featureId: 'feature.fighter.second-wind' };
    const r = checkIntent(intent, state(), { resourceRemaining: 0 });
    expect(r).toEqual({ legal: false, reason: 'No uses of that left — take a rest to recover it.' });
  });

  it('a spell with no slots left at that level', () => {
    const intent: Intent = { kind: 'cast', casterId: 'pc-torvald', spellId: 'spell.fireball', slotLevel: 3 };
    const r = checkIntent(intent, state(), { slotsRemaining: { 1: 4, 2: 3, 3: 0 } });
    expect(r).toEqual({ legal: false, reason: 'No level 3 slots left — take a rest to get them back.' });
  });

  it('a spell you still have the slot for is legal', () => {
    const intent: Intent = { kind: 'cast', casterId: 'pc-torvald', spellId: 'spell.fireball', slotLevel: 3 };
    expect(greyingReason(intent, state(), { slotsRemaining: { 3: 1 } })).toBeNull();
  });

  it('cantrips never run out', () => {
    const intent: Intent = { kind: 'cast', casterId: 'pc-torvald', spellId: 'spell.fire-bolt', slotLevel: 0 };
    expect(greyingReason(intent, state(), { slotsRemaining: {} })).toBeNull();
  });

  it('slots the caller did not supply are not guessed at', () => {
    // Same rule as resourceRemaining: absent means "unknown", so nothing is refused.
    const intent: Intent = { kind: 'cast', casterId: 'pc-torvald', spellId: 'spell.fireball', slotLevel: 3 };
    expect(greyingReason(intent, state())).toBeNull();
  });

  it('free text is never greyed (it routes to a ruling)', () => {
    const intent: Intent = { kind: 'free_text', creatureId: 'pc-torvald', text: 'I try to intimidate it' };
    expect(greyingReason(intent, state({ activeCreatureId: 'npc-goblin-1' }), { activeTurnEnforced: true })).toBeNull();
  });

  it('every reject string is plain language (the §1 ban-list)', () => {
    const rejects = [
      checkIntent(attack(), state({ activeCreatureId: 'npc-goblin-1' }), { activeTurnEnforced: true }),
      checkIntent(attack(), state({}, [{ ...torvald, conditions: [{ conditionId: 'condition.stunned' }] }, goblin])),
      checkIntent(attack(), state({}, [{ ...torvald, hp: 0 }, goblin])),
      checkIntent(attack(), state({}, [torvald, { ...goblin, hp: 0 }])),
      checkIntent(attack(), state(), { targetInRange: false }),
      checkIntent({ kind: 'use_feature', creatureId: 'pc-torvald', featureId: 'f' }, state(), { resourceRemaining: 0 }),
      checkIntent({ kind: 'cast', casterId: 'pc-torvald', spellId: 'spell.fireball', slotLevel: 3 }, state(), { slotsRemaining: { 3: 0 } }),
    ];
    for (const r of rejects) {
      expect(r.legal).toBe(false);
      if (!r.legal) expect(violatesPlainLanguage(r.reason)).toBeNull();
    }
  });
});
