# Brief 14 §1 — Accounts & Session Tokens *(build-ready)*

*Layer 3. The M2/M3-boundary slice of Brief 14, extracted and revalidated per ADR-0013
so a single Claude Code session can build it. Consumed with `@questra/contracts`,
`@questra/server`, Architecture §2, ADR-0004 (secrets), ADR-0011 (tech stack),
ADR-0015 (persistence). This brief mints what Brief 05 §3 assumed: the token that
`hello` carries. Sections §2–§5 of the parent brief-14 (membership plumbing, the
shell surfaces, shell states, notifications) stay as scoped in
[brief-14-accounts-app-shell.md](brief-14-accounts-app-shell.md) and land M3/M4.*

---

> **⚠️ ADR-0013 revalidation note — M2/M3 boundary (2026-07-20).** Checked against
> current `@questra/contracts` and `@questra/server`. The stub brief spoke as if
> accounts were greenfield; they are not. Findings that change the build:
>
> 1. **The `account` table already exists.** Migration
>    [`1721400000000_initial`](../../packages/server/src/store/migrations/1721400000000_initial.ts)
>    created `account (id, email UNIQUE, display_name, created_at)`,
>    `campaign (id, name, owner_account_id → account, created_at)`, and
>    `play_session (id, campaign_id → campaign, created_at)`. **This brief EXTENDS
>    `account` with an ALTER migration** (adds `password_hash`, `email_verified`,
>    `onboarding`, `settings`, `age_bracket`, `deleted_at`) — it does not
>    `CREATE TABLE account`. It **adds** `membership`, `email_verification`,
>    `password_reset`, and `session_refresh` tables.
> 2. **The token seam is exact and already wired for injection.**
>    [`SyncCoreOptions.resolveToken(token, playSessionId) → ResolvedToken | null`](../../packages/server/src/sync-core.ts)
>    (`ResolvedToken = { accountId, role: ViewerRole, playSessionId }`) is the ONLY
>    thing the sync server needs from auth. [`main.ts`](../../packages/server/src/main.ts)
>    injects a **stub** `resolveToken` today ("production injects the real auth").
>    This brief supplies the real one. **No wire/protocol change** — `hello` already
>    carries `{ playSessionId, token }` and `ServerMsg.error.code` already includes
>    `'auth' | 'not_member'`.
> 3. **`accountId` is load-bearing identity, not a display field.** The contracts
>    `Viewer.accountId` and `presence.connected[].accountId`
>    ([visibility.ts](../../packages/contracts/src/play/visibility.ts),
>    [wire.ts](../../packages/contracts/src/play/wire.ts)) are what the visibility
>    filter keys whispers on (`whisperTo === viewer.accountId`). **The JWT subject,
>    `Account.id`, `Membership.accountId`, and `ResolvedToken.accountId` are ALL the
>    same string.** Get this wrong and whispers leak or vanish.
> 4. **`campaign.owner_account_id` already encodes the DM.** A membership row with
>    `role='dm'` for the owner is derivable, but the FK is the source of truth for
>    the "DM-owned campaign blocks deletion" rule — check the FK, not just memberships.
> 5. **Migration tool is decided.** `node-pg-migrate` is already a dep and drives the
>    initial migration (closes GAP-AUDIT A6). This brief adds migrations in that tool;
>    no new ADR.
> 6. **New deps to add:** `argon2` (password hashing — argon2id), `jose` (JWT sign/verify,
>    EdDSA or HS256 from an env secret per ADR-0004). A `Mailer` interface with a
>    **log-only dev implementation** (real provider is a config-seam swap, out of scope
>    for the slice — the slice needs verification *tokens minted and consumable*, not a
>    real inbox).

**Scope:** the account lifecycle (signup, email verification, login, refresh, logout,
password reset, deletion), the session-token mint/verify, the real `resolveToken` that
replaces the stub, and the membership read-path the resolver needs. All server + contracts;
**no shell UI** (that is §3, M3) beyond what the auth ladder golden test drives directly.

**Non-goals:** the shell surfaces / pages (§3), notifications (§5), billing/plan
enforcement (M8), OAuth providers (email+password only for the slice; leave a nullable
`oauth` column + a comment seam), a real email provider (log-only `Mailer`), the
seat-or-create character flow (§2, M3 — this brief mints the *player* membership a join
produces, but the wizard hand-off is §2), rate-limit *tuning* (a working limiter with
sane defaults ships; ops tuning is M8).

