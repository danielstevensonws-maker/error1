/**
 * The five overlays, each on its own.
 *
 * They share one rule worth judging here: an overlay never takes the whole
 * window. The panels stay visible around it, so a player who taps a number to
 * ask a question does not lose the table while they read the answer.
 */
import { useState, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComposeSheet, Folio, PauseOverlay, Scrim, TableMenu } from './Overlays.js';
import { InfoPanel, fromExplain } from '../InfoPanel.js';
import { RoundSpine } from './RoundSpine.js';
import { Stage } from './stage.js';
import { toHero } from './viewModel.js';
import { FEATURES, IDENTITY, INVENTORY, castOrder, sheet, torvald } from './fixtures.js';

const meta: Meta = { title: 'Play/Player View v2/Overlays', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const HERO = toHero(sheet, torvald, IDENTITY);
const noop = (): void => console.log('close');

/** The frame stays put behind every overlay — that is the point of them. */
function Behind(): ReactElement {
  return <RoundSpine round={3} cast={castOrder('pc-torvald')} open onToggle={noop} />;
}

/**
 * Armor Class, opened from its readout. These rows are the real fixture's
 * derivation. No `Scrim` here, unlike the sheets below — InfoPanel is a
 * self-contained dialog that brings its own, and stacking a second would
 * darken the map twice.
 */
export const HowANumberWorks: Story = {
  render: () => (
    <Stage>
      <Behind />
      <div className="qa2-over">
        <InfoPanel data={fromExplain(HERO.ac)} openMode="explain" onClose={noop} />
      </div>
    </Stage>
  ),
};

/** A condition explains itself in plain language, with a line of flavour under it. */
export const WhatAConditionDoes: Story = {
  render: () => {
    const prone = toHero(sheet, { ...torvald, conditions: [{ conditionId: 'condition.prone', appliedBySeq: 1 }] }, IDENTITY);
    return (
      <Stage>
        <Behind />
        <div className="qa2-over">
          <InfoPanel data={fromExplain(prone.conditions[0]!.explain)} openMode="explain" onClose={noop} />
        </div>
      </Stage>
    );
  },
};

/**
 * The SAME panel, entered the other way — an entity rather than a number.
 * Leads with the summary instead of the derivation, docks to the side instead
 * of centring, and can carry a Choose footer. That this is one component and
 * not two is the whole point of the consolidation.
 */
export const ReadingAnEntity: Story = {
  render: () => (
    <Stage>
      <Behind />
      <div className="qa2-over">
        <InfoPanel
          openMode="read"
          showChoose
          onChoose={(d) => console.log('chose', d.name)}
          onClose={noop}
          data={{
            name: 'Guiding Bolt',
            kind: 'Spell — Level 1 Evocation',
            summary: 'A bolt of light you roll to hit with. On a hit it is 4d6 radiant, and the next attack against that target has advantage.',
            derivation: [
              { label: 'Spell attack', value: '+5', parts: 'Proficiency +2, WIS +3' },
              { label: 'Damage', value: '4d6 radiant' },
              { label: 'Range', value: '120 ft' },
            ],
            rulesText:
              'A flash of light streaks toward a creature of your choice within range. Make a ranged spell attack against the target. On a hit, the target takes 4d6 Radiant damage, and the next attack roll made against this target before the end of your next turn has Advantage.',
            flavour: 'Worth saying out loud, so somebody actually uses the advantage.',
          }}
        />
      </div>
    </Stage>
  ),
};

/**
 * The moment before a roll. Advantage and any situational adjustment are decided
 * BEFORE the die, never argued about after it — and the target's Armor Class is
 * deliberately absent, because a player does not know it before they swing.
 */
export const SettingUpARoll: Story = {
  render: function ComposeStory(): ReactElement {
    const [stance, setStance] = useState<string>('');
    return (
      <Stage>
        <Behind />
        <Scrim onClose={noop} />
        <div className="qa2-over">
          <ComposeSheet
            label="Longsword on the skirmisher"
            bonus={5}
            onRoll={(s, sit) => setStance(`${s} ${sit}`)}
            onCancel={noop}
          />
        </div>
        {stance !== '' && <span className="qa2-sr">rolled {stance}</span>}
      </Stage>
    );
  },
};

/**
 * Your character sheet. Torvald is a Fighter, so the Spells half of the first
 * tab says so plainly instead of showing an empty slot track — an honest "not
 * yours" reads as a class, a row of greyed pips reads as a broken product.
 */
export const TheFolio: Story = {
  render: function FolioStory(): ReactElement {
    const [tab, setTab] = useState<'abilities' | 'stats' | 'inventory' | 'equipment'>('stats');
    return (
      <Stage>
        <Behind />
        <Scrim onClose={noop} />
        <div className="qa2-over">
          <Folio
            key={tab}
            hero={HERO}
            features={FEATURES}
            inventory={INVENTORY}
            initialTab={tab}
            onExplain={(e) => console.log('explain', e.id)}
            onClose={() => setTab('stats')}
          />
        </div>
      </Stage>
    );
  },
};

/** Every item names what it does for the person using it, not what it does to the system. */
export const TheMenu: Story = {
  render: () => (
    <Stage>
      <Behind />
      <Scrim onClose={noop} />
      <div className="qa2-over">
        <TableMenu onPick={(a) => console.log('menu', a)} onClose={noop} />
      </div>
    </Stage>
  ),
};

/**
 * The safety signal. Any player or the DM can raise it at any time without
 * saying why, so it names nobody and asks nothing. Quiet on purpose: the point
 * is to take pressure out of the room, and an alarm would do the opposite.
 */
export const ThePause: Story = {
  render: () => (
    <Stage>
      <Behind />
      <Scrim onClose={noop} />
      <div className="qa2-over">
        <PauseOverlay onResume={noop} />
      </div>
    </Stage>
  ),
};
