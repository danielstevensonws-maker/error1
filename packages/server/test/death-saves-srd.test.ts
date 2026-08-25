/**
 * Death saves, against the SRD's own words.
 *
 * WHY THIS EXISTS. The server's death-save path LABELLED a roll correctly and
 * then applied nothing: a natural 20 read as "crit" and left the character at
 * 0 hit points, still dying, rolling again next turn. `deathSave` in the engine
 * had implemented the real rule since the beginning — nothing called it
 * (owner asked whether the engine matches the SRD, 2026-08-25; it did, the
 * server did not).
 *
 * Each test below quotes the rule it is holding the code to, from
 * SRD 5.2.1 "Death Saving Throws" (srd-raw.txt lines 1822–1848), so a reader
 * can check the code against the book without owning the book.
 */
import { describe, it, expect } from 'vitest';
import type { Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';
import { fold } from '@questra/engine';
import type { Combatant, ProjectionState } from '@questra/engine';
import type { EventBody, PlayEvent } from '@questra/contracts';

const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

function dying(over: Partial<Combatant> = {}): Combatant {
  return {
    id: 'mira', name: 'Mira',
    abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 12, cha: 10 },
    profBonus: 2, maxHp: 12, hp: 0, tempHp: 0, ac: 14,
    conditions: [{ conditionId: 'condition.unconscious', appliedBySeq: 0 }],
    isPlayer: true,
    ...over,
  } as Combatant;
}

const state = (c: Combatant): ProjectionState => ({
  combatants: { mira: c }, round: 1, nextSeq: 0,
});

/** A resolver whose d20 is whatever the test says it is. */
function rollOf(d20: number, s: ProjectionState) {
  /* Math.random is what the live resolver uses; pinning it is how a golden
     tests a rule rather than luck. */
  const real = Math.random;
  Math.random = () => (d20 - 1) / 20 + 0.001;
  try {
    return makeSliceResolver()(
      { idempotencyKey: 'k-death-1', intent: { kind: 'death_save', creatureId: 'mira' } },
      s, PLAYER, { playSessionId: 'ps_test' });
  } finally {
    Math.random = real;
  }
}

/**
 * The bodies a roll produced, typed as the union the schema actually defines.
 *
 * It used to be projected onto a hand-written `{ t: string; amount?: number }`
 * and then re-asserted field by field, which is how an assertion on `outcome`
 * came to sit next to a `death_save_rolled` body whose field is called
 * `result`. It reads the RIGHT event — the server announces every save as a
 * `roll_made` first — but nothing in the types said so, and nothing could,
 * because the projection had thrown the union away. Narrow by `t` instead.
 */
const bodies = (out: ReturnType<typeof rollOf>): EventBody[] =>
  out.ok ? out.events.map((e) => e.body) : [];

/** The roll the server announced, which is where a save's verdict is stated. */
function announced(bs: EventBody[]): Extract<EventBody, { t: 'roll_made' }> {
  const b = bs.find((x) => x.t === 'roll_made');
  expect(b, 'the server announces every death save as a roll').toBeDefined();
  return b as Extract<EventBody, { t: 'roll_made' }>;
}

describe('death saves follow the book', () => {
  /** SRD: "Roll 1d20. If the roll is 10 or higher, you succeed." */
  it('succeeds on a 10 and fails on a 9', () => {
    const ten = bodies(rollOf(10, state(dying())));
    const nine = bodies(rollOf(9, state(dying())));
    expect(announced(ten).outcome).toBe('success');
    expect(announced(nine).outcome).toBe('failure');
  });

  /**
   * SRD: "If you roll a 20 on the d20, you regain 1 Hit Point."
   *
   * NOT "a very good save". This is the rule the server was announcing and not
   * applying — the whole reason this file exists.
   */
  it('a natural 20 puts you back on your feet with one hit point', () => {
    const out = bodies(rollOf(20, state(dying())));
    const healing = out.find((b) => b.t === 'healing_applied');
    expect(healing, 'a 20 must DO something, not just be labelled').toBeDefined();
    expect(healing?.t === 'healing_applied' ? healing.amount : 0).toBe(1);
  });

  /** SRD: "When you roll a 1 on the d20 … you suffer two failures." */
  it('a natural 1 costs two failures', () => {
    const s = state(dying({ deathFailures: 1 }));
    const out = rollOf(1, s);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    /* One prior + two = three, which is death. */
    expect(out.events.some((e) => e.body.t === 'creature_died')).toBe(true);
  });

  /** SRD: "On your third success, you become Stable." */
  it('the third success stabilises you', () => {
    const s = state(dying({ deathSuccesses: 2 }));
    const out = rollOf(15, s);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.events.some((e) => e.body.t === 'creature_stabilized')).toBe(true);
  });

  /** SRD: "On your third failure, you die." */
  it('the third failure kills you', () => {
    const s = state(dying({ deathFailures: 2 }));
    const out = rollOf(5, s);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.events.some((e) => e.body.t === 'creature_died')).toBe(true);
  });

  it('does not let somebody on their feet roll one', () => {
    const out = rollOf(10, state(dying({ hp: 5 })));
    expect(out.ok).toBe(false);
  });
});

describe('the ladder, folded from the log', () => {
  /**
   * SRD: "The successes and failures don't need to be consecutive; keep track
   * of both until you collect three of a kind."
   */
  it('accumulates across turns', () => {
    let s = state(dying());
    const log: PlayEvent[] = [];
    for (const d20 of [12, 4, 15]) {
      const out = rollOf(d20, s);
      if (!out.ok) throw new Error('rejected');
      log.push(...out.events);
      s = fold(state(dying()), log);
    }
    expect(s.combatants.mira!.deathSuccesses).toBe(2);
    expect(s.combatants.mira!.deathFailures).toBe(1);
  });

  /**
   * SRD: "The number of both is reset to zero when you regain any Hit Points
   * or become Stable."
   */
  it('is wiped by any healing at all, even one point', () => {
    const log: PlayEvent[] = [];
    const first = rollOf(4, state(dying()));
    if (!first.ok) throw new Error('rejected');
    log.push(...first.events);

    /* One hit point counts exactly as much as a full heal. */
    log.push({
      seq: 90, id: 'heal', at: '2026-08-25T00:00:00.000Z',
      actor: { kind: 'engine' }, visibility: 'public',
      body: { t: 'healing_applied', creatureId: 'mira', amount: 1, resultingHp: 1 },
    } as PlayEvent);

    const s = fold(state(dying()), log);
    expect(s.combatants.mira!.deathFailures).toBe(0);
    expect(s.combatants.mira!.hp).toBe(1);
    expect(
      s.combatants.mira!.conditions.map((c) => c.conditionId),
      'and you are no longer unconscious',
    ).not.toContain('condition.unconscious');
  });

  it('is wiped by becoming stable', () => {
    const log: PlayEvent[] = [
      {
        seq: 1, id: 'r', at: '2026-08-25T00:00:00.000Z',
        actor: { kind: 'engine' }, visibility: 'public',
        body: {
          t: 'roll_made', rollId: 'r1', kind: 'death_save', d20: 4,
          collapsed: 'straight', sources: ['mira'], modifiers: [], total: 4,
          outcome: 'failure', entry: 'server',
        },
      },
      {
        seq: 2, id: 's', at: '2026-08-25T00:00:00.000Z',
        actor: { kind: 'engine' }, visibility: 'public',
        body: { t: 'creature_stabilized', creatureId: 'mira' },
      },
    ] as PlayEvent[];

    const s = fold(state(dying()), log);
    expect(s.combatants.mira!.deathFailures).toBe(0);
  });
});