---

## 1. Contracts — a new `identity` module (`packages/contracts/src/identity.ts`)

Contract-first (ADR-0002): ships as its own commit before the server work. Add the module
and export it from `index.ts`. These are the shapes every layer agrees on; the DB columns
and JWT claims below are bound to them.

```ts
import { z } from 'zod';

export const AccountIdSchema = z.string().min(1);          // === Viewer.accountId, === JWT sub
export const ViewerRoleSchema = z.enum(['dm', 'player', 'table_display']); // re-export shape parity

/** age_bracket reserved for the C5 minors decision (Master Plan) — nullable until decided. */
export const AgeBracketSchema = z.enum(['under13', '13to17', 'adult']).nullable();

export const AccountSchema = z.object({
  id: AccountIdSchema,
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().min(1).max(80),
  // passwordHash / oauth are server-only secrets — NEVER in a contract that reaches a client.
  onboarding: z.string().default('floor0'),   // brief-13's floor-state machine; opaque string here
  settings: z.record(z.unknown()).default({}),
  ageBracket: AgeBracketSchema.default(null),
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().default(null),
});
export type Account = z.infer<typeof AccountSchema>;

/** What a client is allowed to see about itself (no secrets). */
export const SelfAccountSchema = AccountSchema.omit({ /* nothing secret is in AccountSchema */ });
export type SelfAccount = z.infer<typeof SelfAccountSchema>;

export const MembershipSchema = z.object({
  campaignId: z.string().min(1),
  accountId: AccountIdSchema,
  role: ViewerRoleSchema,                       // 'dm' | 'player' | 'table_display'
  createdAt: z.string().datetime(),
});
export type Membership = z.infer<typeof MembershipSchema>;

/** The verified claims a session JWT carries. `sub` IS Account.id IS Viewer.accountId. */
export const SessionClaimsSchema = z.object({
  sub: AccountIdSchema,
  iat: z.number().int(),
  exp: z.number().int(),
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;
```

**Note:** the token is **not** campaign-scoped. `hello` supplies `playSessionId` separately;
`resolveToken` looks up the membership for `(sub, playSessionId's campaign)` at connect time.
This keeps one login valid across every campaign the account belongs to — the JWT proves
*who*, the membership table proves *what role, where*. (This is the single most important
design call in the brief; §4 depends on it.)

## 2. Persistence — migrations (in `node-pg-migrate`, `packages/server/src/store/migrations/`)

One new migration file. `up`:

```
-- extend the existing account table (do NOT re-create it)
ALTER account ADD password_hash text NULL          -- null iff oauth-only (future)
ALTER account ADD oauth jsonb NULL                 -- reserved seam; unused in the slice
ALTER account ADD email_verified boolean NOT NULL DEFAULT false
ALTER account ADD onboarding text NOT NULL DEFAULT 'floor0'
ALTER account ADD settings jsonb NOT NULL DEFAULT '{}'
ALTER account ADD age_bracket text NULL            -- C5 reserved; CHECK in ('under13','13to17','adult')
ALTER account ADD deleted_at timestamptz NULL      -- soft-delete; purge job (below) hard-deletes

CREATE TABLE membership (
  campaign_id  text NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  account_id   text NOT NULL REFERENCES account(id)  ON DELETE CASCADE,
  role         text NOT NULL,                        -- CHECK in ('dm','player','table_display')
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, account_id)
)
CREATE INDEX membership_by_account ON membership(account_id)  -- resolveToken's lookup

CREATE TABLE email_verification ( token text PRIMARY KEY, account_id text NOT NULL REFERENCES account(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL )
CREATE TABLE password_reset      ( token text PRIMARY KEY, account_id text NOT NULL REFERENCES account(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, used_at timestamptz NULL )
-- refresh tokens are opaque, hashed at rest, one row per active session
CREATE TABLE session_refresh     ( token_hash text PRIMARY KEY, account_id text NOT NULL REFERENCES account(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, revoked_at timestamptz NULL )
```

`down` reverses (drop the four tables; drop the added columns). Verification/reset/refresh
token strings are **single-use, high-entropy, hashed at rest** (store `sha256(token)`, never
the raw token) — same discipline as ADR-0004's server-side secret handling.

## 3. Server — the auth module (`packages/server/src/auth/`)

Pure-function core wherever possible (ADR: testable = correct). Suggested files:

