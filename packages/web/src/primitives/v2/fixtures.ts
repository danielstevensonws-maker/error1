/**
 * v2/fixtures — the demo table, built on the REAL contracts fixture.
 *
 * You are Torvald, and every number about him comes from `torvald-sheet.json`
 * through `toHero` — Armor Class 18 is Chain Mail 16 plus a Shield 2 because
 * that is literally what the sheet says, so tapping it shows true working
 * rather than a plausible-looking invention. That is the whole reason the owner
 * chose Torvald over the design request's Wren for these stories: a screen
 * whose promise is "no number you cannot interrogate" should not be
 * demonstrated with numbers nobody derived.
 *
 * Everyone ELSE at the table is hand-built, and correctly so — the spine only
 * ever shows an ally's hit points and an enemy's condition in one word, none of
 * which needs a computed sheet behind it. The party names and levels are the
 * design request's §9 cast, with Wren moved from "you" to the seat beside you.
 */
import type { ComputedSheet, Room } from '@questra/contracts';
import type { Combatant, ProjectionState } from '@questra/engine';
import torvaldSheet from '@questra/contracts/src/fixtures/torvald-sheet.json';
import type { TokenPresentation } from '../MapCanvas.js';
import type { FeatureLineVM, InventoryLineVM } from './Overlays.js';
import type { LogEntryVM, ResultVM, SpellCardVM, SpineEntryVM } from './viewModel.js';

export const sheet = torvaldSheet as unknown as ComputedSheet;

export const IDENTITY = { className: 'Fighter', level: 3 };

export const torvald: Combatant = {
  id: 'pc-torvald', name: 'Torvald',
  abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [], isPlayer: true,
};

export const wren: Combatant = {
  id: 'pc-wren', name: 'Wren',
  abilities: { str: 10, dex: 17, con: 12, int: 13, wis: 14, cha: 11 },
  profBonus: 2, maxHp: 27, hp: 22, tempHp: 0, ac: 14, conditions: [], isPlayer: true,
};

export const skirmisher: Combatant = {
  id: 'npc-goblin-1', name: 'the skirmisher',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 4, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};

export const lookout: Combatant = {
  id: 'npc-goblin-2', name: 'the lookout',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};

const COMBATANTS: Record<string, Combatant> = {
  'pc-torvald': torvald, 'pc-wren': wren, 'npc-goblin-1': skirmisher, 'npc-goblin-2': lookout,
};

/** Torvald is up. */
export const yourTurn: ProjectionState = {
  combatants: COMBATANTS, round: 3, activeCreatureId: 'pc-torvald', nextSeq: 1,
};

/** Wren is up — every tile of Torvald's greys, each carrying the server's reason. */
export const wrensTurn: ProjectionState = {
  combatants: COMBATANTS, round: 3, activeCreatureId: 'pc-wren', nextSeq: 1,
};

export const SCENE = {
  title: 'The Ruined Steading',
  subtitle: 'Outskirts · Dusk',
  round: 3,
  elapsed: '01:42:33',
};

export const TARGETS = [
  { id: 'npc-goblin-1', name: 'skirmisher', selected: true },
  { id: 'npc-goblin-2', name: 'lookout', selected: false },
];

/**
 * What the table calls each creature. ONE map, because the turn order and the
 * map have to agree: a spine listing Skirmisher beside a disc reading GO is
 * two names for one goblin, and the player has to do the join themselves.
 */
export const NAMES: Record<string, string> = {
  'pc-wren': 'Wren',
  'pc-torvald': 'Torvald',
  'pc-mira': 'Mira',
  'pc-ozren': 'Ozren',
  'npc-goblin-1': 'Skirmisher',
  'npc-goblin-2': 'Lookout',
};

/**
 * The round in initiative order. Allies carry hit points; enemies carry one
 * word. `acting` and `acted` are what drives the spine's accent — see
 * RoundSpine.tsx.
 */
