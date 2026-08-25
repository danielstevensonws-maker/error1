/**
 * Character-sheet computation — Brief 03. The pure function from wizard choices +
 * rules data → ComputedSheet, every value carrying its derivation (info-layer 2).
 * Pure and deterministic (§4 #2): same choices + same rules-data version ⇒
 * identical sheet. Imports nothing AI (ADR-0005).
 *
 * The computation reads the rules dataset for class traits (saves, hit die,
 * caster type, level features) and item meta (AC, weapon damage). Illegal choices
 * are rejected with plain-language reasons (§4 #3).
 */
import {
  ABILITIES,
  type Ability,
  type Skill,
  type NamedModifier,
  type RulesEntity,
  type CharacterChoices,
  type ComputedSheet,
  type AttackCard,
  type FeatureCard,
  type SpellCard,
} from '@questra/contracts';
import { abilityMod } from './state.js';
import {
  slotsFor,
  highestSlotLevel,
  unsupportedCasterType,
  PREPARED_SPELLS,
  type CasterType,
} from './spell-slots.js';

/** Standard proficiency bonus by character level (SRD advancement table). */
function profBonusForLevel(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

export interface SheetRulesData {
  classesById: Map<string, RulesEntity>;
  itemsById: Map<string, RulesEntity>;
  spellsById: Map<string, RulesEntity>;
  speciesSpeedFt: number;
}

export function buildSheetRulesData(entities: readonly RulesEntity[], speciesSpeedFt = 30): SheetRulesData {
  const classesById = new Map<string, RulesEntity>();
  const itemsById = new Map<string, RulesEntity>();
  const spellsById = new Map<string, RulesEntity>();
  for (const e of entities) {
    if (e.entityType === 'class') classesById.set(e.id, e);
    if (e.entityType === 'item') itemsById.set(e.id, e);
    if (e.entityType === 'spell') spellsById.set(e.id, e);
  }
  return { classesById, itemsById, spellsById, speciesSpeedFt };
}

/** A choice-validation failure, in plain language (Brief 03 §4 #3). */
export class IllegalChoiceError extends Error {}

const d = <T>(value: T, derivation: NamedModifier[]) => ({ value, derivation });

/** SRD point-buy cost table (score → points); 27-point budget. */
const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

function validateChoices(choices: CharacterChoices): void {
  // point-buy budget (§4 #3)
  if (choices.abilityMethod === 'point_buy') {
    let spent = 0;
    for (const ab of ABILITIES) {
      const score = choices.baseScores[ab];
      const cost = POINT_BUY_COST[score];
      if (cost === undefined) throw new IllegalChoiceError(`Point buy can't reach ${score} in ${ab.toUpperCase()} — scores must be 8–15 before bonuses.`);
      spent += cost;
    }
    if (spent > 27) throw new IllegalChoiceError(`That's ${spent} points of ability scores, but you only have 27 to spend.`);
  }
  // background bonuses must sum to 3 (+2/+1 or +1/+1/+1)
  const bonusSum = Object.values(choices.backgroundBonuses).reduce((s, v) => s + (v ?? 0), 0);
  if (bonusSum !== 3) throw new IllegalChoiceError(`Background ability bonuses must add up to 3, not ${bonusSum}.`);
}

/** Compute the full sheet. Throws IllegalChoiceError (plain-language) on illegal input. */
/**
 * Which ability each skill leans on (SRD). Exported because the SERVER needs
 * the same answer when it rolls a check for somebody: a second copy of this
 * table is a second place for Perception to become Intelligence.
 */
export const SKILL_ABILITY: Partial<Record<Skill, Ability>> = {
  athletics: 'str', acrobatics: 'dex', sleight_of_hand: 'dex', stealth: 'dex',
  arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
  animal_handling: 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
  deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
};

export function computeSheet(choices: CharacterChoices, rules: SheetRulesData): ComputedSheet {
  validateChoices(choices);

  const klass = rules.classesById.get(choices.classId);
  if (!klass || klass.entityType !== 'class') throw new IllegalChoiceError(`Unknown class "${choices.classId}".`);
  const meta = klass.meta;
  const prof = profBonusForLevel(choices.level);

  // ---- abilities: base + background ----
  const abilities = {} as ComputedSheet['abilities'];
  const scores = {} as Record<Ability, number>;
  for (const ab of ABILITIES) {
    const base = choices.baseScores[ab];
    const bonus = choices.backgroundBonuses[ab] ?? 0;
    const score = base + bonus;
    scores[ab] = score;
    const derivation: NamedModifier[] = [{ label: 'Base', value: base }];
    if (bonus !== 0) derivation.push({ label: 'Background', value: bonus });
    abilities[ab] = d(score, derivation);
  }
  const mod = (ab: Ability) => abilityMod(scores[ab]);

  // ---- proficiency bonus ----
  const profBonus = d(prof, [{ label: `Level ${choices.level}`, value: prof }]);

  // ---- HP ----
  const dieSize = Number(meta.hitDie.slice(1));
  const conMod = mod('con');
  const hpDerivation: NamedModifier[] = [{ label: 'Hit die (max at level 1)', value: dieSize }, { label: 'CON', value: conMod }];
  let maxHp = dieSize + conMod;
  if (choices.level > 1) {
    const avg = Math.ceil(dieSize / 2) + 1; // fixed-average per later level
    const perLevel = avg + conMod;
    maxHp += perLevel * (choices.level - 1);
    hpDerivation.push({ label: `Levels 2-${choices.level} (average ${avg} + CON each)`, value: perLevel * (choices.level - 1) });
  }
  const hp = d({ max: maxHp, hitDie: meta.hitDie, hitDiceMax: choices.level }, hpDerivation);

  // ---- AC options from equipment ----
  const acOptions: ComputedSheet['acOptions'][number][] = [];
  const dexMod = mod('dex');
  // unarmored 10 + DEX
  acOptions.push(d(10 + dexMod, [{ label: 'Unarmored', value: 10 }, { label: 'DEX', value: dexMod }]));
  // armor from equipment item meta (loose meta: read ac if present)
  const hasShield = choices.equipment.some((id) => /shield/i.test(id));
  for (const id of choices.equipment) {
    const item = rules.itemsById.get(id);
    if (!item) continue;
    const ac = parseArmorAc(item);
    if (ac !== undefined) {
      const label = item.name;
      acOptions.push(d(ac.base + (ac.dexUp ? Math.min(dexMod, ac.dexCap ?? Infinity) : 0),
        ac.dexUp
          ? [{ label, value: ac.base }, { label: 'DEX', value: Math.min(dexMod, ac.dexCap ?? Infinity) }]
          : [{ label, value: ac.base }]));
      if (hasShield) {
        const armorVal = acOptions[acOptions.length - 1]!;
        acOptions.push(d(armorVal.value + 2, [...armorVal.derivation, { label: 'Shield', value: 2 }]));
      }
    }
  }
  // default = best legal AC
  let acDefault = 0;
  for (let i = 1; i < acOptions.length; i++) if (acOptions[i]!.value > acOptions[acDefault]!.value) acDefault = i;

  // ---- initiative ----
  const initiative = d(dexMod, [{ label: 'DEX', value: dexMod }]);

  // ---- saves ----
  const saves = {} as ComputedSheet['saves'];
  const classSaves = new Set<Ability>(meta.saves);
  for (const ab of ABILITIES) {
    const m = mod(ab);
    const derivation: NamedModifier[] = [{ label: ab.toUpperCase(), value: m }];
    let value = m;
    if (classSaves.has(ab)) { derivation.push({ label: 'Proficiency', value: prof }); value += prof; }
    saves[ab] = d(value, derivation);
  }

  // ---- skills (chosen proficiencies) ----
  const skills = {} as ComputedSheet['skills'];
  const skillAbility = SKILL_ABILITY;
  for (const sk of choices.skillChoices) {
    const ab = skillAbility[sk] ?? 'int';
    const m = mod(ab);
    skills[sk] = d(m + prof, [{ label: ab.toUpperCase(), value: m }, { label: 'Proficiency', value: prof }]);
  }

  // ---- passives (perception/investigation/insight): 10 + mod (+ prof if proficient) ----
  const passiveFor = (sk: Skill, ab: Ability) => {
    const m = mod(ab);
    const proficient = choices.skillChoices.includes(sk);
    const derivation: NamedModifier[] = [{ label: 'Base', value: 10 }, { label: ab.toUpperCase(), value: m }];
    let value = 10 + m;
    if (proficient) { derivation.push({ label: 'Proficiency', value: prof }); value += prof; }
    return d(value, derivation);
  };
  const passives = {
    perception: passiveFor('perception', 'wis'),
    investigation: passiveFor('investigation', 'int'),
    insight: passiveFor('insight', 'wis'),
  };

  // ---- speed ----
  const speedFt = d(rules.speciesSpeedFt, [{ label: 'Species', value: rules.speciesSpeedFt }]);

  // ---- attacks from weapon equipment ----
  const attacks: AttackCard[] = [];
  for (const id of choices.equipment) {
    const item = rules.itemsById.get(id);
    if (!item) continue;
    const weapon = parseWeaponMeta(item);
    if (!weapon) continue;
    // finesse: pick the better of STR/DEX
    const useAbility: Ability = weapon.finesse && dexMod > mod('str') ? 'dex' : weapon.melee ? 'str' : 'dex';
    const abMod = mod(useAbility);
    attacks.push({
      name: item.name,
      toHit: abMod + prof,
      toHitDerivation: [{ label: useAbility.toUpperCase(), value: abMod }, { label: 'Proficiency', value: prof }],
      damage: `${weapon.die} + ${abMod}`,
      damageType: weapon.damageType,
      ability: useAbility,
      tags: ['action', weapon.melee ? 'melee' : 'ranged', ...(weapon.finesse ? ['finesse'] : [])],
    });
  }

  // ---- features from the class level table (resource pools from setResources) ----
  const features: FeatureCard[] = [];
  const levelRow = meta.levels[String(choices.level)];
  if (levelRow) {
    for (const fid of levelRow.features) {
      if (fid.startsWith('choice.')) continue;
      const name = featureName(fid);
      const res = resourceFor(fid, meta.levels, choices.level);
      features.push(res ? { id: fid, name, resource: res } : { id: fid, name });
    }
  }

  // ---- spellcasting ----
  // Every caster type that has a verified SRD progression gets its slots here,
  // not just full casters: a Paladin and a Ranger cast from level 1 in SRD
  // 5.2.1, and the Warlock's Pact Magic is its own kind of slot rather than a
  // thinner full-caster ladder.
  let spellcasting: ComputedSheet['spellcasting'];
  const casterType = meta.casterType as CasterType;
  if (casterType !== 'none') {
    const unsupported = unsupportedCasterType(casterType);
    if (unsupported) throw new IllegalChoiceError(unsupported);

    // The casting ability is declared by the class, never inferred from its
    // primary ability — a Paladin is a Strength class that casts on Charisma.
    const castAbility: Ability = meta.spellcastingAbility
      ?? (meta.primaryAbility === 'str_or_dex' ? 'int' : (meta.primaryAbility as Ability));
    const am = mod(castAbility);
    const slots = slotsFor(casterType, choices.level) ?? {};
    const preparedMax = PREPARED_SPELLS[choices.classId]?.[choices.level] ?? 0;
    const saveDc = d(8 + prof + am, [{ label: 'Base', value: 8 }, { label: 'Proficiency', value: prof }, { label: castAbility.toUpperCase(), value: am }]);
    const attackBonus = d(prof + am, [{ label: 'Proficiency', value: prof }, { label: castAbility.toUpperCase(), value: am }]);

    const resolve = (id: string) => resolveSpellCard(id, rules, klass.name, saveDc.value);
    const cantrips = (choices.cantripChoices ?? []).map(resolve);
    const prepared = (choices.preparedSpellIds ?? []).map(resolve);

    for (const c of cantrips) {
      if (c.level !== 0) throw new IllegalChoiceError(`${c.name} is a level ${c.level} spell, not a cantrip.`);
    }
    const ceiling = highestSlotLevel(slots);
    for (const s of prepared) {
      if (s.level === 0) throw new IllegalChoiceError(`${s.name} is a cantrip — it belongs with your cantrips, not your prepared spells.`);
      if (s.level > ceiling) {
        throw new IllegalChoiceError(
          ceiling === 0
            ? `${s.name} is a level ${s.level} spell, and you have no spell slots yet.`
            : `${s.name} is a level ${s.level} spell, but the highest you can cast is level ${ceiling}.`,
        );
      }
    }
    if (prepared.length > preparedMax) {
      throw new IllegalChoiceError(`That's ${prepared.length} prepared spells, but a level ${choices.level} ${klass.name} can prepare ${preparedMax}.`);
    }

    spellcasting = {
      ability: castAbility,
      saveDc,
      attackBonus,
      slotKind: casterType === 'pact' ? 'pact' : 'slots',
      slots,
      preparedMax,
      prepared,
      cantrips,
    };
  }

  // ---- coins ----
  const coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

  const sheet: ComputedSheet = {
    abilities, profBonus, hp,
    acOptions: acOptions as ComputedSheet['acOptions'],
    acDefault, initiative, saves, skills, passives, speedFt, attacks, features,
    ...(spellcasting ? { spellcasting } : {}),
    coins,
  };
  return sheet;
}

// ---- helpers -------------------------------------------------------------

/**
 * Turn a chosen spell id into a card, reading its mechanics off the entity's own
 * `effects[]`. Nothing is inferred from the spell's prose: a spell whose effects
 * haven't had the rules-lawyer pass yet simply comes back without `save`,
 * `attack` or `damage`, which the card documents as "not known from the data".
 */
function resolveSpellCard(
  id: string,
  rules: SheetRulesData,
  className: string,
  saveDcValue: number,
): SpellCard {
  const entity = rules.spellsById.get(id);
  if (!entity || entity.entityType !== 'spell') {
    throw new IllegalChoiceError(`Unknown spell "${id}".`);
  }
  const meta = entity.meta;
  const classSlug = className.toLowerCase();
  if (meta.classLists.length > 0 && !meta.classLists.includes(classSlug)) {
    throw new IllegalChoiceError(`${entity.name} isn't on the ${className} spell list.`);
  }

  const card: SpellCard = {
    id: entity.id,
    name: entity.name,
    level: meta.level,
    school: meta.school,
    castingTime: meta.castingTime,
    rangeFt: meta.rangeFt,
    concentration: meta.concentration,
    ritual: meta.ritual,
    plain: entity.plain,
  };

  for (const effect of entity.effects) {
    if (effect.hook !== 'trigger') continue;
    const action = effect.do;
    if (action.action === 'area_save' || action.action === 'prompt_save') {
      const dc = action.save.dc === 'spell_save_dc' || typeof action.save.dc !== 'number'
        ? saveDcValue
        : action.save.dc;
      card.save = { ability: action.save.ability, dc };
      if (action.action === 'area_save' && action.onFail.damage) {
        card.damage = { dice: action.onFail.damage.dice, type: action.onFail.damage.type };
      }
      break;
    }
  }
  // `card.attack` is deliberately never set here. The effect vocabulary has no
  // spell-attack-roll action (area_save, prompt_save, heal, take_action), so
  // there is nothing in the data that says "this spell is an attack roll".
  // Filling it in from the caster's attack bonus would put a number on cards
  // like Cure Wounds that never roll to hit. It stays absent until the effect
  // vocabulary can express it.
  return card;
}

/** Read an armor's AC from its item row: base value + whether/how DEX applies. */
interface ArmorAc { base: number; dexUp: boolean; dexCap?: number }
function parseArmorAc(item: RulesEntity): ArmorAc | undefined {
  if ((item.meta as { category?: string }).category !== 'armor') return undefined;
  const text = item.srd_text;
  // "<Name> <base>[ + Dex modifier[ (max N)]] ..."
  const m = text.match(/(\d{2})(\s*\+\s*Dex modifier(\s*\(max\s*(\d+)\))?)?/);
  if (!m) return undefined;
  const base = Number(m[1]);
  const dexUp = m[2] !== undefined;
  const cap = m[4] !== undefined ? Number(m[4]) : undefined;
  return { base, dexUp, ...(cap !== undefined ? { dexCap: cap } : {}) };
}

interface WeaponMeta { die: string; damageType: string; melee: boolean; finesse: boolean }
function parseWeaponMeta(item: RulesEntity): WeaponMeta | null {
  const category = (item.meta as { category?: string }).category;
  if (category !== 'weapon') return null;
  // weapon damage/finesse aren't structured in the loose item meta yet; derive from srd_text.
  const text = item.srd_text;
  const dm = text.match(/(\dd\d+)\s+(Bludgeoning|Piercing|Slashing)/i);
  if (!dm) return null;
  return {
    die: dm[1]!.toLowerCase(),
    damageType: dm[2]!.toLowerCase(),
    melee: !/Ranged|Ammunition/i.test(text),
    finesse: /Finesse/i.test(text),
  };
}

function featureName(id: string): string {
  const slug = id.split('.').pop() ?? id;
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Read a resource pool for a feature from the class's setResources, if any. */
function resourceFor(
  featureId: string,
  levels: Record<string, { setResources?: Record<string, number> | undefined }>,
  level: number,
): { pool: string; max: number; remaining: number } | undefined {
  // map a couple of known pools (Second Wind) for the slice; general mapping is a follow-up.
  if (featureId === 'feature.fighter.second-wind') {
    // level-1 default max is 2 (raised to 3 at level 4 via setResources)
    let max = 2;
    for (let l = 1; l <= level; l++) {
      const sr = levels[String(l)]?.setResources;
      if (sr && typeof sr['second_wind.max'] === 'number') max = sr['second_wind.max']!;
    }
    return { pool: 'feature.second_wind', max, remaining: max };
  }
  return undefined;
}
