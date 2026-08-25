/**
 * Slice assembly — the Playbook §7 vertical slice, wired end-to-end in one test:
 *
 *   sheet computation (M2.2) → combatants → attack intent over the SyncCore
 *   (M2.3) → engine d20 pipeline (M2.1) → filtered fan-out (player vs DM) →
 *   an escalated novel action → AI Ruling with fallback (M2.4) → ruling_decided.
 *
 * This is the automatable half of the go/no-go gate: it proves the packages
 * connect and the deterministic path reproduces. The LIVE metrics (first-token
 * p95, roll→narration round-trip on two real devices, asset acceptability) are
 * the slice-environment manual step recorded in docs/adr/0017-slice-metrics.md.
 */
import { describe, it, expect } from 'vitest';
import {
  filterStream, RulesEntitySchema,
  type CharacterChoices, type PlayEvent, type Viewer,
} from '@questra/contracts';
import {
  computeSheet, buildSheetRulesData,
  buildRulesData, resolveAttack,
  initialState, fold,
  CONDITIONS, CLASSES, DRAFT_ITEMS,
  type Combatant,
} from '@questra/engine';
import { getRuling, makeStubModel, toRulingDecidedBody, type RulingRecipe } from '@questra/ai';
import { SyncCore, type ResolvedToken, type IntentResolver } from '../src/sync-core.js';
import { connectMemory } from '../src/transport.js';

const PS = 'ps-slice';

// ---- 1. sheet computation → the two combatants -----------------------------

const sheetRules = buildSheetRulesData([...CLASSES, ...DRAFT_ITEMS], 30);
const torvaldChoices: CharacterChoices = {
  classId: 'class.fighter', level: 1, backgroundId: 'background.soldier', speciesId: 'species.human',
  abilityMethod: 'standard_array',
  baseScores: { str: 14, dex: 13, con: 13, int: 8, wis: 12, cha: 10 },
  backgroundBonuses: { str: 2, con: 1 },
  skillChoices: ['athletics'], languageChoices: ['Common'],
  equipment: ['item.chain-mail', 'item.shield', 'item.longsword'],
  featChoices: {}, identity: { name: 'Torvald', personality: [], bonds: [], appearanceTokens: [] },
};

function torvaldCombatant(): Combatant {
  const sheet = computeSheet(torvaldChoices, sheetRules);
  const ls = sheet.attacks.find((a) => a.name === 'Longsword')!;
  expect(ls.toHit).toBe(5); // the sheet feeds the pipeline: +5 to hit
  return {
    id: 'pc-torvald', name: 'Torvald',
    abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    profBonus: sheet.profBonus.value, maxHp: sheet.hp.value.max, hp: sheet.hp.value.max, tempHp: 0,
    ac: sheet.acOptions[sheet.acDefault]!.value,
    conditions: [{ conditionId: 'condition.prone' }], isPlayer: true,
  };
}

const goblin: Combatant = {
  id: 'npc-goblin-1', name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};

// ---- 2. the intent resolver wires the SyncCore to the engine pipeline -------

const engineRules = buildRulesData(CONDITIONS.map((c) => RulesEntitySchema.parse(c)));

