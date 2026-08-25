/**
 * The projection becomes what the screen draws.
 *
 * The assertions that matter are about RESOLUTION, not layout: an ally's exact
 * hit points versus an enemy's one-word condition. That distinction is what a
 * player is owed at a real table, and getting it backwards would either leak
 * the DM's numbers or hide an ally's.
 *
 * Note what this adapter does NOT do: hide anything. Visibility is settled
 * server-side before the payload is built, so anything reaching this function
 * is already permitted. These tests are about presentation.
 */
import { describe, it, expect } from 'vitest';
import { castFrom, heroFrom, logFrom, projectionToView, type Combatant, type Projection } from '../src/play/projectionToView.js';

function combatant(over: Partial<Combatant> & { id: string; name: string }): Combatant {
  return {
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    profBonus: 2,
    proficientSkills: [],
    proficientSaves: ['str', 'con'],
    maxHp: 12,
    hp: 12,
    tempHp: 0,
    ac: 16,
    conditions: [],
    isPlayer: true,
    ...over,
  };
}

const derived = (value: number, rows: { label: string; value: number }[]) => ({ value, derivation: rows });

/**
 * A sheet as the server would send it. Hand-built rather than computed so the
 * adapter is tested in isolation — whether computeSheet is correct is the
 * engine's golden suite's job, not this one's.
 */
function sheetStub() {
  return {
    abilities: {
      str: derived(16, [{ label: 'Base', value: 14 }, { label: 'Background', value: 2 }]),
      dex: derived(14, [{ label: 'Base', value: 14 }]),
      con: derived(14, [{ label: 'Base', value: 13 }, { label: 'Background', value: 1 }]),
      int: derived(10, [{ label: 'Base', value: 10 }]),
      wis: derived(12, [{ label: 'Base', value: 12 }]),
      cha: derived(8, [{ label: 'Base', value: 8 }]),
    },
    profBonus: derived(2, [{ label: 'Level 1', value: 2 }]),
    hp: { value: { max: 12, hitDie: 'd10', hitDiceMax: 1 }, derivation: [{ label: 'Hit die', value: 10 }, { label: 'CON', value: 2 }] },
    acOptions: [derived(16, [{ label: 'Chain mail', value: 16 }])],
    acDefault: 0,
    initiative: derived(2, [{ label: 'DEX', value: 2 }]),
    saves: {
      str: derived(5, [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }]),
      dex: derived(2, [{ label: 'DEX', value: 2 }]),
      con: derived(4, [{ label: 'CON', value: 2 }, { label: 'Proficiency', value: 2 }]),
      int: derived(0, [{ label: 'INT', value: 0 }]),
      wis: derived(1, [{ label: 'WIS', value: 1 }]),
      cha: derived(-1, [{ label: 'CHA', value: -1 }]),
    },
    skills: { athletics: derived(5, [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }]) },
    passives: { perception: derived(11, [{ label: 'Base', value: 10 }, { label: 'WIS', value: 1 }]) },
    speedFt: derived(30, [{ label: 'Species', value: 30 }]),
    attacks: [],
    features: [],
    coins: { cp: 0 },
  } as never;
}

const myCharacter = (id: string, name: string) => ({
  id, name, summary: 'Human Fighter', sheet: sheetStub(),
});

const projection = (combatants: Combatant[], over: Partial<Projection> = {}): Projection => ({
  combatants: Object.fromEntries(combatants.map((c) => [c.id, c])),
  round: 1,
  nextSeq: 0,
  ...over,
});

