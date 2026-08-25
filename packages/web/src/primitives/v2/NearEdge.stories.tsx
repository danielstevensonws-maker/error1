/**
 * The near edge on its own — the two bottom panels, isolated.
 *
 * `NearEdge` renders both: your character in the bottom-left corner and the
 * action bar centred. They are siblings, not a row, so this story shows exactly
 * the geometry the composed screen has.
 *
 * Things to judge here: whether the icon row is readable without its names (the
 * detail strip is the answer — sweep across it), whether a greyed row explains
 * itself, whether the open line reads as the next option rather than as an
 * apology, and whether the new collapse chevron on the action panel actually
 * works — every story wires it live, the same as the spine and journal.
 */
import { useState, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NearEdge } from './NearEdge.js';
import { InfoPanel, fromExplain } from '../InfoPanel.js';
import { Stage } from './stage.js';
import { toHero, toTiles, type DyingVM, type ExplainVM } from './viewModel.js';
import { IDENTITY, RESULT, TARGETS, sheet, torvald, wrensTurn, yourTurn } from './fixtures.js';

const meta: Meta = { title: 'Play/Player View v2/Near Edge', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const HERO = toHero(sheet, torvald, IDENTITY);

const WIRING = {
  onUse: (id: string) => console.log('use', id),
  onEquip: (e: string) => console.log('equip', e),
  onDescribe: (t: string) => console.log('describe', t),
  onOpenFolio: (tab?: string) => console.log('folio', tab),
};

/** The collapse toggle, live in every story below — a small hook so six stories don't each hand-roll it. */
function useActOpen(): { actOpen: boolean; onToggleAct: () => void } {
  const [actOpen, setActOpen] = useState(true);
  return { actOpen, onToggleAct: () => setActOpen((v) => !v) };
}

/** Your turn, everything live. Sweep the icon row and watch the strip below it. */
export const YourTurn: Story = {
  render: function YourTurnStory(): ReactElement {
    const [aimed, setAimed] = useState('npc-goblin-1');
    const [explain, setExplain] = useState<ExplainVM | null>(null);
    const act = useActOpen();
    return (
      <Stage>
        <NearEdge
          hero={HERO}
          tiles={toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: aimed })}
          turn={{
            active: true,
            movement: { left: 15, max: 30 },
            targets: TARGETS.map((t) => ({ ...t, selected: t.id === aimed })),
          }}
          onTarget={setAimed}
          onExplain={setExplain}
          {...act}
          {...WIRING}
        />
        <div className="qa2-over">{explain !== null && <InfoPanel data={fromExplain(explain)} openMode="explain" onClose={() => setExplain(null)} />}</div>
      </Stage>
    );
  },
};

/** Someone else's turn — every tile at 50% with the server's own reason below. */
export const Waiting: Story = {
  render: function WaitingStory(): ReactElement {
    const act = useActOpen();
    return (
      <Stage acting="pc-wren">
        <NearEdge
          hero={HERO}
          tiles={toTiles(sheet, torvald, wrensTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' })}
          turn={{ active: false, activeName: 'Wren', movement: { left: 0, max: 30 }, targets: TARGETS }}
          {...act}
          {...WIRING}
        />
      </Stage>
    );
  },
};

/** Bloodied, with a condition on you and temporary hit points on the bar. */
export const Bloodied: Story = {
  render: function BloodiedStory(): ReactElement {
    const hurt = { ...torvald, hp: 5, tempHp: 3, conditions: [{ conditionId: 'condition.prone', appliedBySeq: 1 }] };
    const act = useActOpen();
    return (
      <Stage>
        <NearEdge
          hero={toHero(sheet, hurt, IDENTITY)}
          tiles={toTiles(sheet, hurt, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' })}
          turn={{ active: true, movement: { left: 10, max: 30 }, targets: TARGETS, spent: { bonus: true } }}
          {...act}
          {...WIRING}
        />
      </Stage>
    );
  },
};

/** A settled roll, in the card that rises above the bar you rolled from. */
export const RollLanded: Story = {
  render: function RollLandedStory(): ReactElement {
    const act = useActOpen();
    return (
      <Stage>
        <NearEdge
          hero={HERO}
          tiles={toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' })}
          turn={{ active: true, movement: { left: 15, max: 30 }, targets: TARGETS, spent: { action: true } }}
          result={RESULT}
          {...act}
          {...WIRING}
        />
      </Stage>
    );
  },
};

/** THE FLIP. Click the button to walk the ladder — it reaches Stable or Dead. */
export const Dying: Story = {
  render: function DyingStory(): ReactElement {
    const [state, setState] = useState<DyingVM>({ successes: 1, failures: 2, phase: 'dying' });
    const downed = { ...torvald, hp: 0, conditions: [{ conditionId: 'condition.unconscious', appliedBySeq: 1 }] };
    const act = useActOpen();
    return (
      <Stage>
        <NearEdge
          hero={toHero(sheet, downed, IDENTITY)}
          tiles={toTiles(sheet, downed, yourTurn, { activeTurnEnforced: true })}
          turn={{ active: true, movement: { left: 0, max: 30 } }}
          dying={state}
          onRollDeathSave={() =>
            setState((s) => {
              const next = Math.random() >= 0.45 ? { ...s, successes: s.successes + 1 } : { ...s, failures: s.failures + 1 };
              if (next.successes >= 3) return { ...next, phase: 'stable' };
              if (next.failures >= 3) return { ...next, phase: 'dead' };
              return next;
            })
          }
          {...act}
          {...WIRING}
        />
      </Stage>
    );
  },
};

/** A first session: two things that are actually yours, the rest open sockets. */
export const FirstSession: Story = {
  render: function FirstSessionStory(): ReactElement {
    const act = useActOpen();
    return (
      <Stage>
        <NearEdge
          hero={HERO}
          tiles={toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1', seededOnly: true })}
          turn={{ active: true, movement: { left: 30, max: 30 }, targets: TARGETS }}
          {...act}
          {...WIRING}
        />
      </Stage>
    );
  },
};

/** The action panel collapsed to its pill — the map gets the width back. */
export const ActionsCollapsed: Story = {
  render: function ActionsCollapsedStory(): ReactElement {
    const [actOpen, setActOpen] = useState(false);
    return (
      <Stage>
        <NearEdge
          hero={HERO}
          tiles={toTiles(sheet, torvald, yourTurn, { activeTurnEnforced: true, targetId: 'npc-goblin-1' })}
          turn={{ active: true, movement: { left: 15, max: 30 }, targets: TARGETS }}
          actOpen={actOpen}
          onToggleAct={() => setActOpen((v) => !v)}
          {...WIRING}
        />
      </Stage>
    );
  },
};
