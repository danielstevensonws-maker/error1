/**
 * The pieces the play screens are assembled from.
 *
 * These are the adapters, not the pixels: what a prompt SAYS, what a tile
 * carries, when the death ladder appears, and what reaches the journal. Each
 * one is a pure function of what arrived, which is the property that lets the
 * screens stay dumb.
 */
import { describe, it, expect } from 'vitest';
import type { PlayEvent } from '@questra/contracts';
import { promptsFrom } from '../src/play/promptsFrom.js';
import { tilesFrom } from '../src/play/tilesFrom.js';
import { rulingsFrom } from '../src/play/rulingsFrom.js';
import { roomWithMoves } from '../src/play/roomWithMoves.js';
import { dyingFrom, logFrom, castFrom, type Combatant, type Projection } from '../src/play/projectionToView.js';

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

describe('reaction prompts', () => {
  const prompted = (promptId: string, context: unknown) =>
    ev(1, { t: 'reaction_prompted', promptId, creatureId: 'mira', context, timeoutSec: 60 });

  /**
   * The translation IS the feature. A player mid-fight has seconds to decide,
   * and "opportunity_attack" is not something a first-timer can act on.
   */
  it('says what happened in words, not in engine vocabulary', () => {
    const [p] = promptsFrom(
      [prompted('p1', {
        kind: 'opportunity_attack',
        moverId: 'goblin', provokerId: 'mira',
        pathStep: { from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
        attackOptions: ['Longsword'],
      })],
      { goblin: 'the goblin' },
    );

    expect(p!.context).toBe('the goblin is moving out of reach. You can take a swing as they go.');
    expect(p!.context).not.toMatch(/opportunity|provoke|pathStep/i);
    expect(p!.options).toEqual([{ name: 'Longsword', cost: 'Your reaction' }]);
  });

  it('closes when it is answered, whichever way', () => {
    const taken = promptsFrom([
      prompted('p1', { kind: 'feature', featureId: 'f', trigger: 'take_damage' }),
      ev(2, { t: 'reaction_taken', promptId: 'p1' }),
    ]);
    const declined = promptsFrom([
      prompted('p1', { kind: 'feature', featureId: 'f', trigger: 'take_damage' }),
      ev(2, { t: 'reaction_declined', promptId: 'p1', reason: 'timeout' }),
    ]);
    expect(taken, 'a card that will not go away is the worst failure here').toHaveLength(0);
    expect(declined, 'letting it lapse is a real answer').toHaveLength(0);
  });

  it('counts legendary actions in words a person reads', () => {
    const [p] = promptsFrom([prompted('p1', {
      kind: 'legendary_action',
      poolRemaining: 1,
      options: [{ name: 'Tail Attack', cost: 1 }],
    })]);
    expect(p!.context).toContain('1 action');
    expect(p!.context, 'singular, because "1 actions" reads as a bug').not.toContain('1 actions');
  });

  it('leaves declining off the option list, since the card always offers it', () => {
    const [p] = promptsFrom([prompted('p1', { kind: 'feature', featureId: 'f', trigger: 'custom' })]);
    expect(p!.options.map((o) => o.name)).not.toContain('Let it pass');
  });
});

describe('the action rows', () => {
  const sheet = {
    attacks: [{
      name: 'Longsword', toHit: 5,
      toHitDerivation: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
      damage: '1d8 + 3', damageType: 'slashing', ability: 'str',
    }],
    features: [{ id: 'second-wind', name: 'Second Wind', resource: { pool: 'sw', max: 1, remaining: 1 } }],
  } as never;

  it('carries the arithmetic behind the attack bonus, off the sheet', () => {
    const [tile] = tilesFrom(sheet);
    expect(tile!.name).toBe('Longsword');
    expect(tile!.roll).toEqual({ bonus: 5 });
    expect(tile!.explain.rows).toEqual([
      { label: 'STR', value: '+3' },
      { label: 'Proficiency', value: '+2' },
    ]);
  });

  /**
   * A player does not know a target's armour class before they swing. Handing
   * it over on the tile would give them a number the character has not earned.
   */
  it('never shows what it is rolling against before the roll', () => {
    const [tile] = tilesFrom(sheet);
    expect(tile!.roll?.against).toBeUndefined();
  });

  it('shows a limited feature what is left of it', () => {
    const tiles = tilesFrom(sheet);
    const feature = tiles.find((t) => t.id.startsWith('feature:'))!;
    expect(feature.resource).toBe('1 of 1');
    expect(feature.detail).toContain('a rest brings them back');
  });

  it('greys nothing on its own guess — that is the server’s answer', () => {
    for (const tile of tilesFrom(sheet)) expect(tile.greyReason).toBeNull();
  });

  it('has nothing to show without a sheet', () => {
    expect(tilesFrom(null)).toEqual([]);
  });
});

describe('the death-save ladder', () => {
  it('stays hidden while you are on your feet', () => {
    expect(dyingFrom([], 'mira', 12)).toBeUndefined();
  });

  it('counts successes and failures from the rolls themselves', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'mira' }),
      ev(2, { t: 'roll_made', kind: 'death_save', d20: 15, collapsed: 'straight', sources: ['mira'], modifiers: [], total: 15, outcome: 'success', entry: 'server' }),
      ev(3, { t: 'roll_made', kind: 'death_save', d20: 4, collapsed: 'straight', sources: ['mira'], modifiers: [], total: 4, outcome: 'failure', entry: 'server' }),
    ], 'mira', 0);
    expect(d).toEqual({ successes: 1, failures: 1, phase: 'dying' });
  });

  /** A natural 1 is two failures (SRD). */
  it('counts a fumble twice', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'mira' }),
      ev(2, { t: 'roll_made', kind: 'death_save', d20: 1, collapsed: 'straight', sources: ['mira'], modifiers: [], total: 1, outcome: 'fumble', entry: 'server' }),
    ], 'mira', 0);
    expect(d!.failures).toBe(2);
  });

  it('wipes the ladder when somebody heals you', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'mira' }),
      ev(2, { t: 'roll_made', kind: 'death_save', d20: 4, collapsed: 'straight', sources: ['mira'], modifiers: [], total: 4, outcome: 'failure', entry: 'server' }),
      ev(3, { t: 'healing_applied', creatureId: 'mira', amount: 5 }),
    ], 'mira', 5);
    expect(d, 'back on your feet is not a ladder with one rung ticked').toBeUndefined();
  });

  it('is only ever about your own character', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'bren' }),
      ev(2, { t: 'roll_made', kind: 'death_save', d20: 4, collapsed: 'straight', sources: ['bren'], modifiers: [], total: 4, outcome: 'failure', entry: 'server' }),
    ], 'mira', 12);
    expect(d).toBeUndefined();
  });
});

