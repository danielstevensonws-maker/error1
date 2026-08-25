/**
 * Caster golden tests — the sheet half of the spell-slot work.
 *
 * These cover the three rules gaps the play surface documented but the engine
 * could not feed: half-casters received no spellcasting at all, the casting
 * ability was inferred from the class's primary ability (wrong for exactly the
 * classes that were broken), and a prepared list could never be populated
 * because nothing in CharacterChoices carried the picks.
 *
 * The slot NUMBERS are asserted against the SRD text in spell-slots.golden.test.ts;
 * this suite is about what the sheet does with them.
 */
import { describe, it, expect } from 'vitest';
import { ComputedSheetSchema, derivationSumsToValue, type CharacterChoices } from '@questra/contracts';
import { computeSheet, buildSheetRulesData, IllegalChoiceError } from '../src/sim/sheet.js';
import { CLASSES } from '../src/data/classes.js';
import { DRAFT_ITEMS } from '../src/data/items.js';
import { DRAFT_SPELLS } from '../src/data/spells.js';
import { FIREBALL } from '../src/data/slice.js';

const rules = buildSheetRulesData([...CLASSES, ...DRAFT_ITEMS, ...DRAFT_SPELLS, FIREBALL], 30);

/** A character of `classId` at `level`, with everything irrelevant held fixed. */
const who = (classId: string, level: number, extra: Partial<CharacterChoices> = {}): CharacterChoices => ({
  classId, level,
  backgroundId: 'background.soldier', speciesId: 'species.human',
  abilityMethod: 'standard_array',
  baseScores: { str: 14, dex: 13, con: 13, int: 12, wis: 14, cha: 14 },
  backgroundBonuses: { str: 2, con: 1 },
  skillChoices: [],
  languageChoices: ['Common'],
  equipment: [],
  featChoices: {},
  identity: { name: 'Test', personality: [], bonds: [], appearanceTokens: [] },
  ...extra,
});

describe('half-casters cast — the gap the play surface could not see', () => {
  it('a level 1 Paladin has spell slots (SRD 5.2.1 grants Spellcasting at level 1)', () => {
    const sheet = computeSheet(who('class.paladin', 1), rules);
    expect(sheet.spellcasting).toBeDefined();
    expect(sheet.spellcasting!.slots).toEqual({ '1': 2 });
  });

  it('a level 1 Ranger has spell slots', () => {
    const sheet = computeSheet(who('class.ranger', 1), rules);
    expect(sheet.spellcasting!.slots).toEqual({ '1': 2 });
  });

  it('a half-caster at 5 is behind a full caster at 5', () => {
    const paladin = computeSheet(who('class.paladin', 5), rules);
    const wizard = computeSheet(who('class.wizard', 5), rules);
    expect(paladin.spellcasting!.slots).toEqual({ '1': 4, '2': 2 });
    expect(wizard.spellcasting!.slots).toEqual({ '1': 4, '2': 3, '3': 2 });
  });

  it('every class the SRD says casts, casts; every class it says does not, does not', () => {
    const casters = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
    const martials = ['barbarian', 'fighter', 'monk', 'rogue'];
    for (const c of casters) {
      expect(computeSheet(who(`class.${c}`, 5), rules).spellcasting, c).toBeDefined();
    }
    for (const m of martials) {
      expect(computeSheet(who(`class.${m}`, 5), rules).spellcasting, m).toBeUndefined();
    }
  });
});

describe('the casting ability comes from the class, never from its primary ability', () => {
  // These two are the whole reason spellcastingAbility exists: inferring from
  // primaryAbility gives a Paladin Strength and a Ranger Dexterity, and both
  // would compute a save DC off the wrong score.
  it('a Paladin casts on Charisma though its primary ability is Strength', () => {
    const sheet = computeSheet(who('class.paladin', 5), rules);
    expect(sheet.spellcasting!.ability).toBe('cha');
    // CHA 14 (+2), prof +3 at level 5 → DC 8 + 3 + 2 = 13
    expect(sheet.spellcasting!.saveDc.value).toBe(13);
  });

  it('a Ranger casts on Wisdom though its primary ability is Dexterity', () => {
    const sheet = computeSheet(who('class.ranger', 5), rules);
    expect(sheet.spellcasting!.ability).toBe('wis');
    expect(sheet.spellcasting!.saveDc.value).toBe(13); // WIS 14 (+2) + prof 3 + 8
  });

  it('the full casters keep the abilities the SRD gives them', () => {
    const expected: Record<string, string> = {
      'class.bard': 'cha', 'class.cleric': 'wis', 'class.druid': 'wis',
      'class.sorcerer': 'cha', 'class.warlock': 'cha', 'class.wizard': 'int',
    };
    for (const [cls, ability] of Object.entries(expected)) {
      expect(computeSheet(who(cls, 3), rules).spellcasting!.ability, cls).toBe(ability);
    }
  });

  it('every spellcasting Derived still sums to its value', () => {
    for (const cls of ['class.paladin', 'class.ranger', 'class.warlock', 'class.wizard']) {
      const sc = computeSheet(who(cls, 7), rules).spellcasting!;
      expect(derivationSumsToValue(sc.saveDc), cls).toBe(true);
      expect(derivationSumsToValue(sc.attackBonus), cls).toBe(true);
    }
  });
});

