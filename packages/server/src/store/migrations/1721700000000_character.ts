/**
 * Player characters (Brief 03 / the character wizard).
 *
 * WHAT IS STORED AND WHY IT IS NOT A SHEET. `choices` is the wizard's output —
 * class, background, species, ability scores, the background spend. The
 * computed sheet (HP, AC, saves, skills, spell slots, attacks) is a pure
 * function of those choices plus the rules data, so storing it would mean
 * keeping a derived value that goes stale the moment a rules table is
 * corrected, in a second place that can disagree with the first. Every
 * consumer runs computeSheet instead. This is the same reasoning that makes
 * levelling re-run the computation over bumped choices rather than patch a
 * stored sheet.
 *
 * jsonb rather than columns-per-field: the shape is owned by
 * `CharacterChoicesSchema` in contracts and validated there. Spreading it
 * across thirty columns would fork the schema into the database, where zod
 * cannot see it, and every wizard step would become a migration.
 *
 * ONE CHARACTER PER PERSON PER CAMPAIGN, enforced by the unique index rather
 * than by application code. A player in three campaigns has three characters —
 * the sheet you bring to one game is not the sheet you bring to another — and
 * the constraint is what makes "the character I play here" a well-defined
 * phrase rather than a convention someone has to remember.
 *
 * `name` is denormalised out of choices.identity.name so a lobby roster can be
 * rendered without folding rules data, which is the difference between one
 * cheap query and loading the engine on a screen that only wants a list.
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.createTable('character', {
    id: { type: 'text', primaryKey: true },
    campaign_id: { type: 'text', notNull: true, references: 'campaign', onDelete: 'CASCADE' },
    account_id: { type: 'text', notNull: true, references: 'account', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    choices: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  /* Deleting a campaign or an account takes its characters with it (ON DELETE
     CASCADE above) — a character with no table and no owner is not a record
     worth keeping, and leaving orphans would quietly break the account-deletion
     guarantee. */
  pgm.addConstraint('character', 'character_one_per_member', {
    unique: ['campaign_id', 'account_id'],
  });

  /* The lobby's query: every character in one campaign, to light up the
     roster. Account-first lookups ride the unique index above. */
  pgm.createIndex('character', 'campaign_id', { name: 'character_by_campaign' });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('character');
}
