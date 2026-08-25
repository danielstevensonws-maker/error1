/**
 * Create a campaign. The second step is the important one: brief-14 §2 makes
 * creating a campaign inseparable from getting a link to hand out, so judge
 * whether the join link reads as the thing you SEND rather than as a field you
 * copy.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateCampaign } from './CreateCampaign.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const meta: Meta<typeof CreateCampaign> = { title: 'Shell/Create campaign', component: CreateCampaign, parameters: { layout: 'fullscreen' } };
export default meta;

export const Naming: StoryObj<typeof CreateCampaign> = {
  args: {
    session: mockSession({
      account: MOCK_ACCOUNT,
      authedRequest: (async () => {
        await new Promise((r) => setTimeout(r, 500));
        return { campaign: { id: 'c1', name: 'The Ash Moor' }, joinCode: 'MOOR-4417', playSessionId: 's1' };
      }) as never,
    }),
    onCreated: () => {},
    onCancel: () => {},
  },
};
