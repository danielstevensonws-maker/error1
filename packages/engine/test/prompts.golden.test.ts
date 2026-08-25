/**
 * Brief 08 §4 golden tests — the boss machinery & interrupt component.
 * #1 OA through the real component (prompt → taken → reaction attack).
 * #2 legendary round (3-action pool, spend 1+2 across two turn-ends, reset on
 *    boss turn) byte-matched. #3 legendary resistance held cascade (accepted ⇒
 *    zero downstream failure events; declined ⇒ normal cascade). #4 readied spell
 *    (slot spent at ready, released later, unreleased ⇒ slot stays spent).
 *    #5 timeout + DM-answers-for-player closures on every kind.
 */
import { describe, it, expect } from 'vitest';
import { PromptContextSchema, EventBodySchema, type PromptContext } from '@questra/contracts';
import {
  promptedEvent, takenEvent, declinedEvent, activePromptFor, opportunityPrompts,
  spendReaction, resetReactionsOnTurn, type ReactionState,
  resetLegendaryPool, affordableLegendary, legendaryPromptAtTurnEnd, spendLegendary, type LegendaryPool,
  heldCascade, readyAction, releasePrompt, readiedExpired, lairPrompt, DEFAULT_TIMEOUT_SEC,
} from '../src/sim/prompts.js';

// ---- §4 #1 — opportunity attack through the component ---------------------

describe('Brief 08 §4 #1 — opportunity attack: prompt → taken → the reaction attack runs', () => {
  const step = { from: { x: 5, y: 5 }, to: { x: 6, y: 5 } };

  it('builds one typed OA prompt for a candidate with a reaction and options', () => {
    const prompts = opportunityPrompts('npc-goblin', step, [
      { holderId: 'pc-torvald', attackOptions: ['Longsword'], reactionAvailable: true },
    ], (i) => `oa-${i}`);
    expect(prompts).toHaveLength(1);
    const ev = promptedEvent(prompts[0]!);
    // the emitted event validates and carries the typed context
    expect(() => EventBodySchema.parse(ev)).not.toThrow();
    expect(ev.t === 'reaction_prompted' && ev.context.kind).toBe('opportunity_attack');
    // taking it produces a valid reaction_taken (the caller then runs the attack pipeline)
    expect(() => EventBodySchema.parse(takenEvent(prompts[0]!.promptId, 'Longsword'))).not.toThrow();
  });

  it('§3 #1 — multiple OA candidates each get their own prompt (initiative order preserved); a spent reaction is skipped', () => {
    const prompts = opportunityPrompts('npc-goblin', step, [
      { holderId: 'pc-a', attackOptions: ['Halberd'], reactionAvailable: true },   // higher init first
      { holderId: 'pc-b', attackOptions: ['Spear'], reactionAvailable: false },     // no reaction ⇒ skipped
      { holderId: 'pc-c', attackOptions: ['Longsword'], reactionAvailable: true },
    ], (i) => `oa-${i}`);
    expect(prompts.map((p) => p.holderId)).toEqual(['pc-a', 'pc-c']);
  });
});

// ---- §3 #2 — the per-creature reaction reset ------------------------------

describe('Brief 08 §3 #2 — a reaction resets only on the HOLDER’s next turn, never globally', () => {
  it('spending on another’s turn stays spent until that holder’s turn begins', () => {
    let state: ReactionState = { 'pc-a': { reactionAvailable: true }, 'pc-b': { reactionAvailable: true } };
    state = spendReaction(state, 'pc-a');                 // pc-a reacts on pc-b's turn
    expect(state['pc-a']!.reactionAvailable).toBe(false);

    state = resetReactionsOnTurn(state, 'pc-b');          // pc-b's turn advances — must NOT refund pc-a
    expect(state['pc-a']!.reactionAvailable).toBe(false);

    state = resetReactionsOnTurn(state, 'pc-a');          // pc-a's own turn — now refunded
    expect(state['pc-a']!.reactionAvailable).toBe(true);
  });
});

// ---- §4 #2 — a legendary round, byte-matched ------------------------------

