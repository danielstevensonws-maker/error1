/**
 * A saved character becomes a combatant at the table.
 *
 * THE SEAM THIS FILLS. The wizard persists `CharacterChoices`; the engine's
 * projection is built from `Combatant`s; and until now nothing converted one
 * into the other, so `SyncCore.initialCombatants` went unset and every play
 * session started with an empty table no matter who had made a character.
 *
 * IT GOES THROUGH computeSheet RATHER THAN READING CHOICES DIRECTLY, and that
 * is the whole point. HP is not "the hit die plus a CON bonus" written out
 * again here — it is whatever the sheet says, because the sheet already
 * encodes the SRD's rules and has golden tests behind it. Anything that
 * recomputed those numbers locally would be a second implementation of the
 * rules, free to disagree with the character sheet the player is looking at.
 *
 * Living in the engine rather than the server is deliberate for the same
 * reason: this is a rules translation, and rules belong where they can be
 * tested against the SRD rather than where they can be tested against a mock.
 */
import type { Ability, CharacterChoices } from '@questra/contracts';
import type { Combatant } from './state.js';
import { computeSheet, type SheetRulesData } from './sheet.js';

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export interface CharacterAtTable {
  /** The stored character's id — play events reference it, so it is the token's identity. */
  id: string;
  choices: CharacterChoices;
}

/**
 * Build the combatant a character sits down as.
 *
 * Starts at full health with no conditions: this is a character arriving at a
 * table, not one resuming mid-fight. Anything that happened to them is in the
 * event log and folds on top of this base — which is exactly why the base must
 * be the pristine sheet rather than a remembered state.
 */
export function combatantFromCharacter(character: CharacterAtTable, rules: SheetRulesData): Combatant {
  const sheet = computeSheet(character.choices, rules);

  const abilities = {} as Record<Ability, number>;
  for (const a of ABILITIES) abilities[a] = sheet.abilities[a].value;

  /* acOptions is a LIST because a character can have several ways to be hard
     to hit (unarmoured, armour, a shield) and the sheet does not choose for
     them. acDefault is the sheet's own pick; falling back to 10 rather than
     to 0 keeps an unarmoured character hittable-but-not-absurd if a rules
     gap ever leaves the list empty. */
  const ac = sheet.acOptions[sheet.acDefault]?.value ?? 10;

  return {
    id: character.id,
    name: character.choices.identity.name,
    abilities,
    profBonus: sheet.profBonus.value,
    /* The sheet keys `skills` by the ones the character is actually trained in,
       so its keys ARE the proficiency list — there is no per-skill flag to
       read. Saves are computed for all six, and proficiency shows up as a
       "Proficiency" row in the derivation rather than as a boolean, which is
       what makes the derivation the honest source here. */
    proficientSkills: Object.keys(sheet.skills),
    proficientSaves: ABILITIES.filter((a) =>
      sheet.saves[a].derivation.some((d) => d.label === 'Proficiency'),
    ),
    maxHp: sheet.hp.value.max,
    hp: sheet.hp.value.max,
    tempHp: 0,
    ac,
    conditions: [],
    /* The flag that decides what happens at 0 HP: a player character drops
       unconscious and rolls death saves, a monster dies. Getting this wrong
       would kill somebody's character outright. */
    isPlayer: true,
  };
}