describe('the play view', () => {
  it('shows an ally exact hit points and an enemy only a word', () => {
    const cast = castFrom(
      projection([
        combatant({ id: 'mira', name: 'Mira', hp: 5, maxHp: 12 }),
        combatant({ id: 'gob', name: 'Goblin', hp: 3, maxHp: 12, isPlayer: false }),
      ]),
      'mira',
    );

    const mira = cast.find((c) => c.id === 'mira')!;
    const goblin = cast.find((c) => c.id === 'gob')!;

    expect(mira.hp).toEqual({ current: 5, max: 12 });
    expect(goblin.hp, "an enemy's exact hit points are the DM's to reveal").toBeUndefined();
    expect(goblin.hurt).toBe('Bloodied');
  });

  /**
   * REBUILDING A CHARACTER (found by playing, 2026-08-20).
   *
   * Combatants are seated into the projection when the play session starts and
   * keep whatever they were seated with. Rebuild your character and storage is
   * right immediately while the live session still holds the old one — which
   * showed a player their PREVIOUS character's name beside their NEW
   * character's class. The roster is re-read, so it wins.
   */
  it('shows the current name, not the one the session was seated with', () => {
    const hero = heroFrom(
      combatant({ id: 'ch1', name: 'Torvald' }),
      { ...myCharacter('ch1', 'Daniel'), summary: 'Orc Monk' },
    );
    expect(hero.name, 'the stale combatant name must not win').toBe('Daniel');
    expect(hero.initial).toBe('D');
    expect(hero.className).toBe('Orc Monk');
  });

  it('uses current names in the cast list too', () => {
    const cast = castFrom(
      projection([combatant({ id: 'ch1', name: 'Torvald' }), combatant({ id: 'ch2', name: 'Bren' })]),
      'ch1',
      { ch1: 'Daniel' },
    );
    expect(cast.find((c) => c.id === 'ch1')!.name).toBe('Daniel');
    /* A character nobody renamed keeps the projection's name rather than
       vanishing — the map is a fallback, not a filter. */
    expect(cast.find((c) => c.id === 'ch2')!.name).toBe('Bren');
  });

  it('knows which one is you', () => {
    const cast = castFrom(
      projection([
        combatant({ id: 'mira', name: 'Mira' }),
        combatant({ id: 'bren', name: 'Bren' }),
        combatant({ id: 'gob', name: 'Goblin', isPlayer: false }),
      ]),
      'mira',
    );
    expect(cast.find((c) => c.id === 'mira')!.kind).toBe('you');
    expect(cast.find((c) => c.id === 'bren')!.kind).toBe('ally');
    expect(cast.find((c) => c.id === 'gob')!.kind).toBe('foe');
  });

  /** Bloodied is at or below half, per the SRD. */
  it('calls half health bloodied and no less', () => {
    const at = castFrom(projection([combatant({ id: 'g', name: 'G', hp: 6, maxHp: 12, isPlayer: false })]), null);
    const above = castFrom(projection([combatant({ id: 'g', name: 'G', hp: 7, maxHp: 12, isPlayer: false })]), null);
    expect(at[0]!.hurt).toBe('Bloodied');
    expect(above[0]!.hurt).toBe('Hurt');
  });

  it('marks a downed player dying and a downed enemy down', () => {
    const cast = castFrom(
      projection([
        combatant({ id: 'mira', name: 'Mira', hp: 0 }),
        combatant({ id: 'gob', name: 'Goblin', hp: 0, isPlayer: false }),
      ]),
      'mira',
    );
    expect(cast.find((c) => c.id === 'mira')!.status).toBe('Dying');
    expect(cast.find((c) => c.id === 'gob')!.status).toBe('Down');
  });

  it('marks whose turn it is from the projection, not from the list', () => {
    const cast = castFrom(
      projection(
        [combatant({ id: 'mira', name: 'Mira' }), combatant({ id: 'bren', name: 'Bren' })],
        { activeCreatureId: 'bren' },
      ),
      'mira',
    );
    expect(cast.find((c) => c.id === 'bren')!.acting).toBe(true);
    expect(cast.find((c) => c.id === 'mira')!.acting).toBe(false);
  });

  /**
   * The learn-while-playing mechanic, asserted: every number the hero panel
   * shows arrives with the arithmetic that produced it, taken off the sheet
   * rather than recalculated here. A recalculation could disagree with the
   * character sheet the player is looking at; a passthrough cannot.
   */
  it('carries the arithmetic behind every number, from the sheet', () => {
    const hero = heroFrom(combatant({ id: 'mira', name: 'Mira' }), myCharacter('mira', 'Mira'));

    expect(hero.className, 'what they ARE, not the campaign name').toBe('Human Fighter');
    expect(hero.ac.value).toBe('16');
    expect(hero.ac.rows).toEqual([{ label: 'Chain mail', value: '+16' }]);
    expect(hero.initiative.value).toBe('+2');
    expect(hero.hitDice).toEqual({ die: 'd10', max: 1 });

    /* A Fighter is proficient in STR and CON saves — and the derivation says
       so out loud rather than just showing a bigger number. */
    const str = hero.saves.find((s) => s.key === 'str')!;
    expect(str.mod).toBe(5);
    expect(str.explain.rows.map((r) => r.label)).toContain('Proficiency');
    expect(hero.saves.find((s) => s.key === 'dex')!.mod).toBe(2);

    /* The sheet keys skills by the trained ones, so the list IS what this
       character is good at — the same thing a character sheet shows. */
    expect(hero.skills.map((s) => s.key)).toEqual(['athletics']);
    expect(hero.skills[0]!.mod).toBe(5);
  });

  /**
   * The journal is the table's record, not a firehose. Mechanical events change
   * numbers the screen already shows; putting them in the log would bury the
   * story under bookkeeping, which is what the journal exists to prevent.
   */
  it('logs what was said, not every mechanical tick', () => {
    const entries = logFrom([
      { seq: 1, id: 'a', at: 't', actor: { kind: 'system' }, visibility: 'public', body: { t: 'narration', text: 'The door gives.' } },
      { seq: 2, id: 'b', at: 't', actor: { kind: 'system' }, visibility: 'public', body: { t: 'resource_changed', creatureId: 'x', pool: 'p', delta: -1 } },
    ] as never);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.text).toBe('The door gives.');
  });

  it('says the table is exploring when nobody has rolled initiative', () => {
    const view = projectionToView({
      projection: projection([combatant({ id: 'mira', name: 'Mira' })]),
      room: null, myCharacter: myCharacter('mira', 'Mira'), role: 'player', events: [], campaignName: 'The Ash Moor',
    });
    expect(view.turn.exploring).toBe(true);
    expect(view.scene.subtitle).toBe('Not in a fight');
  });

  it('gives a DM no hero of their own', () => {
    const view = projectionToView({
      projection: projection([combatant({ id: 'mira', name: 'Mira' })]),
      room: null, myCharacter: null, role: 'dm', events: [], campaignName: 'The Ash Moor',
    });
    expect(view.hero, 'a DM plays nobody').toBeNull();
    expect(view.cast, 'but still sees the table').toHaveLength(1);
  });
});
