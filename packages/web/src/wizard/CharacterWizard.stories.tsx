/**
 * The character wizard — class, origin, abilities, name.
 *
 * Things to judge: whether the class list teaches by its ORDER (low-complexity
 * first, so a beginner meets Fighter before Warlock); whether the character
 * panel makes a choice feel consequential as it lands; and whether the
 * arithmetic under each number reads as teaching rather than as clutter.
 *
 * Every option shown is real engine data with a golden test behind it — the
 * class blurbs, the species speeds, the backgrounds' ability options. Nothing
 * on this screen is placeholder content.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CharacterWizard } from './CharacterWizard.js';

const meta: Meta<typeof CharacterWizard> = {
  title: 'Wizard/Character creation',
  component: CharacterWizard,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof CharacterWizard>;

/** A blank start — the panel showing its empty shape. */
export const Empty: Story = {
  args: {
    campaignName: 'The Ash Moor',
    onFinish: (c) => console.log('finished', c),
    onCancel: () => console.log('cancelled'),
  },
};

/** Without a campaign, for the standalone entry point. */
export const NoCampaign: Story = {
  args: {
    onFinish: (c) => console.log('finished', c),
    onCancel: () => console.log('cancelled'),
  },
};
