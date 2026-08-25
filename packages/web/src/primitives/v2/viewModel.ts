/**
 * v2/viewModel — the seam between @questra/contracts (`ComputedSheet`) plus
 * @questra/engine (the folded projection and THE legality function) and the
 * Player View v2 surfaces.
 *
 * Two rules from Brief 10 §1 are load-bearing here and neither is negotiable:
 *
 * ZERO COMPONENT-LOCAL GAME STATE. Everything a v2 surface renders arrives as
 * one of the view-models below. The components hold UI state only — which tab
 * is open, which tile the mouse is over — and never a hit point.
 *
 * NO ORPHAN MATH. Every number on this screen carries the derivation that
 * produced it, as an `ExplainVM`, so tapping it can show its working. That is
 * why `toHero` reads `sheet.acOptions[sheet.acDefault].derivation` rather than
 * just the AC value: the value alone would be a number a player cannot
 * interrogate, which §5 forbids outright.
 *
 * AND GREYING IS THE SERVER'S ANSWER. `toTiles` runs every tile through
 * `greyingReason` — the shared legality function the server calls to reject an
 * illegal intent — so a tile's dimmed state and its explanation are literally
 * the server's reject string. Client and server cannot disagree about what is
 * legal, because there is only one implementation.
 */
import type { ComputedSheet, Intent, Skill } from '@questra/contracts';
import { greyingReason, type Combatant, type ProjectionState } from '@questra/engine';
import type { CardOutcome, StructuredRow } from '../AcceptTweakRejectCard.js';
import { glyphFor, type ExplainVM, type GlyphName } from '../../design/index.js';

/**
 * Re-exported so this screen's callers keep importing their view-model types
 * from one place. The SHAPE belongs to the design layer, not here: "a value,
 * its itemised rows, and a sentence about what it means" is presentational,
 * and the authoring surfaces need the identical thing for numbers that have
 * nothing to do with combat.
 */
export type { ExplainVM };

type Deriv = { label: string; value: number }[];

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
const asRows = (d: Deriv): { label: string; value: string }[] =>
  d.map((m) => ({ label: m.label, value: signed(m.value) }));

// ---- your character --------------------------------------------------------

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

const ABILITY_ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};
/** What each score is actually FOR, said the way a person would say it. */
const ABILITY_RULE: Record<AbilityKey, string> = {
  str: 'Strength is shoving, climbing, and hitting things hard with something heavy.',
  dex: 'Dexterity is aim, balance, and getting out of the way.',
  con: 'Constitution is how much you can take before it stops you.',
  int: 'Intelligence is what you know and what you can work out.',
  wis: 'Wisdom is what you notice and how well you read a room.',
  cha: 'Charisma is how much people go along with you.',
};

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export interface AbilityVM {
  key: AbilityKey;
  short: string;
  score: number;
  mod: number;
  explain: ExplainVM;
}

export interface ConditionVM {
  id: string;
  name: string;
  explain: ExplainVM;
}

/** Everything the near edge shows about you, and everything the folio expands on. */
export interface HeroVM {
  id: string;
  name: string;
  initial: string;
  className: string;
  level: number;
  hp: { current: number; max: number; temp: number };
  bloodied: boolean;
  ac: ExplainVM;
  speed: ExplainVM;
  passivePerception: ExplainVM;
  initiative: ExplainVM;
  hitDice: { die: string; max: number };
  coins: string;
  /**
   * The spell this character is holding, if any. Unlike the spell CARDS, this
   * one is genuine live state — `Combatant.concentratingOn` is already on the
   * engine's projection, so the badge is driven by the server today.
   */
  concentratingOn?: string;
  abilities: AbilityVM[];
  conditions: ConditionVM[];
  saves: { key: AbilityKey; label: string; mod: number; explain: ExplainVM }[];
  skills: { key: Skill; label: string; mod: number; explain: ExplainVM }[];
}

