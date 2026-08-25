/**
 * @questra/contracts — identity (Brief 14 §1).
 *
 * Accounts, memberships, and the session-token claims. This module names the ONE
 * identity string the whole app agrees on:
 *
 *     JWT.sub  ===  Account.id  ===  Membership.accountId  ===  Viewer.accountId
 *
 * That is the string the visibility filter keys whispers on (see
 * play/visibility.ts: `whisperTo === viewer.accountId`). Every layer — auth, sync,
 * fan-out — resolves to it. A mismatch anywhere leaks a whisper to the wrong player
 * or drops it entirely, so this equality is a contract, not a convention.
 *
 * DESIGN DECISION (Brief 14 §1): the session token is NOT campaign-scoped. It proves
 * *who* (a verified account). *What role, in which campaign* is decided at connect
 * time by looking up the Membership for (sub, the campaign that owns the play
 * session). One login is valid across every campaign the account belongs to.
 *
 * SECRETS: passwordHash / oauth NEVER appear here. This module is client-reachable;
 * anything a server keeps private (per ADR-0004) lives server-side only. `Account`
 * as defined here is the self-view a client is allowed to see.
 */
import { z } from 'zod';
import type { ViewerRole } from './play/visibility.js';

/** The one identity string (see module doc). Non-empty; opaque format. */
export const AccountIdSchema = z.string().min(1);
export type AccountId = z.infer<typeof AccountIdSchema>;

/**
 * The runtime schema for a viewer role. The `ViewerRole` TYPE stays owned by
 * play/visibility.ts (the visibility filter is its home); this is only the
 * zod schema for validating role strings at the auth boundary. The
 * `satisfies` below fails to compile if the two ever drift apart, so identity
 * and the filter are kept in lockstep at build time, not just by a test.
 */
export const ViewerRoleSchema = z.enum(['dm', 'player', 'table_display']);
// compile-time lockstep: identity's enum output === visibility's ViewerRole.
type _RoleParity = z.infer<typeof ViewerRoleSchema> extends ViewerRole
  ? ViewerRole extends z.infer<typeof ViewerRoleSchema>
    ? true
    : never
  : never;
const _roleParity: _RoleParity = true;
void _roleParity;

/**
 * Age bracket reserved for the C5 minors decision (Master Plan / GAP-AUDIT). Null
 * until the owner decides the policy; the field exists now so signup does not churn
 * its schema later.
 */
export const AgeBracketSchema = z.enum(['under13', '13to17', 'adult']).nullable();
export type AgeBracket = z.infer<typeof AgeBracketSchema>;

/**
 * The account as a client is allowed to see it (its own self-view). Secret-free by
 * construction: no passwordHash, no oauth. Test `no client-reachable secret fields`
 * guards this.
 */
export const AccountSchema = z.object({
  id: AccountIdSchema,
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().min(1).max(80),
  /** brief-13's floor-state machine; an opaque string here (default: a fresh account). */
  onboarding: z.string().default('floor0'),
  settings: z.record(z.string(), z.unknown()).default({}),
  ageBracket: AgeBracketSchema.default(null),
  createdAt: z.string().datetime(),
  /** soft-delete marker; a purge job hard-deletes rows past retention. */
  deletedAt: z.string().datetime().nullable().default(null),
});
export type Account = z.infer<typeof AccountSchema>;

/** Alias making the "this is the self-view, and it is secret-free" intent explicit. */
export const SelfAccountSchema = AccountSchema;
export type SelfAccount = z.infer<typeof SelfAccountSchema>;

/**
 * A membership binds an account to a campaign with a role. This is what
 * resolveToken reads to answer "what role does this person have here?" — the token
 * proves `accountId`, this row proves `role` + `campaignId`.
 */
export const MembershipSchema = z.object({
  campaignId: z.string().min(1),
  accountId: AccountIdSchema,
  role: ViewerRoleSchema,
  createdAt: z.string().datetime(),
});
export type Membership = z.infer<typeof MembershipSchema>;

/**
 * The verified claims a session JWT carries. `sub` IS the identity string above.
 * `iat`/`exp` are unix seconds. Nothing campaign-specific lives here — by design.
 */
export const SessionClaimsSchema = z.object({
  sub: AccountIdSchema,
  iat: z.number().int(),
  exp: z.number().int(),
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;
