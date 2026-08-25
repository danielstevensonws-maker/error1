/**
 * The 12 SRD 5.2.1 classes — VERIFIED (Brief 01 §6, acceptance #4).
 *
 * Each class combines two sources:
 *  - The 1–20 level table (feature ids per level + proficiency bonus), parsed
 *    from the "<Class> Features" table by the ingestion pipeline and committed
 *    as classes.levels.json. Acceptance #4 — every level grants ≥1 feature id —
 *    is guaranteed by the parser (caster "--" levels get a spell-progression id)
 *    and asserted by the golden suite.
 *  - The core traits (hit die, primary ability, saves, caster type, subclass
 *    level, ASI levels), which are the well-known SRD core-traits data, authored
 *    here (they aren't a table the parser can reliably lift).
 *
 * class.fighter's level rows match the canonical Fighter fixture's feature-id
 * convention (choice.fighter.subclass, choice.asi-or-feat, feature.fighter.*).
 */
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';
import { DATASET_VERSION } from '../ingest/pipeline.js';
import levelsById from './classes.levels.json' with { type: 'json' };

type LevelRow = { profBonus: number; features: string[] };
type LevelTable = Record<string, LevelRow>;
const LEVELS = levelsById as Record<string, LevelTable>;

type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

interface CoreTraits {
  name: string;
  complexity: 'low' | 'average' | 'high';
  hitDie: 'd6' | 'd8' | 'd10' | 'd12';
  primaryAbility: Ability | 'str_or_dex';
  saves: [Ability, Ability];
  casterType: 'none' | 'third' | 'half' | 'full' | 'pact';
  /**
   * The ability the class casts with, per the SRD's "Spellcasting Ability"
   * paragraph in each class entry. Deliberately separate from primaryAbility:
   * a Paladin's primary ability is Strength but it casts on Charisma, and a
   * Ranger's is Dexterity but it casts on Wisdom. Omitted for non-casters.
   */
  spellcastingAbility?: Ability;
  subclassLevel: number;
  asiLevels: number[];
  plain: string;
}

/** Canonical SRD 5.2.1 core traits. ASI levels are the standard 4/8/12/16/19 (+6 for Fighter, +10 for Rogue). */
const CORE: Record<string, CoreTraits> = {
  'class.barbarian': { name: 'Barbarian', complexity: 'low', hitDie: 'd12', primaryAbility: 'str', saves: ['str', 'con'], casterType: 'none', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A furious warrior who channels rage into raw power.' },
  'class.bard': { name: 'Bard', complexity: 'high', hitDie: 'd8', primaryAbility: 'cha', saves: ['dex', 'cha'], casterType: 'full', spellcastingAbility: 'cha', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A magical performer whose art inspires allies and confounds foes.' },
  'class.cleric': { name: 'Cleric', complexity: 'average', hitDie: 'd8', primaryAbility: 'wis', saves: ['wis', 'cha'], casterType: 'full', spellcastingAbility: 'wis', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A divine caster who channels a deity’s power to heal and smite.' },
  'class.druid': { name: 'Druid', complexity: 'high', hitDie: 'd8', primaryAbility: 'wis', saves: ['int', 'wis'], casterType: 'full', spellcastingAbility: 'wis', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A guardian of the wild who shapes nature and their own form.' },
  'class.fighter': { name: 'Fighter', complexity: 'low', hitDie: 'd10', primaryAbility: 'str_or_dex', saves: ['str', 'con'], casterType: 'none', subclassLevel: 3, asiLevels: [4, 6, 8, 12, 14, 16], plain: 'The master of weapons and armor. Simple to play, hard to kill.' },
  'class.monk': { name: 'Monk', complexity: 'high', hitDie: 'd8', primaryAbility: 'dex', saves: ['str', 'dex'], casterType: 'none', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A martial artist who turns focus and speed into a flurry of strikes.' },
  'class.paladin': { name: 'Paladin', complexity: 'average', hitDie: 'd10', primaryAbility: 'str', saves: ['wis', 'cha'], casterType: 'half', spellcastingAbility: 'cha', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A holy warrior bound by an oath, blending martial might and divine magic.' },
  'class.ranger': { name: 'Ranger', complexity: 'average', hitDie: 'd10', primaryAbility: 'dex', saves: ['str', 'dex'], casterType: 'half', spellcastingAbility: 'wis', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A wilderness hunter who blends tracking, archery, and primal magic.' },
  'class.rogue': { name: 'Rogue', complexity: 'average', hitDie: 'd8', primaryAbility: 'dex', saves: ['dex', 'int'], casterType: 'none', subclassLevel: 3, asiLevels: [4, 8, 10, 12, 16, 19], plain: 'A skilled opportunist who strikes precisely and slips away.' },
  'class.sorcerer': { name: 'Sorcerer', complexity: 'high', hitDie: 'd6', primaryAbility: 'cha', saves: ['con', 'cha'], casterType: 'full', spellcastingAbility: 'cha', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'An innate caster who bends raw magic with force of personality.' },
  'class.warlock': { name: 'Warlock', complexity: 'high', hitDie: 'd8', primaryAbility: 'cha', saves: ['wis', 'cha'], casterType: 'pact', spellcastingAbility: 'cha', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A caster who trades with an otherworldly patron for eldritch power.' },
  'class.wizard': { name: 'Wizard', complexity: 'high', hitDie: 'd8', primaryAbility: 'int', saves: ['int', 'wis'], casterType: 'full', spellcastingAbility: 'int', subclassLevel: 3, asiLevels: [4, 8, 12, 16, 19], plain: 'A scholar of magic who masters spells through study and preparation.' },
};

function buildClass(id: string): RulesEntity {
  const core = CORE[id]!;
  const levels = LEVELS[id];
  if (!levels) throw new Error(`No parsed level table for ${id} — run \`npm run ingest\`.`);
  return RulesEntitySchema.parse({
    id,
    entityType: 'class',
    name: core.name,
    source: 'srd-5.2.1',
    version: DATASET_VERSION,
    qa: 'verified',
    plain: core.plain,
    srd_text: `${core.name}. Hit Die ${core.hitDie}. Primary ability ${core.primaryAbility}. Saving throws ${core.saves.join(', ')}.`,
    effects: [],
    resolution: 'routine',
    meta: {
      complexity: core.complexity,
      hitDie: core.hitDie,
      primaryAbility: core.primaryAbility,
      saves: core.saves,
      casterType: core.casterType,
      ...(core.spellcastingAbility ? { spellcastingAbility: core.spellcastingAbility } : {}),
      subclassLevel: core.subclassLevel,
      asiLevels: core.asiLevels,
      levels,
    },
  });
}

/** The 12 verified classes, validated against the contracts schema. */
export const CLASSES: RulesEntity[] = Object.keys(CORE).map(buildClass);
