# @questra/contracts

The shared spine of the Questra codebase. Everything in the app — client, server, tests, mocks — imports its shapes from here and only here.

What lives here:
- `src/rules/expr.ts` — the closed expression language (dice + formulas), parser + seeded evaluator. One grammar for "8d6", "1d10 + level", "-2 * exhaustion_level".
- `src/rules/effects.ts` — the effect-hook vocabulary. This union IS the routine/novel boundary.
- `src/rules/entities.ts` — the rules-entity envelope + typed meta (condition/spell/monster/class), plain-language ban list.
- `src/play/events.ts` — the play event vocabulary, intents, and shared pure functions (advantage collapse, cover, concentration DC, passive scores).
- `src/play/visibility.ts` — the permission filter. Secret data is stripped HERE, before fan-out.
- `src/fixtures/` — canonical data: Prone, Fireball, Goblin Warrior, Fighter 1–5 + Second Wind, and the Torvald combat trace. Golden tests byte-compare against these.

Commands: `npm run check` (typecheck + tests) · `npm run build` · `npm test`

Rule zero: features conform to this package; this package changes only by deliberate contract PR (types + fixtures + tests together).
