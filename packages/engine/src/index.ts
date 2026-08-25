/**
 * @questra/engine — the pure event-sourced engine, sheet computation, and the
 * SRD ingestion pipeline. Depends on @questra/contracts for every shape; never
 * imports anything AI (ADR-0005).
 *
 * M1.1 surface: the ingestion pipeline + the verified rules dataset + a loader
 * that refuses `draft` entities outside dev. The event-sourced projection and
 * d20 pipeline arrive in M2 (Brief 02).
 */
export * from './ingest/conditions.js';
export * from './ingest/spells.js';
export * from './ingest/monsters.js';
export * from './ingest/classes.js';
export * from './ingest/namedEntities.js';
export * from './ingest/items.js';
export * from './ingest/tables.js';
export * from './ingest/pipeline.js';
export * from './data/conditions.js';
export * from './data/slice.js';
export * from './data/spells.js';
export * from './data/monsters.js';
export * from './data/classes.js';
export * from './data/named.js';
export * from './data/origins.js';
export * from './data/items.js';
export * from './data/tables.js';
export * from './data/loader.js';
export * from './sim/state.js';
export * from './sim/projection.js';
export * from './sim/encounter.js';
export * from './sim/pipeline.js';
export * from './sim/cascade.js';
export * from './sim/sheet.js';
export * from './sim/combatant-from-character.js';
export * from './sim/starter-room.js';
export * from './sim/placement.js';
export * from './sim/narration.js';
export * from './sim/duration.js';
export * from './sim/dying.js';
export * from './sim/rest.js';
export * from './sim/advancement.js';
export * from './sim/shop.js';
export * from './sim/prompts.js';
export * from './sim/legality.js';

import { CONDITIONS } from './data/conditions.js';
import { GOBLIN_WARRIOR, FIREBALL } from './data/slice.js';
import { CLASSES } from './data/classes.js';
import { draftSpells } from './data/spells.js';
import { draftMonsters } from './data/monsters.js';
import { draftNamed } from './data/named.js';
import { draftItems } from './data/items.js';
import type { RulesEntity } from '@questra/contracts';

/**
 * The verified dataset: 15 conditions + the slice monster/spell + the 12 full
 * classes. (The Fighter comes from the full class dataset — the fixture's 1–5
 * excerpt is superseded, so it is not added separately here.) Safe in real sessions.
 */
export const VERIFIED_DATASET: RulesEntity[] = [...CONDITIONS, GOBLIN_WARRIOR, FIREBALL, ...CLASSES];

/** The full dataset including drafts (verified core + draft spells/monsters/species/backgrounds/feats/items). Drafts are dev-only via the loader. */
export function fullDataset(): RulesEntity[] {
  return [...VERIFIED_DATASET, ...draftSpells(), ...draftMonsters(), ...draftNamed(), ...draftItems()];
}
