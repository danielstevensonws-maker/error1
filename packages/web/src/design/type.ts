/**
 * design/type — the app's type ramp, expressed as ROLES.
 *
 * A component asks for a role and therefore cannot pick a number. That
 * constraint exists because the surface this ramp was first written for drifted
 * badly without it: four different sizes (8.5px, 9px, 9.5px, 10px) were all
 * rendering the same "small mono caps label", plus one-off 13px and 22px, and
 * nothing failed because nothing was looking. `test/hud-type-hygiene.test.ts`
 * is now looking, and it fails the build on a numeric `fontSize` in any file
 * on the guard list.
 *
 * Six sizes are in play — whisper 10, label 12, body 16, lg 20, title 28,
 * display 40 — and every one already exists in @questra/theme. Nothing here
 * invents a size, because `packages/theme` is byte-identity-guarded against
 * the upstream Claude Design project (ADR-0014): a missing value gets raised,
 * never fabricated.
 *
 * THE RULE UNDERNEATH (Player View design request §3): **prose is a serif,
 * data is mono.** A reader can tell at a glance whether they are looking at
 * the story or at the arithmetic. The play screen leans on it hardest — the
 * round spine sets every combatant's name in the display serif and every
 * initiative number in mono, so the rail reads as a cast list with a running
 * order rather than as a table of rows — but it holds everywhere, which is
 * why this lives in the shared layer rather than beside one screen.
 */
import type { CSSProperties } from 'react';

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

/** The quiet heading over a region or a readout — ROUND 3, ACTION, TARGET. */
export const eyebrow: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-whisper)',
  letterSpacing: 'var(--qa-tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--qa-ink-faint)',
};

/** Your own name, on the near edge. The largest fiction voice on the screen. */
export const heroName: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-title)',
  color: 'var(--qa-ink)',
  lineHeight: 1,
};

/**
 * The wordmark and the shell's page titles (Landing, Home, Join) — the display
 * role at its ceiling, `--qa-text-display`. The ramp has no size above this one
 * (six sizes exist; nothing here invents a seventh), so a screen that wants the
 * wordmark bigger than 40px scales the CONTAINER with `transform`, never the
 * font-size — composition is the composing screen's job, per design/styles.tsx's
 * own split of chrome vs. position. That keeps the actual type-size vocabulary
 * exactly six values everywhere, title screen included.
 */
export const heroTitle: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-display)',
  color: 'var(--qa-ink)',
  lineHeight: 1,
  letterSpacing: '0.01em',
};

/** The scene's name in the top rail. */
export const sceneName: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-lg)',
  color: 'var(--qa-ink)',
  lineHeight: 1.1,
};

/** A member of the cast, on the round spine. Serif — these are people, not rows. */
export const castName: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-body)',
  color: 'var(--qa-ink)',
  lineHeight: 1.1,
};

/** The number a player reads across the table: HP, AC, an ability modifier. */
export const statValue: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-lg)',
  fontWeight: 600,
  color: 'var(--qa-ink)',
  lineHeight: 1,
};

/** The settled total of a roll — the one hero number on the screen. */
export const rollTotal: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-display)',
  fontWeight: 600,
  color: 'var(--qa-ink)',
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

/** Data supporting a value — a to-hit, a damage die, a resource count. */
export const statMeta: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
  fontVariantNumeric: 'tabular-nums',
};

/** The smallest data there is — an initiative number, an HP fraction on the rail. */
export const micro: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-whisper)',
  color: 'var(--qa-ink-faint)',
  fontVariantNumeric: 'tabular-nums',
};

/** The name of a thing you can act on — an action tile, an inventory line. */
export const itemName: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink)',
  lineHeight: 1.2,
};

/** The story voice: narration, rulings, the DM talking. Given real size. */
export const narration: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-body)',
  color: 'var(--qa-ink)',
  lineHeight: 1.45,
};

/** Secondary prose — table talk, help text, a flavour line. */
export const prose: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
  lineHeight: 1.4,
};

/** Something a player said, quoted back to them before a ruling lands on it. */
export const quote: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-body)',
  fontStyle: 'italic',
  color: 'var(--qa-ink)',
  lineHeight: 1.35,
};
