/**
 * Brief 14 §2 — membership plumbing: the join link and the table_display credential.
 *
 * A join code is the SAME kind of thing as a verification/reset/refresh token
 * (1721500000000_accounts_membership): possession is access, so it is stored
 * HASHED and matched by hashing the incoming code (ADR-0004). It lives as a
 * column on `campaign` rather than its own table because a campaign has exactly
 * one live join code at a time — "regenerable" (brief-14 §2) means overwriting
 * it, which immediately invalidates the old link.
 *
 * `table_display` has no account behind it — it is a shared screen on a TV, not
 * a person who signed up — so it is its own token table rather than a fake
 * account with a password. `revoked_at` is what "the DM can turn it off" means.
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.addColumns('campaign', {
    join_token_hash: { type: 'text', notNull: false }, // null ⇒ no live link (shouldn't happen post-create, but not enforced)
  });
  // a join code must resolve to at most one campaign
  pgm.addConstraint('campaign', 'campaign_join_token_hash_uniq', { unique: 'join_token_hash' });

  pgm.createTable('table_display_token', {
    token_hash: { type: 'text', primaryKey: true },
    campaign_id: { type: 'text', notNull: true, references: 'campaign', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    revoked_at: { type: 'timestamptz', notNull: false },
  });
  pgm.createIndex('table_display_token', 'campaign_id', { name: 'table_display_token_by_campaign' });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('table_display_token');
  pgm.dropConstraint('campaign', 'campaign_join_token_hash_uniq');
  pgm.dropColumns('campaign', ['join_token_hash']);
}
