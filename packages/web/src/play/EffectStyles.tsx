/**
 * EffectStyles — the atmosphere layer's own vocabulary.
 *
 * WHY THIS IS A SEPARATE STYLESHEET. The play screen's files are scanned by
 * hud-type-hygiene, which forbids naming a duration directly: a component asks
 * the ramp for a role and the token owns the number. Screen effects genuinely
 * need durations the shared ramp does not have — weather runs in seconds where
 * every interaction token is measured in a couple of hundred milliseconds, and
 * putting a two-second veil on the interaction ramp would corrupt it for
 * everything that legitimately uses it.
 *
 * So this file follows the pattern the shell already uses (RoadStyles owns the
 * --rd-* vocabulary, every screen spends it): ONE file names the effect
 * durations, and nothing else may. The discipline is unchanged — define the
 * vocabulary in exactly one place — even though the place is new.
 *
 * Colours are still theme tokens. There is no reason for an effect to invent
 * one, and a hardcoded cold blue would fight a warm map in the wrong theme.
 */
import type { ReactElement } from 'react';

const CSS = `
/* Effect durations, named rather than sprinkled. Weather is deliberately
   slower than impact: a shudder is over before you look, a storm is a mood. */
.qa2-screen {
  --qa-fx-quick: 600ms;
  --qa-fx-flash: 700ms;
  --qa-fx-loop: 900ms;
  --qa-fx-mood: 1600ms;
  --qa-fx-long: 1800ms;
  --qa-fx-veil: 2000ms;
}

/* ---- screen effects --------------------------------------------------------
   Ephemeral atmosphere (Brief 10 §4). Pointer events pass straight through —
   an effect that swallows a click mid-fight is worse than no effect. Every one
   is fixed-length and removes itself, so nothing accumulates over four hours.

   Reduce-motion is handled in the component by rendering nothing at all, not
   here by shortening a duration: a faster shake is still a shake. */
.qa-fx {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}

/* The whole screen moves. Small and brief — this is a shudder, not a ride. */
.qa-fx.is-shake { animation: qa-fx-shake var(--qa-fx-quick) var(--qa-ease); }
@keyframes qa-fx-shake {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-4px, 2px); }
  40% { transform: translate(4px, -2px); }
  60% { transform: translate(-3px, -1px); }
  80% { transform: translate(3px, 1px); }
}

.qa-fx-flash {
  position: absolute;
  inset: 0;
  background: var(--qa-ink);
  opacity: 0;
  animation: qa-fx-flash var(--qa-fx-flash) var(--qa-ease);
}
@keyframes qa-fx-flash {
  0% { opacity: 0; }
  6% { opacity: 0.55; }
  12% { opacity: 0.1; }
  20% { opacity: 0.4; }
  100% { opacity: 0; }
}

/* Rain is drawn rather than animated per-drop: a repeating gradient sliding
   down costs one composited layer instead of a hundred elements. */
.qa-fx-rain {
  position: absolute;
  inset: -20%;
  /* The ink token at low opacity, so rain reads correctly in either theme
     rather than being a hardcoded cold blue that fights a warm map. */
  background-image: repeating-linear-gradient(
    102deg,
    transparent 0 6px,
    var(--qa-ink-faint) 6px 7px,
    transparent 7px 13px
  );
  animation: qa-fx-rain var(--qa-fx-loop) linear infinite;
}
@keyframes qa-fx-rain {
  from { transform: translateY(-8%); }
  to { transform: translateY(8%); }
}

.qa-fx-torch {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 55%, transparent 30%, var(--qa-map-lo) 100%);
  animation: qa-fx-torch var(--qa-fx-mood) var(--qa-ease);
}
@keyframes qa-fx-torch {
  0%, 100% { opacity: 0.55; }
  15% { opacity: 0.85; }
  30% { opacity: 0.45; }
  55% { opacity: 0.9; }
  70% { opacity: 0.6; }
}

.qa-fx-blood {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 180px 60px var(--qa-danger);
  opacity: 0;
  animation: qa-fx-blood var(--qa-fx-long) var(--qa-ease);
}
@keyframes qa-fx-blood {
  0% { opacity: 0; }
  25% { opacity: 0.5; }
  100% { opacity: 0; }
}

.qa-fx-fade {
  position: absolute;
  inset: 0;
  background: var(--qa-map-lo);
  opacity: 0;
  animation: qa-fx-fade var(--qa-fx-veil) var(--qa-ease);
}
@keyframes qa-fx-fade {
  0% { opacity: 0; }
  40%, 60% { opacity: 1; }
  100% { opacity: 0; }
}
`;

/**
 * Mounted alongside ScreenStyles by whichever screen draws effects. Two style
 * elements rather than one is deliberate: this vocabulary is scoped to the
 * atmosphere layer and should be removable without touching the HUD's.
 */
export function EffectStyles(): ReactElement {
  return <style data-qa-effects>{CSS}</style>;
}