export function castOrder(
  actingId: string,
  opts: { yourStatus?: string; youId?: string } = {},
): SpineEntryVM[] {
  // WHICH ONE IS YOU is a parameter, not a constant. The spine's whole job is
  // answering "when am I up", and it computes that from the entry marked `you`
  // — so hardcoding Torvald made the caster story mark the wrong player and
  // count down to the wrong turn.
  const youId = opts.youId ?? 'pc-torvald';

  const order: Omit<SpineEntryVM, 'acting' | 'acted' | 'kind' | 'name'>[] = [
    { id: 'pc-wren', initiative: 21, role: 'Rogue · 3', hp: { current: 22, max: 27 } },
    { id: 'pc-torvald', initiative: 18, role: 'Fighter · 3', hp: { current: torvald.hp, max: torvald.maxHp } },
    { id: 'npc-goblin-1', initiative: 15, role: 'Goblin', hurt: 'Bloodied' },
    { id: 'pc-mira', initiative: 12, role: 'Cleric · 3', hp: { current: mira.hp, max: mira.maxHp } },
    { id: 'npc-goblin-2', initiative: 9, role: 'Goblin', hurt: 'Unhurt' },
    { id: 'pc-ozren', initiative: 7, role: 'Wizard · 3', hp: { current: 9, max: 20 } },
  ];

  const at = order.findIndex((e) => e.id === actingId);
  return order.map((e, i) => ({
    ...e,
    name: NAMES[e.id] ?? e.id,
    kind: e.id === youId ? 'you' : e.hurt !== undefined ? 'foe' : 'ally',
    acting: i === at,
    acted: at >= 0 && i < at,
    ...(e.id === youId && opts.yourStatus !== undefined ? { status: opts.yourStatus } : {}),
  }));
}

/**
 * The yard behind the ruined steading, as a real `Room` rather than the
 * decorative CSS grid the play screen used to draw. 24×15 is chosen so the
 * grid's proportions match a widescreen viewport closely enough that
 * `fit="fill"` reaches the edges while cells stay square — see MapCanvas for
 * why square is non-negotiable.
 *
 * Fully revealed, because this is what a PLAYER sees after
 * `filterRoomForViewer` has run: unrevealed cells never reach the client at
 * all. The fog machinery is still exercised by the DM/editor stories, which
 * pass a partially-revealed room.
 */
const ALL_CELLS: string[] = Array.from({ length: 15 }, (_, y) =>
  Array.from({ length: 24 }, (_, x) => `${x},${y}`),
).flat();

export const ROOM: Room = {
  id: 'room.ruined-steading-yard',
  terrainImageRef: 'terrain.steading-yard',
  gridSize: { w: 24, h: 15 },
  cellTags: {
    // The churned ground around the well, and the muck along the barn wall.
    '11,7': { difficultTerrain: true }, '12,7': { difficultTerrain: true },
    '11,8': { difficultTerrain: true }, '12,8': { difficultTerrain: true },
    '3,12': { difficultTerrain: true }, '4,12': { difficultTerrain: true }, '5,12': { difficultTerrain: true },
  },
  revealed: ALL_CELLS,
  assets: [
    { id: 'asset.well', imageRef: 'asset.well', cell: { x: 11, y: 7 }, footprint: { w: 2, h: 2 }, flags: { blocking: true, movable: false, interactive: true, difficultTerrain: false } },
    { id: 'asset.cart', imageRef: 'asset.cart', cell: { x: 4, y: 3 }, footprint: { w: 3, h: 2 }, flags: { blocking: true, movable: true, interactive: false, difficultTerrain: false } },
    { id: 'asset.barn-door', imageRef: 'asset.door', cell: { x: 20, y: 5 }, footprint: { w: 1, h: 2 }, flags: { blocking: false, movable: false, interactive: true, difficultTerrain: false }, state: 'open' },
    { id: 'asset.crates', imageRef: 'asset.crates', cell: { x: 17, y: 11 }, footprint: { w: 2, h: 1 }, flags: { blocking: true, movable: true, interactive: false, difficultTerrain: false } },
  ],
  tokens: [
    { id: 'tok.wren', creatureRef: 'pc-wren', cell: { x: 8, y: 5 }, size: 'small', hidden: false, staged: false },
    { id: 'tok.torvald', creatureRef: 'pc-torvald', cell: { x: 10, y: 8 }, size: 'medium', hidden: false, staged: false },
    { id: 'tok.mira', creatureRef: 'pc-mira', cell: { x: 6, y: 9 }, size: 'medium', hidden: false, staged: false },
    { id: 'tok.ozren', creatureRef: 'pc-ozren', cell: { x: 5, y: 7 }, size: 'medium', hidden: false, staged: false },
    { id: 'tok.g1', creatureRef: 'npc-goblin-1', cell: { x: 15, y: 4 }, size: 'small', hidden: false, staged: false },
    { id: 'tok.g2', creatureRef: 'npc-goblin-2', cell: { x: 18, y: 7 }, size: 'small', hidden: false, staged: false },
  ],
};