/**
 * Conditions we can say something true about in plain language. Anything not
 * listed still renders — it just says so honestly rather than inventing a rule,
 * because a wrong rule is worse than a missing one for players who cannot tell.
 */
const CONDITIONS: Record<string, { name: string; rule: string; flavour?: string }> = {
  'condition.prone': {
    name: 'Prone',
    rule: 'You are on the ground. Attacks made next to you have advantage, attacks from further off have disadvantage, and standing up costs half your movement.',
    flavour: 'The mud is closer than you would like.',
  },
  'condition.grappled': {
    name: 'Grappled',
    rule: 'Something has hold of you. Your speed is zero until you break free or it lets go.',
  },
  'condition.frightened': {
    name: 'Frightened',
    rule: 'While you can see what scared you, you roll with disadvantage and you cannot move closer to it.',
  },
  'condition.poisoned': {
    name: 'Poisoned',
    rule: 'You roll attacks and ability checks with disadvantage until it wears off.',
  },
  'condition.blinded': {
    name: 'Blinded',
    rule: 'You cannot see. Your attacks have disadvantage, and attacks against you have advantage.',
  },
  'condition.unconscious': {
    name: 'Unconscious',
    rule: 'You are out. You cannot act or move, and attacks from close by hit automatically.',
  },
};

const conditionVM = (id: string): ConditionVM => {
  const known = CONDITIONS[id];
  const name = known?.name ?? id.replace('condition.', '');
  return {
    id,
    name,
    explain: {
      id: `condition:${id}`,
      kicker: 'Condition',
      title: name,
      value: 'On you',
      rows: [],
      rule: known?.rule ?? 'The DM is tracking what this one does — ask them and they will tell you.',
      ...(known?.flavour !== undefined ? { flavour: known.flavour } : {}),
    },
  };
};

/** "12 gp, 4 sp" — only the coin actually carried, largest first. */
export function fmtCoins(coins: ComputedSheet['coins']): string {
  const order: { key: keyof ComputedSheet['coins']; label: string }[] = [
    { key: 'pp', label: 'pp' }, { key: 'gp', label: 'gp' }, { key: 'ep', label: 'ep' },
    { key: 'sp', label: 'sp' }, { key: 'cp', label: 'cp' },
  ];
  const parts = order.filter((o) => coins[o.key] > 0).map((o) => `${coins[o.key]} ${o.label}`);
  return parts.length > 0 ? parts.join(', ') : 'No coin';
}

const SKILL_LABEL: Record<Skill, string> = {
  acrobatics: 'Acrobatics', animal_handling: 'Animal Handling', arcana: 'Arcana', athletics: 'Athletics',
  deception: 'Deception', history: 'History', insight: 'Insight', intimidation: 'Intimidation',
  investigation: 'Investigation', medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion', sleight_of_hand: 'Sleight of Hand',
  stealth: 'Stealth', survival: 'Survival',
};

