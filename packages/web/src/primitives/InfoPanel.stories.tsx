/**
 * Primitives/InfoPanel — rebuilt to the Claude Design handoff.
 *
 * The panel is an absolutely-positioned slide-over. Stories render it inside a
 * relative "battle-map" ground (per Design's handoff) so the scrim + panel sit
 * correctly, exactly as they do over the Questra HUD.
 *
 * Three of the entity stories parse REAL contracts fixtures through
 * RulesEntitySchema before rendering — proving the panel renders official data
 * with no per-type code and no backend. The derivation (info-layer 2) is
 * supplied by the caller, as it would be at runtime from a character's sheet.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { RulesEntitySchema } from '@questra/contracts';
import { InfoPanel, ExplainButton } from './InfoPanel.js';
import { entityToInfoPanel, type InfoPanelData } from './entityToInfoPanel.js';

import prone from '@questra/contracts/src/fixtures/prone.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';

/** The candlelit map ground the glass floats over. */
function Ground({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        height: 760,
        overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 62% 34%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)',
      }}
    >
      {children}
    </div>
  );
}

/** Opens closed, with a trigger to re-open — so the panel can be judged repeatedly. */
function Harness({
  data,
  openMode = 'read',
  showChoose = false,
  chooseLabel,
}: {
  data: InfoPanelData;
  openMode?: 'read' | 'explain';
  showChoose?: boolean;
  chooseLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Ground>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          top: 'var(--qa-hud-inset)',
          left: 'var(--qa-hud-inset)',
          zIndex: 1,
          padding: 'var(--qa-s2) var(--qa-s4)',
          background: 'var(--qa-glass-solid)',
          color: 'var(--qa-ink)',
          border: 'var(--qa-hairline) solid var(--qa-glass-border)',
          borderRadius: 'var(--qa-radius)',
          fontFamily: 'var(--qa-font-body)',
          cursor: 'pointer',
        }}
      >
        Open {data.name}
      </button>
      <InfoPanel
        data={data}
        open={open}
        onClose={() => setOpen(false)}
        openMode={openMode}
        showChoose={showChoose}
        {...(chooseLabel !== undefined ? { chooseLabel } : {})}
        onChoose={() => setOpen(false)}
      />
    </Ground>
  );
}

