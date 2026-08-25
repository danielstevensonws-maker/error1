/**
 * Primitives/CardSequencer — one primitive, two screens.
 *
 * The pairing IS the point: ScenesInASession and SessionsInACampaign differ
 * only in the data and `itemNoun`, which is the evidence that one component
 * covers both "scenes within a session" and "sessions within a campaign".
 * Both hold their list in harness state so reorder/remove are genuinely
 * exercised, not static.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { CardSequencer } from './CardSequencer.js';
import type { SequenceItem } from './CardSequencer.js';

/** A tiny local card — demonstrates the body is entirely the caller's, never the sequencer's. */
function SceneCard({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--qa-font-body)', fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--qa-font-body)', fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink-faint)', marginTop: 2 }}>
        {note}
      </div>
    </div>
  );
}

interface Scene {
  id: string;
  title: string;
  note: string;
}

const SCENES: Scene[] = [
  { id: 'scene-market', title: 'The market square', note: 'Read-aloud: the stalls, the noise, a pickpocket working the crowd.' },
  { id: 'scene-ambush', title: 'Ambush on the north road', note: 'Three goblins, Torvald yard tactics — see brief-01 fixtures.' },
  { id: 'scene-almshouse', title: 'The almshouse', note: 'Sister Aldous, secret motive staged for a later reveal.' },
  { id: 'scene-vault', title: 'The sealed vault', note: 'Trap: DC 14 to disarm. Reward: the Emberweave Cloak.' },
];

interface Session {
  id: string;
  title: string;
  note: string;
}

const SESSIONS: Session[] = [
  { id: 'session-1', title: 'Session 1 — Arrival', note: 'The party reaches the Ashfen and meets Sister Aldous.' },
  { id: 'session-2', title: 'Session 2 — The goblin yard', note: 'Torvald encounter; first combat.' },
  { id: 'session-3', title: 'Session 3 — The vault', note: 'The almshouse secret comes due.' },
];

const meta: Meta = {
  title: 'Primitives/CardSequencer',
  component: CardSequencer,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

function Panel({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 480, margin: '48px auto' }}>{children}</div>;
}

/** Session Planner: four scenes, reorder AND remove both live. */
export const ScenesInASession: Story = {
  render: function ScenesInASessionStory() {
    const [scenes, setScenes] = useState(SCENES);

    const items: SequenceItem[] = scenes.map((scene) => ({
      id: scene.id,
      render: <SceneCard title={scene.title} note={scene.note} />,
    }));

    function onReorder(nextOrderedIds: string[]) {
      const byId = new Map(scenes.map((scene) => [scene.id, scene]));
      setScenes(nextOrderedIds.map((id) => byId.get(id)!));
    }

    function onRemove(id: string) {
      setScenes((prev) => prev.filter((scene) => scene.id !== id));
    }

    return (
      <Panel>
        <CardSequencer items={items} onReorder={onReorder} onRemove={onRemove} itemNoun="scenes" />
      </Panel>
    );
  },
};

/** Campaign Wrapper: three sessions. Same primitive, different noun, NO onRemove — no ✕ column. */
export const SessionsInACampaign: Story = {
  render: function SessionsInACampaignStory() {
    const [sessions, setSessions] = useState(SESSIONS);

    const items: SequenceItem[] = sessions.map((session) => ({
      id: session.id,
      render: <SceneCard title={session.title} note={session.note} />,
    }));

    function onReorder(nextOrderedIds: string[]) {
      const byId = new Map(sessions.map((session) => [session.id, session]));
      setSessions(nextOrderedIds.map((id) => byId.get(id)!));
    }

    return (
      <Panel>
        <CardSequencer items={items} onReorder={onReorder} itemNoun="sessions" />
      </Panel>
    );
  },
};