export function toHero(
  sheet: ComputedSheet,
  me: Combatant,
  identity: { className: string; level: number },
): HeroVM {
  const acD = sheet.acOptions[sheet.acDefault]!;

  return {
    id: me.id,
    name: me.name,
    initial: me.name.charAt(0),
    className: identity.className,
    level: identity.level,
    hp: { current: me.hp, max: me.maxHp, temp: me.tempHp },
    bloodied: me.hp > 0 && me.hp <= Math.floor(me.maxHp / 2),
    ac: {
      id: 'ac',
      kicker: 'Your character',
      title: 'Armor Class',
      value: String(acD.value),
      rows: acD.derivation.map((m) => ({ label: m.label, value: String(m.value) })),
      rule: 'An attack has to roll this number or higher to hit you. Nothing else about it changes — it is one number, and this is where it comes from.',
      flavour: 'Chain over a padded coat. Heavy, hot, and worth every pound of it.',
    },
    speed: {
      id: 'speed',
      kicker: 'Your character',
      title: 'Speed',
      value: `${sheet.speedFt.value} ft`,
      rows: asRows(sheet.speedFt.derivation),
      rule: 'How far you can move on your turn, in feet. You can split it up — move, act, then move the rest.',
    },
    passivePerception: {
      id: 'passive-perception',
      kicker: 'Your character',
      title: 'Passive Perception',
      value: String(sheet.passives.perception.value),
      rows: asRows(sheet.passives.perception.derivation),
      rule: 'What you notice without looking for it. The DM checks it quietly against anything hidden, so you never have to ask "do I see something?"',
    },
    initiative: {
      id: 'initiative',
      kicker: 'Your character',
      title: 'Initiative',
      value: signed(sheet.initiative.value),
      rows: asRows(sheet.initiative.derivation),
      rule: 'Added to a d20 when a fight starts. The results set the order everyone acts in, highest first.',
    },
    hitDice: { die: sheet.hp.value.hitDie, max: sheet.hp.value.hitDiceMax },
    coins: fmtCoins(sheet.coins),
    ...(me.concentratingOn !== undefined ? { concentratingOn: me.concentratingOn } : {}),
    abilities: ABILITY_ORDER.map((key) => {
      const d = sheet.abilities[key];
      const mod = abilityMod(d.value);
      return {
        key,
        short: key.toUpperCase(),
        score: d.value,
        mod,
        explain: {
          id: `ability:${key}`,
          kicker: 'Ability score',
          title: ABILITY_LABEL[key],
          value: signed(mod),
          rows: [
            ...asRows(d.derivation),
            { label: 'Score', value: String(d.value) },
          ],
          rule: `${ABILITY_RULE[key]} The score is the raw number; the ${signed(mod)} is what you actually add to a roll.`,
        },
      };
    }),
    conditions: me.conditions.map((c) => conditionVM(c.conditionId)),
    saves: ABILITY_ORDER.map((key) => {
      const d = sheet.saves[key];
      return {
        key,
        label: ABILITY_LABEL[key],
        mod: d.value,
        explain: {
          id: `save:${key}`,
          kicker: 'Saving throw',
          title: `${ABILITY_LABEL[key]} save`,
          value: signed(d.value),
          rows: asRows(d.derivation),
          rule: 'Rolled when something happens TO you and you get a chance to resist it. The DM will tell you which one to roll.',
        },
      };
    }),
    skills: (Object.entries(sheet.skills) as [Skill, ComputedSheet['skills'][Skill]][])
      .filter((e): e is [Skill, NonNullable<ComputedSheet['skills'][Skill]>] => e[1] !== undefined)
      .map(([key, d]) => ({
        key,
        label: SKILL_LABEL[key],
        mod: d.value,
        explain: {
          id: `skill:${key}`,
          kicker: 'Skill',
          title: SKILL_LABEL[key],
          value: signed(d.value),
          rows: asRows(d.derivation),
          rule: 'Added to a d20 when the DM asks for this kind of check. You are trained in it, which is where the proficiency comes from.',
        },
      })),
  };
}

// ---- the action rows -------------------------------------------------------

export type Economy = 'action' | 'bonus' | 'reaction';

export interface TileVM {
  id: string;
  name: string;
  economy: Economy;
  glyph: GlyphName;
  /** the mono line on the tile face — "+5 · 1d8 + 3". */
  meta?: string;
  /** "2 of 2" for a limited feature. */
  resource?: string;
  /** the full sentence the detail strip shows while this tile is hovered. */
  detail: string;
  /**
   * present ⇒ using this tile opens the compose sheet first, with this bonus
   * already in the formula. `against` is deliberately absent for attacks: the
   * target's Armor Class is not something a player knows BEFORE they swing, so
   * it appears in the verdict afterwards and nowhere earlier.
   */
  roll?: { bonus: number; against?: { label: string; value: number } };
  /** null ⇒ legal. A string ⇒ dimmed, and this is the server's own reason. */
  greyReason: string | null;
  explain: ExplainVM;
}