- `passwords.ts` — `hash(pw): Promise<string>` / `verify(pw, hash): Promise<boolean>` (argon2id).
- `tokens.ts` — `signSession(accountId): {token, exp}` / `verifySession(token): SessionClaims | null`
  (jose; secret from `process.env.QUESTRA_JWT_SECRET`, ADR-0004). Access token **15 min**;
  refresh opaque, **30 days**, httpOnly cookie, rotated on use.
- `mailer.ts` — `interface Mailer { send(to, subject, body): Promise<void> }` + `LogMailer`
  (dev: writes the link to stdout). Config seam; real provider is a later swap.
- `repo.ts` — the account/membership data access (thin; parameterized SQL, no ORM).
- `routes.ts` — Fastify routes below.
- `resolve-token.ts` — **the `resolveToken` the sync server injects (the payoff).**

### HTTP routes (Fastify, all `zod`-parsed at the boundary)

| Route | Does | Notes |
|---|---|---|
| `POST /auth/signup` | create account (email+pw), hash pw, mint+send verification token | `email_verified=false`; returns SelfAccount (no session until verified — or issue session immediately and gate features on `emailVerified`, DM's call; **slice: issue session immediately, gate nothing yet**) |
| `POST /auth/verify` | consume verification token → set `email_verified=true` | single-use; expired ⇒ 410 |
| `POST /auth/login` | verify pw → issue access token + set refresh cookie | rate-limited + lockout (below) |
| `POST /auth/refresh` | rotate refresh cookie → new access token | reject revoked/expired; rotation invalidates the old row |
| `POST /auth/logout` | revoke the refresh row + clear cookie | idempotent |
| `POST /auth/reset/request` | mint+send reset token (always 200, even for unknown email — no account enumeration) | |
| `POST /auth/reset/confirm` | consume reset token → set new pw, revoke all refresh rows | single-use |
| `DELETE /auth/account` | **soft-delete** (`deleted_at=now()`) IFF no owned campaign; else 409 with plain-language reason | purge job hard-deletes after 30 days |

**Deletion rule (the one with a real edge):** an account that is `campaign.owner_account_id`
for any non-archived campaign **cannot** be deleted — respond `409` with
`{ reason: "You're the DM of <name>. Hand it to another player or archive it first." }`
(plain language, ADR-0009). Ownership transfer / archive is a §2 (M3) surface; this brief
only enforces the block and returns the reason.

**Auth hardening:** `POST /auth/login` and `/auth/reset/request` rate-limited per-IP and
per-email; N failed logins ⇒ exponential backoff lockout on that account (store attempt
count + `locked_until`; simplest: a small in-memory limiter for the slice, note that M8
moves it to Postgres/Redis for multi-instance). Never leak whether an email exists.

### `resolveToken` — the swap that ends the stub

```ts
// resolve-token.ts — injected into SyncCore, replacing main.ts's stub.
export function makeResolveToken(repo: AuthRepo): SyncCoreOptions['resolveToken'] {
  return (token, playSessionId) => {
    const claims = verifySession(token);            // jose verify + exp check
    if (!claims) return null;                         // → hello answers { error: 'auth' }
    const campaignId = repo.campaignIdForSession(playSessionId);
    if (!campaignId) return null;
    const m = repo.membership(claims.sub, campaignId);
    if (!m) return null;                              // → hello answers { error: 'not_member' } (via the playSessionId check)
    return { accountId: claims.sub, role: m.role, playSessionId };
  };
}
```

Then in `main.ts`, replace the stub injection with `makeResolveToken(repo)` and select the
`PostgresEventStore` when `DATABASE_URL` is set (this is also the ADR-0015 dev-env wiring the
next task needs — call it out but the store swap can land here since it's one line). Keep the
in-memory store + a fixed stub token for tests/dev with no DB.

## 4. Worked example — the auth ladder (this is the golden test's script)

A single deterministic transcript, mirroring how Brief 02's Torvald trace anchors the engine.
Times are illustrative; the test injects a clock.

```
1.  signup  alice@example.com / "correct horse"   → 201, SelfAccount{ id: acc_alice, emailVerified:false, onboarding:'floor0' }
2.  verify  <token from LogMailer capture>          → 200, account.emailVerified === true
3.  login   alice@example.com / "correct horse"     → 200, access JWT (sub=acc_alice, exp=+15m) + refresh cookie
4.  login   alice@example.com / "wrong"    ×5        → 401 ×5, then 429 locked_until set (backoff)
5.  refresh <cookie>                                 → 200, NEW access JWT, old refresh row revoked
6.  — Alice creates campaign "The Sunless Keep" (campaign.owner_account_id = acc_alice; membership{dm} derived) —
7.  hello   { playSessionId: sess_1, token: <Alice's access JWT> }  → resolveToken → { accountId: acc_alice, role:'dm', playSessionId: sess_1 }  → welcome
8.  — Bob signs up, verifies, logs in, joins via link → membership{ campaign, acc_bob, role:'player' } —
9.  hello   { playSessionId: sess_1, token: <Bob's JWT> }           → resolveToken → { accountId: acc_bob, role:'player', playSessionId: sess_1 }
10. hello   { playSessionId: sess_1, token: <Bob's JWT with sub=acc_carol (never a member)> } → resolveToken null → error 'auth'
11. DELETE /auth/account  (as Alice, owns "Sunless Keep")           → 409 { reason: "You're the DM of The Sunless Keep. …" }
12. — Alice archives the campaign (§2 stub for the test) —          → DELETE /auth/account → 200, deleted_at set
13. reset/request alice@… → reset/confirm <token> new pw            → 200, ALL refresh rows revoked; old access JWT still valid until its 15m exp (documented, acceptable)
```

The whisper-identity assertion (the load-bearing one): a `whisper` event with
`whisperTo: acc_bob` reaches Bob's `hello`-derived Viewer and **not** Alice's player-view
nor the table_display — proving `JWT.sub === Membership.accountId === Viewer.accountId`
threads unbroken. This reuses the existing `eventVisibleTo`; it does not re-implement it.

## 5. Acceptance criteria *(each maps 1:1 to a test)*

1. **Ladder golden** (`auth-ladder.golden.test.ts`, against testcontainer Postgres):
   the §4 transcript runs step-for-step; each response shape `zod`-parses against the §1
   contracts; the LogMailer captures the verification + reset tokens the ladder consumes.
2. **Token ↔ sync seam:** a JWT minted by `signSession` is accepted by a **real Brief-05
   `hello`** through `makeResolveToken` (not the stub); a JWT for a non-member yields
   `error 'auth'`, and a valid token for the wrong `playSessionId` yields `error 'not_member'`.
   (Drives the existing SyncCore over the in-memory socket pair — no network.)
3. **Whisper identity:** the §4 whisper reaches exactly the addressed player's viewer and no
   other, asserted through the unchanged contracts `eventVisibleTo` (proves the id thread).
4. **Deletion guard:** owner-of-a-live-campaign delete ⇒ 409 with a plain-language reason
   (ban-list-checked string); after archive ⇒ 200 + `deleted_at`; a purge-job unit test
   hard-deletes rows past 30 days and only those.
5. **Security invariants:** password never stored in plaintext (argon2id hash present, verify
   round-trips); verification/reset/refresh tokens stored only as `sha256`; reset consumes
   single-use and revokes refresh rows; `/auth/reset/request` returns 200 for unknown emails
   (no enumeration); login lockout engages after N failures.
6. **No secret in any client shape:** a static assertion (and a test) that `SelfAccount` /
   `AccountSchema` carry no `passwordHash` / `oauth` — the contract that reaches a client is
   secret-free by construction (ADR-0004).
7. `npm run check:all` green; the new migration applies and reverses cleanly on a fresh DB.

## 6. Definition-of-done checks (CLAUDE.md)

- **Disconnect/rejoin:** already covered by Brief-05 reconnect — this brief only ensures the
  token that reconnect replays under is real and still valid (or refreshed).
- **DM override/undo:** N/A at the account layer (no game state); the deletion block *is* the
  safety valve, and it's reversible (archive, then delete).
- **It makes a sound / never-played-D&D usable:** deferred to §3's shell UI; this brief is the
  server spine the shell sits on. The plain-language 409 reason is the one user-facing string
  here and it must pass the ban list.

---

*Ships as two commits (ADR-0002): (1) `packages/contracts` — `identity.ts` + export + tests;
(2) `packages/server` — migration, `auth/`, the `main.ts` swap, goldens. After merge:
ADR-0015's dev-env task (store swap + network host) and §2 membership surfaces are unblocked,
and ADR-0017's slice measurement can run against real tokens.*
