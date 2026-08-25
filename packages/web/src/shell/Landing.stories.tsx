/**
 * Landing, judged whole — the signature moment of the shell: the same
 * `.qa2-map` ground the real Player View renders on, at rest, with the
 * wordmark and a single lit CTA staged at the threshold rather than centred.
 *
 * Things to judge here: whether the asymmetric composition reads as "a door,
 * cracked open" rather than as an off-centre accident; whether the wordmark
 * earns its size without a hardcoded font value (it's --qa-text-display
 * scaled by the SCREEN, per heroTitle's own doc — check the DOM, not just the
 * eye); whether Enter's glow is the only accent-saturated thing on the page;
 * and whether the auth sheet (click Enter) feels like the door opening
 * further rather than a navigation away from the threshold.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Landing } from './Landing.js';
import { mockSession } from './mockSession.js';

const meta: Meta<typeof Landing> = {
  title: 'Shell/Landing',
  component: Landing,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof Landing>;

export const Threshold: Story = {
  args: {
    session: mockSession(),
    onEntered: () => console.log('entered'),
  },
};

export const SigningIn: Story = {
  render: () => {
    const session = mockSession({
      login: async () => { await new Promise((r) => setTimeout(r, 400)); },
    });
    return <Landing session={session} onEntered={() => console.log('entered')} />;
  },
};

export const WrongPassword: Story = {
  render: () => {
    const session = mockSession({
      login: async () => { throw new Error('Email or password is incorrect.'); },
    });
    return <Landing session={session} onEntered={() => console.log('entered')} />;
  },
};