/**
 * How many 46px tiles each economy's row physically holds before it needs
 * help — either from a dashed growth socket (too few real tiles) or the
 * overflow "+N" tile (too many). ONE number per economy, not two.
 *
 * THIS USED TO BE TWO NUMBERS, AND THAT WAS A BUG. An earlier pass had a
 * separate, bigger "how many sockets to show" constant on top of this one, on
 * the theory that showing more empty slots than the real-tile ceiling would
 * make a fresh character's row look more inviting. It does not work: sockets
 * and real tiles are the identical 46px square, so a row that holds at most 8
 * real tiles before overflowing cannot ALSO hold 10 empty ones without either
 * wrapping to a second line or overflowing — the same physical constraint
 * governs both. Worse, once the "sockets" target exceeded this one, a row
 * with, say, 7 real tiles computed a POSITIVE sockets count from the bigger
 * number in the same breath its overflow math correctly fired from this one —
 * a socket and an overflow tile rendering side by side, which
 * `ActionRows.test.tsx`'s mutual-exclusivity check caught immediately.
 *
 * So there is one ceiling. Padding a thin row and capping a thick one are the
 * same arithmetic run in opposite directions: `Math.max(0, cap - real.length)`
 * sockets when under the cap, one overflow tile carrying the remainder when
 * over it — see `ActionRows.tsx`.
 *
 * THE NUMBERS ARE TUNED TO FILL THE ROW, not to round numbers (owner
 * direction, 2026-08-19: "sockets until it reaches the end of the row, so I
 * can see the creativity possibilities"). First pass (8/6/4) undercounted —
 * it was tuned against Mira's real tile count fitting *without overflowing*,
 * which is a different question from *how much of the row's actual width is
 * left unused*. Action sits alone on the panel's full ~788px content width,
 * while Bonus and Reaction only share it, so capping all three at the same
 * number was never going to fill Action's much larger row — measured, Action
 * had ~364px of dead space at 8. Re-measured properly this time, live in the
 * browser rather than by hand: rendered a generously oversized run of tiles,
 * read each one's `getBoundingClientRect()`, and counted how many share the
 * first tile's `top` (i.e. have not wrapped) — repeated with each row's real
 * neighbour at its final count, since Bonus and Reaction's econ blocks
 * compete for the SAME physical width and measuring one at a huge count with
 * the other also huge just pushes the second one onto its own line entirely,
 * silently measuring the wrong thing. Padding, gaps, and the divider between
 * Bonus and Reaction make this arithmetic easy to get subtly wrong by hand;
 * the measurement doesn't guess:
 *   - action: 14 — alone on the full-width row, ~55px of slack left over
 *     (less than one more 54px tile), confirmed against Mira's real 8-tile
 *     kit fitting inside it with 6 sockets to spare and zero overflow.
 *   - bonus: 10 — sharing the top row with reaction fixed at its real
 *     ceiling (4), this is genuinely the most that fits beside it before
 *     reaction's block gets pushed to its own line; ~14px of slack left.
 *   - reaction: 4 — pinned to real data, not eyeballed, and does not move for
 *     visual fullness even though the row could geometrically hold more if
 *     bonus were narrower. Counted every reaction-cast spell in
 *     `packages/engine/src/data/spells.draft.json` (312 SRD entries) by
 *     class: no class list has more than 3 (Wizard/Sorcerer top out at
 *     Shield, Counterspell, Feather Fall). Add the universal Opportunity
 *     Attack and the real ceiling for any single-class character, at any
 *     level, is 4 — a sourced fact about the ruleset outranks a "make the row
 *     look fuller" preference every time, even now that bonus is wide enough
 *     that reaction visibly has room to spare beside it.
 *
 * `.qa2-slots` wraps as a safety net for narrower windows (see ScreenStyles),
 * so a character with an unusually full kit costs a taller panel on a small
 * screen, never a broken or inaccessible one.
 */