describe('Pact Magic is its own kind of slot, not a thin full caster', () => {
  it('a level 5 Warlock has two level-3 slots, not a full caster ladder', () => {
    const sheet = computeSheet(who('class.warlock', 5), rules);
    expect(sheet.spellcasting!.slotKind).toBe('pact');
    expect(sheet.spellcasting!.slots).toEqual({ '3': 2 });
  });

  it('everyone else uses the standard ladder', () => {
    for (const cls of ['class.wizard', 'class.paladin', 'class.cleric']) {
      expect(computeSheet(who(cls, 5), rules).spellcasting!.slotKind, cls).toBe('slots');
    }
  });
});

describe('prepared spells resolve into real cards', () => {
  const wizardWithFireball = who('class.wizard', 5, { preparedSpellIds: ['spell.fireball'] });

  it('a chosen spell comes back as a card carrying its own rules data', () => {
    const sheet = computeSheet(wizardWithFireball, rules);
    const [card] = sheet.spellcasting!.prepared;
    expect(card!.name).toBe('Fireball');
    expect(card!.level).toBe(3);
    expect(card!.school).toBe('evocation');
    expect(card!.concentration).toBe(false);
    expect(card!.rangeFt).toBe(150);
  });

  it("the save and damage are read off the spell's effects, with the caster's own DC", () => {
    const sheet = computeSheet(wizardWithFireball, rules);
    const card = sheet.spellcasting!.prepared[0]!;
    // INT 12 (+1), prof +3 at level 5 → DC 12; Fireball's dc is 'spell_save_dc'
    expect(card.save).toEqual({ ability: 'dex', dc: 12 });
    expect(sheet.spellcasting!.saveDc.value).toBe(12);
    expect(card.damage).toEqual({ dice: '8d6', type: 'fire' });
  });

  it('no spell claims an attack roll — the effect vocabulary cannot express one', () => {
    const sheet = computeSheet(wizardWithFireball, rules);
    expect(sheet.spellcasting!.prepared[0]!.attack).toBeUndefined();
  });

  it('the sheet still validates against the contract with cards on it', () => {
    expect(() => ComputedSheetSchema.parse(computeSheet(wizardWithFireball, rules))).not.toThrow();
  });

  it('an empty pick list is an empty list, not a missing one', () => {
    const sheet = computeSheet(who('class.wizard', 5), rules);
    expect(sheet.spellcasting!.prepared).toEqual([]);
    expect(sheet.spellcasting!.cantrips).toEqual([]);
  });
});

describe('illegal spell choices are refused in plain language', () => {
  const reason = (choices: CharacterChoices): string => {
    try { computeSheet(choices, rules); } catch (e) {
      expect(e).toBeInstanceOf(IllegalChoiceError);
      return (e as Error).message;
    }
    throw new Error('expected the choices to be rejected');
  };

  it('a spell above your slot ceiling', () => {
    // Fireball is level 3; a level 3 wizard tops out at level 2 slots.
    expect(reason(who('class.wizard', 3, { preparedSpellIds: ['spell.fireball'] })))
      .toBe('Fireball is a level 3 spell, but the highest you can cast is level 2.');
  });

  it('a spell that is not on your class list', () => {
    // Fireball's classLists are sorcerer + wizard.
    expect(reason(who('class.cleric', 5, { preparedSpellIds: ['spell.fireball'] })))
      .toBe("Fireball isn't on the Cleric spell list.");
  });

  it('more prepared spells than the class table allows', () => {
    const msg = reason(who('class.paladin', 1, {
      preparedSpellIds: ['spell.bless', 'spell.cure-wounds', 'spell.heroism'],
    }));
    expect(msg).toBe("That's 3 prepared spells, but a level 1 Paladin can prepare 2.");
  });

  it('a spell nobody has heard of', () => {
    expect(reason(who('class.wizard', 5, { preparedSpellIds: ['spell.not-a-spell'] })))
      .toBe('Unknown spell "spell.not-a-spell".');
  });

  it('a levelled spell in the cantrip list', () => {
    expect(reason(who('class.wizard', 5, { cantripChoices: ['spell.fireball'] })))
      .toBe('Fireball is a level 3 spell, not a cantrip.');
  });

  it('a cantrip in the prepared list', () => {
    expect(reason(who('class.wizard', 5, { preparedSpellIds: ['spell.fire-bolt'] })))
      .toBe('Fire Bolt is a cantrip — it belongs with your cantrips, not your prepared spells.');
  });
});

describe('cantrips', () => {
  it('resolve like any other spell, at level 0', () => {
    const sheet = computeSheet(who('class.wizard', 5, { cantripChoices: ['spell.fire-bolt', 'spell.mage-hand'] }), rules);
    const [bolt, hand] = sheet.spellcasting!.cantrips;
    expect(bolt!.name).toBe('Fire Bolt');
    expect(bolt!.level).toBe(0);
    expect(bolt!.school).toBe('evocation');
    expect(bolt!.rangeFt).toBe(120);
    expect(hand!.name).toBe('Mage Hand');
  });

  it('do not count against the prepared ceiling', () => {
    // A level 1 Paladin prepares 2 — cantrips are a separate column in the table.
    const sheet = computeSheet(who('class.paladin', 1, {
      preparedSpellIds: ['spell.bless', 'spell.heroism'],
      cantripChoices: [],
    }), rules);
    expect(sheet.spellcasting!.prepared).toHaveLength(2);
    expect(sheet.spellcasting!.preparedMax).toBe(2);
  });

  it('are still held to the class list', () => {
    // Eldritch Blast is Warlock-only.
    let msg = '';
    try { computeSheet(who('class.wizard', 5, { cantripChoices: ['spell.eldritch-blast'] }), rules); }
    catch (e) { msg = (e as Error).message; }
    expect(msg).toBe("Eldritch Blast isn't on the Wizard spell list.");
  });
});