describe('the journal', () => {
  it('shows the arithmetic of a roll, which is the whole promise', () => {
    const [line] = logFrom([
      ev(1, {
        t: 'roll_made', rollId: 'r1', kind: 'attack_roll',
        d20: 12, collapsed: 'straight', sources: ['mira'], modifiers: [{ label: 'STR', value: 5 }],
        total: 17, vs: { type: 'ac', value: 15 }, outcome: 'hit', entry: 'server',
      }),
    ], { mira: 'Mira' });

    expect(line!.actor).toBe('Mira');
    expect(line!.text, 'a bare 17 teaches nothing').toBe('Attack: rolled 12 +5 STR = 17 against 15 — a hit');
  });

  it('names the round and who is up when the turn moves', () => {
    const [line] = logFrom([ev(1, { t: 'turn_advanced', round: 2, activeCreatureId: 'goblin' })], { goblin: 'Goblin' });
    expect(line!.text).toBe('Goblin is up.');
    expect(line!.actor).toBe('Round 2');
  });

  it('marks a whisper as private so it is not read aloud by mistake', () => {
    const [line] = logFrom([ev(1, { t: 'whisper_sent', text: 'The floor is a trap.' })]);
    expect(line!.actor).toBe('Just to you');
  });

  it('still leaves bookkeeping out of the story', () => {
    const lines = logFrom([ev(1, { t: 'resource_changed', creatureId: 'mira', pool: 'p', delta: -1 })]);
    expect(lines).toHaveLength(0);
  });
});

describe('the cast list', () => {
  const projection = (over: Partial<Projection>): Projection => ({
    combatants: {
      zara: combatant({ id: 'zara', name: 'Zara' }),
      arn: combatant({ id: 'arn', name: 'Arn' }),
    },
    round: 1, nextSeq: 0,
    ...over,
  });

  /**
   * A turn order sorted alphabetically is actively misleading: the list's whole
   * job in a fight is to answer "who is next?".
   */
  it('follows initiative in a fight, not the alphabet', () => {
    const cast = castFrom(projection({ order: ['zara', 'arn'], activeCreatureId: 'zara' }), 'arn');
    expect(cast.map((c) => c.id)).toEqual(['zara', 'arn']);
  });

  it('falls back to the alphabet when nobody has rolled', () => {
    const cast = castFrom(projection({}), 'arn');
    expect(cast.map((c) => c.id)).toEqual(['arn', 'zara']);
  });

  it('puts somebody who joined mid-fight at the end rather than the front', () => {
    const p = projection({ order: ['zara'], activeCreatureId: 'zara' });
    const cast = castFrom(p, 'arn');
    expect(cast.map((c) => c.id)).toEqual(['zara', 'arn']);
  });
});

