/**
 * Player View v2 — "The Near Edge".
 *
 * A second concept for the player's screen, built fresh rather than rearranged
 * from v1. The thesis, the signature and the reasoning live in the component
 * headers; this file is the evidence.
 *
 * JUDGE FROM `YourTurn`. It puts the whole frame on screen at once with the
 * round mid-flight: the spine's accent has reached your notch and carried into
 * the top edge of the near edge, a bloodied enemy is aimed at, the journal has
 * a ruling suggestion waiting, and every number on the band opens its own
 * working. `Waiting` is the other half of the pair — the same screen with the
 * round somewhere else — and the two are worth flipping between, because the
 * difference between them is the entire argument for the spine.
 */
import { useMemo, useState, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerViewV2 } from './PlayerViewV2.js';
import { toHero, toSpells, toTiles, type DyingVM, type ResultVM } from './viewModel.js';
import {
  ENTRIES, FEATURES, IDENTITY, INVENTORY, NOTES, RESULT, SCENE, TARGETS,
  MIRA_FEATURES, MIRA_IDENTITY, MIRA_INVENTORY, MIRA_SLOTS, MIRA_SPELLS,
  ROOM, castOrder, mira, miraSheet, mirasTurn, present, sheet, torvald, wrensTurn, yourTurn,
} from './fixtures.js';

const meta: Meta = { title: 'Play/Player View v2', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const log = (what: string) => (...args: unknown[]) => console.log(what, ...args);

/** Everything every story shares — the callbacks and the folio's contents. */
const WIRING = {
  features: FEATURES,
  inventory: INVENTORY,
  onUse: log('use'),
  onDescribe: log('describe'),
  onSend: log('say'),
  onTarget: log('target'),
  onEquip: log('equip'),
  onReact: log('react'),
  onRollDeathSave: log('death save'),
  onMenuPick: log('menu'),
};

// ---------------------------------------------------------------------------

/**
 * THE ONE TO JUDGE FROM. Round 3, Torvald is up, the skirmisher is bloodied and
 * aimed at, and a ruling suggestion is waiting in the journal.
 *
 * Things worth doing here rather than reading about: hover along the action row
 * and watch the detail strip below it explain each tile without anything above
 * it moving; tap "Armor class" and see Chain Mail 16 + Shield 2 = 18 come out
 * of the real fixture; tap the Longsword and set up the roll before committing
 * it; collapse the spine and the journal from the top-right controls and watch
 * the map come back.
 */
export const YourTurn: Story = {
  render: function YourTurnStory(): ReactElement {
    const [aimed, setAimed] = useState('npc-goblin-1');
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(
      () => toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: aimed }),
      [aimed],
    );

    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald')}
        room={ROOM}
        present={present('pc-torvald')}
        tiles={tiles}
        turn={{
          active: true,
          movement: { left: 15, max: 30 },
          targets: TARGETS.map((t) => ({ ...t, selected: t.id === aimed })),
          spent: { reaction: false },
        }}
        entries={ENTRIES}
        notes={NOTES}
        pendingCount={1}
        {...WIRING}
        onTarget={setAimed}
      />
    );
  },
};

/**
 * WAITING — Wren is up, so every one of Torvald's tiles carries the server's own
 * refusal ("It isn't Torvald's turn.") and the detail strip says it in full
 * rather than making you hunt for a tooltip.
 *
 * This is where the spine earns its place. The accent has not reached your notch
 * yet, the cue at the bottom of the rail reads "You're next", and nothing on the
 * screen demands to be read while somebody else is talking.
 */
export const Waiting: Story = {
  render: function WaitingStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(
      () => toTiles(sheet, torvald, wrensTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }),
      [],
    );
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-wren')}
        room={ROOM}
        present={present('pc-wren')}
        tiles={tiles}
        turn={{ active: false, activeName: 'Wren', movement: { left: 0, max: 30 }, targets: TARGETS }}
        entries={ENTRIES.slice(0, 4)}
        notes={NOTES}
        {...WIRING}
      />
    );
  },
};

/**
 * BLOODIED, WITH CONDITIONS. Half hit points or less: the bar turns, a Bloodied
 * tag appears beside your Armor Class, and the Prone tag next to it opens what
 * being on the ground actually costs you — in plain language, because the
 * player this product is for has never read a rulebook.
 *
 * Temporary hit points ride ON the bar as a hatched overlay rather than as a
 * second number to add up.
 */
