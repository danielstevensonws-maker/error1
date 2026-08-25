/**
 * Home — the world, none of the ritual.
 *
 * Judge the register, not the drama: this is the screen a returning DM opens
 * most often, so the question is whether it still belongs to the same world as
 * Landing while getting out of the way immediately. Nothing here types, waits,
 * or performs.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Home } from './Home.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const meta: Meta<typeof Home> = { title: 'Shell/Home', component: Home, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof Home>;

const withCampaigns = (dming: string[], playing: string[]) =>
  mockSession({
    account: MOCK_ACCOUNT,
    authedRequest: (async () => ({
      dming: dming.map((n, i) => ({ campaignId: 'd' + String(i), campaignName: n })),
      playing: playing.map((n, i) => ({ campaignId: 'p' + String(i), campaignName: n })),
    })) as never,
  });

export const Both: Story = {
  args: {
    session: withCampaigns(['The Ash Moor'], ['Vane Bay', 'The Long Shoal']),
    onOpenCampaign: () => {},
    onCreateCampaign: () => {},
  },
};

/** A brand-new account. An empty screen is an invitation to act, not a mood. */
export const Empty: Story = {
  args: { session: withCampaigns([], []), onOpenCampaign: () => {}, onCreateCampaign: () => {} },
};

export const Failed: Story = {
  args: {
    session: mockSession({
      account: MOCK_ACCOUNT,
      authedRequest: (async () => { throw new Error('Could not reach the server. Check your connection and try again.'); }) as never,
    }),
    onOpenCampaign: () => {},
    onCreateCampaign: () => {},
  },
};
