/**
 * Rooms — the maps a campaign plays on (Brief 06, ADR-0015's M3 persistence).
 *
 * A "room" is the battle map itself: a grid of five-foot cells, what is on
 * each of them, where every token stands, and which cells the players have
 * been allowed to see. Without one persisted, a play session has nowhere to
 * open — which is exactly where the shell stopped before this.
 *
 * jsonb for the room body, same reasoning as `character.choices`: the shape is
 * owned by `RoomSchema` in contracts and validated there. Splitting cellTags,
 * assets and tokens into their own tables would fork that schema into the
 * database where zod cannot see it, and would turn every map edit into a
 * multi-table transaction for no gain at this size.
 *
 * FOG IS STORED WHOLE AND FILTERED ON THE WAY OUT. `revealed` lives in the
 * room body as the complete truth, and `filterRoomForViewer` strips unrevealed
 * cells and hidden tokens per viewer BEFORE a player payload is built
 * (Brief 06 non-negotiable #3 — server-side, not client-side hiding). Storing
 * a per-player copy instead would mean the fog could drift between viewers,
 * and would make "the DM reveals a corridor" a write to every player's row.
 *
 * A campaign has many rooms over its life; `is_current` marks the one a
 * session opens into. A partial unique index enforces at most one current room
 * per campaign, so "which map are we on" is a fact rather than a convention.
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.createTable('room', {
    id: { type: 'text', primaryKey: true },
    campaign_id: { type: 'text', notNull: true, references: 'campaign', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    /** The whole Room shape (grid, cellTags, revealed, assets, tokens). */
    body: { type: 'jsonb', notNull: true },
    is_current: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('room', 'campaign_id', { name: 'room_by_campaign' });

  /* At most one current room per campaign. Partial, so the many non-current
     rooms a campaign accumulates do not collide with each other. */
  pgm.createIndex('room', 'campaign_id', {
    name: 'room_one_current_per_campaign',
    unique: true,
    where: 'is_current',
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('room');
}
