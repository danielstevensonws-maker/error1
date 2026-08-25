/**
 * Primitives/PullFromCampaignPicker — the reference picker.
 *
 * PullIntoScene and SinglePick build their items from REAL contracts
 * fixtures (Goblin Warrior, the Fighter class, Fireball) parsed through
 * RulesEntitySchema via a local toPickable() adapter — proving the picker
 * references existing contracts content with no bespoke shape.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { RulesEntitySchema } from '@questra/contracts';
import type { RulesEntity } from '@questra/contracts';
import { PullFromCampaignPicker } from './PullFromCampaignPicker.js';
import type { PickableItem } from './PullFromCampaignPicker.js';

import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';
import fighter from '@questra/contracts/src/fixtures/fighter.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';

/** The caller-side adapter — the picker itself has no idea what a "monster" or "class" is. */
function toPickable(entity: RulesEntity): PickableItem {
  const kind = entity.entityType === 'monster' ? 'Cast' : entity.entityType === 'class' ? 'Class' : 'Reference';
  return { id: entity.id, name: entity.name, kind, hint: entity.plain };
}

const ITEMS: PickableItem[] = [
  toPickable(RulesEntitySchema.parse(goblin)),
  toPickable(RulesEntitySchema.parse((fighter as { class: unknown }).class)),
  toPickable(RulesEntitySchema.parse(fireball)),
];

const meta: Meta = {
  title: 'Primitives/PullFromCampaignPicker',
  component: PullFromCampaignPicker,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

function Panel({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 420, margin: '48px auto', fontFamily: 'var(--qa-font-body)' }}>{children}</div>;
}

/** Multi — three items pulled into a scene's cast, the first pre-selected. */
export const PullIntoScene: Story = {
  render: function PullIntoSceneStory() {
    const [selectedIds, setSelectedIds] = useState<string[]>([ITEMS[0]!.id]);
    return (
      <Panel>
        <PullFromCampaignPicker items={ITEMS} selectedIds={selectedIds} onChange={setSelectedIds} mode="multi" />
      </Panel>
    );
  },
};

/** Single — "the one recurring map this scene uses". Picking a second clears the first; re-picking the same one clears it. */
export const SinglePick: Story = {
  render: function SinglePickStory() {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    return (
      <Panel>
        <PullFromCampaignPicker items={ITEMS} selectedIds={selectedIds} onChange={setSelectedIds} mode="single" />
      </Panel>
    );
  },
};

/** A fresh campaign — no rewards defined yet. Distinct from "no search matches". */
export const Empty: Story = {
  render: () => (
    <Panel>
      <PullFromCampaignPicker
        items={[]}
        selectedIds={[]}
        onChange={() => {}}
        emptyLabel="No rewards defined in this campaign yet."
      />
    </Panel>
  ),
};
