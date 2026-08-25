/**
 * Primitives/PublicSecretField — the DM-authoring public/secret split.
 *
 * No `--qa-secret` token exists yet (see the component's own doc comment and
 * packages/theme/test/tokens.test.ts), so both stories render the neutral,
 * provisional accent — restyle once Design supplies the real tint.
 *
 * Both stories render a live "Emitted" panel below the field, reading
 * straight from `VISIBILITY_FOR` — the seam to the wire made visible: this
 * isn't just an input, it's proof the split resolves to real contracts
 * `Visibility` values, not a UI-only convention.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PublicSecretField, VISIBILITY_FOR } from './PublicSecretField.js';
import type { PublicSecretValue } from './PublicSecretField.js';

function AuthoringPanel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '48px auto',
        padding: 'var(--qa-s5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--qa-s4)',
        background: 'var(--qa-glass-solid)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius-lg)',
      }}
    >
      {children}
    </div>
  );
}

/** The live wire-visibility readout — proves the split isn't just a UI convention. */
function Emitted({ value }: { value: PublicSecretValue }) {
  const rowStyle = { display: 'flex', gap: 'var(--qa-s2)' };
  const keyStyle = { color: 'var(--qa-ink-faint)' };
  const valStyle = { color: 'var(--qa-ink)' };
  return (
    <dl
      style={{
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 'var(--qa-text-whisper)',
        letterSpacing: 'var(--qa-tracking-caps)',
      }}
    >
      {(Object.keys(VISIBILITY_FOR) as Array<keyof PublicSecretValue>).map((half) => (
        <div key={half} style={rowStyle}>
          <dt style={keyStyle}>{half} →</dt>
          <dd style={{ ...valStyle, margin: 0 }}>&quot;{String(VISIBILITY_FOR[half])}&quot;</dd>
        </div>
      ))}
    </dl>
  );
}

const meta: Meta = {
  title: 'Primitives/PublicSecretField',
  component: PublicSecretField,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

/** Single-line — a cast entry with a public role and a secret motive. */
export const CastEntry: Story = {
  render: function CastEntryStory() {
    const [value, setValue] = useState<PublicSecretValue>({
      public: 'Sister Aldous, keeper of the small shrine',
      secret: "The cult's paymaster — every coin that reaches the Ashfen goblins passes through her hands first.",
    });
    return (
      <AuthoringPanel>
        <PublicSecretField
          value={value}
          onChange={setValue}
          help="The table meets the public face; the truth stays with you."
        />
        <Emitted value={value} />
      </AuthoringPanel>
    );
  },
};

/** Multiline — scene notes: public read-aloud plus secret staging. */
export const SceneNotes: Story = {
  render: function SceneNotesStory() {
    const [value, setValue] = useState<PublicSecretValue>({
      public: 'The tavern common room is loud tonight — a bard is losing an argument with the bar about her tab.',
      secret: 'Two cutpurses are working the room. Perception DC 13 to notice a hand near a belt pouch.',
    });
    return (
      <AuthoringPanel>
        <PublicSecretField value={value} onChange={setValue} multiline />
        <Emitted value={value} />
      </AuthoringPanel>
    );
  },
};
