/**
 * Postgres AuthRepo (Brief 14 §1) — the durable implementation behind the AuthRepo
 * seam. Parameterized SQL, no ORM (same discipline as PostgresEventStore). Token
 * rows store only the sha256 hash; raw tokens never touch the database. Reads the
 * `campaign.owner_account_id` FK (from the initial migration) for the deletion
 * guard, and joins `play_session → campaign` for resolveToken.
 */
import pg from 'pg';
import type { Membership, Campaign } from '@questra/contracts';
import type { AuthRepo, AccountRow, CharacterRow, RoomRow, TokenRow } from './repo.js';

const { Pool } = pg;

type CampaignDb = { id: string; name: string; owner_account_id: string; created_at: Date };
function toCampaign(r: CampaignDb): Campaign {
  return { id: r.id, name: r.name, ownerAccountId: r.owner_account_id, createdAt: r.created_at.toISOString() };
}

type AccountDb = {
  id: string; email: string; email_verified: boolean; display_name: string;
  password_hash: string | null; onboarding: string; settings: Record<string, unknown>;
  age_bracket: 'under13' | '13to17' | 'adult' | null; created_at: Date; deleted_at: Date | null;
};

function toAccountRow(r: AccountDb): AccountRow {
  return {
    id: r.id, email: r.email, emailVerified: r.email_verified, displayName: r.display_name,
    passwordHash: r.password_hash, onboarding: r.onboarding, settings: r.settings,
    ageBracket: r.age_bracket, createdAt: r.created_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  };
}

type CharacterDb = {
  id: string; campaign_id: string; account_id: string;
  name: string; choices: unknown; created_at: Date;
};
function toCharacter(r: CharacterDb): CharacterRow {
  return {
    id: r.id, campaignId: r.campaign_id, accountId: r.account_id,
    name: r.name, choices: r.choices, createdAt: r.created_at.toISOString(),
  };
}

type RoomDb = {
  id: string; campaign_id: string; name: string;
  body: unknown; is_current: boolean; created_at: Date;
};
function toRoom(r: RoomDb): RoomRow {
  return {
    id: r.id, campaignId: r.campaign_id, name: r.name,
    body: r.body, isCurrent: r.is_current, createdAt: r.created_at.toISOString(),
  };
}

