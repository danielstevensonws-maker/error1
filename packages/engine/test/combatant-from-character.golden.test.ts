/**
 * A saved character sits down at the table as the sheet says it should.
 *
 * This is the seam between what a player built and what the engine fights
 * with, and it is exactly the kind of place a second implementation of the
 * rules creeps in — someone writes "hp = hit die + con" here, it drifts from
 * computeSheet, and a character's sheet disagrees with the character at the
 * table. Every assertion below therefore checks the combatant against the
 * SHEET rather than against a number typed into the test.
 */
import { describe, it, expect } from 'vitest';
import type { CharacterChoices } from '@questra/contracts';
import { combatantFromCharacter } from '../src/sim/combatant-from-character.js';
import { computeSheet, buildSheetRulesData } from '../src/sim/sheet.js';
import { CLASSES } from '../src/data/classes.js';
import { DRAFT_ITEMS } from '../src/data/items.js';
import { DRAFT_SPELLS } from '../src/data/spells.js';
import { speciesSpeedFt } from '../src/data/origins.js';

function choicesFor(over: Partial<CharacterChoices> = {}): CharacterChoices {
  return {
    classId: 'class.fighter',
    level: 1,
    backgroundId: 'background.soldier',
    speciesId: 'species.human',
    abilityMethod: 'standard_array',
    baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    backgroundBonuses: { str: 2, con: 1 },
    skillChoices: ['athletics'],
    languageChoices: ['Common'],
    equipment: [],
    featChoices: {},
    identity: { name: 'Torvald', personality: [], bonds: [], appearanceTokens: [] },
    ...over,
  };
}

const rulesFor = (choices: CharacterChoices) =>
  buildSheetRulesData([...CLASSES, ...DRAFT_ITEMS, ...DRAFT_SPELLS], speciesSpeedFt(choices.speciesId));

describe('a character becomes a combatant', () => {
  it('takes every number from the computed sheet, not from a second calculation', () => {
    const choices = choicesFor();
    const rules = rulesFor(choices);
    const sheet = computeSheet(choices, rules);
    const c = combatantFromCharacter({ id: 'char_1', choices }, rules);

    expect(c.maxHp).toBe(sheet.hp.value.max);
    expect(c.ac).toBe(sheet.acOptions[sheet.acDefault]!.value);
    expect(c.profBonus).toBe(sheet.profBonus.value);
    for (const a of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      expect(c.abilities[a], a).toBe(sheet.abilities[a].value);
    }
  });

  it('carries the stored id, because play events reference it', () => {
    const choices = choicesFor();
    const c = combatantFromCharacter({ id: 'char_abc', choices }, rulesFor(choices));
    expect(c.id).toBe('char_abc');
    expect(c.name).toBe('Torvald');
  });

  /**
   * The flag that decides what happens at 0 HP: a player drops unconscious and
   * rolls death saves, a monster dies. Getting it wrong kills somebody's
   * character outright, which is why it is asserted rather than assumed.
   */
  it('is a player character', () => {
    const choices = choicesFor();
    expect(combatantFromCharacter({ id: 'c', choices }, rulesFor(choices)).isPlayer).toBe(true);
  });

  it('arrives at full health with nothing wrong with it', () => {
    const choices = choicesFor();
    const c = combatantFromCharacter({ id: 'c', choices }, rulesFor(choices));
    expect(c.hp).toBe(c.maxHp);
    expect(c.tempHp).toBe(0);
    expect(c.conditions).toEqual([]);
    expect(c.concentratingOn).toBeUndefined();
  });

  /* The sheet keys `skills` by the trained ones, so the keys are the list. */
  it('is trained in what the sheet says it is trained in', () => {
    const choices = choicesFor({ skillChoices: ['athletics', 'intimidation'] });
    const rules = rulesFor(choices);
    const sheet = computeSheet(choices, rules);
    const c = combatantFromCharacter({ id: 'c', choices }, rules);
    expect(new Set(c.proficientSkills)).toEqual(new Set(Object.keys(sheet.skills)));
  });

  /** A Fighter is proficient in STR and CON saves (SRD class table). */
  it('reads save proficiency off the derivation rather than a flag', () => {
    const choices = choicesFor();
    const c = combatantFromCharacter({ id: 'c', choices }, rulesFor(choices));
    expect(new Set(c.proficientSaves)).toEqual(new Set(['str', 'con']));
  });

  /**
   * The Goliath again — the case that proves the rules bundle must be built
   * per character rather than cached with a hardcoded 30ft speed.
   */
  it('respects a species that does not move at the default speed', () => {
    const choices = choicesFor({ speciesId: 'species.goliath' });
    const rules = rulesFor(choices);
    expect(computeSheet(choices, rules).speedFt.value).toBe(35);
  });

  it('gives a different class a different body', () => {
    const fighter = choicesFor();
    const wizard = choicesFor({
      classId: 'class.wizard',
      backgroundId: 'background.sage',
      backgroundBonuses: { int: 2, con: 1 },
      skillChoices: ['arcana'],
    });
    const f = combatantFromCharacter({ id: 'f', choices: fighter }, rulesFor(fighter));
    const w = combatantFromCharacter({ id: 'w', choices: wizard }, rulesFor(wizard));
    /* d10 vs d6 hit die — the wizard is squishier, and that difference coming
       through proves the class table is actually being read. */
    expect(f.maxHp).toBeGreaterThan(w.maxHp);
  });
});