export const MAX_SLOTS: Record<Economy, number> = { action: 14, bonus: 10, reaction: 4 };

/**
 * The universal actions — Dash, Disengage, Dodge. Every creature has these and
 * none of them lives on a character sheet, so they cannot come from
 * `sheet.attacks`. They are gated by running a `move` intent through the SAME
 * `checkIntent`: that intent kind exercises exactly the actor-level gates that
 * apply to all three (you are down, you are incapacitated, it is not your turn)
 * and nothing else. This is deliberately NOT a second legality implementation —
 * it is the one function, asked a narrower question.
 */
const UNIVERSAL: { id: string; name: string; economy: Economy; detail: string; rule: string }[] = [
  {
    id: 'universal.dash', name: 'Dash', economy: 'action',
    detail: 'Dash — spend your action to move your speed again this turn.',
    rule: 'Trade your action for a second helping of movement. Useful when the thing you want is further away than one turn of walking.',
  },
  {
    id: 'universal.disengage', name: 'Disengage', economy: 'action',
    detail: 'Disengage — move away without anyone getting a free swing at you.',
    rule: 'Normally, walking out of arm’s reach of an enemy lets them take a swing at you. Disengage means they do not get one.',
  },
  {
    id: 'universal.dodge', name: 'Dodge', economy: 'action',
    detail: 'Dodge — attacks against you have disadvantage until your next turn.',
    rule: 'Spend the turn making yourself hard to hit. Anyone attacking you rolls twice and takes the worse result, until your next turn comes round.',
  },
];

const REACTION: { id: string; name: string; detail: string; rule: string } = {
  id: 'universal.opportunity-attack',
  name: 'Opportunity Attack',
  detail: 'Opportunity Attack — the table will offer this when someone walks away from you.',
  rule: 'When an enemy leaves your reach on their own turn, you get one free swing at them. The table prompts you — you never have to watch for it.',
};

// ---- spells ----------------------------------------------------------------

/**
 * One castable spell, as the action row needs it.
 *
 * WHERE THIS COMES FROM, AND WHERE IT WILL COME FROM. `ComputedSheet` already
 * carries `spellcasting` (ability, save DC, attack bonus, slots, prepared) —
 * but `prepared` is a bare list of ids, and `packages/engine/src/sim/sheet.ts`
 * currently hardcodes it to `[]`. There is no spell-card data on the sheet yet,
 * so nothing on this screen can read one.
 *
 * This interface is that missing card, declared where the seam needs it. The
 * screen code below is FINAL — it runs spells through the same shared legality
 * function as everything else, and builds tiles the same way. Only the DATA is
 * supplied by hand today. When the engine resolves `prepared` into real cards,
 * this becomes its return shape and the fixture is deleted; nothing in the
 * components changes.
 */
export interface SpellCardVM {
  id: string;
  name: string;
  /** 0 = cantrip: always available, spends no slot. */
  level: number;
  /** which economy casting it costs. */
  economy: Economy;
  /** "1d8 radiant" — appears on the detail line, never on the tile face. */
  damage?: string;
  /** a spell the target resists rather than one you roll to hit with. */
  save?: { ability: string; dc: number };
  /** a spell you roll an attack for. */
  attack?: number;
  range: string;
  /** holding it needs concentration — you can only hold one at a time. */
  concentration?: boolean;
  /** the sentence the detail strip shows while this tile is focused. */
  detail: string;
  /** plain English, for the explain sheet. */
  rule: string;
}

export interface TileOpts {
  /** whether turns are being enforced (off outside structured combat). */
  activeTurnEnforced?: boolean;
  /** the currently aimed-at creature, for the attack legality check. */
  targetId?: string;
  /** caller-computed geometry, per attack name. */
  targetInRange?: (attackName: string) => boolean;
  /** economies already spent this turn — the row's pip goes hollow. */
  spent?: Partial<Record<Economy, boolean>>;
  /** cap the tiles to the first N of each economy — the first-session state (§4.11). */
  seededOnly?: boolean;
  /** a caster's prepared spells. Absent ⇒ this character does not cast. */
  spells?: SpellCardVM[];
  /** slots still unspent, by level — drives the count in each tile's corner. */
  slotsRemaining?: Record<number, number>;
}

