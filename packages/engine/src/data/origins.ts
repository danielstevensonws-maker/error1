/**
 * Species and backgrounds — VERIFIED (Brief 01 §7), promoted from the drafts in
 * named.draft.json.
 *
 * WHY THIS FILE EXISTS. The ingestion pass captured verbatim `srd_text` for all
 * nine species and four backgrounds but left `meta` empty and `plain` as a stub
 * ("Elf — an SRD species."). That is fine for a corpus and useless for a
 * character wizard, which needs two things the drafts do not have:
 *
 *   1  STRUCTURED FACTS. `CharacterChoices.backgroundBonuses` is a record of
 *      real numbers, and the SRD prints a background's ability options as prose
 *      ("Ability Scores: Strength, Dexterity, Constitution"). Something has to
 *      turn that sentence into data. Doing it here rather than in the wizard
 *      keeps rules out of the view layer, where no test would guard them.
 *   2  PLAIN LANGUAGE. The wizard's promise is that nobody needs to know the
 *      rules to make a character. A card reading "Elf — an SRD species" breaks
 *      that promise on the second step.
 *
 * WHAT IS SRD AND WHAT IS OURS, kept strictly separate:
 *   - `srd_text` is verbatim, carried through from the draft untouched.
 *   - `meta` is a transcription of what that text SAYS — every field is
 *     asserted against srd_text in origins.golden.test.ts, so it cannot drift.
 *   - `plain` is AUTHORED BY US, in the product's voice. It is not SRD text and
 *     does not paraphrase rules mechanics; it says what the thing is like to
 *     play. Flagged in meta.plainAuthored so a reviewer can find every line.
 *
 * THE 2024 BACKGROUND RULE, since it is the whole reason backgrounds matter
 * here: a background offers THREE abilities and the player spends +2/+1 across
 * two of them, or +1/+1/+1 across all three. The SRD prints the three; the
 * split is the player's choice, which is why `abilityOptions` is a list rather
 * than a fixed bonus map. The wizard collects the spend.
 */
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';
import { DATASET_VERSION } from '../ingest/pipeline.js';
import { DRAFT_NAMED } from './named.js';

const V = DATASET_VERSION;

/** Pull the verbatim SRD text off the draft so it is never retyped here. */
function srdTextFor(id: string): string {
  const draft = DRAFT_NAMED.find((e) => e.id === id);
  if (!draft) throw new Error(`origins.ts: no draft entity for "${id}" — did named.draft.json change?`);
  return draft.srd_text;
}

interface SpeciesFacts {
  id: string;
  name: string;
  /** Authored by us, reviewed as product copy — never presented as SRD text. */
  plain: string;
  sizeLabel: string;
  speedFt: number;
  /** The trait names the SRD prints, for the info panel to list. */
  traits: string[];
}

/**
 * The nine SRD species.
 *
 * Speed is a real field rather than an assumption: Goliath moves 35 feet and
 * every other species moves 30, and `buildSheetRulesData` takes a single
 * `speciesSpeedFt` — so a wizard that hardcoded 30 would quietly give every
 * Goliath the wrong movement.
 */
const SPECIES: SpeciesFacts[] = [
  {
    id: 'species.dragonborn', name: 'Dragonborn',
    plain: 'Draconic blood, and a breath weapon to prove it.',
    sizeLabel: 'Medium', speedFt: 30,
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance', 'Darkvision'],
  },
  {
    id: 'species.dwarf', name: 'Dwarf',
    plain: 'Hard to wear down, and at home under stone.',
    sizeLabel: 'Medium', speedFt: 30,
    traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Toughness', 'Stonecunning'],
  },
  {
    id: 'species.elf', name: 'Elf',
    plain: 'Quick, keen-eyed, and hard to sneak up on.',
    sizeLabel: 'Medium', speedFt: 30,
    traits: ['Darkvision', 'Elven Lineage', 'Fey Ancestry', 'Keen Senses', 'Trance'],
  },
  {
    id: 'species.gnome', name: 'Gnome',
    plain: 'Small, inventive, and stubbornly resistant to magic.',
    sizeLabel: 'Small', speedFt: 30,
    traits: ['Darkvision', 'Gnomish Cunning', 'Gnomish Lineage'],
  },
  {
    id: 'species.goliath', name: 'Goliath',
    plain: 'Giant-blooded and built to carry more than looks possible.',
    sizeLabel: 'Medium', speedFt: 35,
    traits: ['Giant Ancestry', 'Large Form', 'Powerful Build'],
  },
  {
    id: 'species.halfling', name: 'Halfling',
    plain: 'Small, lucky, and very good at not being seen.',
    sizeLabel: 'Small', speedFt: 30,
    traits: ['Brave', 'Halfling Nimbleness', 'Luck', 'Naturally Stealthy'],
  },
  {
    id: 'species.human', name: 'Human',
    plain: 'No special tricks — an extra skill and a free feat instead.',
    sizeLabel: 'Medium', speedFt: 30,
    traits: ['Resourceful', 'Skillful', 'Versatile'],
  },
  {
    id: 'species.orc', name: 'Orc',
    plain: 'Keeps going after most things would have stopped.',
    sizeLabel: 'Medium', speedFt: 30,
    traits: ['Adrenaline Rush', 'Darkvision', 'Relentless Endurance'],
  },
  {
    id: 'species.tiefling', name: 'Tiefling',
    plain: 'Fiendish heritage, and people notice.',
    sizeLabel: 'Medium', speedFt: 30,
    traits: ['Darkvision', 'Fiendish Legacy', 'Otherworldly Presence'],
  },
];

