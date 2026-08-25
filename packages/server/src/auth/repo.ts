/**
 * Auth data access (Brief 14 §1). Same seam pattern as EventStore: the flows and
 * resolveToken talk to the AuthRepo interface, never a concrete store — so the
 * ladder golden runs in-memory (no DB) and production runs against Postgres with no
 * code change. Token strings are passed in ALREADY HASHED; the repo never sees raw
 * verification/reset/refresh tokens.
 */
import type { Membership, ViewerRole, Campaign } from '@questra/contracts';

/** The server-side account row — includes secrets that never reach a client. */
export interface AccountRow {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  passwordHash: string | null;
  onboarding: string;
  settings: Record<string, unknown>;
  ageBracket: 'under13' | '13to17' | 'adult' | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface TokenRow {
  tokenHash: string;
  accountId: string;
  expiresAt: number; // unix seconds
  usedAt?: number | null;
  revokedAt?: number | null;
}

/**
 * A stored character. `choices` is the wizard's output, kept opaque here —
 * contracts owns its shape (CharacterChoicesSchema) and validates it on the
 * way in and out, so the repo does not fork that schema into the data layer.
 */
export interface CharacterRow {
  id: string;
  campaignId: string;
  accountId: string;
  name: string;
  choices: unknown;
  createdAt: string;
}

/**
 * A stored map. `body` is the whole Room shape, kept opaque here — contracts
 * owns it (RoomSchema) and validates on the way in and out, so the repo does
 * not fork that schema into the data layer.
 */
export interface RoomRow {
  id: string;
  campaignId: string;
  name: string;
  body: unknown;
  isCurrent: boolean;
  createdAt: string;
}

export interface AuthRepo {
  // accounts
  createAccount(a: Omit<AccountRow, 'createdAt' | 'deletedAt'> & { createdAt: string }): Promise<void>;
  accountByEmail(email: string): Promise<AccountRow | null>;
  accountById(id: string): Promise<AccountRow | null>;
  setEmailVerified(id: string): Promise<void>;
  setPasswordHash(id: string, hash: string): Promise<void>;
  softDeleteAccount(id: string, at: string): Promise<void>;
  hardDeleteAccountsDeletedBefore(cutoffIso: string): Promise<number>;

  // campaigns (Brief 14 §2)
  createCampaign(c: Campaign): Promise<void>;
  campaignById(id: string): Promise<Campaign | null>;
  /** Overwrites the live code — this is the mechanism "regenerable" (brief-14 §2) uses. */
  setJoinTokenHash(campaignId: string, tokenHash: string): Promise<void>;
  campaignByJoinTokenHash(tokenHash: string): Promise<Campaign | null>;
  createPlaySession(id: string, campaignId: string, createdAt: string): Promise<void>;

  // memberships (what resolveToken reads)
  addMembership(m: Membership): Promise<void>;
  membership(accountId: string, campaignId: string): Promise<Membership | null>;
  removeMembership(accountId: string, campaignId: string): Promise<void>;
  /** Every campaign this account belongs to, with its role — Home's DM'd/playing-in split. */
  membershipsForAccount(accountId: string): Promise<(Membership & { campaignName: string })[]>;
  /** Campaigns this account OWNS (blocks deletion) — via campaign.owner_account_id. */
  ownedCampaigns(accountId: string): Promise<{ id: string; name: string }[]>;
  campaignIdForSession(playSessionId: string): Promise<string | null>;
  /** The live play session for a campaign — the reverse of campaignIdForSession.
   *  The sync protocol's hello requires a playSessionId and nothing surfaced one. */
  sessionIdForCampaign(campaignId: string): Promise<string | null>;
  /** Everyone who belongs at a campaign's table, with the names a lobby renders.
   *  Narrower than Membership[role] on purpose: table_display is a credential
   *  with no account behind it, so it is never a row here.
   *  Presence answers who is connected; this answers who belongs. */
  membersOfCampaign(campaignId: string): Promise<{ accountId: string; displayName: string; role: 'dm' | 'player' }[]>;

  // characters (the wizard's output — choices, never a computed sheet)
  putCharacter(c: CharacterRow): Promise<void>;
  /** The one character this account plays in this campaign, if they have made one. */
  characterFor(accountId: string, campaignId: string): Promise<CharacterRow | null>;
  /** Every character at a campaign's table, for the lobby roster. */
  charactersOfCampaign(campaignId: string): Promise<CharacterRow[]>;

  // rooms (the maps a campaign plays on)
  putRoom(r: RoomRow): Promise<void>;
  /** The map a session opens into, or null if the campaign has none yet. */
  currentRoom(campaignId: string): Promise<RoomRow | null>;

  // table_display credentials (Brief 14 §2) — a shared screen, not a signed-in person,
  // so this is its own token table rather than a fake account (see the migration doc).
  putTableDisplayToken(t: { tokenHash: string; campaignId: string; createdAt: string }): Promise<void>;
  /** The campaign a table_display token grants access to, or null if unknown/revoked. */
  tableDisplayCampaignId(tokenHash: string): Promise<string | null>;
  revokeTableDisplayTokens(campaignId: string): Promise<void>;