const makeResolver = (): IntentResolver => (envelope, state) => {
  const intent = envelope.intent as { kind: string; text?: string };
  if (intent.kind === 'attack') {
    const rng = scriptedRng([3, 14, 9, 6]); // Bless d4=3, d20 14/9→9, damage d8=6 (the trace)
    const events = resolveAttack(
      { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword', damageDice: '1d8 + 3', damageType: 'slashing', coverDegree: 'half', attackModHooks: [{ label: 'Bless (1d4)', dice: '1d4', sourceId: 'spell.bless' }] },
      state, engineRules, rng,
      { seq: state.nextSeq, timestamps: ['t1', 't2', 't3'], ids: ['e-a', 'e-b', 'e-c'], rollId: 'roll-1', actor: { kind: 'player', accountId: 'acct-torvald', creatureId: 'pc-torvald' } },
      'cause-attack',
    );
    return { ok: true, events };
  }
  if (intent.kind === 'free_text') {
    // a novel action → escalate to a ruling (the AI tier proposes; engine doesn't call the model)
    const seq = state.nextSeq;
    const ev: PlayEvent = { seq, id: 'e-escalate', causeId: 'cause-freetext', at: 't', actor: { kind: 'engine' }, visibility: 'public', body: { t: 'escalated_to_ruling', intentSeq: seq, context: {} } };
    return { ok: true, events: [ev] };
  }
  return { ok: false, reason: 'Unknown action.' };
};

function scriptedRng(seq: number[]) { let i = 0; return () => seq[i++]!; }

function newCore() {
  return new SyncCore({
    resolveToken: (token, playSessionId): ResolvedToken | null => {
      const t: Record<string, ResolvedToken> = {
        'tok-torvald': { accountId: 'acct-torvald', role: 'player', playSessionId: PS },
        'tok-dm': { accountId: 'acct-dm', role: 'dm', playSessionId: PS },
      };
      const r = t[token];
      return r && r.playSessionId === playSessionId ? r : null;
    },
    resolveIntent: makeResolver(),
    initialCombatants: () => [torvaldCombatant(), goblin],
  });
}

// ---- the assembled slice --------------------------------------------------

describe('Playbook §7 slice — assembled end to end', () => {
  it('sheet → attack → engine cascade → filtered fan-out (player == DM here, all public)', () => {
    const core = newCore();
    const player = connectMemory(core, 'sc-player');
    const dm = connectMemory(core, 'sc-dm');
    player.send({ m: 'hello', playSessionId: PS, token: 'tok-torvald' });
    dm.send({ m: 'hello', playSessionId: PS, token: 'tok-dm' });

    player.send({ m: 'intent', envelope: { idempotencyKey: 'slice-attack-1', intent: { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword' } } });

    const log = core.logFor(PS) as PlayEvent[];
    // the engine produced the trace cascade: roll_made hit, damage 9, goblin 10→1, narration
    const roll = log.find((e) => e.body.t === 'roll_made')!;
    expect(roll.body.t === 'roll_made' && roll.body.outcome).toBe('hit');
    const dmg = log.find((e) => e.body.t === 'damage_applied')!;
    expect(dmg.body.t === 'damage_applied' && dmg.body.resultingHp).toBe(1);

    // filtered fan-out: player capture == filterStream(log) (M2.3 reused)
    const playerViewer: Viewer = { role: 'player', accountId: 'acct-torvald' };
    const captured = player.received.filter((m) => m.m === 'event').map((m) => (m as { event: PlayEvent }).event);
    expect(captured).toEqual(filterStream(log, playerViewer));

    // fold reflects the hit: the goblin is at 1 HP (M2.1 projection)
    const state = fold(initialState([torvaldCombatant(), goblin]), log);
    expect(state.combatants['npc-goblin-1']!.hp).toBe(1);
  });

  it('a novel action escalates → AI ruling (fallback) → ruling_decided feeds the pipeline', async () => {
    const core = newCore();
    const player = connectMemory(core, 'sc-p2');
    player.send({ m: 'hello', playSessionId: PS, token: 'tok-torvald' });

    // "I swing on the rope" → free_text intent → escalated_to_ruling
    player.send({ m: 'intent', envelope: { idempotencyKey: 'slice-swing-1', intent: { kind: 'free_text', creatureId: 'pc-torvald', text: 'I swing across on the rope.' } } });
    const log = core.logFor(PS) as PlayEvent[];
    expect(log.some((e) => e.body.t === 'escalated_to_ruling')).toBe(true);

    // the AI tier proposes a ruling; with a dead model it uses the ladder fallback
    const recipe: RulingRecipe = { declaredAction: 'I swing across on the rope.', actorSummary: 'Torvald F1', sceneSummary: 'a gap with a rope', partyLevels: [1] };
    const failModel = makeStubModel({ suggestion: { check: { kind: 'ability_check', ability: 'dex' }, dc: 14, failConsequence: 'x', rationale: 'y' }, fail: true });
    const ruling = await getRuling(recipe, { model: failModel, timeoutMs: 50, fallbackAbility: 'dex', fallbackRung: 'Hard' });
    expect(ruling.usedFallback).toBe(true);        // AI always has a non-AI fallback
    expect(ruling.suggestion.dc).toBe(15);

    // DM taps "Ask for the roll" → ruling_decided{ask_roll} the pipeline consumes
    const decided = toRulingDecidedBody({ decision: 'ask_roll', suggestion: ruling.suggestion });
    expect(decided).toEqual({ t: 'ruling_decided', decision: 'ask_roll', applied: { kind: 'ability_check', dc: 15 } });
  });

  it('undo rolls back the causal group (M2.1 undo property, over the wire log)', () => {
    const core = newCore();
    const player = connectMemory(core, 'sc-p3');
    player.send({ m: 'hello', playSessionId: PS, token: 'tok-torvald' });
    player.send({ m: 'intent', envelope: { idempotencyKey: 'slice-attack-3', intent: { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword' } } });

    const log = core.logFor(PS) as PlayEvent[];
    const withUndo: PlayEvent[] = [...log, { seq: log[log.length - 1]!.seq + 1, id: 'e-undo', at: 't', actor: { kind: 'dm', accountId: 'acct-dm' }, visibility: 'public', body: { t: 'undo_applied', undoneCauseId: 'cause-attack', reversedSeqs: log.map((e) => e.seq) } }];
    const afterUndo = fold(initialState([torvaldCombatant(), goblin]), withUndo);
    expect(afterUndo.combatants['npc-goblin-1']!.hp).toBe(10); // back to full
  });
});