describe('checks the DM asked for', () => {
  const asked = (creatureIds: string[]) =>
    ev(5, { t: 'check_asked', askId: 'ask-1', skill: 'animal_handling', creatureIds, reason: 'The horse is spooked' });

  /**
   * A check aimed at somebody is TAPPABLE only by them. Everyone else hears
   * the ask in the journal and watches the roll — which is what a table does.
   */
  it('is a card for the person who owes the roll', () => {
    const mine = promptsFrom([asked(['mira'])], { mira: 'Mira' }, 'mira');
    expect(mine).toHaveLength(1);
    expect(mine[0]!.context).toBe('The horse is spooked — roll Animal Handling.');
    expect(mine[0]!.options[0]!.name).toBe('Roll Animal Handling');
  });

  it('is not a card for anybody else', () => {
    expect(promptsFrom([asked(['mira'])], { mira: 'Mira' }, 'bren')).toHaveLength(0);
  });

  /** No countdown: a check waits for the player rather than interrupting them. */
  it('carries no clock', () => {
    expect(promptsFrom([asked(['mira'])], {}, 'mira')[0]!.timeoutSec).toBe(0);
  });

  it('closes once that player has rolled', () => {
    const after = promptsFrom([
      asked(['mira']),
      ev(6, { t: 'roll_made', kind: 'ability_check', d20: 12, collapsed: 'straight', sources: ['mira'], modifiers: [], total: 14, outcome: 'success', entry: 'server' }),
    ], {}, 'mira');
    expect(after).toHaveLength(0);
  });

  it('stays open when somebody ELSE rolls theirs', () => {
    const still = promptsFrom([
      asked(['mira', 'bren']),
      ev(6, { t: 'roll_made', kind: 'ability_check', d20: 12, collapsed: 'straight', sources: ['bren'], modifiers: [], total: 14, outcome: 'success', entry: 'server' }),
    ], {}, 'mira');
    expect(still, 'Mira still owes her own roll').toHaveLength(1);
  });

  it('tells the whole table what was asked', () => {
    const [line] = logFrom([asked(['mira'])], { mira: 'Mira' });
    expect(line!.actor).toBe('The DM asks');
    expect(line!.text).toBe('Mira to roll Animal Handling — The horse is spooked.');
  });
});

describe('what players want to do', () => {
  const described = (seq: number, creatureId: string, text: string) =>
    ({ seq, id: `e${String(seq)}`, at, actor: { kind: 'player', creatureId }, visibility: 'public',
       body: { t: 'narration', text, from: 'engine' } } as PlayEvent);

  /**
   * Law 2's escape hatch only works if somebody is on the other side of it.
   * A described action is a QUESTION, and this is what queues it for an answer.
   */
  it('queues a described action for the DM', () => {
    const open = rulingsFrom([described(3, 'mira', 'I move my clones in a circle and heal')], { mira: 'Mira' });
    expect(open).toHaveLength(1);
    expect(open[0]!.who).toBe('Mira');
    expect(open[0]!.text).toBe('I move my clones in a circle and heal');
  });

  it('stops waiting once the DM has answered it', () => {
    const open = rulingsFrom([
      described(3, 'mira', 'I climb the wall'),
      ev(4, { t: 'ruled', onSeq: 3, verdict: 'allow' }),
    ], { mira: 'Mira' });
    expect(open).toHaveLength(0);
  });

  /** A DM narrating is talking to the table, not asking their own permission. */
  it('never queues the DM’s own narration', () => {
    const open = rulingsFrom([ev(3, { t: 'narration', text: 'The door gives.', from: 'dm' })]);
    expect(open).toHaveLength(0);
  });

  it('answers in the order people asked', () => {
    const open = rulingsFrom([
      described(9, 'bren', 'second'),
      described(3, 'mira', 'first'),
    ], { mira: 'Mira', bren: 'Bren' });
    expect(open.map((r) => r.text)).toEqual(['first', 'second']);
  });

  it('puts the ruling in the log, because the log is the play record', () => {
    const [line] = logFrom([ev(4, { t: 'ruled', onSeq: 3, verdict: 'refuse', note: 'The door is iron.' })]);
    expect(line!.text).toBe('says not this time. The door is iron.');
  });
});