  // single-use / rotating tokens (stored hashed)
  putVerification(t: TokenRow): Promise<void>;
  takeVerification(tokenHash: string): Promise<TokenRow | null>; // consume (delete) if unexpired
  putReset(t: TokenRow): Promise<void>;
  takeReset(tokenHash: string): Promise<TokenRow | null>;
  putRefresh(t: TokenRow): Promise<void>;
  getRefresh(tokenHash: string): Promise<TokenRow | null>;
  revokeRefresh(tokenHash: string): Promise<void>;
  revokeAllRefresh(accountId: string): Promise<void>;
}

// -------------------------------------------------------------- in-memory repo
/** In-memory AuthRepo (dev/tests). Postgres-backed prod uses PostgresAuthRepo below. */
export class InMemoryAuthRepo implements AuthRepo {
  private accounts = new Map<string, AccountRow>();
  private byEmail = new Map<string, string>();
  private memberships = new Map<string, Membership>(); // key: campaign|account
  /* Same composite key as memberships: one character per person per campaign,
     which is the unique constraint the migration enforces in Postgres. */
  private characters = new Map<string, CharacterRow>();
  /** Keyed by room id — a campaign has many rooms, one of them current. */
  private rooms = new Map<string, RoomRow>();
  private campaigns = new Map<string, Campaign>();
  private joinTokens = new Map<string, string>(); // tokenHash → campaignId
  private sessions = new Map<string, string>(); // playSessionId → campaignId
  private tableDisplayTokens = new Map<string, { campaignId: string; revoked: boolean }>();
  private verifications = new Map<string, TokenRow>();
  private resets = new Map<string, TokenRow>();
  private refresh = new Map<string, TokenRow>();

  private mkey(accountId: string, campaignId: string): string {
    return `${campaignId}|${accountId}`;
  }

  /** Test-only: brief-14 §2's "archive" isn't a real flow yet, only what unblocks deletion. */
  archiveCampaign(id: string): void {
    this.campaigns.delete(id);
  }

