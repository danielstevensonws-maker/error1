/**
 * Auth flows (Brief 14 §1) as testable async functions — signup, verify, login,
 * refresh, logout, password reset, deletion, and the purge job. The ladder golden
 * drives these directly (routes.ts is a thin HTTP shell over them). Ids, clock, and
 * token minting are injected so the golden is deterministic.
 *
 * Security invariants enforced here:
 *  - passwords argon2id-hashed, never stored plaintext
 *  - verification/reset/refresh tokens stored HASHED, single-use / rotating
 *  - reset/request never reveals whether an email exists (no enumeration)
 *  - DM-owned campaigns block account deletion (plain-language reason, ADR-0009)
 *  - login lockout with backoff after repeated failures
 */
import type { SelfAccount } from '@questra/contracts';
import type { AuthRepo, AccountRow } from './repo.js';
import type { Mailer } from './mailer.js';
import { hashPassword, verifyPassword } from './passwords.js';
import {
  signSession, newRefreshToken, hashToken,
  REFRESH_TTL_SECONDS, type TokenConfig, type Clock, systemClock,
} from './tokens.js';

const VERIFY_TTL = 24 * 60 * 60; // 24h
const RESET_TTL = 60 * 60; // 1h
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BASE_MS = 1000;

export interface AuthDeps {
  repo: AuthRepo;
  mailer: Mailer;
  tokens: TokenConfig;
  clock?: Clock;
  /** Injected id + secret-token minting (deterministic in tests). */
  newAccountId: () => string;
  /** Raw secret token generator (verification/reset). Defaults to a CSPRNG. */
  newSecret?: () => string;
}

export class AuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

/** Strip an AccountRow to the client-safe self-view (no passwordHash, no oauth). */
export function toSelf(a: AccountRow): SelfAccount {
  return {
    id: a.id, email: a.email, emailVerified: a.emailVerified, displayName: a.displayName,
    onboarding: a.onboarding, settings: a.settings, ageBracket: a.ageBracket,
    createdAt: a.createdAt, deletedAt: a.deletedAt,
  };
}

/** Simple per-account failed-login tracker (slice-scoped; M8 moves it to Postgres/Redis). */
export class LoginLimiter {
  private fails = new Map<string, { count: number; lockedUntil: number }>();
  constructor(private clock: Clock = systemClock) {}
  check(email: string): void {
    const e = this.fails.get(email.toLowerCase());
    if (e && e.lockedUntil > this.clock() * 1000) {
      throw new AuthError('locked', 'Too many attempts. Try again shortly.', 429);
    }
  }
  fail(email: string): void {
    const key = email.toLowerCase();
    const e = this.fails.get(key) ?? { count: 0, lockedUntil: 0 };
    e.count += 1;
    if (e.count >= LOCKOUT_THRESHOLD) {
      e.lockedUntil = this.clock() * 1000 + LOCKOUT_BASE_MS * 2 ** (e.count - LOCKOUT_THRESHOLD);
    }
    this.fails.set(key, e);
  }
  succeed(email: string): void {
    this.fails.delete(email.toLowerCase());
  }
}

export class AuthService {
  private now: Clock;
  private newSecret: () => string;
  constructor(private deps: AuthDeps, public limiter = new LoginLimiter(deps.clock)) {
    this.now = deps.clock ?? systemClock;
    this.newSecret = deps.newSecret ?? newRefreshToken;
  }

  private nowIso(): string {
    return new Date(this.now() * 1000).toISOString();
  }

  // --- signup + verification ----------------------------------------------
  async signup(email: string, password: string, displayName: string): Promise<{ self: SelfAccount; verifyToken: string }> {
    if (await this.deps.repo.accountByEmail(email)) {
      throw new AuthError('email_taken', 'That email is already registered.', 409);
    }
    const id = this.deps.newAccountId();
    const passwordHash = await hashPassword(password);
    const row: AccountRow = {
      id, email, emailVerified: false, displayName, passwordHash,
      onboarding: 'floor0', settings: {}, ageBracket: null, createdAt: this.nowIso(), deletedAt: null,
    };
    await this.deps.repo.createAccount(row);

    const verifyToken = this.newSecret();
    await this.deps.repo.putVerification({
      tokenHash: await hashToken(verifyToken), accountId: id, expiresAt: this.now() + VERIFY_TTL,
    });
    await this.deps.mailer.send({
      to: email, subject: 'Verify your Questra account',
      body: `Confirm your email with this token: ${verifyToken}`,
    });
    return { self: toSelf(row), verifyToken };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const row = await this.deps.repo.takeVerification(await hashToken(rawToken));
    if (!row) throw new AuthError('bad_token', 'That link is invalid or already used.', 410);
    if (row.expiresAt < this.now()) throw new AuthError('expired', 'That link has expired.', 410);
    await this.deps.repo.setEmailVerified(row.accountId);
  }