describe('Brief 08 §4 #2 — legendary round: 3-action pool, spend 1+2 across two turn-ends, reset on boss turn', () => {
  const base: LegendaryPool = {
    bossId: 'npc-dragon', poolMax: 3, remaining: 3,
    options: [{ name: 'Tail Attack', cost: 1, action: 'attack' }, { name: 'Wing Attack', cost: 2, action: 'aoe' }],
  };

  it('the full round of pool events is byte-matched', () => {
    // turn-end 1: both options affordable ⇒ prompt; spend Tail Attack (cost 1)
    const p1 = legendaryPromptAtTurnEnd(base, 'la-1')!;
    expect(p1.context.kind).toBe('legendary_action');
    const s1 = spendLegendary(base, 'Tail Attack')!;
    expect(s1.events).toEqual([{ t: 'resource_changed', creatureId: 'npc-dragon', pool: 'legendary', delta: -1, remaining: 2 }]);

    // turn-end 2: 2 left ⇒ Wing Attack (cost 2) still affordable ⇒ spend it
    expect(affordableLegendary(s1.pool).map((o) => o.name)).toEqual(['Tail Attack', 'Wing Attack']);
    const s2 = spendLegendary(s1.pool, 'Wing Attack')!;
    expect(s2.events).toEqual([{ t: 'resource_changed', creatureId: 'npc-dragon', pool: 'legendary', delta: -2, remaining: 0 }]);

    // pool exhausted ⇒ no prompt at the next turn-end
    expect(legendaryPromptAtTurnEnd(s2.pool, 'la-3')).toBeNull();

    // boss turn start ⇒ pool resets to full
    const reset = resetLegendaryPool(s2.pool);
    expect(reset.event).toEqual({ t: 'resource_changed', creatureId: 'npc-dragon', pool: 'legendary', delta: 3, remaining: 3 });
    expect(reset.pool.remaining).toBe(3);
  });

  it('an unaffordable-only pool offers no prompt (§3 #3 — turn-boundary only)', () => {
    const poor: LegendaryPool = { ...base, remaining: 0 };
    expect(legendaryPromptAtTurnEnd(poor, 'la-x')).toBeNull();
    expect(spendLegendary(poor, 'Tail Attack')).toBeNull();
  });
});

// ---- §4 #3 — legendary resistance, the held cascade -----------------------

describe('Brief 08 §4 #3 — legendary resistance: failed save held → accepted flips it, zero downstream failure events', () => {
  const downstream = EventBodySchema.array().parse([
    { t: 'condition_applied', creatureId: 'npc-dragon', conditionId: 'condition.stunned', duration: { kind: 'save_ends', save: { ability: 'con', dc: 18 }, repeatAt: 'turn_end' } },
  ]);

  it('accepted ⇒ the use is spent, NONE of the downstream failure events emit', () => {
    const held = heldCascade({ bossId: 'npc-dragon', usesLeft: 3 }, { ability: 'con', dc: 18 }, downstream, 'lr-1');
    expect(held.prompt!.context.kind).toBe('legendary_resistance');
    expect(() => EventBodySchema.parse(promptedEvent(held.prompt!))).not.toThrow();

    const out = held.resolve(true);
    expect(out.lr.usesLeft).toBe(2);
    expect(out.events).toEqual([{ t: 'resource_changed', creatureId: 'npc-dragon', pool: 'legendary_resistance', delta: -1, remaining: 2 }]);
    // the stun never lands
    expect(out.events.some((e) => e.t === 'condition_applied')).toBe(false);
  });

  it('declined ⇒ the normal failure cascade proceeds unchanged', () => {
    const held = heldCascade({ bossId: 'npc-dragon', usesLeft: 3 }, { ability: 'con', dc: 18 }, downstream, 'lr-1');
    const out = held.resolve(false);
    expect(out.lr.usesLeft).toBe(3);
    expect(out.events).toEqual(downstream);
  });

  it('no uses left ⇒ no prompt, the cascade just proceeds', () => {
    const held = heldCascade({ bossId: 'npc-dragon', usesLeft: 0 }, { ability: 'con', dc: 18 }, downstream, 'lr-1');
    expect(held.prompt).toBeNull();
    expect(held.resolve(true).events).toEqual(downstream); // can't flip with 0 left
  });
});

