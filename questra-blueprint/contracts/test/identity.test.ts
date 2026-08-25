import { describe, it, expect } from 'vitest';
import {
  AccountSchema,
  SelfAccountSchema,
  MembershipSchema,
  SessionClaimsSchema,
  ViewerRoleSchema,
  AccountIdSchema,
  eventVisibleTo,
  type Account,
  type Membership,
  type SessionClaims,
  type Viewer,
  type PlayEvent,
} from '../src/index.js';

// ---------------------------------------------------------------- shapes parse
describe('identity shapes (Brief 14 §1)', () => {
  const account: Account = {
    id: 'acc_alice',
    email: 'alice@example.com',
    emailVerified: true,
    displayName: 'Alice',
    onboarding: 'floor0',
    settings: {},
    ageBracket: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    deletedAt: null,
  };

  it('a full account parses', () => {
    expect(AccountSchema.parse(account)).toEqual(account);
  });

  it('defaults fill onboarding/settings/ageBracket/deletedAt', () => {
    const parsed = AccountSchema.parse({
      id: 'acc_bob',
      email: 'bob@example.com',
      emailVerified: false,
      displayName: 'Bob',
      createdAt: '2026-07-20T00:00:00.000Z',
    });
    expect(parsed.onboarding).toBe('floor0');
    expect(parsed.settings).toEqual({});
    expect(parsed.ageBracket).toBeNull();
    expect(parsed.deletedAt).toBeNull();
  });

  it('rejects a bad email and an empty id', () => {
    expect(AccountSchema.safeParse({ ...account, email: 'not-an-email' }).success).toBe(false);
    expect(AccountIdSchema.safeParse('').success).toBe(false);
  });

  it('a membership parses with a wire-parity role', () => {
    const m: Membership = {
      campaignId: 'camp_1',
      accountId: 'acc_alice',
      role: 'dm',
      createdAt: '2026-07-20T00:00:00.000Z',
    };
    expect(MembershipSchema.parse(m)).toEqual(m);
  });

  it('session claims carry only who + validity, never a campaign', () => {
    const c: SessionClaims = { sub: 'acc_alice', iat: 1_000, exp: 2_000 };
    expect(SessionClaimsSchema.parse(c)).toEqual(c);
    // by design the token is not campaign-scoped: no such field is accepted meaningfully
    expect(Object.keys(SessionClaimsSchema.parse({ ...c, campaignId: 'camp_1' }))).not.toContain('campaignId');
  });
});

// -------------------------------------------------- the identity thread holds
describe('identity threads into the visibility filter unbroken (the load-bearing invariant)', () => {
  it('ViewerRoleSchema in identity is byte-identical to the roles the visibility filter uses', () => {
    // If play/visibility.ts ever adds/removes a role, this fails until identity is updated in lockstep.
    expect(ViewerRoleSchema.options).toEqual(['dm', 'player', 'table_display']);
  });

  it('a whisper addressed to an AccountId reaches exactly that account via eventVisibleTo', () => {
    // The contract-level proof of the thread: Account.id (an AccountId) is the SAME
    // string type that Viewer.accountId carries and that whisperTo addresses. The
    // server golden re-proves this end-to-end with real tokens; here it is proven at
    // the type/shape seam using the real, unchanged eventVisibleTo.
    const whisperTo: string = AccountIdSchema.parse('acc_bob');
    const whisper: PlayEvent = {
      seq: 1,
      id: 'evt-w',
      at: '2026-07-20T00:00:00.000Z',
      actor: { kind: 'dm' },
      visibility: { whisperTo },
      body: { t: 'whisper_sent', text: 'psst' },
    };
    const bob: Viewer = { role: 'player', accountId: 'acc_bob' };
    const alice: Viewer = { role: 'player', accountId: 'acc_alice' };
    const table: Viewer = { role: 'table_display' };

    expect(eventVisibleTo(whisper, bob)).toBe(true);   // addressed → reaches
    expect(eventVisibleTo(whisper, alice)).toBe(false); // other player → NOT reached
    expect(eventVisibleTo(whisper, table)).toBe(false); // table display → never sees whispers
  });
});

// ------------------------------------------------ secret-free by construction
describe('no client-reachable secret fields (ADR-0004)', () => {
  it('AccountSchema / SelfAccountSchema expose no passwordHash or oauth', () => {
    const keys = Object.keys(AccountSchema.shape);
    expect(keys).not.toContain('passwordHash');
    expect(keys).not.toContain('oauth');
    expect(Object.keys(SelfAccountSchema.shape)).toEqual(keys);
  });

  it('unknown/secret-looking fields are stripped, not preserved', () => {
    const parsed = AccountSchema.parse({
      id: 'acc_x',
      email: 'x@example.com',
      emailVerified: true,
      displayName: 'X',
      createdAt: '2026-07-20T00:00:00.000Z',
      passwordHash: '$argon2id$leak',
      oauth: { provider: 'evil' },
    } as unknown);
    expect(parsed).not.toHaveProperty('passwordHash');
    expect(parsed).not.toHaveProperty('oauth');
  });
});