export function toTiles(
  sheet: ComputedSheet,
  me: Combatant,
  state: ProjectionState,
  opts: TileOpts = {},
): TileVM[] {
  const gate = (intent: Intent, extra: Parameters<typeof greyingReason>[2] = {}): string | null =>
    greyingReason(intent, state, {
      ...(opts.activeTurnEnforced !== undefined ? { activeTurnEnforced: opts.activeTurnEnforced } : {}),
      ...extra,
    });

  const actorGate = (): string | null =>
    gate({ kind: 'move', tokenId: me.id, path: [{ x: 0, y: 0 }] });

  const tiles: TileVM[] = [];

  for (const atk of sheet.attacks) {
    const inRange = opts.targetInRange?.(atk.name);
    const damage = `${atk.damage} ${atk.damageType}`;
    tiles.push({
      id: `attack.${atk.name}`,
      name: atk.name,
      economy: 'action',
      glyph: glyphFor(atk.name, atk.tags ?? []),
      meta: `${signed(atk.toHit)} · ${atk.damage}`,
      detail: `${atk.name} — ${signed(atk.toHit)} to hit, ${damage} on a hit.`,
      roll: { bonus: atk.toHit },
      greyReason: gate(
        { kind: 'attack', attackerId: me.id, targetId: opts.targetId ?? '', actionName: atk.name },
        inRange !== undefined ? { targetInRange: inRange } : {},
      ),
      explain: {
        id: `attack:${atk.name}`,
        kicker: 'Attack',
        title: `${atk.name} — to hit`,
        value: signed(atk.toHit),
        rows: asRows(atk.toHitDerivation),
        rule: `Roll a d20 and add ${signed(atk.toHit)}. If the result is at least the target's Armor Class, you hit and roll ${damage}.`,
      },
    });
  }

  for (const u of UNIVERSAL) {
    tiles.push({
      id: u.id,
      name: u.name,
      economy: u.economy,
      glyph: glyphFor(u.name),
      detail: u.detail,
      greyReason: actorGate(),
      explain: { id: `action:${u.id}`, kicker: 'Everyone can do this', title: u.name, value: 'Action', rows: [], rule: u.rule },
    });
  }

  for (const feat of sheet.features) {
    if (feat.resource === undefined) continue;
    const left = feat.resource.remaining;
    tiles.push({
      id: `feature.${feat.id}`,
      name: feat.name,
      economy: 'bonus',
      glyph: glyphFor(feat.name),
      resource: `${left} of ${feat.resource.max}`,
      detail: `${feat.name} — ${left} of ${feat.resource.max} uses left. A rest brings them back.`,
      greyReason: gate(
        { kind: 'use_feature', creatureId: me.id, featureId: feat.id },
        { resourceRemaining: left },
      ),
      explain: {
        id: `feature:${feat.id}`,
        kicker: 'Your feature',
        title: feat.name,
        value: `${left} of ${feat.resource.max}`,
        rows: [{ label: 'Used so far', value: String(feat.resource.max - left) }],
        rule: 'Something only you can do, and only so many times before you rest. The count on the tile is what you have left.',
      },
    });
  }

  /*
   * SPELLS GO THROUGH THE SAME DOOR AS EVERYTHING ELSE. `cast` is a real intent
   * kind in the contracts union and `checkIntent` already handles it, so a
   * spell tile's greying is the server's own answer exactly like an attack's —
   * down, incapacitated, not your turn, target out of range.
   *
   * ONE HONEST GAP: the engine does not check spell slots. `checkIntent`'s
   * `use_feature` branch has a resource test; `cast` has none. Greying a
   * slotless spell here would mean inventing a refusal string the server would
   * never send, which is the one thing this seam exists to prevent — so the
   * remaining count goes on the tile's face instead and nothing is greyed on
   * its account. When the engine grows that check, these tiles start greying
   * with the real reason and this comment is what gets deleted.
   */
  for (const sp of opts.spells ?? []) {
    const left = sp.level === 0 ? undefined : (opts.slotsRemaining?.[sp.level] ?? 0);
    const cost = sp.level === 0 ? 'a cantrip — cast it as often as you like' : `spends a level ${sp.level} slot`;
    tiles.push({
      id: `spell.${sp.id}`,
      name: sp.name,
      economy: sp.economy,
      glyph: glyphFor(sp.name),
      ...(left !== undefined ? { resource: `${left} left` } : {}),
      detail: `${sp.name} — ${sp.detail} (${sp.range}, ${cost}${sp.concentration === true ? ', needs concentration' : ''}).`,
      greyReason: gate(
        { kind: 'cast', casterId: me.id, spellId: sp.id, slotLevel: sp.level, targetIds: opts.targetId !== undefined ? [opts.targetId] : [] },
        opts.targetInRange?.(sp.name) !== undefined ? { targetInRange: opts.targetInRange(sp.name) } : {},
      ),
      explain: {
        id: `spell:${sp.id}`,
        kicker: sp.level === 0 ? 'Cantrip' : `Level ${sp.level} spell`,
        title: sp.name,
        value: sp.save !== undefined ? `DC ${sp.save.dc}` : sp.attack !== undefined ? signed(sp.attack) : sp.range,
        rows: [
          ...(sp.save !== undefined ? [{ label: `${sp.save.ability} save`, value: `DC ${sp.save.dc}` }] : []),
          ...(sp.attack !== undefined ? [{ label: 'Spell attack', value: signed(sp.attack) }] : []),
          ...(sp.damage !== undefined ? [{ label: 'Damage', value: sp.damage }] : []),
          { label: 'Range', value: sp.range },
        ],
        rule: sp.rule,
      },
    });
  }

  tiles.push({
    id: REACTION.id,
    name: REACTION.name,
    economy: 'reaction',
    glyph: glyphFor(REACTION.name),
    detail: REACTION.detail,
    greyReason: actorGate(),
    explain: { id: `action:${REACTION.id}`, kicker: 'Everyone can do this', title: REACTION.name, value: 'Reaction', rows: [], rule: REACTION.rule },
  });

  if (opts.seededOnly === true && opts.spells === undefined) {
    // A brand-new player starts with what is actually THEIRS — the weapon on
    // their sheet and the one feature their class gave them. The universal
    // actions and the rest of each row stay as open sockets, so the first
    // session reads as room to grow rather than as a product with most of the
    // lights off (§4.11). The table teaches Dash and Dodge when they matter.
    return tiles.filter((t) => t.id.startsWith('attack.') || t.id.startsWith('feature.'));
  }

  return tiles;
}

