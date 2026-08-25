/**
 * The round spine on its own — v2's signature, isolated.
 *
 * Judge two things here that the composed screen makes harder to see: whether
 * the accent actually reads as a line filling behind the turns that have gone,
 * and whether the cue at the bottom answers "when am I up" at a glance without
 * being read word by word.
 */
import { useState, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundSpine } from './RoundSpine.js';
import { Stage } from './stage.js';
import { castOrder } from './fixtures.js';

const meta: Meta = { title: 'Play/Player View v2/Round Spine', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

function Live({ acting, targetId }: { acting: string; targetId?: string }): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <Stage acting={acting}>
      <RoundSpine
        round={3}
        cast={castOrder(acting)}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        onSelect={(id) => console.log('select', id)}
        {...(targetId !== undefined ? { targetId } : {})}
      />
    </Stage>
  );
}

/** Your turn — the accent has reached your notch and the cue says so. */
export const YourTurn: Story = { render: () => <Live acting="pc-torvald" targetId="npc-goblin-1" /> };

/** Wren is up and you are next. The line has filled one segment. */
export const YoureNext: Story = { render: () => <Live acting="pc-wren" targetId="npc-goblin-1" /> };

/** Mid-round: three turns have gone, and yours is a way off. */
export const MidRound: Story = { render: () => <Live acting="pc-mira" /> };

/** Out of combat there is no order, so it becomes the party and the numbers go. */
export const OutOfCombat: Story = {
  render: function OutOfCombatStory(): ReactElement {
    const [open, setOpen] = useState(true);
    return (
      <Stage acting="nobody">
        <RoundSpine round={0} cast={castOrder('nobody').filter((c) => c.kind !== 'foe')} open={open} onToggle={() => setOpen((v) => !v)} />
      </Stage>
    );
  },
};

/** Collapsed to its pill. Click it to bring the spine back. */
export const Collapsed: Story = {
  render: function CollapsedStory(): ReactElement {
    const [open, setOpen] = useState(false);
    return (
      <Stage acting="pc-wren">
        <RoundSpine round={3} cast={castOrder('pc-wren')} open={open} onToggle={() => setOpen((v) => !v)} />
      </Stage>
    );
  },
};