export class PostgresAuthRepo implements AuthRepo {
  private pool: pg.Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async createAccount(a: Omit<AccountRow, 'createdAt' | 'deletedAt'> & { createdAt: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO account (id, email, email_verified, display_name, password_hash, onboarding, settings, age_bracket, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [a.id, a.email, a.emailVerified, a.displayName, a.passwordHash, a.onboarding, JSON.stringify(a.settings), a.ageBracket, a.createdAt],
    );
  }
  async accountByEmail(email: string): Promise<AccountRow | null> {
    const { rows } = await this.pool.query<AccountDb>(`SELECT * FROM account WHERE lower(email) = lower($1)`, [email]);
    return rows[0] ? toAccountRow(rows[0]) : null;
  }
  async accountById(id: string): Promise<AccountRow | null> {
    const { rows } = await this.pool.query<AccountDb>(`SELECT * FROM account WHERE id = $1`, [id]);
    return rows[0] ? toAccountRow(rows[0]) : null;
  }
  async setEmailVerified(id: string): Promise<void> {
    await this.pool.query(`UPDATE account SET email_verified = true WHERE id = $1`, [id]);
  }
  async setPasswordHash(id: string, hash: string): Promise<void> {
    await this.pool.query(`UPDATE account SET password_hash = $2 WHERE id = $1`, [id, hash]);
  }
  async softDeleteAccount(id: string, at: string): Promise<void> {
    await this.pool.query(`UPDATE account SET deleted_at = $2 WHERE id = $1`, [id, at]);
  }
  async hardDeleteAccountsDeletedBefore(cutoffIso: string): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM account WHERE deleted_at IS NOT NULL AND deleted_at < $1`, [cutoffIso],
    );
    return rowCount ?? 0;
  }

  async createCampaign(c: Campaign): Promise<void> {
    await this.pool.query(
      `INSERT INTO campaign (id, name, owner_account_id, created_at) VALUES ($1,$2,$3,$4)`,
      [c.id, c.name, c.ownerAccountId, c.createdAt],
    );
  }
  async campaignById(id: string): Promise<Campaign | null> {
    const { rows } = await this.pool.query<CampaignDb>(`SELECT id, name, owner_account_id, created_at FROM campaign WHERE id = $1`, [id]);
    return rows[0] ? toCampaign(rows[0]) : null;
  }
  async setJoinTokenHash(campaignId: string, tokenHash: string): Promise<void> {
    await this.pool.query(`UPDATE campaign SET join_token_hash = $2 WHERE id = $1`, [campaignId, tokenHash]);
  }
  async campaignByJoinTokenHash(tokenHash: string): Promise<Campaign | null> {
    const { rows } = await this.pool.query<CampaignDb>(
      `SELECT id, name, owner_account_id, created_at FROM campaign WHERE join_token_hash = $1`, [tokenHash],
    );
    return rows[0] ? toCampaign(rows[0]) : null;
  }
  async createPlaySession(id: string, campaignId: string, createdAt: string): Promise<void> {
    await this.pool.query(`INSERT INTO play_session (id, campaign_id, created_at) VALUES ($1,$2,$3)`, [id, campaignId, createdAt]);
  }

  async addMembership(m: Membership): Promise<void> {
    await this.pool.query(
      `INSERT INTO membership (campaign_id, account_id, role, created_at) VALUES ($1,$2,$3,$4)
       ON CONFLICT (campaign_id, account_id) DO UPDATE SET role = EXCLUDED.role`,
      [m.campaignId, m.accountId, m.role, m.createdAt],
    );
  }
  async membership(accountId: string, campaignId: string): Promise<Membership | null> {
    const { rows } = await this.pool.query<{ campaign_id: string; account_id: string; role: Membership['role']; created_at: Date }>(
      `SELECT * FROM membership WHERE account_id = $1 AND campaign_id = $2`, [accountId, campaignId],
    );
    const r = rows[0];
    return r ? { campaignId: r.campaign_id, accountId: r.account_id, role: r.role, createdAt: r.created_at.toISOString() } : null;
  }
  async removeMembership(accountId: string, campaignId: string): Promise<void> {
    await this.pool.query(`DELETE FROM membership WHERE account_id = $1 AND campaign_id = $2`, [accountId, campaignId]);
  }
  async membershipsForAccount(accountId: string): Promise<(Membership & { campaignName: string })[]> {
    const { rows } = await this.pool.query<{
      campaign_id: string; account_id: string; role: Membership['role']; created_at: Date; campaign_name: string;
    }>(
      `SELECT m.campaign_id, m.account_id, m.role, m.created_at, c.name AS campaign_name
       FROM membership m JOIN campaign c ON c.id = m.campaign_id
       WHERE m.account_id = $1`,
      [accountId],
    );
    return rows.map((r) => ({
      campaignId: r.campaign_id, accountId: r.account_id, role: r.role,
      createdAt: r.created_at.toISOString(), campaignName: r.campaign_name,
    }));
  }
  async ownedCampaigns(accountId: string): Promise<{ id: string; name: string }[]> {
    const { rows } = await this.pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM campaign WHERE owner_account_id = $1`, [accountId],
    );
    return rows;
  }
  async campaignIdForSession(playSessionId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ campaign_id: string | null }>(
      `SELECT campaign_id FROM play_session WHERE id = $1`, [playSessionId],
    );
    return rows[0]?.campaign_id ?? null;
  }

  /* Oldest first, so a campaign that somehow has more than one play session
     resolves to the original rather than to whichever row the planner returns.
     Campaign creation mints exactly one today; this makes the choice
     deterministic rather than relying on that staying true. */
  async sessionIdForCampaign(campaignId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM play_session WHERE campaign_id = $1 ORDER BY created_at ASC, id ASC LIMIT 1`, [campaignId],
    );
    return rows[0]?.id ?? null;
  }

  async membersOfCampaign(campaignId: string): Promise<{ accountId: string; displayName: string; role: 'dm' | 'player' }[]> {
    /* Joined against account so the lobby gets names in one round trip. DMs
       first, then alphabetical — a stable order beats insertion order for a
       list people read repeatedly. */
    const { rows } = await this.pool.query<{ account_id: string; display_name: string; role: 'dm' | 'player' }>(
      `SELECT m.account_id, a.display_name, m.role
         FROM membership m
         JOIN account a ON a.id = m.account_id
        WHERE m.campaign_id = $1 AND a.deleted_at IS NULL
        ORDER BY (m.role = 'dm') DESC, a.display_name ASC`,
      [campaignId],
    );
    return rows.map((r) => ({ accountId: r.account_id, displayName: r.display_name, role: r.role }));
  }

  /* Upsert: re-running the wizard replaces the character rather than failing on
     the one-per-member constraint. A player who rebuilds before session one is
     doing something ordinary, not something exceptional. */
  async putCharacter(c: CharacterRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO character (id, campaign_id, account_id, name, choices, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (campaign_id, account_id)
       DO UPDATE SET name = EXCLUDED.name, choices = EXCLUDED.choices`,
      [c.id, c.campaignId, c.accountId, c.name, JSON.stringify(c.choices), c.createdAt],
    );
  }

  async characterFor(accountId: string, campaignId: string): Promise<CharacterRow | null> {
    const { rows } = await this.pool.query<CharacterDb>(
      `SELECT * FROM character WHERE account_id = $1 AND campaign_id = $2`, [accountId, campaignId],
    );
    return rows[0] ? toCharacter(rows[0]) : null;
  }

  async charactersOfCampaign(campaignId: string): Promise<CharacterRow[]> {
    const { rows } = await this.pool.query<CharacterDb>(
      `SELECT * FROM character WHERE campaign_id = $1`, [campaignId],
    );
    return rows.map(toCharacter);
  }

  /* Demote-then-insert in one transaction: the partial unique index would
     reject two current rooms, and doing it in two statements outside a
     transaction would leave a window where a concurrent read sees none. */
  async putRoom(r: RoomRow): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (r.isCurrent) {
        await client.query(
          `UPDATE room SET is_current = false WHERE campaign_id = $1 AND id <> $2 AND is_current`,
          [r.campaignId, r.id],
        );
      }
      await client.query(
        `INSERT INTO room (id, campaign_id, name, body, is_current, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, body = EXCLUDED.body, is_current = EXCLUDED.is_current`,
        [r.id, r.campaignId, r.name, JSON.stringify(r.body), r.isCurrent, r.createdAt],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async currentRoom(campaignId: string): Promise<RoomRow | null> {
    const { rows } = await this.pool.query<RoomDb>(
      `SELECT * FROM room WHERE campaign_id = $1 AND is_current LIMIT 1`, [campaignId],
    );
    return rows[0] ? toRoom(rows[0]) : null;
  }

  async putTableDisplayToken(t: { tokenHash: string; campaignId: string; createdAt: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO table_display_token (token_hash, campaign_id, created_at) VALUES ($1,$2,$3)`,
      [t.tokenHash, t.campaignId, t.createdAt],
    );
  }
  async tableDisplayCampaignId(tokenHash: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ campaign_id: string }>(
      `SELECT campaign_id FROM table_display_token WHERE token_hash = $1 AND revoked_at IS NULL`, [tokenHash],
    );
    return rows[0]?.campaign_id ?? null;
  }
  async revokeTableDisplayTokens(campaignId: string): Promise<void> {
    await this.pool.query(
      `UPDATE table_display_token SET revoked_at = now() WHERE campaign_id = $1 AND revoked_at IS NULL`, [campaignId],
    );
  }

  async putVerification(t: TokenRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO email_verification (token_hash, account_id, expires_at) VALUES ($1,$2, to_timestamp($3))`,
      [t.tokenHash, t.accountId, t.expiresAt],
    );
  }
  async takeVerification(tokenHash: string): Promise<TokenRow | null> {
    const { rows } = await this.pool.query<{ account_id: string; expires_at: Date }>(
      `DELETE FROM email_verification WHERE token_hash = $1 RETURNING account_id, expires_at`, [tokenHash],
    );
    const r = rows[0];
    return r ? { tokenHash, accountId: r.account_id, expiresAt: Math.floor(r.expires_at.getTime() / 1000) } : null;
  }
  async putReset(t: TokenRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO password_reset (token_hash, account_id, expires_at) VALUES ($1,$2, to_timestamp($3))`,
      [t.tokenHash, t.accountId, t.expiresAt],
    );
  }
  async takeReset(tokenHash: string): Promise<TokenRow | null> {
    const { rows } = await this.pool.query<{ account_id: string; expires_at: Date }>(
      `DELETE FROM password_reset WHERE token_hash = $1 AND used_at IS NULL RETURNING account_id, expires_at`, [tokenHash],
    );
    const r = rows[0];
    return r ? { tokenHash, accountId: r.account_id, expiresAt: Math.floor(r.expires_at.getTime() / 1000) } : null;
  }
  async putRefresh(t: TokenRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO session_refresh (token_hash, account_id, expires_at) VALUES ($1,$2, to_timestamp($3))`,
      [t.tokenHash, t.accountId, t.expiresAt],
    );
  }
  async getRefresh(tokenHash: string): Promise<TokenRow | null> {
    const { rows } = await this.pool.query<{ account_id: string; expires_at: Date; revoked_at: Date | null }>(
      `SELECT account_id, expires_at, revoked_at FROM session_refresh WHERE token_hash = $1`, [tokenHash],
    );
    const r = rows[0];
    if (!r || r.revoked_at) return null;
    return { tokenHash, accountId: r.account_id, expiresAt: Math.floor(r.expires_at.getTime() / 1000) };
  }
  async revokeRefresh(tokenHash: string): Promise<void> {
    await this.pool.query(`UPDATE session_refresh SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, [tokenHash]);
  }
  async revokeAllRefresh(accountId: string): Promise<void> {
    await this.pool.query(`UPDATE session_refresh SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL`, [accountId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