/**
 * The folio's Spells tab. Reads `sheet.spellcasting` for the two numbers that
 * ARE already computed by the engine — the save DC and the spell attack bonus,
 * both carrying real derivations — and takes the prepared list from the same
 * hand-supplied cards the action row uses, for the same reason.
 *
 * Returns undefined for a non-caster, which is what makes the tab say so
 * plainly instead of drawing an empty slot track.
 */
export function toSpells(
  sheet: ComputedSheet,
  cards: SpellCardVM[],
  slotsRemaining: Record<number, number>,
): { slots: { level: number; max: number; used: number }[]; prepared: { id: string; name: string; note: string }[]; saveDC: number; attack: number } | undefined {
  const sc = sheet.spellcasting;
  if (sc === undefined) return undefined;

  return {
    saveDC: sc.saveDc.value,
    attack: sc.attackBonus.value,
    slots: Object.entries(sc.slots)
      .map(([level, max]) => ({ level: Number(level), max, used: max - (slotsRemaining[Number(level)] ?? max) }))
      .filter((s) => s.level > 0)
      .sort((a, b) => a.level - b.level),
    prepared: cards.map((c) => ({
      id: c.id,
      name: c.name,
      note: [
        c.level === 0 ? 'Cantrip' : `Level ${c.level}`,
        c.save !== undefined ? `${c.save.ability} save DC ${c.save.dc}` : undefined,
        c.attack !== undefined ? `${signed(c.attack)} to hit` : undefined,
        c.damage,
        c.concentration === true ? 'concentration' : undefined,
      ].filter(Boolean).join(' · '),
    })),
  };
}

