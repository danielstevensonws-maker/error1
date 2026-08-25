/**
 * Nav — deliberately the quietest thing in the shell. The only warm mark in
 * the bar should be the visitor's own name.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Nav } from './Nav.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const meta: Meta<typeof Nav> = { title: 'Shell/Nav', component: Nav, parameters: { layout: 'fullscreen' } };
export default meta;

export const SignedIn: StoryObj<typeof Nav> = {
  args: { session: mockSession({ account: MOCK_ACCOUNT }), onHome: () => {} },
};