/**
 * Who each creature is TO YOU, which the room itself cannot know. Allies carry
 * their state; enemies carry a word only — an enemy's exact hit points are the
 * DM's to reveal.
 */
export function present(actingId: string, opts: { yourId?: string; yourTag?: string; yourDown?: boolean } = {}): Record<string, TokenPresentation> {
  const youId = opts.yourId ?? 'pc-torvald';
  const sideOf = (id: string): 'you' | 'ally' | 'foe' =>
    id === youId ? 'you' : id.startsWith('npc-') ? 'foe' : 'ally';

  const out: Record<string, TokenPresentation> = {};
  for (const t of ROOM.tokens) {
    const id = t.creatureRef;
    const name = NAMES[id];
    out[id] = {
      ...(name !== undefined ? { name } : {}),
      side: sideOf(id),
      acting: id === actingId,
      ...(id === 'npc-goblin-1' ? { tag: 'Bloodied' } : {}),
      ...(id === 'npc-goblin-2' ? { tag: 'Unhurt' } : {}),
      ...(id === youId && opts.yourTag !== undefined ? { tag: opts.yourTag } : {}),
      ...(id === youId && opts.yourDown === true ? { down: true } : {}),
    };
  }
  return out;
}

export const NOTES = {
  title: 'The Ruined Steading — your notes',
  lines: [
    'The lookout bolts for the barn once it is bloodied — Wren called it.',
    'The well hides a cellar hatch, barred from below.',
    'Bram the farmer is tied up in the loft. He will shout a warning.',
  ],
};

const noop = (what: string) => () => console.log(what);

export const ENTRIES: LogEntryVM[] = [
  { id: '1', tone: 'narration', actor: 'DM', text: 'Smoke drifts across the yard. The skirmisher staggers back, and the lookout edges toward the well.' },
  { id: '2', tone: 'chat', actor: 'Torvald', text: 'I stay between them and Mira.' },
  {
    id: '3', tone: 'roll', actor: 'Wren · Attack', text: 'Shortbow on the skirmisher',
    roll: {
      total: 18,
      rows: [
        { label: 'd20', value: '13' },
        { label: 'DEX', value: '+3' },
        { label: 'Proficiency', value: '+2' },
      ],
      verdict: 'Hit — against Armor Class 15',
      tone: 'hit',
    },
  },
  { id: '4', tone: 'narration', actor: 'Engine', text: 'Wren hits the skirmisher for 6 piercing. It is bloodied.' },
  {
    id: '5', tone: 'suggestion', actor: 'Ruling suggestion',
    text: 'I want to swing on the well-rope and drop on the lookout.',
    // A ruling, so it arrives as ROWS rather than a paragraph — the three
    // things a player has to weigh are what to roll, what to beat, and what
    // happens if they miss, and a sentence makes you find all three.
    suggestion: {
      rows: [
        { label: 'Roll', value: 'Dexterity (Acrobatics)' },
        { label: 'Beat', value: '13', variant: 'number' },
        { label: 'On a miss', value: 'Wren lands flat in the goblin’s square.', variant: 'note' },
      ],
      // The motions are renamed for the table, never redefined: Accept asks
      // for the roll, Tweak changes it, Reject says no roll is needed.
      acceptLabel: 'Ask for the roll',
      tweakLabel: 'Change it',
      rejectLabel: 'No roll needed',
      onAccept: noop('ask for the roll'),
      onTweak: noop('change it'),
      onReject: noop('no roll'),
    },
  },
  { id: '6', tone: 'narration', actor: 'DM', text: 'Torvald — you are up. The lookout has one eye on you and one on the barn door.' },
];

export const RESULT: ResultVM = {
  label: 'Longsword on the skirmisher',
  total: 19,
  rows: [
    { label: 'd20', value: '14' },
    { label: 'STR', value: '+3' },
    { label: 'Proficiency', value: '+2' },
  ],
  verdict: 'Hit — against Armor Class 15',
  tone: 'hit',
};

