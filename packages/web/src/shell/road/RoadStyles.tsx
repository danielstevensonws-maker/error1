/**
 * shell/road — the shell's design language, rebuilt on the play screen's
 * material (owner direction, 2026-08-20: cohesion with the player screen
 * matters more than the shell having its own look).
 *
 * THE RULE THAT CHANGED. The first version of this file gave the shell a
 * deliberately separate register with its own cold --rd-* palette. That was
 * wrong: side by side with the play screen it read as a different product.
 * The shell now uses the SAME tokens the play screen uses — --qa-map-* for the
 * ground, --qa-glass* for panels, --qa-accent for the one warm mark, the same
 * type ramp families — and --rd-* survives only as a small set of ALIASES onto
 * them, so screens keep reading one name while the value comes from the
 * guarded set.
 *
 * WHY ALIASES RATHER THAN A FIND-AND-REPLACE. The shell still needs a handful
 * of decisions the play screen has no opinion on (how big a landing paragraph
 * is, what a campaign card does on hover). Keeping those behind --rd-* names
 * means the shell can be re-pointed at a different theme later by editing this
 * block alone. Nothing downstream hardcodes a colour, which
 * test/shell-token-hygiene.test.ts enforces.
 *
 * WHAT CARRIES BETWEEN SHELL SCREENS:
 *   1  THE TABLE IS ALWAYS UNDER YOU — one Road component, the same top-down
 *      gridded map the play screen draws, at three distances.
 *   2  SECOND PERSON, ALWAYS — "Back at the fire", never "3 members".
 *   3  THE ACCENT MEANS YOU — --qa-accent is reserved for the visitor's own
 *      marks, exactly as the play screen reserves it for your token and turn.
 *   4  PROSE IS A SERIF, DATA IS MONO — design/type.ts's rule, unchanged.
 *
 * The typed-answer ritual stays confined to Landing and Join, the two screens a
 * person meets once. It is now visually the play screen's own DM prompt — the
 * same free-text control that sits under the action rows — so it reads as a
 * preview of the real thing rather than as a landing-page trick.
 *
 * EDITING HAZARD, paid for repeatedly: the CSS is a template literal, so a
 * BACKTICK anywhere inside it — including in a comment — closes the string and
 * the file stops parsing. Write class and property names bare.
 */
import type { ReactElement } from 'react';
import { DesignStyles } from '../../design/index.js';
import { ThemeFonts } from '../../theme/fonts.js';