// ---- §4 #4 — readied spell ------------------------------------------------

describe('Brief 08 §4 #4 — readied spell: slot spent at ready; released later; unreleased ⇒ slot stays spent', () => {
  const readied = { holderId: 'pc-wizard', triggerText: 'when the goblin enters', response: 'cast Fireball', spellId: 'spell.fireball', slotLevel: 3, released: false };

  it('readying a spell spends the slot NOW and starts concentration', () => {
    const events = readyAction(readied);
    expect(events).toEqual([
      { t: 'resource_changed', creatureId: 'pc-wizard', pool: 'slot_3', delta: -1, remaining: 0 },
      { t: 'concentration_started', creatureId: 'pc-wizard', spellId: 'spell.fireball' },
    ]);
  });

  it('the DM marking the trigger met produces a valid release prompt', () => {
    const p = releasePrompt(readied, 'rd-1');
    expect(p.context.kind).toBe('readied');
    expect(() => PromptContextSchema.parse(p.context)).not.toThrow();
  });

  it('unreleased at encounter end ⇒ slot stays spent; concentration ends', () => {
    expect(readiedExpired(readied)).toEqual([{ t: 'concentration_ended', creatureId: 'pc-wizard', spellId: 'spell.fireball', reason: 'voluntary' }]);
    // released ⇒ nothing to clean up
    expect(readiedExpired({ ...readied, released: true })).toEqual([]);
  });
});

// ---- §4 #5 — timeout + DM-answers-for-player, every kind ------------------

describe('Brief 08 §4 #5 — timeout and DM-answers-for-anyone produce valid closures on every kind', () => {
  const contexts = [
    { kind: 'opportunity_attack', moverId: 'm', provokerId: 'p', pathStep: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }, attackOptions: ['Longsword'] },
    { kind: 'feature', featureId: 'feature.shield', trigger: 'targeted_by_attack' },
    { kind: 'readied', triggerText: 't', response: 'r' },
    { kind: 'legendary_action', poolRemaining: 2, options: [{ name: 'Tail Attack', cost: 1 }] },
    { kind: 'legendary_resistance', save: { ability: 'wis', dc: 18 }, usesLeft: 1 },
    { kind: 'lair', options: [] },
  ] satisfies PromptContext[];

  it('a timeout ⇒ a valid reaction_declined{reason:timeout} for every prompt kind', () => {
    for (const context of contexts) {
      const prompt = { promptId: `p-${context.kind}`, holderId: 'holder', timeoutSec: DEFAULT_TIMEOUT_SEC, context };
      expect(() => EventBodySchema.parse(promptedEvent(prompt))).not.toThrow();
      expect(() => EventBodySchema.parse(declinedEvent(prompt.promptId, 'timeout'))).not.toThrow();
    }
  });

  it('the DM answering for a player ⇒ a valid taken/declined with reason "dm"', () => {
    expect(() => EventBodySchema.parse(takenEvent('p-1'))).not.toThrow();
    expect(() => EventBodySchema.parse(declinedEvent('p-1', 'dm'))).not.toThrow();
  });

  it('one modal prompt at a time per viewer; the rest queue (§1)', () => {
    /* This test is about QUEUEING, not about kinds, so one real context is
       reused for all three. Named rather than indexed out of the table above:
       noUncheckedIndexedAccess types `contexts[1]` as possibly undefined, and a
       prompt with no context is not one the system can hold. */
    const context: PromptContext = {
      kind: 'feature', featureId: 'feature.shield', trigger: 'targeted_by_attack',
    };
    const pending = [
      { promptId: 'a', holderId: 'pc-1', timeoutSec: 60, context },
      { promptId: 'b', holderId: 'pc-1', timeoutSec: 60, context },
      { promptId: 'c', holderId: 'pc-2', timeoutSec: 60, context },
    ];
    const { active, queued } = activePromptFor('pc-1', pending);
    expect(active!.promptId).toBe('a');
    expect(queued.map((q) => q.promptId)).toEqual(['b']);
  });
});