  // --- login / refresh / logout -------------------------------------------
  async login(email: string, password: string): Promise<{ access: string; exp: number; refresh: string }> {
    this.limiter.check(email);
    const acc = await this.deps.repo.accountByEmail(email);
    const ok = acc && acc.passwordHash && !acc.deletedAt && (await verifyPassword(password, acc.passwordHash));
    if (!ok || !acc) {
      this.limiter.fail(email);
      throw new AuthError('bad_credentials', 'Email or password is incorrect.', 401);
    }
    this.limiter.succeed(email);
    return this.issueSession(acc.id);
  }

  private async issueSession(accountId: string): Promise<{ access: string; exp: number; refresh: string }> {
    const { token: access, exp } = await signSession(accountId, this.deps.tokens);
    const refresh = newRefreshToken();
    await this.deps.repo.putRefresh({
      tokenHash: await hashToken(refresh), accountId, expiresAt: this.now() + REFRESH_TTL_SECONDS,
    });
    return { access, exp, refresh };
  }

  async refresh(rawRefresh: string): Promise<{ access: string; exp: number; refresh: string }> {
    const hash = await hashToken(rawRefresh);
    const row = await this.deps.repo.getRefresh(hash);
    if (!row || row.expiresAt < this.now()) throw new AuthError('bad_refresh', 'Session expired. Please sign in again.', 401);
    await this.deps.repo.revokeRefresh(hash); // rotation: the old refresh is dead
    return this.issueSession(row.accountId);
  }

  async logout(rawRefresh: string): Promise<void> {
    await this.deps.repo.revokeRefresh(await hashToken(rawRefresh)); // idempotent
  }

  // --- password reset ------------------------------------------------------
  /** Always resolves (never reveals whether the email exists). Returns the token
   *  only when an account exists (so tests can consume it; the HTTP route ignores it). */
  async requestReset(email: string): Promise<{ resetToken?: string }> {
    const acc = await this.deps.repo.accountByEmail(email);
    if (!acc || acc.deletedAt) return {}; // silent — no enumeration
    const resetToken = this.newSecret();
    await this.deps.repo.putReset({
      tokenHash: await hashToken(resetToken), accountId: acc.id, expiresAt: this.now() + RESET_TTL,
    });
    await this.deps.mailer.send({
      to: email, subject: 'Reset your Questra password',
      body: `Reset your password with this token: ${resetToken}`,
    });
    return { resetToken };
  }

  async confirmReset(rawToken: string, newPassword: string): Promise<void> {
    const row = await this.deps.repo.takeReset(await hashToken(rawToken));
    if (!row) throw new AuthError('bad_token', 'That link is invalid or already used.', 410);
    if (row.expiresAt < this.now()) throw new AuthError('expired', 'That link has expired.', 410);
    await this.deps.repo.setPasswordHash(row.accountId, await hashPassword(newPassword));
    await this.deps.repo.revokeAllRefresh(row.accountId); // every session dies on a reset
  }

  // --- self ------------------------------------------------------------------
  /** GET /auth/me's read: the client-safe self-view for the bearer token's account. */
  async getSelf(accountId: string): Promise<SelfAccount> {
    const acc = await this.deps.repo.accountById(accountId);
    if (!acc || acc.deletedAt) throw new AuthError('auth', 'Please sign in.', 401);
    return toSelf(acc);
  }

  // --- deletion ------------------------------------------------------------
  async deleteAccount(accountId: string): Promise<void> {
    const owned = await this.deps.repo.ownedCampaigns(accountId);
    if (owned.length > 0) {
      const name = owned[0]!.name;
      throw new AuthError(
        'owns_campaign',
        `You're the DM of ${name}. Hand it to another player or archive it first.`,
        409,
      );
    }
    await this.deps.repo.softDeleteAccount(accountId, this.nowIso());
  }

  /** Purge job: hard-delete accounts soft-deleted more than `retentionDays` ago. */
  async purgeDeleted(retentionDays = 30): Promise<number> {
    const cutoff = new Date((this.now() - retentionDays * 24 * 60 * 60) * 1000).toISOString();
    return this.deps.repo.hardDeleteAccountsDeletedBefore(cutoff);
  }
}
