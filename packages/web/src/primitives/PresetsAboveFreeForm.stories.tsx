/**
 * Primitives/PresetsAboveFreeForm — presets teach, they never cage.
 *
 * Both stories are live-state harnesses so the pick-then-edit behaviour
 * (which naturally deselects the chip — no extra state needed) is directly
 * exercisable, not just described.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PresetsAboveFreeForm } from './PresetsAboveFreeForm.js';

function Panel({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 420, margin: '48px auto', fontFamily: 'var(--qa-font-body)' }}>{children}</div>;
}

const meta: Meta = {
  title: 'Primitives/PresetsAboveFreeForm',
  component: PresetsAboveFreeForm,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

/** pick — a campaign premise. Starts empty; tap a spark or write your own. */
export const Premise: Story = {
  render: function PremiseStory() {
    const [value, setValue] = useState('');
    return (
      <Panel>
        <PresetsAboveFreeForm
          label="Campaign premise"
          help="Pick a spark to start from, or write your own — you can always edit either way."
          presets={[
            { label: 'A heist gone wrong' },
            { label: 'A haunted frontier town' },
            { label: 'War on two fronts' },
            { label: 'Fae court intrigue' },
          ]}
          value={value}
          onChange={setValue}
        />
      </Panel>
    );
  },
};

/** tags — portrait appearance traits, starting with one preset already selected. */
export const AppearanceTraits: Story = {
  render: function AppearanceTraitsStory() {
    const [values, setValues] = useState<string[]>(['Weathered']);
    return (
      <Panel>
        <PresetsAboveFreeForm
          mode="tags"
          label="Appearance traits"
          presets={[{ label: 'Scarred' }, { label: 'Weathered' }, { label: 'Regal' }, { label: 'Youthful' }]}
          value={values}
          onChange={setValues}
        />
        <p style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink-faint)', marginTop: 'var(--qa-s3)' }}>
          {JSON.stringify(values)}
        </p>
      </Panel>
    );
  },
};