// ---- Mira, and what is honest about her ------------------------------------

/**
 * MIRA IS HAND-AUTHORED, AND TORVALD IS NOT. The distinction matters more than
 * the fixture does.
 *
 * Torvald's sheet is `torvald-sheet.json` — the shape the engine actually
 * computes, so tapping his Armor Class shows the working the engine did.
 * Mira's SPELL TILES below are still written by hand, but for a narrower reason
 * than before. `packages/engine/src/sim/sheet.ts` now attaches `spellcasting`
 * to every caster type, computes her slots and her prepared ceiling, and
 * resolves chosen spell ids into real `SpellCard`s. What it cannot do is
 * resolve HERS *with numbers on it*. The dataset now carries 339 spells across
 * levels 0–9 (109 of them Cleric spells, 7 of those cantrips), so her list could
 * be pointed at real ids — but not one draft spell has an authored `effects[]`,
 * and that is where a card's save, DC and damage come from. Resolving her from
 * the data today would give correct names and ranges on blank tiles. The tiles
 * stay hand-authored until the rules-lawyer pass fills `effects[]` in.
 *
 * What she therefore DOES prove: that the action row holds a caster's tile
 * count without wrapping, that the glyphs separate when most of a row is
 * spells, that the folio's Spells tab has a shape worth filling, and that the
 * concentration badge reads. What she does NOT prove: that the engine can
 * resolve a real Cleric spell list — that waits on the spell QA pass.
 *
 * Every number here is arithmetically consistent with a Cleric 3 (WIS 17, prof
 * +2) and every `derivation` sums to its `value`, because `derivationSumsToValue`
 * is a stated invariant of the contract and a fixture that violated it would be
 * teaching the wrong shape to whoever wires the real thing.
 */
export const MIRA_IDENTITY = { className: 'Cleric', level: 3 };

const d = (value: number, derivation: { label: string; value: number }[]) => ({ value, derivation });

export const miraSheet: ComputedSheet = {
  abilities: {
    str: d(12, [{ label: 'Base', value: 12 }]),
    dex: d(10, [{ label: 'Base', value: 10 }]),
    con: d(14, [{ label: 'Base', value: 13 }, { label: 'Background', value: 1 }]),
    int: d(11, [{ label: 'Base', value: 11 }]),
    wis: d(17, [{ label: 'Base', value: 15 }, { label: 'Background', value: 2 }]),
    cha: d(13, [{ label: 'Base', value: 13 }]),
  },
  profBonus: d(2, [{ label: 'Level 3', value: 2 }]),
  hp: {
    value: { max: 24, hitDie: 'd8', hitDiceMax: 3 },
    derivation: [
      { label: 'Hit die (max at level 1)', value: 8 },
      { label: 'Levels 2-3', value: 10 },
      { label: 'CON', value: 6 },
    ],
  },
  acOptions: [
    d(13, [{ label: 'Chain Shirt', value: 13 }]),
    d(15, [{ label: 'Chain Shirt', value: 13 }, { label: 'Shield', value: 2 }]),
  ],
  acDefault: 1,
  initiative: d(0, [{ label: 'DEX', value: 0 }]),
  saves: {
    str: d(1, [{ label: 'STR', value: 1 }]),
    dex: d(0, [{ label: 'DEX', value: 0 }]),
    con: d(2, [{ label: 'CON', value: 2 }]),
    int: d(0, [{ label: 'INT', value: 0 }]),
    wis: d(5, [{ label: 'WIS', value: 3 }, { label: 'Proficiency', value: 2 }]),
    cha: d(3, [{ label: 'CHA', value: 1 }, { label: 'Proficiency', value: 2 }]),
  },
  skills: {
    insight: d(5, [{ label: 'WIS', value: 3 }, { label: 'Proficiency', value: 2 }]),
    medicine: d(5, [{ label: 'WIS', value: 3 }, { label: 'Proficiency', value: 2 }]),
    persuasion: d(3, [{ label: 'CHA', value: 1 }, { label: 'Proficiency', value: 2 }]),
    religion: d(2, [{ label: 'INT', value: 0 }, { label: 'Proficiency', value: 2 }]),
  },
  passives: {
    perception: d(15, [{ label: 'Base', value: 10 }, { label: 'WIS', value: 3 }, { label: 'Proficiency', value: 2 }]),
    investigation: d(10, [{ label: 'Base', value: 10 }, { label: 'INT', value: 0 }]),
    insight: d(15, [{ label: 'Base', value: 10 }, { label: 'WIS', value: 3 }, { label: 'Proficiency', value: 2 }]),
  },
  speedFt: d(30, [{ label: 'Species', value: 30 }]),
  attacks: [
    {
      name: 'Mace',
      toHit: 3,
      toHitDerivation: [{ label: 'STR', value: 1 }, { label: 'Proficiency', value: 2 }],
      damage: '1d6 + 1',
      damageType: 'bludgeoning',
      ability: 'str',
      tags: ['action', 'melee'],
    },
  ],
  features: [
    { id: 'feature.cleric.channel-divinity', name: 'Channel Divinity', resource: { pool: 'feature.channel_divinity', max: 1, remaining: 1 } },
  ],
  spellcasting: {
    ability: 'wis',
    saveDc: d(13, [{ label: 'Base', value: 8 }, { label: 'Proficiency', value: 2 }, { label: 'WIS', value: 3 }]),
    attackBonus: d(5, [{ label: 'Proficiency', value: 2 }, { label: 'WIS', value: 3 }]),
    slotKind: 'slots',
    slots: { '1': 4, '2': 2 },
    // A level 3 Cleric prepares 6 spells (SRD Cleric table). The engine now
    // computes this; her six tiles below are still hand-authored because the
    // spell dataset they would resolve from has no Cleric entries verified yet.
    preparedMax: 6,
    prepared: [],
    cantrips: [],
  },
  coins: { cp: 0, sp: 8, ep: 0, gp: 14, pp: 0 },
};

