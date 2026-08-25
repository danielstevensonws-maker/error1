/**
 * Primitives/PromptHolderCard — one card, used six ways.
 *
 * OpportunityAttack and LegendaryAction build their `context`/`options` from
 * REAL contracts shapes: PromptContextSchema-validated data and the real
 * Goblin Warrior fixture's first attack, via promptContextToLines.ts. Both
 * every story sets timeoutSec: 600 — a Storybook-only accommodation, since
 * the production 60s default would auto-decline a static snapshot before
 * anyone could look at it. The server owns the real 60s.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PromptContextSchema, RulesEntitySchema } from '@questra/contracts';
import { PromptHolderCard } from './PromptHolderCard.js';
import type { PromptOptionVM } from './PromptHolderCard.js';
import { promptContextToLines, promptKindLabel, promptOptionsToVM } from './promptContextToLines.js';

import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';

function Ground({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 520,
        display: 'grid',
        placeItems: 'center',
        padding: 48,
        background: 'radial-gradient(120% 90% at 56% 30%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)',
      }}
    >
      {children}
    </div>
  );
}

/** Replaces the card with its reported outcome once taken/declined — makes the report visible, not buried in a console log. */
function Resolvable({
  render,
}: {
  render: (props: { onTake: (optionId?: string) => void; onDecline: () => void }) => ReactNode;
}) {
  const [outcome, setOutcome] = useState<string | null>(null);
  if (outcome !== null) {
    return (
      <Ground>
        <p style={{ fontFamily: 'var(--qa-font-mono)', color: 'var(--qa-ink-dim)' }}>{outcome}</p>
      </Ground>
    );
  }
  return (
    <Ground>
      {render({
        onTake: (optionId) => setOutcome(optionId === undefined ? 'Took: (bare)' : `Took: ${optionId}`),
        onDecline: () => setOutcome('Declined.'),
      })}
    </Ground>
  );
}

const meta: Meta = {
  title: 'Primitives/PromptHolderCard',
  component: PromptHolderCard,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

/** A player character's reaction (Player View): the Goblin Warrior's own attack as the option. */
export const OpportunityAttack: Story = {
  render: () => {
    const goblinEntity = RulesEntitySchema.parse(goblin);
    const attackName = goblinEntity.entityType === 'monster' ? goblinEntity.meta.actions[0]?.name ?? 'Attack' : 'Attack';
    const context = PromptContextSchema.parse({
      kind: 'opportunity_attack',
      moverId: 'pc-wren',
      provokerId: 'npc-goblin-1',
      pathStep: { from: { x: 2, y: 3 }, to: { x: 4, y: 3 } },
      attackOptions: [attackName],
    });
    const options: PromptOptionVM[] = context.kind === 'opportunity_attack' ? context.attackOptions.map((name) => ({ id: name, label: name })) : [];

    return (
      <Resolvable
        render={({ onTake, onDecline }) => (
          <PromptHolderCard
            kind={promptKindLabel(context)}
            holder={goblinEntity.name}
            context={promptContextToLines(context)}
            options={options}
            timeoutSec={600}
            onTake={onTake}
            onDecline={onDecline}
          />
        )}
      />
    );
  },
};

/** A boss's legendary action (DM View): three pooled-cost options. */
export const LegendaryAction: Story = {
  render: () => {
    const context = PromptContextSchema.parse({
      kind: 'legendary_action',
      poolRemaining: 3,
      options: [
        { name: 'Detect', cost: 1 },
        { name: 'Tail Attack', cost: 1 },
        { name: 'Wing Attack', cost: 2 },
      ],
    });
    const options = context.kind === 'legendary_action' ? promptOptionsToVM(context.options) : [];

    return (
      <Resolvable
        render={({ onTake, onDecline }) => (
          <PromptHolderCard
            kind={promptKindLabel(context)}
            holder="Ancient White Dragon"
            context={promptContextToLines(context)}
            options={options}
            timeoutSec={600}
            onTake={onTake}
            onDecline={onDecline}
          />
        )}
      />
    );
  },
};

/** The lair itself acting at initiative 20 (DM View), with a Skip option alongside the real choices. */
export const LairAction: Story = {
  render: () => {
    const context = PromptContextSchema.parse({
      kind: 'lair',
      options: [{ name: 'Freeze the Water' }, { name: 'Grasping Ice' }],
    });
    const options: PromptOptionVM[] =
      context.kind === 'lair' ? [...promptOptionsToVM(context.options), { id: 'skip', label: 'Skip' }] : [];

    return (
      <Resolvable
        render={({ onTake, onDecline }) => (
          <PromptHolderCard
            kind={promptKindLabel(context)}
            holder="The Frozen Cavern"
            context={promptContextToLines(context)}
            options={options}
            timeoutSec={600}
            onTake={onTake}
            onDecline={onDecline}
          />
        )}
      />
    );
  },
};

/**
 * The DM answering for Torvald (DM View, `asDm`). "ruling" has no contracts
 * shape yet (Playbook §3 names it, but it isn't in PromptContextSchema) — so
 * this story, unlike the three above, builds `context` by hand rather than
 * through promptContextToLines. That's the deliberate gap the card's own
 * doc comment describes. Skips the Resolvable harness so the asDm note stays
 * on screen.
 */
export const DmAnswersRuling: Story = {
  render: () => (
    <Ground>
      <PromptHolderCard
        kind="Ruling"
        holder="Torvald"
        asDm
        context={['Suggested roll: Dexterity (Acrobatics).', 'Suggested target: 14 or higher.']}
        timeoutSec={600}
        onTake={() => {}}
        onDecline={() => {}}
      />
    </Ground>
  ),
};