export const Bloodied: Story = {
  render: function BloodiedStory(): ReactElement {
    const hurt = { ...torvald, hp: 5, tempHp: 3, conditions: [{ conditionId: 'condition.prone', appliedBySeq: 1 }] };
    const hero = useMemo(() => toHero(sheet, hurt, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, hurt, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }), []);
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald').map((c) => (c.kind === 'you' ? { ...c, hp: { current: 5, max: 12 } } : c))}
        room={ROOM}
        present={present('pc-torvald', { yourTag: 'Bloodied' })}
        tiles={tiles}
        turn={{ active: true, movement: { left: 10, max: 30 }, targets: TARGETS, spent: { bonus: true } }}
        entries={ENTRIES}
        notes={NOTES}
        {...WIRING}
      />
    );
  },
};

/**
 * THE FLIP. Hit points at zero: the middle bay's contents are replaced by the
 * death-save ladder, your identity dims to 45%, your token drops and is tagged,
 * and the spine's notch carries "Dying". It is a pure function of the `dying`
 * view-model — the server's ladder drives it, and there is no local state.
 *
 * Click the roll button to walk the ladder in the harness. The copy is the
 * product's voice verbatim: "A 10 or higher is a success. Three successes and
 * you hold on; three failures and the story ends."
 */
export const Dying: Story = {
  render: function DyingStory(): ReactElement {
    const [state, setState] = useState<DyingVM>({ successes: 1, failures: 2, phase: 'dying' });
    // Zero hit points means Unconscious in the projection, so the condition is
    // on the view-model too — the near edge should never say "nothing on you"
    // to somebody face down in the mud.
    const downed = { ...torvald, hp: 0, conditions: [{ conditionId: 'condition.unconscious', appliedBySeq: 1 }] };
    const hero = useMemo(() => toHero(sheet, downed, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, downed, yourTurn, { activeTurnEnforced: true }), []);

    const roll = (): void =>
      setState((s) => {
        const success = Math.random() >= 0.45;
        const next = success
          ? { ...s, successes: s.successes + 1 }
          : { ...s, failures: s.failures + 1 };
        if (next.successes >= 3) return { ...next, phase: 'stable' };
        if (next.failures >= 3) return { ...next, phase: 'dead' };
        return next;
      });

    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald', { yourStatus: state.phase === 'dead' ? 'Dead' : state.phase === 'stable' ? 'Stable' : 'Dying' })
          .map((c) => (c.kind === 'you' ? { ...c, hp: { current: 0, max: 12 } } : c))}
        room={ROOM}
        present={present('pc-torvald', { yourTag: state.phase === 'stable' ? 'Stable' : 'Dying', yourDown: true })}
        tiles={tiles}
        turn={{ active: true, movement: { left: 0, max: 30 } }}
        dying={state}
        entries={[
          ...ENTRIES.slice(0, 2),
          { id: 'd1', tone: 'narration', actor: 'DM', text: 'The lookout’s arrow takes Torvald in the shoulder and he goes down in the mud.' },
        ]}
        {...WIRING}
        onRollDeathSave={roll}
      />
    );
  },
};

/**
 * WHERE THE ROLL LANDS (§6). The near edge's right-hand bay is the same place
 * every time — quiet readouts between rolls, and the settled total, its named
 * rows and its verdict the moment one resolves. A result that appears in a
 * floating toast makes a player hunt for it; this one is already where their
 * eyes are.
 *
 * The same roll is in the journal as one collapsed line. Tap it to see the
 * working — expanded by default would turn a busy round into a wall of
 * arithmetic.
 */
export const RollLanded: Story = {
  render: function RollLandedStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }), []);
    const result: ResultVM = RESULT;
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald')}
        room={ROOM}
        present={present('pc-torvald')}
        tiles={tiles}
        turn={{ active: true, movement: { left: 15, max: 30 }, targets: TARGETS, spent: { action: true } }}
        result={result}
        entries={[
          ...ENTRIES.slice(0, 4),
          {
            id: 'r1', tone: 'roll', actor: 'Torvald · Attack', text: 'Longsword on the skirmisher',
            roll: { total: 19, rows: result.rows, verdict: result.verdict, tone: 'hit' },
          },
          { id: 'r2', tone: 'narration', actor: 'Engine', text: 'Torvald hits the skirmisher for 9 slashing. It drops.' },
        ]}
        notes={NOTES}
        {...WIRING}
      />
    );
  },
};

/**
 * HOW A NUMBER IS WORKED OUT (§5). Nothing on this screen is a number a player
 * cannot interrogate — and rather than hang a "?" beside every value, the
 * readout's own LABEL carries a dotted underline and the whole readout is the
 * button. Cheaper in space, and it scales down to the log's breakdown rows.
 *
 * These rows are the real fixture's derivation, not a plausible-looking mock.
 */
export const HowANumberWorks: Story = {
  render: function HowANumberWorksStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }), []);
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald')}
        room={ROOM}
        present={present('pc-torvald')}
        tiles={tiles}
        turn={{ active: true, movement: { left: 15, max: 30 }, targets: TARGETS }}
        entries={ENTRIES}
        defaultOverlay={{ kind: 'explain', explain: hero.ac }}
        {...WIRING}
      />
    );
  },
};

