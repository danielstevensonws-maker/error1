/**
 * shell/mockSession — a SessionApi that never touches the network, for stories
 * and component tests. Same role as v2/fixtures.ts: a stand-in for the real
 * wiring (session.tsx's SessionProvider), not a second implementation of it.
 */
import type { SelfAccount } from '@questra/contracts';
import type { SessionApi } from './session.js';

export const MOCK_ACCOUNT: SelfAccount = {
  id: 'acc_mira', email: 'mira@example.com', emailVerified: true, displayName: 'Mira',
  onboarding: 'floor4', settings: {}, ageBracket: 'adult',
  createdAt: '2026-07-01T00:00:00.000Z', deletedAt: null,
};

export function mockSession(overrides: Partial<SessionApi> = {}): SessionApi {
  return {
    account: null,
    loading: false,
    signup: async () => {},
    login: async () => {},
    logout: async () => {},
    authedRequest: async () => { throw new Error('mockSession: authedRequest not stubbed for this story'); },
    /* Stories never open a real socket; a lobby story stubs presence directly. */
    accessToken: () => null,
    ...overrides,
  };
}