const meta: Meta = {
  title: 'Primitives/InfoPanel',
  component: InfoPanel,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

// --- fixtures parsed through the real schema ------------------------------

const proneData = entityToInfoPanel(RulesEntitySchema.parse(prone));
const fireballData = entityToInfoPanel(RulesEntitySchema.parse(fireball));
const goblinData = entityToInfoPanel(RulesEntitySchema.parse(goblin));

/** A condition — Layers 1 + 3 only, no Choose (the sparsest case). */
export const Condition: Story = {
  render: () => <Harness data={proneData} />,
};

/**
 * A spell with a Choose footer. The derivation is supplied by the caller (as a
 * runtime sheet value would be); the fixture itself carries none.
 */
export const SpellWithChoose: Story = {
  render: () => (
    <Harness
      data={{
        ...fireballData,
        derivation: [
          { label: 'Damage', value: '8d6 fire', parts: '3d6 base + 1d6 / slot level above 3rd' },
          { label: 'Save DC', value: '15', parts: '8 + 4 INT mod + 3 prof' },
          { label: 'Radius', value: '20 ft', parts: 'sphere · spreads round corners' },
          { label: 'Range', value: '150 ft' },
        ],
      }}
      showChoose
      chooseLabel="Prepare Fireball"
    />
  ),
};

/**
 * Homebrew renders in the IDENTICAL panel plus one quiet tinted badge — a tint,
 * never a warning. Hand-authored (there is no homebrew fixture).
 */
export const Homebrew: Story = {
  render: () => (
    <Harness
      data={{
        name: 'Emberweave Cloak',
        kind: 'Wondrous Item — Rare',
        homebrew: true,
        summary: 'A cloak banked with living coals; it wards the cold and, once a day, answers fire with fire.',
        derivation: [
          { label: 'Resistance', value: 'cold' },
          { label: 'Flare', value: '2d8 fire', parts: '1/day reaction when you take fire damage' },
          { label: 'Attunement', value: 'required' },
        ],
        rulesText:
          'While wearing this cloak you have resistance to cold damage.\n\nWhen you take fire damage, you can use your reaction to wreathe yourself in flame. Each creature within 5 feet of you takes 2d8 fire damage. Once used, this property can\'t be used again until the next dawn.',
      }}
      showChoose
      chooseLabel="Attune"
    />
  ),
};

/** Dense — a full monster stat block from the real goblin fixture; the panel must survive it. */
export const DenseStatBlock: Story = {
  render: () => (
    <Harness
      data={{
        ...goblinData,
        derivation: [
          { label: 'Armor Class', value: '15', parts: 'leather armor + shield' },
          { label: 'Hit Points', value: '10', parts: '3d6' },
          { label: 'Speed', value: '30 ft' },
          { label: 'Scimitar', value: '+4 to hit', parts: '1d6 + 2 slashing · reach 5 ft' },
          { label: 'Nimble Escape', value: 'bonus', parts: 'Disengage or Hide as a bonus action' },
        ],
      }}
    />
  ),
};

// --- the two entry paths --------------------------------------------------

/**
 * PATH 1 — "Explain this number." Entered from the ? on a number/chip. Leads
 * with the L2 derivation (expanded by default); Choose is always absent.
 * Uses a synthetic AC view-model — this is a computed sheet value, not an entity.
 */
export const Path1_ExplainNumber: Story = {
  render: () => (
    <Harness
      data={{
        name: 'Armor Class',
        kind: 'Defense',
        summary: 'How hard you are to hit — an attack roll must meet or beat it to land.',
        derivation: [
          { label: 'Chain mail', value: '16', parts: 'base AC · no DEX added' },
          { label: 'Shield', value: '+2' },
          { label: 'Armor Class', value: '18' },
        ],
        rulesText: 'Heavy armor like chain mail sets a fixed base and ignores your Dexterity. A shield adds 2 while it\'s on your arm.',
      }}
      openMode="explain"
    />
  ),
};

/**
 * PATH 2 — "Read, then pick." Entered by tapping the entity's own card. Leads
 * with the L1 summary (L2/L3 collapsed); Choose present in pick contexts.
 */
export const Path2_ReadThenPick: Story = {
  render: () => (
    <Harness data={fireballData} openMode="read" showChoose chooseLabel="Prepare Fireball" />
  ),
};

/**
 * The ? affordance as it actually works (Path 1, end to end). The `?` sits on a
 * number; clicking it opens the panel in "explain" mode, leading with the
 * derivation for that number. Hover / focus / press the `?` to see its states,
 * then click to open. This is the real Player-View interaction: tap the ? on a
 * number, get "where this number comes from".
 */
const AC_DATA: InfoPanelData = {
  name: 'Armor Class',
  kind: 'Defense',
  summary: 'How hard you are to hit — an attack roll must meet or beat it to land.',
  derivation: [
    { label: 'Chain mail', value: '16', parts: 'base AC · no DEX added' },
    { label: 'Shield', value: '+2' },
    { label: 'Armor Class', value: '18' },
  ],
  rulesText: "Heavy armor like chain mail sets a fixed base and ignores your Dexterity. A shield adds 2 while it's on your arm.",
};

export const ExplainAffordance: Story = {
  render: function ExplainAffordanceStory() {
    const [open, setOpen] = useState(false);
    return (
      <Ground>
        {/* A number on the HUD, with its ? — tap it to explain the value. */}
        <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 28, color: 'var(--qa-ink)', lineHeight: 1 }}>18</span>
          <ExplainButton label="Explain Armor Class" onClick={() => setOpen(true)} />
        </div>
        <InfoPanel data={AC_DATA} open={open} onClose={() => setOpen(false)} openMode="explain" />
      </Ground>
    );
  },
};