/**
 * THE FOLIO. Your character sheet, rising from the near edge because that is
 * where your sheet sits at a real table — and stopping short of the frame, so
 * the round keeps running around it.
 *
 * Torvald is a Fighter, so the Spells half of the first tab says so plainly
 * instead of showing an empty slot track. An honest "this is not yours" reads
 * as a different character class; a row of greyed pips reads as a broken
 * product.
 */
export const TheFolio: Story = {
  render: function TheFolioStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }), []);
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald')}
        room={ROOM}
        present={present('pc-torvald')}
        tiles={tiles}
        turn={{ active: true, movement: { left: 15, max: 30 }, targets: TARGETS }}
        entries={ENTRIES}
        defaultOverlay={{ kind: 'folio', tab: 'stats' }}
        {...WIRING}
      />
    );
  },
};

/**
 * THE MENU, AND THE SAFETY SIGNAL. Every item names what it does for the person
 * using it, not what it does to the system. Picking "Safety tools" raises the
 * pause: it names nobody, asks for no reason, and is quiet on purpose — the
 * point is to take pressure out of the room, and an alarm would do the opposite.
 */
export const TableMenuOpen: Story = {
  render: function TableMenuStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }), []);
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-torvald')}
        room={ROOM}
        present={present('pc-torvald')}
        tiles={tiles}
        turn={{ active: true, movement: { left: 15, max: 30 }, targets: TARGETS }}
        entries={ENTRIES}
        defaultOverlay={{ kind: 'menu' }}
        {...WIRING}
      />
    );
  },
};

/**
 * FIRST SESSION (§4.11). A brand-new player with two things they will actually
 * reach for and the rest of each row left as open sockets. It should read as
 * room to grow, not as a product with most of the lights off — which is why the
 * sockets are dashed slots rather than dimmed buttons, and why hovering one
 * says what will arrive there.
 */
export const FirstSession: Story = {
  render: function FirstSessionStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(
      () => toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1', seededOnly: true }),
      [],
    );
    return (
      <PlayerViewV2
        scene={{ ...SCENE, round: 1, elapsed: '00:06:12' }}
        hero={hero}
        cast={castOrder('pc-torvald')}
        room={ROOM}
        present={present('pc-torvald')}
        tiles={tiles}
        turn={{ active: true, movement: { left: 30, max: 30 }, targets: TARGETS }}
        entries={[
          { id: 'f1', tone: 'narration', actor: 'DM', text: 'Two goblins in the yard, and neither of them has seen you yet. Torvald, you are up first.' },
          { id: 'f2', tone: 'system', actor: 'The table', text: 'Anything you can do right now is lit up. Anything greyed will tell you why if you point at it.' },
        ]}
        {...WIRING}
      />
    );
  },
};

/**
 * OUT OF COMBAT. No round, no order — so the spine stops pretending there is
 * one and becomes the party, the initiative column disappears, the turn badge
 * says "No turn order — go ahead", and the accent stays out of the near edge
 * entirely. The same surfaces, told the truth about the moment.
 *
 * The open line is doing most of the work in this state, which is the point of
 * putting it in the action rows rather than in a corner.
 */
export const Exploring: Story = {
  render: function ExploringStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(() => toTiles(sheet, torvald, { ...yourTurn, activeCreatureId: '' }, {}), []);
    return (
      <PlayerViewV2
        scene={{ ...SCENE, subtitle: 'The barn · Dusk', round: 0 }}
        hero={hero}
        // The goblins are down, so they leave the roster and the map with
        // them. A rail that keeps listing defeated enemies is telling the
        // player the fight is still on.
        cast={castOrder('nobody').filter((c) => c.kind !== 'foe')}
        room={{ ...ROOM, tokens: ROOM.tokens.filter((t) => !t.creatureRef.startsWith('npc-')) }}
        present={present('nobody')}
        tiles={tiles}
        turn={{ active: true, exploring: true }}
        entries={[
          { id: 'e1', tone: 'narration', actor: 'DM', text: 'The goblins are down. The barn door hangs open, and somewhere above you a rope creaks against a beam.' },
          { id: 'e2', tone: 'chat', actor: 'Mira', text: 'I want to check on the farmer before we touch anything else.' },
        ]}
        notes={NOTES}
        {...WIRING}
      />
    );
  },
};

