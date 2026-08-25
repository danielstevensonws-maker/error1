/**
 * Lobby — the room filling up.
 *
 * The roster comes from an authenticated call and presence from a WebSocket,
 * so both are stubbed here. The socket stub matters: without it the component
 * opens a real connection to localhost:8787, fails, and the story renders a
 * permanently reconnecting screen that tells you nothing about the design.
 *
 * Things to judge: whether an empty seat reads as EXPECTED rather than broken;
 * whether the DM's copy makes clear they can begin without a straggler; and
 * whether a player waiting is told who they are waiting on rather than just
 * being made to wait.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Lobby } from './Lobby.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const MEMBERS = [
  { accountId: 'acc_wren', displayName: 'Wren', role: 'dm' as const, character: null },
  { accountId: 'acc_mira', displayName: 'Mira', role: 'player' as const, character: { id: 'ch1', name: 'Mira Vale' } },
  { accountId: 'acc_bren', displayName: 'Bren', role: 'player' as const, character: { id: 'ch2', name: 'Bren Ash' } },
  { accountId: 'acc_ash', displayName: 'Ash', role: 'player' as const, character: null },
];

/**
 * A fake sync server. Sends `welcome` then a `presence` naming whoever is
 * "connected", which is all the lobby reads.
 */
function stubSocket(connected: string[]): void {
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() {
      setTimeout(() => {
        this.onopen?.();
        this.onmessage?.({ data: JSON.stringify({ m: 'welcome', viewer: { role: 'player' }, snapshotSeq: 0, snapshot: {} }) });
        this.onmessage?.({
          data: JSON.stringify({
            m: 'presence',
            connected: connected.map((accountId) => ({ accountId, role: accountId === 'acc_wren' ? 'dm' : 'player' })),
          }),
        });
      }, 60);
    }
    send(): void { /* the lobby sends nothing */ }
    close(): void { /* no reconnect: onclose is never called */ }
  }
  (window as unknown as { WebSocket: unknown }).WebSocket = FakeSocket;
}

function sessionFor(accountId: string, displayName: string, yourRole: 'dm' | 'player') {
  return mockSession({
    account: { ...MOCK_ACCOUNT, id: accountId, displayName },
    accessToken: () => 'stub-token',
    authedRequest: (async () => ({
      campaignId: 'camp_1',
      campaignName: 'The Ash Moor',
      playSessionId: 'ps_1',
      members: MEMBERS,
      yourRole,
    })) as never,
  });
}

const meta: Meta<typeof Lobby> = { title: 'Shell/Lobby', component: Lobby, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof Lobby>;

/** The DM, waiting on one straggler. The interesting case. */
export const DmWaiting: Story = {
  render: () => {
    stubSocket(['acc_wren', 'acc_mira', 'acc_bren']);
    return <Lobby campaignId="camp_1" session={sessionFor('acc_wren', 'Wren', 'dm')} onBegin={() => {}} onLeave={() => {}} onMakeCharacter={() => {}} />;
  },
};

/** Everyone in. The copy should stop nagging and simply invite. */
export const DmEveryoneHere: Story = {
  render: () => {
    stubSocket(MEMBERS.map((m) => m.accountId));
    return <Lobby campaignId="camp_1" session={sessionFor('acc_wren', 'Wren', 'dm')} onBegin={() => {}} onLeave={() => {}} onMakeCharacter={() => {}} />;
  },
};

/** A player, who cannot start and should be told who can. */
export const PlayerWaiting: Story = {
  render: () => {
    stubSocket(['acc_wren', 'acc_mira']);
    return <Lobby campaignId="camp_1" session={sessionFor('acc_mira', 'Mira', 'player')} onBegin={() => {}} onLeave={() => {}} onMakeCharacter={() => {}} />;
  },
};