// ---- the round spine -------------------------------------------------------

export type Hurt = 'Unhurt' | 'Hurt' | 'Bloodied' | 'Down';

export interface SpineEntryVM {
  id: string;
  initiative: number;
  name: string;
  kind: 'you' | 'ally' | 'foe';
  /** "Fighter · 3" for people; enemies do not get one. */
  role?: string;
  /** allies only. An enemy's exact hit points are the DM's to reveal, not ours. */
  hp?: { current: number; max: number };
  /** enemies only — the same information, at the resolution a player is owed. */
  hurt?: Hurt;
  /** an overriding state worth saying out loud: Dying, Stable, Away. */
  status?: string;
  /**
   * Armour class. Present on a DM's roster and absent on a player's spine: it
   * is the number every attack in the room is measured against, which makes it
   * the one a DM reads most and one a player has not earned about an enemy.
   */
  ac?: number;
  acted: boolean;
  acting: boolean;
}

/** A word for how hurt something is, which is all a player gets to know about an enemy. */
export function hurtWord(hp: number, maxHp: number): Hurt {
  if (hp <= 0) return 'Down';
  if (hp <= Math.floor(maxHp / 2)) return 'Bloodied';
  if (hp < maxHp) return 'Hurt';
  return 'Unhurt';
}

// ---- the log ---------------------------------------------------------------

export interface LogRollVM {
  rows: { label: string; value: string }[];
  total: number;
  /** "Hit — against Armor Class 15" */
  verdict: string;
  tone: 'hit' | 'miss' | 'neutral';
}

/**
 * A proposal from the assistant, sitting in the journal.
 *
 * The shape is the AI card's, not a generic list of buttons, because the three
 * motions are not interchangeable: Accept applies it, Tweak edits it first,
 * Reject leaves the scene untouched. A caller can rename them — "Ask for the
 * roll" reads better than "Accept" at a table — but it cannot invent a fourth,
 * and it cannot make one of them mean something else.
 *
 * `outcome` is set once the host has decided, which turns the entry into the
 * card's resolved state: what happened, and an Undo. A decision that scrolls
 * away unrecorded is a decision nobody can take back (law 3).
 */
export interface LogSuggestionVM {
  /** the proposal in prose. */
  detail?: string;
  /** or the proposal as a ruling — Check / difficulty / on a fail. */
  rows?: StructuredRow[];
  acceptLabel?: string;
  tweakLabel?: string;
  rejectLabel?: string;
  onAccept?: () => void;
  onTweak?: () => void;
  onReject?: () => void;
  onUndo?: () => void;
  outcome?: CardOutcome;
}

export interface LogEntryVM {
  id: string;
  tone: 'narration' | 'chat' | 'roll' | 'system' | 'suggestion';
  actor: string;
  text: string;
  roll?: LogRollVM;
  suggestion?: LogSuggestionVM;
}

/** What the result bay shows once a roll has settled at the near edge. */
export interface ResultVM {
  label: string;
  total: number;
  rows: { label: string; value: string }[];
  verdict: string;
  tone: 'hit' | 'miss' | 'neutral';
}

// ---- the dying ladder ------------------------------------------------------

export interface DyingVM {
  successes: number;
  failures: number;
  phase: 'dying' | 'stable' | 'dead' | 'up';
}