interface BackgroundFacts {
  id: string;
  name: string;
  plain: string;
  /** The three abilities the SRD offers; the player spends +2/+1 or +1/+1/+1. */
  abilityOptions: ['str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', ...('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha')[]];
  featId: string;
  skills: [string, string];
}

/** The four SRD backgrounds. */
const BACKGROUNDS: BackgroundFacts[] = [
  {
    id: 'background.acolyte', name: 'Acolyte',
    plain: 'You served at a temple, and some of it stuck.',
    abilityOptions: ['int', 'wis', 'cha'],
    featId: 'feat.magic-initiate',
    skills: ['Insight', 'Religion'],
  },
  {
    id: 'background.criminal', name: 'Criminal',
    plain: 'You made a living at things other people would rather you had not.',
    abilityOptions: ['dex', 'con', 'int'],
    featId: 'feat.alert',
    skills: ['Sleight of Hand', 'Stealth'],
  },
  {
    id: 'background.sage', name: 'Sage',
    plain: 'You read your way to answers most people never look for.',
    abilityOptions: ['con', 'int', 'wis'],
    featId: 'feat.magic-initiate',
    skills: ['Arcana', 'History'],
  },
  {
    id: 'background.soldier', name: 'Soldier',
    plain: 'You carried a weapon for someone else. Now you carry it for yourself.',
    abilityOptions: ['str', 'dex', 'con'],
    featId: 'feat.savage-attacker',
    skills: ['Athletics', 'Intimidation'],
  },
];

const RAW: unknown[] = [
  ...SPECIES.map((s) => ({
    id: s.id,
    entityType: 'species',
    name: s.name,
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: s.plain,
    srd_text: srdTextFor(s.id),
    effects: [],
    /* Species traits are largely prose (a breath weapon's shape, a lineage's
       spell list) with no hook vocabulary to express them, so the entity stays
       novel and the Engine escalates anything mechanical to a Ruling. Size and
       speed ARE structured, because the sheet needs them as numbers. */
    resolution: 'novel',
    meta: {
      kind: 'species',
      sizeLabel: s.sizeLabel,
      speedFt: s.speedFt,
      traits: s.traits,
      plainAuthored: true,
    },
  })),
  ...BACKGROUNDS.map((b) => ({
    id: b.id,
    entityType: 'background',
    name: b.name,
    source: 'srd-5.2.1',
    version: V,
    qa: 'verified',
    plain: b.plain,
    srd_text: srdTextFor(b.id),
    effects: [],
    resolution: 'novel',
    meta: {
      kind: 'background',
      abilityOptions: b.abilityOptions,
      featId: b.featId,
      skills: b.skills,
      plainAuthored: true,
    },
  })),
];

/** The thirteen verified origins, validated against the contracts schema. */
export const ORIGINS: RulesEntity[] = RAW.map((r) => RulesEntitySchema.parse(r));

export const VERIFIED_SPECIES: RulesEntity[] = ORIGINS.filter((e) => e.entityType === 'species');
export const VERIFIED_BACKGROUNDS: RulesEntity[] = ORIGINS.filter((e) => e.entityType === 'background');

/** Speed for a species id, defaulting to 30 for anything unknown. */
export function speciesSpeedFt(speciesId: string): number {
  const s = VERIFIED_SPECIES.find((e) => e.id === speciesId);
  const speed = (s?.meta as { speedFt?: number } | undefined)?.speedFt;
  return typeof speed === 'number' ? speed : 30;
}
