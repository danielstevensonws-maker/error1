/**
 * @questra/contracts — the shared spine.
 *
 * RULES FOR EVERY SESSION (mirrored in CLAUDE.md):
 *  1. Features conform to these types; types change only by deliberate contract PR.
 *  2. The event union and effect-hook union grow here first, never inline in a feature.
 *  3. Fixtures in ./fixtures are canonical — golden tests compare against them byte-for-byte.
 */
export * from './rules/expr.js';
export * from './rules/effects.js';
export * from './rules/entities.js';
export * from './rules/sheet.js';
export * from './play/events.js';
export * from './play/visibility.js';
export * from './play/wire.js';
export * from './play/ai.js';
export * from './world/room.js';
export * from './identity.js';
export * from './campaign.js';