describe('the map, showing where people actually are', () => {
  const room = {
    id: 'r', terrainImageRef: 'stone', gridSize: { w: 10, h: 10 },
    cellTags: {}, revealed: ['1,1'], assets: [],
    tokens: [
      { id: 't-mira', creatureRef: 'mira', cell: { x: 1, y: 1 }, size: 'medium', hidden: false, staged: false },
      { id: 't-gob', creatureRef: 'gob', cell: { x: 5, y: 5 }, size: 'medium', hidden: false, staged: false },
    ],
  } as never as import('@questra/contracts').Room;

  const moved = (tokenId: string, to: { x: number; y: number }, path: { x: number; y: number }[]) =>
    ev(7, { t: 'token_moved', tokenId, from: { x: 1, y: 1 }, to, path, forced: false, costFt: 15 });

  /**
   * THE MAP WAS FROZEN. A room is fetched once and never changes while
   * token_moved events flow past on the socket — and nothing applied them, so
   * tokens sat where they were at page load no matter how much the table moved.
   */
  it('puts a token where the log says it went', () => {
    const out = roomWithMoves(room, [moved('t-mira', { x: 4, y: 1 }, [{ x: 1, y: 1 }, { x: 4, y: 1 }])])!;
    expect(out.tokens.find((t) => t.id === 't-mira')!.cell).toEqual({ x: 4, y: 1 });
  });

  it('leaves everybody else where they were', () => {
    const out = roomWithMoves(room, [moved('t-mira', { x: 4, y: 1 }, [])])!;
    expect(out.tokens.find((t) => t.id === 't-gob')!.cell).toEqual({ x: 5, y: 5 });
  });

  /** A move names the CREATURE; the room names the token that stands for it. */
  it('matches a move addressed to the creature rather than the token', () => {
    const out = roomWithMoves(room, [moved('mira', { x: 2, y: 2 }, [])])!;
    expect(out.tokens.find((t) => t.id === 't-mira')!.cell).toEqual({ x: 2, y: 2 });
  });

  it('reveals the squares somebody walked through', () => {
    const out = roomWithMoves(room, [moved('t-mira', { x: 3, y: 1 }, [{ x: 2, y: 1 }, { x: 3, y: 1 }])])!;
    expect(out.revealed).toContain('2,1');
    expect(out.revealed).toContain('3,1');
  });

  /**
   * Replaying rather than mutating is what makes a refetch safe: the fetched
   * room is the base, the moves are the log, and later moves win.
   */
  it('lands on the last place they went, not the first', () => {
    const out = roomWithMoves(room, [
      moved('t-mira', { x: 2, y: 1 }, []),
      moved('t-mira', { x: 6, y: 1 }, []),
    ])!;
    expect(out.tokens.find((t) => t.id === 't-mira')!.cell).toEqual({ x: 6, y: 1 });
  });

  it('hands back the same room when nobody has moved', () => {
    expect(roomWithMoves(room, [])).toBe(room);
  });
});

describe('the DM performing rather than narrating', () => {
  /**
   * "The goblin boss says" reads as somebody speaking; "The DM" reads as the
   * world being described. Flattening both into one voice is what makes a log
   * feel like a chat window instead of a table.
   */
  it('names the character, not the DM', () => {
    const [line] = logFrom([ev(3, {
      t: 'narration', text: 'You will not pass.', from: 'dm', spoken: true,
      as: { name: 'The Goblin Boss', creatureId: 'gob' },
    })]);
    expect(line!.actor).toBe('The Goblin Boss');
    expect(line!.tone, 'set apart from narration on sight').toBe('chat');
  });

  it('still says The DM when they are narrating as themselves', () => {
    const [line] = logFrom([ev(3, { t: 'narration', text: 'The door gives.', from: 'dm' })]);
    expect(line!.actor).toBe('The DM');
    expect(line!.tone).toBe('narration');
  });

  /** A DM performing is not asking their own permission. */
  it('never queues a performance for a ruling', () => {
    const open = rulingsFrom([ev(3, {
      t: 'narration', text: 'You will not pass.', from: 'dm', spoken: true,
      as: { name: 'The Goblin Boss' },
    })]);
    expect(open).toHaveLength(0);
  });
});