export const mira: Combatant = {
  id: 'pc-mira', name: 'Mira',
  abilities: { str: 12, dex: 10, con: 14, int: 11, wis: 17, cha: 13 },
  profBonus: 2, maxHp: 24, hp: 18, tempHp: 0, ac: 15, conditions: [], isPlayer: true,
  // Real projection state, not invented: `concentratingOn` is already on the
  // engine's Combatant, so the badge this drives is server-driven today.
  concentratingOn: 'Bless',
};

/** Mira's turn, with the rest of the table where the Torvald states leave them. */
export const mirasTurn: ProjectionState = {
  combatants: { 'pc-torvald': torvald, 'pc-wren': wren, 'pc-mira': mira, 'npc-goblin-1': skirmisher, 'npc-goblin-2': lookout },
  round: 3, activeCreatureId: 'pc-mira', nextSeq: 1,
};

/** What a Cleric 3 would actually have prepared. Hand-written — see the note above. */
export const MIRA_SPELLS: SpellCardVM[] = [
  {
    id: 'spell.sacred-flame', name: 'Sacred Flame', level: 0, economy: 'action',
    save: { ability: 'DEX', dc: 13 }, damage: '1d8 radiant', range: '60 ft',
    detail: 'light falls on one creature you can see; a Dexterity save for half nothing, 1d8 radiant on a fail',
    rule: 'Cover does not help against this one — the light comes from above. They roll a Dexterity save against your spell save DC; on a failure they take 1d8 radiant, and on a success nothing happens.',
  },
  {
    id: 'spell.guiding-bolt', name: 'Guiding Bolt', level: 1, economy: 'action',
    attack: 5, damage: '4d6 radiant', range: '120 ft',
    detail: 'a bolt of light you roll to hit with; the next attack against that target has advantage',
    rule: 'Roll a spell attack. On a hit it is 4d6 radiant, and the next person to attack that creature before your next turn rolls with advantage — worth saying out loud so somebody uses it.',
  },
  {
    id: 'spell.cure-wounds', name: 'Cure Wounds', level: 1, economy: 'action',
    damage: '1d8 + 3 healed', range: 'touch',
    detail: 'touch someone and give them hit points back',
    rule: 'No roll. Touch a creature and they get 1d8 + your Wisdom back in hit points. It does nothing for anything undead or constructed.',
  },
  {
    id: 'spell.bless', name: 'Bless', level: 1, economy: 'action',
    concentration: true, range: '30 ft, up to three',
    detail: 'up to three of you add 1d4 to attacks and saving throws while you hold it',
    rule: 'While you hold your concentration, up to three creatures add 1d4 to every attack roll and saving throw they make. Losing concentration ends it for all of them at once.',
  },
  {
    id: 'spell.spiritual-weapon', name: 'Spiritual Weapon', level: 2, economy: 'bonus',
    attack: 5, damage: '1d8 + 3 force', range: '60 ft',
    detail: 'a floating weapon that strikes on your bonus action and moves 20 ft each turn',
    rule: 'A weapon of light appears and attacks for you. It costs a bonus action to summon and a bonus action each turn after to move and swing again, which means you can cast something else with your action in the same turn.',
  },
  {
    id: 'spell.shield-of-faith', name: 'Shield of Faith', level: 1, economy: 'bonus',
    concentration: true, range: '60 ft',
    detail: 'one creature gets +2 to Armor Class while you hold it',
    rule: 'Two points of Armor Class on somebody who is about to be hit a lot. It needs concentration, so it competes with Bless — you can only hold one.',
  },
];

