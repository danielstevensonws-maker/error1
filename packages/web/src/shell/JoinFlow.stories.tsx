/**
 * Join — a player arriving from a friend's link, and the shell's second and
 * last conversation.
 *
 * WHY THESE STORIES STUB FETCH. The join preview is an UNAUTHENTICATED call
 * (apiRequest, not SessionApi.authedRequest), so mockSession cannot reach it,
 * and the previous version of this file simply accepted that — it said to judge
 * the populated card "from Landing's auth-sheet story, which is the same card
 * material" and left Join's actual main state unviewable in Storybook. That is
 * precisely how the previous shell ended up shipping a screen whose stated
 * design nobody had ever seen rendered. A one-line fetch stub costs nothing and
 * makes the real path reviewable.
 *
 * Things to judge: whether the campaign name reads as something you were HANDED
 * rather than as a page title; whether the scene earns its four seconds when the
 * visitor did not choose to be here; and whether a dead link reads as direction
 * rather than as an apology.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { JoinFlow } from './JoinFlow.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

/**
 * Answers the preview call and nothing else. Deliberately narrow: anything it
 * does not recognise falls through to the real fetch, so a story that starts
 * depending on some other endpoint fails loudly rather than silently passing.
 */
function stubPreview(campaignName: string, delayMs = 260): void {
  const real = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/join/') && (init?.method ?? 'GET') === 'GET') {
      await new Promise((r) => setTimeout(r, delayMs));
      return new Response(JSON.stringify({ campaignName }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return real(input as RequestInfo, init);
  }) as typeof window.fetch;
}

const meta: Meta<typeof JoinFlow> = { title: 'Shell/Join', component: JoinFlow, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof JoinFlow>;

/** The real first impression: a stranger, following a friend's link. */
export const Invited: Story = {
  render: () => {
    stubPreview('The Ash Moor');
    return <JoinFlow code="a7k92xqp" session={mockSession()} onJoined={(id) => console.log('joined', id)} />;
  },
};

/** Already has an account: the scene still plays, but there is no form at the
 *  end of it — only the one action. */
export const AlreadySignedIn: Story = {
  render: () => {
    stubPreview('The Ash Moor');
    return <JoinFlow code="a7k92xqp" session={mockSession({ account: MOCK_ACCOUNT })} onJoined={(id) => console.log('joined', id)} />;
  },
};

/** A revoked or mistyped link. No scene plays — telling a story over a dead
 *  link is a worse first impression than saying so immediately. */
export const DeadLink: Story = {
  args: { code: 'nope', session: mockSession(), onJoined: (id: string) => console.log('joined', id) },
};
