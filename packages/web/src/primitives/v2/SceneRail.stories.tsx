/**
 * The scene nameplate and the control cluster.
 *
 * Two floating things, not a bar: the nameplate centred over the map and the
 * controls in the corner. Judge whether the scene's name carries as the one
 * piece of fiction in the chrome, and whether the meta line under it stays
 * quiet enough to ignore while somebody is talking.
 */
import { useState, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SceneRail } from './SceneRail.js';
import { Stage } from './stage.js';

const meta: Meta = { title: 'Play/Player View v2/Scene Nameplate', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

function Live({ round, turn, subtitle }: { round: number; turn: { name: string; isYou: boolean; exploring?: boolean }; subtitle: string }): ReactElement {
  const [journalOpen, setJournalOpen] = useState(true);
  const [muted, setMuted] = useState(false);
  return (
    <Stage bare>
      <SceneRail
        title="The Ruined Steading"
        subtitle={subtitle}
        round={round}
        elapsed="01:42:33"
        turn={turn}
        journalOpen={journalOpen}
        muted={muted}
        onToggleJournal={() => setJournalOpen((v) => !v)}
        onToggleMute={() => setMuted((v) => !v)}
        onOpenMenu={() => console.log('menu')}
        onOpenSettings={() => console.log('settings')}
      />
    </Stage>
  );
}

/** Your turn — the only word in the meta line that takes the accent. */
export const YourTurn: Story = { render: () => <Live round={3} subtitle="Outskirts · Dusk" turn={{ name: 'Torvald', isYou: true }} /> };

/** Somebody else's — the same line, quiet. */
export const SomeoneElse: Story = { render: () => <Live round={3} subtitle="Outskirts · Dusk" turn={{ name: 'Wren', isYou: false }} /> };

/** Out of combat the round leaves rather than showing a zero. */
export const Exploring: Story = { render: () => <Live round={0} subtitle="The barn · Dusk" turn={{ name: 'Torvald', isYou: true, exploring: true }} /> };