  async createCampaign(c: Campaign): Promise<void> {
    this.campaigns.set(c.id, c);
  }
  async campaignById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) ?? null;
  }
  async setJoinTokenHash(campaignId: string, tokenHash: string): Promise<void> {
    // one live code per campaign — drop any prior hash pointing at this campaign first
    for (const [hash, cid] of [...this.joinTokens]) if (cid === campaignId) this.joinTokens.delete(hash);
    this.joinTokens.set(tokenHash, campaignId);
  }
  async campaignByJoinTokenHash(tokenHash: string): Promise<Campaign | null> {
    const campaignId = this.joinTokens.get(tokenHash);
    return campaignId ? (this.campaigns.get(campaignId) ?? null) : null;
  }
  /**
   * `createdAt` is accepted and not stored, and the parameter is written out
   * rather than dropped.
   *
   * TypeScript lets a two-parameter function satisfy a three-parameter
   * interface, so omitting it conformed — but every CALLER is then typed
   * against the concrete class rather than the interface, and passing the third
   * argument became an error at the call site. Nineteen test files were passing
   * it happily because none of them were typechecked (see tsconfig.check.json).
   *
   * Nothing reads a play session's creation time out of this store; the
   * Postgres one records it because the column exists. Naming the parameter is
   * how the two stay substitutable.
   */
  async createPlaySession(id: string, campaignId: string, _createdAt: string): Promise<void> {
    this.sessions.set(id, campaignId);
  }

  async createAccount(a: Omit<AccountRow, 'createdAt' | 'deletedAt'> & { createdAt: string }): Promise<void> {
    const row: AccountRow = { ...a, deletedAt: null };
    this.accounts.set(row.id, row);
    this.byEmail.set(row.email.toLowerCase(), row.id);
  }
  async accountByEmail(email: string): Promise<AccountRow | null> {
    const id = this.byEmail.get(email.toLowerCase());
    return id ? (this.accounts.get(id) ?? null) : null;
  }
  async accountById(id: string): Promise<AccountRow | null> {
    return this.accounts.get(id) ?? null;
  }
  async setEmailVerified(id: string): Promise<void> {
    const a = this.accounts.get(id);
    if (a) a.emailVerified = true;
  }
  async setPasswordHash(id: string, hash: string): Promise<void> {
    const a = this.accounts.get(id);
    if (a) a.passwordHash = hash;
  }
  async softDeleteAccount(id: string, at: string): Promise<void> {
    const a = this.accounts.get(id);
    if (a) a.deletedAt = at;
  }
  async hardDeleteAccountsDeletedBefore(cutoffIso: string): Promise<number> {
    let n = 0;
    for (const [id, a] of [...this.accounts]) {
      if (a.deletedAt !== null && a.deletedAt < cutoffIso) {
        this.accounts.delete(id);
        this.byEmail.delete(a.email.toLowerCase());
        n++;
      }
    }
    return n;
  }

  async addMembership(m: Membership): Promise<void> {
    this.memberships.set(this.mkey(m.accountId, m.campaignId), m);
  }
  async membership(accountId: string, campaignId: string): Promise<Membership | null> {
    return this.memberships.get(this.mkey(accountId, campaignId)) ?? null;
  }
  async removeMembership(accountId: string, campaignId: string): Promise<void> {
    this.memberships.delete(this.mkey(accountId, campaignId));
  }
  async membershipsForAccount(accountId: string): Promise<(Membership & { campaignName: string })[]> {
    return [...this.memberships.values()]
      .filter((m) => m.accountId === accountId)
      .map((m) => ({ ...m, campaignName: this.campaigns.get(m.campaignId)?.name ?? '(deleted campaign)' }));
  }
  async ownedCampaigns(accountId: string): Promise<{ id: string; name: string }[]> {
    return [...this.campaigns.values()]
      .filter((c) => c.ownerAccountId === accountId)
      .map((c) => ({ id: c.id, name: c.name }));
  }
  async campaignIdForSession(playSessionId: string): Promise<string | null> {
    return this.sessions.get(playSessionId) ?? null;
  }
  async sessionIdForCampaign(campaignId: string): Promise<string | null> {
    for (const [sessionId, cid] of this.sessions) if (cid === campaignId) return sessionId;
    return null;
  }
  async membersOfCampaign(campaignId: string): Promise<{ accountId: string; displayName: string; role: 'dm' | 'player' }[]> {
    return [...this.memberships.values()]
      .filter((m) => m.campaignId === campaignId)
      .flatMap((m) => (m.role === 'dm' || m.role === 'player'
        ? [{
            accountId: m.accountId,
            displayName: this.accounts.get(m.accountId)?.displayName ?? '(removed)',
            role: m.role,
          }]
        : []));
  }

  async putCharacter(c: CharacterRow): Promise<void> {
    this.characters.set(this.mkey(c.accountId, c.campaignId), c);
  }
  async characterFor(accountId: string, campaignId: string): Promise<CharacterRow | null> {
    return this.characters.get(this.mkey(accountId, campaignId)) ?? null;
  }
  async charactersOfCampaign(campaignId: string): Promise<CharacterRow[]> {
    return [...this.characters.values()].filter((c) => c.campaignId === campaignId);
  }

  async putRoom(r: RoomRow): Promise<void> {
    /* Setting a room current demotes the others, mirroring the partial unique
       index in Postgres: "which map are we on" is one answer, not a race. */
    if (r.isCurrent) {
      for (const [key, existing] of this.rooms) {
        if (existing.campaignId === r.campaignId && existing.id !== r.id) {
          this.rooms.set(key, { ...existing, isCurrent: false });
        }
      }
    }
    this.rooms.set(r.id, r);
  }
  async currentRoom(campaignId: string): Promise<RoomRow | null> {
    for (const r of this.rooms.values()) if (r.campaignId === campaignId && r.isCurrent) return r;
    return null;
  }

  async putTableDisplayToken(t: { tokenHash: string; campaignId: string }): Promise<void> {
    this.tableDisplayTokens.set(t.tokenHash, { campaignId: t.campaignId, revoked: false });
  }
  async tableDisplayCampaignId(tokenHash: string): Promise<string | null> {
    const t = this.tableDisplayTokens.get(tokenHash);
    return t && !t.revoked ? t.campaignId : null;
  }
  async revokeTableDisplayTokens(campaignId: string): Promise<void> {
    for (const t of this.tableDisplayTokens.values()) if (t.campaignId === campaignId) t.revoked = true;
  }

  async putVerification(t: TokenRow): Promise<void> { this.verifications.set(t.tokenHash, t); }
  async takeVerification(tokenHash: string): Promise<TokenRow | null> {
    return this.consume(this.verifications, tokenHash);
  }
  async putReset(t: TokenRow): Promise<void> { this.resets.set(t.tokenHash, t); }
  async takeReset(tokenHash: string): Promise<TokenRow | null> {
    return this.consume(this.resets, tokenHash);
  }
  async putRefresh(t: TokenRow): Promise<void> { this.refresh.set(t.tokenHash, t); }
  async getRefresh(tokenHash: string): Promise<TokenRow | null> {
    const t = this.refresh.get(tokenHash);
    return t && !t.revokedAt ? t : null;
  }
  async revokeRefresh(tokenHash: string): Promise<void> {
    const t = this.refresh.get(tokenHash);
    if (t) t.revokedAt = Math.floor(Date.now() / 1000);
  }
  async revokeAllRefresh(accountId: string): Promise<void> {
    for (const t of this.refresh.values()) if (t.accountId === accountId) t.revokedAt = 1;
  }

  private consume(map: Map<string, TokenRow>, tokenHash: string): TokenRow | null {
    const t = map.get(tokenHash);
    if (!t) return null;
    map.delete(tokenHash); // single-use
    return t;
  }
}

export type { ViewerRole };