const CSS = `
/* ---------------------------------------------------------------------------
   ALIASES. Every one resolves to a token the play screen already uses.
   --------------------------------------------------------------------------- */
.rd {
  --rd-ink: var(--qa-ink);
  --rd-dim: var(--qa-ink-dim);
  --rd-faint: var(--qa-ink-faint);
  --rd-line: var(--qa-glass-border);
  --rd-accent: var(--qa-accent);
  --rd-accent-line: var(--qa-accent-line);
  --rd-accent-soft: var(--qa-accent-soft);
  --rd-danger: var(--qa-danger);

  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--qa-map-lo);
  color: var(--rd-ink);
  -webkit-font-smoothing: antialiased;
}

/* ---------------------------------------------------------------------------
   THE TABLE. Byte-for-byte the play screen's ground: the same two grid
   frequencies (58px cells, 290px five-cell majors), the same warm patches, the
   same pulled-back vignette. Fixed rather than absolute because shell pages
   GROW as a scene plays out, and an absolute ground scrolls away underneath
   the words that are still arriving.
   --------------------------------------------------------------------------- */
.rd-table, .rd-vignette { position: fixed; inset: 0; z-index: 0; pointer-events: none; }

.rd-ground {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    linear-gradient(to bottom, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    linear-gradient(to right, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    linear-gradient(to bottom, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    radial-gradient(34% 42% at 24% 30%, var(--qa-map-hi) 0%, transparent 68%),
    radial-gradient(28% 34% at 74% 60%, var(--qa-map-hi) 0%, transparent 70%),
    radial-gradient(42% 38% at 56% 88%, var(--qa-map-mid) 0%, transparent 72%),
    radial-gradient(30% 30% at 88% 18%, var(--qa-map-mid) 0%, transparent 74%),
    radial-gradient(130% 105% at 52% 36%, var(--qa-map-hi) 0%, var(--qa-map-mid) 42%, var(--qa-map-lo) 100%);
  background-size:
    290px 290px, 290px 290px,
    58px 58px, 58px 58px,
    100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%;
  transition: opacity var(--qa-dur-slow) var(--qa-ease);
}

/* Distance is how much table you can see and how lit it is. Camp is dimmer and
   pulled back because Home and Create are screens you came to in order to click
   something, and the ground must not compete with the content. */
.rd-table.is-camp .rd-ground { opacity: 0.5; background-size: 200px 200px, 200px 200px, 40px 40px, 40px 40px, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%; }
.rd-table.is-far {
  position: absolute;
  background: linear-gradient(180deg, var(--qa-map-hi) 0%, var(--qa-map-mid) 100%);
  opacity: 0.6;
}

/* The table wakes when you answer: the same accent bloom the play screen uses
   for your own turn, brought up under the whole ground. This is the one piece
   of choreography in the shell, and only Landing and Join can trigger it. */
.rd-table.is-awake .rd-ground { opacity: 1; }
.rd-table.is-awake::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(46% 40% at 50% 62%, var(--qa-accent-soft) 0%, transparent 72%);
  animation: rd-wake var(--qa-dur-slow) var(--qa-ease) both;
}
@keyframes rd-wake { from { opacity: 0; } to { opacity: 1; } }

/* Legibility, not mood — the same reasoning as the play screen's ground::after:
   enough to hold a panel's contrast, not so much that the room disappears. */
.rd-vignette {
  background: radial-gradient(126% 108% at 50% 42%, transparent 62%, var(--qa-map-lo) 100%);
  opacity: 0.72;
  z-index: 1;
}

/* Pieces at rest. The play screen's token, minus the interaction. */
.rd-pieces { position: absolute; inset: 0; }
.rd-piece {
  position: absolute;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  background: var(--qa-glass-solid);
  opacity: 0.38;
  box-shadow: inset 0 0 12px -4px var(--qa-map-lo);
}
.rd-piece.is-ally { border-color: var(--qa-success); }
.rd-piece.is-you { border-color: var(--qa-accent); box-shadow: 0 0 0 3px var(--qa-accent-soft); opacity: 0.75; }

/* ---------------------------------------------------------------------------
   THE PANEL. The shell's one structural borrowing: identical chrome to
   .qa2-panel, so a shell surface and a play surface are made of the same glass.
   --------------------------------------------------------------------------- */
.rd-panel {
  position: relative;
  z-index: 2;
  background: var(--qa-glass);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  box-shadow: var(--qa-shadow-pop);
}

/* ---------------------------------------------------------------------------
   TYPE. design/type.ts's rule, expressed as classes so shell markup can stay
   free of style objects: prose is a serif, data is mono.
   --------------------------------------------------------------------------- */
.rd-prose {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.5;
  color: var(--rd-ink);
}
.rd-prose em { font-style: italic; color: var(--rd-ink); }
.rd-prose.is-scene { font-size: var(--qa-text-lg); line-height: 1.5; }
.rd-prose.is-reply { color: var(--rd-dim); }

.rd-label {
  margin: 0;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--rd-faint);
}
.rd-micro {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  color: var(--rd-faint);
}
.rd-title {
  margin: 0;
  font-family: var(--qa-font-display);
  font-size: var(--qa-text-title);
  line-height: 1.1;
  color: var(--rd-ink);
}
.rd-detail {
  margin: 0;
  max-width: 46ch;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.5;
  color: var(--rd-dim);
}

/* ---------------------------------------------------------------------------
   THE PROMPT. Visually the play screen's own free-text control — the input
   under the action rows that reads "Or describe what you do". Landing and Join
   use the same widget so the mechanic reads as a preview of the real thing.
   --------------------------------------------------------------------------- */
.rd-turn { display: flex; flex-direction: column; gap: var(--qa-s2); }
.rd-prompt {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s3) var(--qa-s4);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  transition: border-color var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease);
}
.rd-prompt:focus-within { border-color: var(--qa-accent-line); background: var(--qa-glass); }
.rd-prompt.is-said { border-color: var(--qa-accent-line); background: var(--qa-accent-soft); }
.rd-answer {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  color: var(--rd-ink);
  background: none;
  border: none;
  padding: 0;
  caret-color: var(--qa-accent);
}
.rd-answer::placeholder { color: var(--rd-faint); }
.rd-answer:focus { outline: none; }
.rd-prompt.is-said .rd-answer { color: var(--qa-accent); }

/* ---------------------------------------------------------------------------
   FORMS AND CONTROLS. Built from the design layer's vocabulary so a shell
   button and a play-screen button are the same object.
   --------------------------------------------------------------------------- */
.rd-form { display: flex; flex-direction: column; gap: var(--qa-s3); }
.rd-form.is-entering { animation: qa2-rise var(--qa-dur-slow) var(--qa-ease-out) both; }

.rd-field { display: flex; flex-direction: column; gap: var(--qa-s1); }
.rd-field > span {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--rd-faint);
}
.rd-field > input {
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  padding: var(--qa-s2) var(--qa-s3);
  color: var(--rd-ink);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  transition: border-color var(--qa-dur) var(--qa-ease);
}
.rd-field > input::placeholder { color: var(--rd-faint); }
.rd-field > input:focus { outline: none; border-color: var(--qa-accent-line); }

.rd-actions { display: flex; align-items: center; gap: var(--qa-s4); flex-wrap: wrap; margin-top: var(--qa-s1); }
.rd-error { margin: 0; font-family: var(--qa-font-mono); font-size: var(--qa-text-whisper); letter-spacing: var(--qa-tracking-caps); color: var(--rd-danger); }

/* The prompt is excluded: it is autofocused on arrival and Chrome treats
   programmatic focus on a text input as focus-visible, so the global ring drew
   a second hard rectangle inside the prompt before anyone had touched it. Its
   own rule above (the border going accent) is the indicator. */
.rd :focus-visible:not(.rd-answer) { outline: 2px solid var(--qa-accent); outline-offset: 2px; }

@media (max-width: 720px) {
  .rd-prose.is-scene { font-size: var(--qa-text-body); }
}

/* Reduced motion: @questra/theme collapses animation DURATION globally but not
   DELAY, so anything sequenced by delay still makes a visitor wait it out.
   Switched off outright and rendered in its finished state instead. */
.rd.is-still .rd-form,
.rd.is-still .rd-table.is-awake::after { animation: none !important; }
.rd.is-still .rd-ground { transition: none !important; }
`;

/** The shell's sheet, layered on the app's shared design language. */
export function RoadStyles(): ReactElement {
  return (
    <>
      <ThemeFonts />
      <DesignStyles />
      <style>{CSS}</style>
    </>
  );
}
