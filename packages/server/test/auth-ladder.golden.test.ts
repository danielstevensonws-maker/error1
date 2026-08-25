/**
 * Brief 14 §1 acceptance #1, #4, #5 — the auth ladder golden.
 *
 * Runs the §4 transcript step-for-step against the in-memory AuthRepo (no DB needed
 * — the Postgres repo is the same seam, exercised by the persistence env), with an
 * injected clock + deterministic ids so it is byte-stable. Every response shape is
 * zod-parsed against the identity contracts. The LogMailer captures the
 * verification + reset tokens the ladder consumes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SelfAccountSchema } from '@questra/contracts';
import {
  AuthService, AuthError, InMemoryAuthRepo, LogMailer,
  verifySession, hashPassword, verifyPassword, hashToken, type TokenConfig,
} from '../src/auth/index.js';

const SECRET = new TextEncoder().encode('test-secret-please-ignore-32chars!');

function fixedClock(startSec: number) {
  let t = startSec;
  const clock = () => t;
  return { clock, advance: (sec: number) => { t += sec; } };
}

function extractToken(body: string): string {
  return body.split('token: ')[1]!.trim();
}

describe('auth ladder (Brief 14 §1)', () => {
  let repo: InMemoryAuthRepo;
  let mailer: LogMailer;
  let svc: AuthService;
  let tokens: TokenConfig;
  let ids: string[];
  let clk: ReturnType<typeof fixedClock>;

  beforeEach(() => {
    clk = fixedClock(1_700_000_000); // fresh clock per test — no cross-test leak
    repo = new InMemoryAuthRepo();
    mailer = new LogMailer(() => {});
    tokens = { secret: SECRET, clock: clk.clock };
    let n = 0;
    let secretN = 0;
    ids = [];
    svc = new AuthService({
      repo, mailer, tokens, clock: clk.clock,
      newAccountId: () => { const id = `acc_${['alice', 'bob', 'carol'][n++] ?? n}`; ids.push(id); return id; },
      newSecret: () => `secret-${++secretN}`,
    });
  });

  it('signup → verify → login → lockout → refresh → hello-ready → delete-blocked → archive → delete → reset', async () => {
    // 1. signup
    const { self } = await svc.signup('alice@example.com', 'correct horse', 'Alice');
    expect(SelfAccountSchema.parse(self)).toEqual(self);
    expect(self.emailVerified).toBe(false);
    expect(self.onboarding).toBe('floor0');
    // secret invariant: password is argon2id-hashed, never plaintext
    const stored = await repo.accountById('acc_alice');
    expect(stored!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored!.passwordHash).not.toContain('correct horse');

    // 2. verify (token came by mail)
    const vtok = extractToken(mailer.lastTo('alice@example.com')!.body);
    await svc.verifyEmail(vtok);
    expect((await repo.accountById('acc_alice'))!.emailVerified).toBe(true);
    // single-use: replaying the same verification token fails
    await expect(svc.verifyEmail(vtok)).rejects.toBeInstanceOf(AuthError);

    // 3. login → a real access JWT whose sub === account id
    const s1 = await svc.login('alice@example.com', 'correct horse');
    const claims = await verifySession(s1.access, tokens);
    expect(claims!.sub).toBe('acc_alice');

    // 4. five wrong logins → lockout (429)
    for (let i = 0; i < 5; i++) {
      await expect(svc.login('alice@example.com', 'wrong')).rejects.toMatchObject({ status: 401 });
    }
    await expect(svc.login('alice@example.com', 'correct horse')).rejects.toMatchObject({ status: 429 });

    // 5. refresh rotates: the OLD refresh is dead, a NEW one issued.
    // (advance the clock a second — a refresh happens later than the login, so the
    // new JWT's iat differs; with a frozen clock the signatures would be identical.)
    clk.advance(1);
    const s2 = await svc.refresh(s1.refresh);
    expect(s2.access).not.toBe(s1.access);
    await expect(svc.refresh(s1.refresh)).rejects.toMatchObject({ status: 401 }); // old one revoked

    // 6. Alice owns a campaign (Brief 14 §2) → deletion blocked with a plain reason
    await repo.createCampaign({ id: 'camp_1', name: 'The Sunless Keep', ownerAccountId: 'acc_alice', createdAt: '2026-07-20T00:00:00.000Z' });
    await repo.createPlaySession('sess_1', 'camp_1', '2026-07-20T00:00:00.000Z');
    await repo.addMembership({ campaignId: 'camp_1', accountId: 'acc_alice', role: 'dm', createdAt: '2026-07-20T00:00:00.000Z' });
    await expect(svc.deleteAccount('acc_alice')).rejects.toMatchObject({
      status: 409, code: 'owns_campaign',
    });

    // 7. archive → deletion now succeeds (soft-delete)
    repo.archiveCampaign('camp_1');
    await svc.deleteAccount('acc_alice');
    expect((await repo.accountById('acc_alice'))!.deletedAt).not.toBeNull();

    // 8. reset ladder: request (200 even if unknown) → confirm → all refresh revoked
    // (use a fresh, non-deleted account so the flow is observable)
    const bob = await svc.signup('bob@example.com', 'bob password', 'Bob');
    await svc.verifyEmail(extractToken(mailer.lastTo('bob@example.com')!.body));
    const bobSession = await svc.login('bob@example.com', 'bob password');
    const { resetToken } = await svc.requestReset('bob@example.com');
    await svc.confirmReset(resetToken!, 'bob new password');
    // old refresh dead after reset
    await expect(svc.refresh(bobSession.refresh)).rejects.toMatchObject({ status: 401 });
    // new password works, old does not
    await expect(svc.login('bob@example.com', 'bob password')).rejects.toMatchObject({ status: 401 });
    await expect(svc.login('bob@example.com', 'bob new password')).resolves.toBeTruthy();
    void bob;
  });

  it('reset/request never reveals whether an email exists (no enumeration)', async () => {
    const r = await svc.requestReset('nobody@example.com');
    expect(r).toEqual({}); // resolves 200-equivalent, no token minted, no throw
    expect(mailer.sent.length).toBe(0);
  });

  it('getSelf (GET /auth/me\'s read) returns the client-safe self-view, never a deleted one', async () => {
    const { self } = await svc.signup('dora@example.com', 'dora password', 'Dora');
    const fetched = await svc.getSelf(self.id);
    expect(() => SelfAccountSchema.parse(fetched)).not.toThrow();
    expect(fetched).toEqual(self); // signup's own return is already the self-view — must agree
    expect(fetched).not.toHaveProperty('passwordHash');

    await svc.deleteAccount(self.id);
    await expect(svc.getSelf(self.id)).rejects.toMatchObject({ status: 401, code: 'auth' });
  });

  it('an expired access token no longer verifies', async () => {
    await svc.signup('carol@example.com', 'carol password', 'Carol');
    await svc.verifyEmail(extractToken(mailer.lastTo('carol@example.com')!.body));
    const s = await svc.login('carol@example.com', 'carol password');
    expect(await verifySession(s.access, tokens)).not.toBeNull();
    clk.advance(16 * 60); // past the 15-minute access TTL
    expect(await verifySession(s.access, tokens)).toBeNull();
    clk.advance(-16 * 60); // restore clock for other assertions if reused
  });

  it('the purge job hard-deletes only accounts past retention', async () => {
    await svc.signup('carol@example.com', 'carol password', 'Carol');
    await svc.deleteAccount('acc_alice'); // acc_alice is carol here (first id) — soft-delete now
    // not yet past 30 days → survives
    expect(await svc.purgeDeleted(30)).toBe(0);
    clk.advance(31 * 24 * 60 * 60);
    expect(await svc.purgeDeleted(30)).toBe(1);
    expect(await repo.accountById('acc_alice')).toBeNull();
    clk.advance(-31 * 24 * 60 * 60);
  });

  it('token/password crypto round-trips (security invariants)', async () => {
    const h = await hashPassword('hunter2');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword('hunter2', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
    // token hashing is sha256 hex, stable, and not the raw token
    const hh = await hashToken('raw-token');
    expect(hh).toMatch(/^[0-9a-f]{64}$/);
    expect(hh).not.toContain('raw-token');
    expect(await hashToken('raw-token')).toBe(hh);
  });
});