/** Slots Mira has left this fight: two of four level-1 spent, both level-2 intact. */
export const MIRA_SLOTS: Record<number, number> = { 1: 2, 2: 2 };

export const MIRA_FEATURES: FeatureLineVM[] = [
  {
    id: 'feature.cleric.channel-divinity',
    name: 'Channel Divinity',
    resource: '1 of 1 left',
    text: 'A burst of your deity’s power, once between rests. Your domain decides what it does — turning undead is the one every Cleric gets.',
  },
  {
    id: 'feature.cleric.domain',
    name: 'Divine Domain',
    text: 'The part of your faith you lean on. It adds spells to your prepared list for free, and they never count against how many you can prepare.',
  },
];

export const MIRA_INVENTORY: InventoryLineVM[] = [
  { id: 'item.chain-shirt', name: 'Chain Shirt', note: 'Worn', equipped: true, flavour: 'Light enough to kneel in, which matters more than she expected.' },
  { id: 'item.shield-holy', name: 'Shield', note: 'Left arm', equipped: true },
  { id: 'item.mace', name: 'Mace', note: 'Drawn', equipped: true },
  { id: 'item.holy-symbol', name: 'Holy Symbol', note: 'Worn at the throat', equipped: true, flavour: 'Worn smooth at the edges from being held.' },
  { id: 'item.healers-kit', name: "Healer's Kit", note: '10 uses' },
  { id: 'item.priests-pack', name: "Priest's Pack" },
];

export const FEATURES: FeatureLineVM[] = [
  {
    id: 'feature.fighter.second-wind',
    name: 'Second Wind',
    resource: '2 of 2 left',
    text: 'Catch your breath and get some hit points back, once or twice between rests. It costs your bonus action, so you can still swing in the same turn.',
  },
  {
    id: 'feature.fighter.fighting-style',
    name: 'Fighting Style — Defense',
    text: 'While you are wearing armor, you are a little harder to hit. It is already counted in your Armor Class.',
  },
  {
    id: 'feature.fighter.action-surge',
    name: 'Action Surge',
    resource: 'Arrives at level 2',
    text: 'One extra action on your turn, once per rest. It will appear in your Action row the moment you have it.',
  },
];

/**
 * Torvald's gear. The item names come from the fixture's equipment; the notes
 * and flavour are written here because @questra/contracts has no Item catalog
 * yet — when it grows one, this list is what it replaces.
 */
export const INVENTORY: InventoryLineVM[] = [
  { id: 'item.chain-mail', name: 'Chain Mail', note: 'Worn', equipped: true, flavour: 'Heavy, hot, and the reason you are still standing.' },
  { id: 'item.shield', name: 'Shield', note: 'Left arm', equipped: true, flavour: 'Oak and iron, with a dent you have stopped explaining.' },
  { id: 'item.longsword', name: 'Longsword', note: 'Drawn', equipped: true },
  { id: 'item.dagger', name: 'Dagger', qty: 2 },
  { id: 'item.explorers-pack', name: "Explorer's Pack", note: 'Rope, tinderbox, rations' },
  { id: 'item.torch', name: 'Torch', qty: 5 },
];
