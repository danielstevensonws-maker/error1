/**
 * @questra/ui — the shared look-and-feel layer.
 *
 * These are the repeats: the surfaces, tags, buttons, and labels every
 * primitive composes rather than reinventing. Everything here is themed only
 * via @questra/theme's --qa-* tokens (ADR-0014), so the whole app re-themes
 * from one file with no component edits.
 *
 * This package holds NO game logic and imports no contracts — it is look only.
 */
export * from './core/index.js';
export * from './hud/index.js';
