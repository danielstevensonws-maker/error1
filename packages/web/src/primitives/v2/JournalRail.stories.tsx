/**
 * The journal on its own.
 *
 * Judge: whether narration in the body serif and rolls in mono separate cleanly
 * enough to skim; whether a roll collapsed to one line still tells you what
 * happened; and whether the ruling suggestion reads as a proposal with three
 * answers rather than as something the app already did.
 */
import { useState, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { JournalRail } from './JournalRail.js';
import { Stage } from './stage.js';
import { ENTRIES, NOTES, RESULT } from './fixtures.js';

const meta: Meta = { title: 'Play/Player View v2/Journal', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const WIRING = {
  onSend: (t: string) => console.log('say', t),
  onReact: (e: string) => console.log('react', e),
};

function Live({ open: initial, ...rest }: { open: boolean } & Partial<Parameters<typeof JournalRail>[0]>): ReactElement {
  const [open, setOpen] = useState(initial);
  return (
    <Stage>
      <JournalRail entries={ENTRIES} notes={NOTES} pendingCount={1} {...rest} open={open} onToggle={() => setOpen((v) => !v)} {...WIRING} />
    </Stage>
  );
}

/** The full feed: notes pinned, narration, table talk, a roll, a ruling suggestion. */
export const Full: Story = { render: () => <Live open /> };

/** Tap the roll line to open its working — collapsed is the resting state. */
export const WithARoll: Story = {
  render: () => (
    <Live
      open
      entries={[
        ...ENTRIES.slice(0, 2),
        { id: 'r1', tone: 'roll', actor: 'Torvald · Attack', text: 'Longsword on the skirmisher', roll: { total: 19, rows: RESULT.rows, verdict: RESULT.verdict, tone: 'hit' } },
        { id: 'r2', tone: 'narration', actor: 'Engine', text: 'Torvald hits the skirmisher for 9 slashing. It drops.' },
      ]}
    />
  ),
};

/** Nothing has happened yet. An empty screen is an invitation, not a void. */
export const Quiet: Story = {
  render: function QuietStory(): ReactElement {
    const [open, setOpen] = useState(true);
    return (
      <Stage>
        {/* No `notes` prop at all rather than an undefined one — the pinned
            callout is absent, not empty. */}
        <JournalRail entries={[]} pendingCount={0} open={open} onToggle={() => setOpen((v) => !v)} {...WIRING} />
      </Stage>
    );
  },
};

/** Collapsed to its pill, with a dot because something is waiting. */
export const Collapsed: Story = { render: () => <Live open={false} /> };