/**
 * THE CASTER VARIANT (design request §9). Mira, Cleric 3 — the half of the
 * design neither Torvald nor Wren can exercise.
 *
 * What to judge: the action row now holds six spells plus a weapon plus the
 * universals, and it still fits on one line without wrapping; the glyphs still
 * separate when most of a row is magic; the concentration badge on her panel
 * says what she is holding; and the folio's Spells tab has real content — slot
 * pips, save DC, spell attack, prepared list — instead of the honest "does not
 * cast" note Torvald gets.
 *
 * WHAT IS AND IS NOT REAL HERE. Torvald's numbers come from the engine's own
 * fixture. Mira's spell LIST is written by hand — not because the engine can't
 * compute a caster sheet (it now attaches `spellcasting` to every caster type,
 * derives her slots and prepared ceiling, and resolves spell ids into real
 * cards) but because every ingested spell is still `qa: 'draft'`, so there is no
 * verified Cleric spell to resolve. The SCREEN code is final either way: her
 * spells run through the same `greyingReason()` as every other tile, using the
 * `cast` intent that already exists in the contracts union. See `fixtures.ts`.
 */
export const MiraTheCleric: Story = {
  render: function MiraStory(): ReactElement {
    const [aimed, setAimed] = useState('npc-goblin-1');
    const hero = useMemo(() => toHero(miraSheet, mira, MIRA_IDENTITY), []);
    const tiles = useMemo(
      () => toTiles(miraSheet, mira, mirasTurn, {
        activeTurnEnforced: true,
        targetId: aimed,
        spells: MIRA_SPELLS,
        slotsRemaining: MIRA_SLOTS,
      }),
      [aimed],
    );

    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-mira', { youId: 'pc-mira' })}
        room={ROOM}
        present={present('pc-mira', { yourId: 'pc-mira' })}
        tiles={tiles}
        turn={{
          active: true,
          movement: { left: 30, max: 30 },
          targets: TARGETS.map((t) => ({ ...t, selected: t.id === aimed })),
        }}
        entries={[
          ...ENTRIES.slice(0, 4),
          { id: 'm1', tone: 'narration', actor: 'DM', text: 'Mira — Torvald is bleeding and the lookout has not seen you yet. Your call.' },
        ]}
        notes={NOTES}
        features={MIRA_FEATURES}
        inventory={MIRA_INVENTORY}
        spells={toSpells(miraSheet, MIRA_SPELLS, MIRA_SLOTS)}
        onUse={log('use')}
        onDescribe={log('describe')}
        onSend={log('say')}
        onEquip={log('equip')}
        onReact={log('react')}
        onRollDeathSave={log('death save')}
        onMenuPick={log('menu')}
        onTarget={setAimed}
      />
    );
  },
};

/** Mira's folio, open on the tab only a caster can fill. */
export const MirasSpellbook: Story = {
  render: function MirasSpellbookStory(): ReactElement {
    const hero = useMemo(() => toHero(miraSheet, mira, MIRA_IDENTITY), []);
    const tiles = useMemo(
      () => toTiles(miraSheet, mira, mirasTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1', spells: MIRA_SPELLS, slotsRemaining: MIRA_SLOTS }),
      [],
    );
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-mira', { youId: 'pc-mira' })}
        room={ROOM}
        present={present('pc-mira', { yourId: 'pc-mira' })}
        tiles={tiles}
        turn={{ active: true, movement: { left: 30, max: 30 }, targets: TARGETS }}
        entries={ENTRIES.slice(0, 3)}
        features={MIRA_FEATURES}
        inventory={MIRA_INVENTORY}
        spells={toSpells(miraSheet, MIRA_SPELLS, MIRA_SLOTS)}
        defaultOverlay={{ kind: 'folio', tab: 'abilities' }}
        onUse={log('use')}
        onSend={log('say')}
        onMenuPick={log('menu')}
      />
    );
  },
};

/**
 * GIVING THE MAP BACK. All three collapse to their strips: the spine keeps a
 * dot when your turn is close, the journal keeps a dot when something is
 * waiting, and the action panel's pill carries the same turn phrase its badge
 * would show ("Wren is up") so it stays informative collapsed. The You panel
 * stays put — your own hit points are worth keeping visible even here. Law 4
 * says screen time is a cost — this is the state where the design agrees to
 * pay less of it.
 */
export const EyesUp: Story = {
  render: function EyesUpStory(): ReactElement {
    const hero = useMemo(() => toHero(sheet, torvald, IDENTITY), []);
    const tiles = useMemo(
      () => toTiles(sheet, torvald, wrensTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' }),
      [],
    );
    return (
      <PlayerViewV2
        scene={SCENE}
        hero={hero}
        cast={castOrder('pc-wren')}
        room={ROOM}
        present={present('pc-wren')}
        tiles={tiles}
        turn={{ active: false, activeName: 'Wren', movement: { left: 0, max: 30 }, targets: TARGETS }}
        entries={ENTRIES}
        pendingCount={1}
        defaultSpineOpen={false}
        defaultJournalOpen={false}
        defaultActOpen={false}
        {...WIRING}
      />
    );
  },
};
