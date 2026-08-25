/**
 * v2/ScreenStyles — the Player View's own layout, and nothing else.
 *
 * WHAT IS AND IS NOT HERE. Chrome and behaviour live in the shared design
 * layer (src/design/styles.tsx): what a panel is made of, what its controls
 * look like, the focus ring, the reduced-motion guarantee, the keyframes. This
 * file owns only what is true of THIS screen — where each panel sits, the map
 * ground beneath them, and the internals of the four surfaces the play screen
 * invented (the round spine, the near edge, the action rows, the journal).
 *
 * The division is worth keeping honest, because it is what lets an authoring
 * surface reuse .qa2-panel without inheriting a play screen's absolute
 * positioning. Chrome is shared; placement is local. If a rule you are about
 * to add would be equally true of a wizard step or a compendium entry, it
 * belongs in the design layer, not here.
 *
 * THE MAP IS THE HERO (owner direction, 2026-08-16). An earlier pass ran these
 * surfaces flush to the window, which made the HUD a frame — a continuous C
 * down the left, along the bottom and up the right — and made the map what was
 * left over. Chrome is the wrong thing to look at for three hours. So the map
 * is full bleed and every surface is a DISCRETE PANEL floating over it, held
 * off the window by --qa-hud-inset and off each other by the spacing scale.
 *
 * ONE EDITING HAZARD, paid for repeatedly: the CSS below is a template
 * literal, so a BACKTICK anywhere inside it — including inside a CSS comment,
 * where quoting a class name is the natural thing to do — closes the string and
 * the whole file stops parsing. Write class names bare in those comments. The
 * type-hygiene suite asserts this file carries exactly the two backticks that
 * open and close the literal.
 */
import type { ReactElement } from 'react';
import { DesignStyles } from '../../design/index.js';

const CSS = `
/* Every floating panel on this screen is the shared .qa2-panel chrome plus a
   placement. Positioning is applied here rather than in the design layer so
   the same chrome can sit in an ordinary document flow elsewhere. */
.qa2-scene, .qa2-spine, .qa2-journal, .qa2-you, .qa2-act { position: absolute; z-index: 2; }
.qa2-pill.is-spine, .qa2-pill.is-journal, .qa2-pill.is-act { position: absolute; z-index: 2; }

.qa2-screen {
  --qa2-journal: 336px;
  --qa2-spine: 244px;
  --qa2-you: 244px;
  /* The collapsed journal is a pill sized to its own text, not a fixed box —
     this is an approximation used only to keep the action panel centred
     correctly while the journal is collapsed. Same imprecision the width
     override already carried before today; not new. */
  --qa2-journal-closed: 244px;
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--qa-ink);
}

/* ---- the ground: the map is the table surface, full bleed under everything --
   Now that the HUD floats, the map has to CARRY the screen rather than fill the
   hole in a frame. So the placeholder terrain is layered rather than flat: soft
   patches of the warm map tone break up the field, a major grid every five
   cells reads as a battle mat rather than as graph paper, and the vignette is
   pulled back to where it is doing legibility work and no further. All of it is
   still --qa-map-* tokens, so dropping a real terrain image in as the bottom
   layer changes nothing above it. */
.qa2-ground {
  position: absolute;
  inset: 0;
  z-index: 0;
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
}
/* Legibility, not mood: §8 asks that glass survive a bright map, and the
   corners are where the panels sit. Enough to hold a panel's contrast, not so
   much that the room disappears. */
.qa2-ground::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(126% 108% at 50% 42%, transparent 62%, var(--qa-map-lo) 100%);
  opacity: 0.55;
}

.qa2-token {
  position: absolute;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  background: var(--qa-glass-solid);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  color: var(--qa-ink-dim);
  cursor: pointer;
}
.qa2-token.is-ally { border-color: var(--qa-success); color: var(--qa-ink); }
.qa2-token.is-foe { border-color: var(--qa-danger); color: var(--qa-ink); }
.qa2-token.is-you { border-color: var(--qa-accent); box-shadow: 0 0 0 3px var(--qa-accent-soft); color: var(--qa-ink); }
.qa2-token.is-you.is-acting { animation: qa2-breathe var(--qa-dice-settle) var(--qa-ease) infinite alternate; }
.qa2-token.is-down { opacity: 0.55; }
.qa2-token-tag {
  position: absolute;
  top: 100%;
  margin-top: var(--qa-s1);
  padding: 0 var(--qa-s1);
  border-radius: var(--qa-radius-sm);
  background: var(--qa-glass-solid);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
}
.qa2-token-tag.is-hurt { color: var(--qa-danger); }
.qa2-token-tag.is-down { color: var(--qa-ink-faint); }

/* ---- where each panel sits ------------------------------------------------ */

/* The scene's name floats free at the top, centred over the map — the only
   surface that is not a rectangle of controls. */
.qa2-scene {
  top: var(--qa-hud-inset);
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
  gap: var(--qa-s1);
  padding: var(--qa-s2) var(--qa-s5);
  text-align: center;
}
/* The frame controls are their own cluster, not a bar. */
.qa2-controls {
  position: absolute;
  z-index: 2;
  top: var(--qa-hud-inset);
  right: var(--qa-hud-inset);
  display: flex;
  gap: var(--qa-s2);
}
.qa2-spine {
  top: var(--qa-hud-inset);
  left: var(--qa-hud-inset);
  width: var(--qa2-spine);
  max-height: calc(100% - var(--qa-hud-inset) * 2 - 240px);
  padding: var(--qa-s3) 0;
  gap: 0;
}
.qa2-journal {
  right: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: var(--qa2-journal);
  height: min(544px, calc(100% - var(--qa-hud-inset) * 2 - 64px));
  padding: var(--qa-s3) 0 0;
  gap: 0;
}
/* The near edge is TWO independently anchored panels, not a row: who you are
   sits in the bottom-left corner, and the bar you ACT from is centred on the
   screen. Centring it is what every game with an action bar does, and for the
   same reason — it is the one surface your hand returns to, so it belongs under
   the middle of your attention rather than off to one side. Both sit on the
   same baseline. */
.qa2-you {
  left: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: var(--qa2-you);
}
/*
 * CENTRED BETWEEN ITS NEIGHBOURS, NOT ON THE VIEWPORT (owner direction,
 * 2026-08-19). left:50% plus a translateX(-50%) centres on the whole screen —
 * but the You panel (244px) and the journal (336px) are different widths, so
 * centring on the screen left MORE gap on one side than the other by exactly
 * that 92px difference. It read as leaning toward the journal.
 *
 * The fix is the standard CSS trick for centring a fixed-width box in an
 * ASYMMETRIC track: set left and right to the real edges of the two neighbour
 * panels (not the viewport edges), give the box an explicit width, and set
 * its side margins to auto. The browser splits whatever space is left over
 * EQUALLY between the two auto margins — that is specified behaviour
 * (CSS2.1 section 10.3.7), not an approximation, so the gap to the You panel
 * and the gap to the journal end up identical regardless of how unequal the
 * two neighbours are.
 */
.qa2-act {
  left: calc(var(--qa-hud-inset) + var(--qa2-you));
  right: calc(var(--qa-hud-inset) + var(--qa2-journal));
  bottom: var(--qa-hud-inset);
  /* 820px, up from the first pass's 600px (owner direction, 2026-08-18): wide
     enough that Action's solo row and Bonus+Reaction's shared one both show
     real breathing room, while still leaving clear map either side — the
     modest-widen choice, not the full-bleed-bar one. Below 820px of actual
     track space the width shrinks to fit it exactly, so the margins never go
     negative. */
  /* Plus a minimum gap either side: the track alone as the ceiling means the
     bar sits flush against the You panel and the journal at any width where
     the track is under 820, which is every laptop at 1280 and below. */
  width: min(820px, calc(100% - (var(--qa-hud-inset) + var(--qa2-you)) - (var(--qa-hud-inset) + var(--qa2-journal)) - var(--qa-hud-inset) * 2));
  margin: 0 auto;
  min-width: 0;
}
.qa2-screen.is-journal-closed .qa2-act {
  right: calc(var(--qa-hud-inset) + var(--qa2-journal-closed));
  width: min(820px, calc(100% - (var(--qa-hud-inset) + var(--qa2-you)) - (var(--qa-hud-inset) + var(--qa2-journal-closed)) - var(--qa-hud-inset) * 2));
}
/* The collapsed pill sits in exactly the same track, for the same reason —
   collapsing the action panel should not make it jump sideways. */
.qa2-pill.is-act {
  left: calc(var(--qa-hud-inset) + var(--qa2-you));
  right: calc(var(--qa-hud-inset) + var(--qa2-journal));
  bottom: var(--qa-hud-inset);
  width: fit-content;
  margin: 0 auto;
}
.qa2-screen.is-journal-closed .qa2-pill.is-act { right: calc(var(--qa-hud-inset) + var(--qa2-journal-closed)); }

/* Overlays float over everything; the panels stay visible around them, so you
   never lose sight of the table while you read an answer. */
.qa2-over { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
.qa2-over > * { pointer-events: auto; }

/* THE SIGNATURE, part two: when the round arrives at you, the spine's accent
   continues along the top edge of the panel you act from. One accent, one
   journey — and it lands on a panel edge just as happily as on a frame edge. */
.qa2-act::before {
  content: "";
  position: absolute;
  inset: 0 var(--qa-s5) auto var(--qa-s5);
  height: 2px;
  border-radius: var(--qa-radius-round);
  background: linear-gradient(to right, var(--qa-accent), var(--qa-accent-line) 40%, transparent 82%);
  transform-origin: left center;
  opacity: 0;
}
.qa2-act.is-yours::before { opacity: 1; animation: qa2-sweep var(--qa-dur-slow) var(--qa-ease-out); }

/* ---- the round spine ------------------------------------------------------ */
.qa2-spine-head, .qa2-journal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s2);
  padding: 0 var(--qa-s3) var(--qa-s3) var(--qa-s4);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
  flex: none;
}
/* Hugs its contents rather than stretching: a floating panel with a hole in the
   middle of it looks like a bug, not like breathing room. The max-height on the
   panel still caps a long initiative order, and then this scrolls. */
.qa2-cast { flex: 0 1 auto; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 0; scrollbar-width: thin; }
.qa2-pill.is-spine { top: var(--qa-hud-inset); left: var(--qa-hud-inset); }
.qa2-pill.is-journal { right: var(--qa-hud-inset); bottom: var(--qa-hud-inset); }

.qa2-notch {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-items: center;
  gap: var(--qa-s3);
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3) var(--qa-s2) var(--qa-s4);
  border: none;
  background: transparent;
  text-align: left;
  cursor: default;
  transition: background var(--qa-dur) var(--qa-ease), opacity var(--qa-dur) var(--qa-ease);
}
/* The timeline itself: one hairline per notch, stacked into a continuous line.
   Burned segments carry the accent, upcoming ones the frame's own border. */
.qa2-notch::before {
  content: "";
  position: absolute;
  left: calc(var(--qa-s4) + 13px);
  top: 0;
  bottom: 0;
  width: var(--qa-hairline);
  background: var(--qa-ink-faint);
}
.qa2-notch.is-acted::before, .qa2-notch.is-acting::before { background: var(--qa-accent); }
/* The line stops AT the first and last dots rather than running off the ends.
   Scoped through the list item, not the notch: each notch is the only child of
   its own list item, so a :first-child on the notch matches every one of them,
   which collapsed the whole timeline to nothing. */
.qa2-cast > li:first-child .qa2-notch::before { top: 50%; }
.qa2-cast > li:last-child .qa2-notch::before { bottom: 50%; }

.qa2-dot {
  position: relative;
  justify-self: center;
  width: 7px;
  height: 7px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  background: var(--qa-glass-solid);
}
.qa2-notch.is-acted .qa2-dot { border-color: var(--qa-accent-line); background: var(--qa-accent-line); }
.qa2-notch.is-acting .qa2-dot {
  width: 11px;
  height: 11px;
  border-color: var(--qa-accent);
  background: var(--qa-accent);
  box-shadow: 0 0 0 4px var(--qa-accent-soft);
}
.qa2-notch.is-acted { opacity: 0.42; filter: saturate(0.35); }
.qa2-notch.is-acting { background: linear-gradient(to right, var(--qa-accent-soft), transparent 78%); }
.qa2-notch.is-down { opacity: 0.5; }
.qa2-notch.is-you { }
.qa2-notch.is-you::after {
  content: "";
  position: absolute;
  left: 0;
  top: var(--qa-s1);
  bottom: var(--qa-s1);
  width: 2px;
  background: var(--qa-ink-faint);
}
.qa2-notch.is-you.is-acting::after { background: var(--qa-accent); }

.qa2-cue {
  display: block;
  padding: var(--qa-s2) var(--qa-s4) var(--qa-s3);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
  flex: none;
}

/* ---- the near edge: two panels, never one bar ------------------------------ */
.qa2-bay { display: flex; flex-direction: column; gap: var(--qa-s2); min-width: 0; }

.qa2-portrait {
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: var(--qa-radius);
}
.qa2-portrait:hover .qa2-portrait-name { color: var(--qa-accent); }
.qa2-portrait-name { transition: color var(--qa-dur-fast) var(--qa-ease); }

.qa2-abils { display: flex; gap: var(--qa-s1); }
.qa2-abil {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: var(--qa-s1) 0;
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius-sm);
  background: transparent;
  cursor: pointer;
  transition: background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-abil:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }

/* ---- the action rows -------------------------------------------------------
   ICON TILES on TWO rows (owner direction, 2026-08-18): Bonus and Reaction
   share the top, Action sits alone on the bottom — nearest you, because it is
   the row your hand returns to on nearly every turn, and the two you only
   consult sometimes stack above it. v1's ActionBar split the same way for the
   same stated reason ("Action on its own — usually the busiest economy"); this
   keeps that reasoning and flips which end Action sits on. Icons rather than
   named tiles for the reason v1 never had to weigh: a named tile costs roughly
   three times the width, and the map is supposed to be what you are looking
   at. The tile's name and numbers live in the detail strip below instead,
   fixed height and never empty, so the icon is a shortcut for a player who
   already knows it, never the only way to find out what it is. */
.qa2-econ-stack { display: flex; flex-direction: column; gap: var(--qa-s3); min-width: 0; }
.qa2-econ-row { display: flex; align-items: flex-start; gap: var(--qa-s4); min-width: 0; flex-wrap: wrap; }
/* A hairline between the two groups, not between every row — it marks "these
   are read, that one is operated," the same distinction the divider inside
   the top row marks between Bonus and Reaction individually. */
.qa2-econ-row.is-primary { padding-top: var(--qa-s3); border-top: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-econ { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-econ + .qa2-econ { padding-left: var(--qa-s4); border-left: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-econ-label { display: flex; align-items: center; gap: var(--qa-s2); }
.qa2-pip {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  background: var(--qa-ink-faint);
}
.qa2-pip.is-spent { background: transparent; }
/* Wrap is a safety net, not the intent: the socket COUNT below is tuned to
   fill each row's real width at the reference size without wrapping, so a
   fresh character's row reads as genuinely full of room to grow. If the
   window narrows past that, wrapping to a second line keeps every socket a
   real, focusable, screen-reader-visible button — the alternative (rendering
   a big fixed number and clipping the overflow with an overflow:hidden rule)
   leaves invisible buttons still sitting in the tab order, which is a real
   accessibility bug, not a visual nicety being skipped. */
.qa2-slots { display: flex; flex-wrap: wrap; gap: var(--qa-s2); row-gap: var(--qa-s2); }

/* Fixed-height, so nothing above it ever reflows as the mouse sweeps the row. */
.qa2-detail {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s1) 0;
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
}

/* ---- where a roll lands ----------------------------------------------------
   A card that rises directly above the panel you rolled from, left-aligned with
   it: the same place every time, but only occupying the map while there is
   something to say. It used to be a permanent third bay, which meant a column
   of the HUD stood empty between rolls. */
.qa2-roll {
  position: absolute;
  bottom: calc(100% + var(--qa-s3));
  left: 0;
  width: 268px;
  animation: qa2-rise var(--qa-dur) var(--qa-ease-out);
}
.qa2-result { display: flex; align-items: baseline; gap: var(--qa-s3); }
.qa2-verdict {
  display: inline-flex;
  align-self: flex-start;
  padding: 1px var(--qa-s2);
  border-radius: var(--qa-radius-sm);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}
.qa2-verdict.is-hit { background: var(--qa-success-soft); color: var(--qa-success); }
.qa2-verdict.is-miss { background: var(--qa-danger-soft); color: var(--qa-danger); }
.qa2-verdict.is-neutral { background: var(--qa-chip); color: var(--qa-ink-dim); }
.qa2-total { animation: qa2-land var(--qa-dur) var(--qa-ease-out); }

/* ---- journal -------------------------------------------------------------- */
.qa2-feed { flex: 1; min-height: 0; overflow-y: auto; padding: var(--qa-s3) var(--qa-s4); display: flex; flex-direction: column; gap: var(--qa-s4); scrollbar-width: thin; }
.qa2-notes { padding: var(--qa-s3); border: var(--qa-hairline) solid var(--qa-glass-border); border-radius: var(--qa-radius); background: var(--qa-chip); display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-entry { display: flex; flex-direction: column; gap: var(--qa-s1); }
.qa2-rollrow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--qa-s3);
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-rollrow:hover { border-color: var(--qa-accent-line); }
.qa2-breakdown { list-style: none; margin: 0; padding: var(--qa-s2) var(--qa-s3) 0; display: flex; flex-direction: column; gap: 2px; }
.qa2-breakdown li { display: flex; justify-content: space-between; gap: var(--qa-s3); }
.qa2-react { display: flex; gap: var(--qa-s1); padding: 0 var(--qa-s4) var(--qa-s2); flex: none; }
.qa2-reactbtn {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  background: transparent;
  cursor: pointer;
  transition: transform var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-reactbtn:hover { background: var(--qa-chip); transform: translateY(-2px); }
.qa2-compose { display: flex; gap: var(--qa-s2); padding: var(--qa-s3) var(--qa-s4); border-top: var(--qa-hairline) solid var(--qa-glass-border); flex: none; }

/*
 * Below 1280px the frame gives up the spine first (it is the most compressible —
 * the near edge still carries the turn badge), then the journal. Desktop-first
 * is the product's stated platform, so these are graceful floors, not a phone
 * layout.
 */
@media (max-width: 1439px) {
  .qa2-screen { --qa2-journal: 300px; --qa2-spine: 228px; }
}
@media (max-width: 1179px) {
  /* The panels start to crowd the map they are meant to be floating over, so
     the two REFERENCE surfaces give ground first. The panel you act from keeps
     its size at every width — it is the only one anybody operates. */
  .qa2-screen { --qa2-journal: 268px; --qa2-spine: 208px; }
  .qa2-you { width: 212px; }
  .qa2-spine { max-height: calc(100% - var(--qa-hud-inset) * 2 - 268px); }
}

/* ============================================================================
   THE DM SCREEN — THE HEAD OF THE TABLE

   THIRD PASS, AND THE FIRST ONE THAT DOES NOT INVENT A SECOND LANGUAGE.

   Pass one was a left rail of full-width caps slabs. Pass two replaced it with
   hand-rolled panels, a five-tab console and a journal welded to the window
   edge — different chrome, a compressed type ramp, and three surfaces that
   physically overlapped each other at 1600x900. Both passes were arrangements
   of a vocabulary that only this screen spoke.

   THIS PASS HAS ALMOST NO CSS OF ITS OWN, WHICH IS THE POINT. The turn order is
   the player's RoundSpine. The journal is the player's JournalRail. The chrome
   is qa2-panel. The tiles, the eyebrows, the detail strip and the escape-hatch
   footer are the player action bar's own parts. What is left below is the
   placement of four surfaces, and the internals of the one thing the DM screen
   genuinely invents: the director's bar.

   TWO MECHANICAL FAULTS SAT UNDER THE COMPOSITION AND ARE FIXED AT SOURCE, NOT
   HERE — a design-layer button reset whose selector out-specified every rule on
   this screen and silently reset its type, and three typefaces that nothing in
   the repo ever loaded. Rearranging panels would not have touched either.

   THE TRACK SYSTEM IS THE PLAYER SCREEN'S. Panel widths are custom properties
   on the root, the bar is centred between its real neighbours with auto
   margins, and nothing is positioned against the viewport where a neighbour is
   what actually bounds it. That is what stops the overlap returning the next
   time a panel changes width.
   ========================================================================= */
.qa-dm {
  /* The three tracks the bar has to fit between. Same names and same job as
     the player screen's, so the two layouts stay legible side by side. */
  --qa2-spine: 340px;
  --qa2-journal: 336px;
  --qa2-journal-closed: 244px;
  position: relative;
  /* The viewport, not a percentage. This element is the route's own root and
     has no sized ancestor to take 100% OF — the player screen gets away with
     the percentage only because PlayerViewV2 sets an inline 100vh over the top
     of it. Same result, said once, here. */
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}

/* ---- the left rail ---------------------------------------------------------
   THE ROUND ON TOP, THE WORKBENCH UNDER IT, IN ONE FLEX COLUMN.

   Both used to be absolutely positioned with hand-written heights, which is
   how a spine holding ten combatants ran under whatever sat below it. Here the
   turn order takes what it needs up to a share of the column, the workbench
   takes the rest, and neither has to know how tall the other is. */
.qa2-leftrail {
  position: absolute;
  z-index: 3;
  top: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  left: var(--qa-hud-inset);
  width: var(--qa2-spine);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  min-height: 0;
  /* The gap between the two panels is map, and the map is clickable. */
  pointer-events: none;
}
.qa2-leftrail > * { pointer-events: auto; }

/* Inside the rail the spine is an ordinary flex child rather than a floating
   box: it hugs its cast, and stops at half the column so the workbench is
   never squeezed out by a big encounter. */
.qa-dm .qa2-leftrail .qa2-spine,
.qa-dm .qa2-leftrail .qa2-pill.is-spine {
  position: static;
  width: auto;
  /* Sizes to its cast and refuses to be shrunk below that by the bench; the
     cap is what stops a ten-creature encounter taking the whole column. */
  flex: 0 0 auto;
  min-height: 0;
  max-height: 58%;
}

/* ---- the workbench ---------------------------------------------------------
   Where every tool opens, one at a time. It takes whatever height the turn
   order leaves and scrolls inside itself, so a long rules list never pushes the
   column off the bottom of the window. */
/*
 * flex-basis ZERO, not auto. With auto, the workbench asks for as much height as
 * its content wants — and the glossary is long — so the flex algorithm hands it
 * the column and squeezes the turn order down to a single row. A basis of zero
 * says "I have no opinion about my height, give me what is left", which is the
 * actual relationship: the round takes what it needs, the bench takes the rest,
 * and the bench scrolls inside itself.
 */
.qa2-bench {
  flex: 1 1 0;
  min-height: 0;
  gap: var(--qa-s3);
  overflow: hidden;
}
.qa2-bench-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s2);
  padding-bottom: var(--qa-s2);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
}
.qa2-bench-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
}
/* A tool that is a paragraph and a field rather than a list of choices. */
.qa2-bench-note { display: flex; flex-direction: column; gap: var(--qa-s3); }

/* The tile whose tool is open. Gold rather than accent: this marks what the DM
   is looking at, not what the table is waiting for. */
.qa2-tile.is-open {
  border-color: var(--qa-gold);
  background: var(--qa-gold-soft);
}
.qa2-tile.is-open .qa2-glyph { color: var(--qa-gold); }
.qa2-tile.is-open:hover { border-color: var(--qa-gold); background: var(--qa-gold-soft); }

/* ---- the glossary ----------------------------------------------------------
   The workbench at rest. It is a reference rather than a control surface, so it
   is set as prose with the terms leading, and nothing in it is a button except
   the one link out to the full rules. */
.qa2-gloss { display: flex; flex-direction: column; gap: var(--qa-s3); min-height: 0; }
.qa2-gloss-find { flex: none; }
.qa2-gloss-list { display: flex; flex-direction: column; gap: var(--qa-s4); }
.qa2-gloss-group { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-gloss-term { display: flex; flex-direction: column; gap: 2px; }
.qa2-gloss-name {
  font-family: var(--qa-font-display);
  font-size: var(--qa-text-body);
  color: var(--qa-ink);
  line-height: 1.2;
}
/* The correction, set apart from the explanation: this is the bit a DM gets
   wrong, and it should not read as more of the same sentence. */
.qa2-gloss-note {
  margin: var(--qa-s1) 0 0;
  padding-left: var(--qa-s3);
  border-left: 2px solid var(--qa-gold-soft);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.4;
  color: var(--qa-ink-faint);
}
.qa2-gloss-more { align-self: flex-start; }

/* ---- the rules, for a player ----------------------------------------------
   They have no workbench, so the compendium arrives as a sheet over the map. */
.qa2-rulesheet {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100% - var(--qa-hud-inset) * 2));
  max-height: min(680px, calc(100% - var(--qa-hud-inset) * 2));
  overflow: hidden;
  box-shadow: var(--qa-shadow-pop);
  animation: qa2-rise var(--qa-dur) var(--qa-ease);
}
.qa2-rulesheet .qa-comp { min-height: 0; overflow-y: auto; scrollbar-width: thin; }
/* A foe in the DM's order. The mark is a hairline on the left rather than a
   fill, because the accent on this screen belongs to whoever is UP, and a
   roomful of tinted monsters would take it away from them. */
.qa2-notch.is-foe .qa2-dot { border-color: var(--qa-danger); }
/* The one the director's bar is showing. Gold, because on this screen gold is
   the DM's own attention rather than the table's. */
.qa2-notch.is-open { background: var(--qa-gold-soft); }

/* ---- the baton -------------------------------------------------------------
   The end of the timeline, and the control that moves it. A DM presses this
   more than anything else during a fight; it used to sit in a bottom strip at
   the same weight as eight other things. Full width of the spine so it reads as
   the line continuing rather than as a button parked underneath it. */
.qa2-baton {
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  width: 100%;
  margin-top: var(--qa-s3);
  padding: var(--qa-s3) var(--qa-s4);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-accent-ink);
  background: var(--qa-accent);
  border: none;
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: filter var(--qa-dur-fast) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease);
}
.qa2-baton:hover { filter: brightness(1.08); transform: translateY(-1px); }
.qa2-baton:active { transform: translateY(0); }
/* Refused: the accent drains out of it, because on this screen the accent means
   the table is waiting on you, and a control that cannot fire is not waiting. */
.qa2-baton[aria-disabled="true"] {
  color: var(--qa-ink-faint);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  cursor: not-allowed;
}
.qa2-baton[aria-disabled="true"]:hover { filter: none; transform: none; }
.qa2-baton[aria-disabled="true"] .qa2-baton-mark { background: var(--qa-ink-faint); }

.qa2-cast-empty { padding: var(--qa-s3) var(--qa-s4); }

/* Something the server refused. Danger rather than accent: the accent means the
   table is waiting on you, and this is the opposite — the table did not hear
   you. It sits at the top of the bottom stack, above whatever is waiting,
   because it is about the thing you just pressed. */
.qa2-notice {
  flex: none;
  flex-direction: row;
  align-items: center;
  gap: var(--qa-s3);
  border-color: var(--qa-danger);
  color: var(--qa-danger);
  animation: qa2-rise var(--qa-dur) var(--qa-ease);
}
.qa2-notice .qa2-glyph { color: var(--qa-danger); }
/* The dot sits where a notch's dot sits, one step further down the line: the
   button is drawn as the next entry in the running order, because pressing it
   is what makes there be one. */
.qa2-baton-mark {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: var(--qa-radius-round);
  background: var(--qa-accent-ink);
}

/* Ending a fight is the OPPOSITE of the baton, so it is nowhere near it. Given
   equal weight beside a control pressed every thirty seconds, a fight ends by
   accident sooner or later. */
.qa2-pill.is-endfight {
  position: absolute;
  z-index: 2;
  left: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
}

/* ---- the scene nameplate ---------------------------------------------------
   The same anchor, the same shape and the same two-line structure the player's
   screen uses. A DM glancing between their laptop and a player's phone should
   find the round in the same place on both. */
.qa2-scene-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}

/* ---- carrying somebody -----------------------------------------------------
   Not decoration: a DM who has picked a token up has no other way of knowing
   the next tap will put it down. */
.qa2-hint {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: calc(var(--qa-hud-inset) + 84px);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  margin: 0;
  padding: var(--qa-s2) var(--qa-s4);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-accent);
  background: var(--qa-glass-solid);
  border: var(--qa-hairline) solid var(--qa-accent-line);
  border-radius: var(--qa-radius-round);
  backdrop-filter: blur(var(--qa-glass-blur));
  pointer-events: none;
}
.qa2-hint .qa2-glyph { color: var(--qa-accent); }

/* ---- the director's bar ----------------------------------------------------
   THE PLAYER'S ACTION BAR POSITION, EXACTLY. Centred between its two real
   neighbours with auto margins rather than on the viewport, which is what makes
   the gap either side identical even though the spine and the journal are
   different widths (CSS2.1 10.3.7 — specified behaviour, not an approximation).
   The previous console was centred on the window and sat under the roster. */
.qa2-deskstack {
  position: absolute;
  z-index: 3;
  left: calc(var(--qa-hud-inset) + var(--qa2-spine));
  right: calc(var(--qa-hud-inset) + var(--qa2-journal));
  bottom: var(--qa-hud-inset);
  /* The extra inset*2 is a MINIMUM GAP, not decoration. Without it the ceiling
     is the whole track, so at any width where the track is under 760 the bar
     grows flush against the spine and the journal and the three read as one
     welded bar — measured at 1280, where the gap either side came out at
     exactly zero. Below that the bar shrinks instead of touching. */
  width: min(760px, calc(100% - (var(--qa-hud-inset) + var(--qa2-spine)) - (var(--qa-hud-inset) + var(--qa2-journal)) - var(--qa-hud-inset) * 2));
  margin: 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--qa-s3);
  max-height: calc(100% - var(--qa-hud-inset) * 2);
  /* The gaps between the stacked panels are map, and the map is clickable. */
  pointer-events: none;
}
.qa2-deskstack > * { pointer-events: auto; }
.qa-dm.is-journal-closed .qa2-deskstack {
  right: calc(var(--qa-hud-inset) + var(--qa2-journal-closed));
  width: min(760px, calc(100% - (var(--qa-hud-inset) + var(--qa2-spine)) - (var(--qa-hud-inset) + var(--qa2-journal-closed)) - var(--qa-hud-inset) * 2));
}
.qa2-desk { min-width: 0; gap: var(--qa-s3); }

/* With nobody chosen the bar opens with the one sentence that teaches the
   screen: the turn order is how you get at a creature. */
.qa2-desk-hint {
  padding-bottom: var(--qa-s2);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
}

/* Who you are working on. The player's identity block, at the DM's resolution:
   exact numbers for everybody, including the monsters. */
.qa2-desk-head {
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  padding-bottom: var(--qa-s3);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
}
.qa2-desk-chip {
  width: 38px;
  height: 38px;
  flex: none;
  display: grid;
  place-items: center;
  font-family: var(--qa-font-display);
  font-size: var(--qa-text-lg);
  color: var(--qa-ink-dim);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
}
.qa2-desk-chip.is-foe { color: var(--qa-danger); border-color: var(--qa-danger); }
.qa2-desk-who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.qa2-desk-line {
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qa2-desk-vitals {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  justify-content: flex-end;
}
.qa2-desk-hp { display: block; width: 200px; }

/* The escape hatch, in the same place the player's is — theirs is the story the
   rules cannot resolve, this is the person the board does not contain. */
.qa2-desk-voice {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding-top: var(--qa-s3);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
  color: var(--qa-gold);
}
.qa2-desk-voice .qa2-open:focus-within { border-color: var(--qa-gold); }

/* ---- yours alone -----------------------------------------------------------
   Gold is the DM's own colour on this screen and it means one thing: nobody
   else can see this. The whisper sheet, the table-screen link and their pinned
   notes all carry it, so the rule is learnable rather than decorative. */
.qa2-secret {
  position: absolute;
  z-index: 6;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(460px, calc(100% - var(--qa-hud-inset) * 2));
  border-color: var(--qa-gold-soft);
  box-shadow: var(--qa-shadow-pop);
  animation: qa2-rise var(--qa-dur) var(--qa-ease);
}
.qa2-secret-head { display: flex; align-items: center; justify-content: space-between; gap: var(--qa-s3); }
.qa2-secret-actions { display: flex; align-items: center; gap: var(--qa-s3); }
.qa2-secret .qa2-open:focus-within { border-color: var(--qa-gold); }
.qa2-notes.is-private { border-color: var(--qa-gold-soft); }

/* A voice chosen in the composer: the DM is performing rather than narrating,
   and the table is about to hear somebody who is not them. */
.qa2-compose.is-voiced { border-top-color: var(--qa-gold); }
.qa2-compose.is-voiced .qa2-open { border-color: var(--qa-gold-soft); }
.qa2-voicetag {
  display: inline-flex;
  align-items: center;
  gap: var(--qa-s1);
  flex: none;
  align-self: center;
  padding: 2px var(--qa-s2);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-gold);
  background: var(--qa-gold-soft);
  border-radius: var(--qa-radius-sm);
  white-space: nowrap;
}
.qa2-voicetag-x {
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--qa-gold);
  cursor: pointer;
}

/* ---- what is waiting on you ------------------------------------------------
   A reaction prompt and a player's ruling request answer the same question —
   what needs me — so they share a place. That place is ABOVE the director's
   bar rather than on top of it, which is where the previous version put both of
   them: same coordinates, same z-index, one covering the other. */
.qa2-prompt, .qa2-ruling {
  flex: none;
  border-color: var(--qa-accent-line);
  animation: qa2-rise var(--qa-dur) var(--qa-ease);
}
.qa2-prompt-head, .qa2-ruling-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--qa-s3);
}
.qa2-prompt-kind { color: var(--qa-accent); }
.qa2-prompt-kind {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}
.qa2-prompt-clock {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  color: var(--qa-ink-faint);
  font-variant-numeric: tabular-nums;
}
/* Ten seconds left is where it stops being information and starts being
   pressure, so that is where the colour changes. */
.qa2-prompt-clock.is-urgent { color: var(--qa-danger); }
.qa2-prompt-context {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.5;
  color: var(--qa-ink);
}
.qa2-prompt-options, .qa2-ruling-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--qa-s3);
}
.qa2-prompt-take { display: inline-flex; align-items: baseline; gap: var(--qa-s2); }
.qa2-prompt-cost {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  opacity: 0.75;
}
.qa2-prompt-queued, .qa2-ruling-queued {
  margin: 0;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}
.qa2-ruling-skills { display: grid; grid-template-columns: 1fr 1fr; gap: var(--qa-s2); }

/* ---- asking for a roll -----------------------------------------------------
   The DM's most-used control. Opens over the map on the side the journal is
   NOT, and closes the moment a skill is picked — one tap for the common ask. */
/* The tools are CONTENT now, not floating sheets — the workbench places them
   and owns their heading, their close and their scroll. What is left here is
   only the internal shape of each one. */
.qa2-ask, .qa-add {
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  min-width: 0;
}
.qa2-ask-who { display: flex; flex-wrap: wrap; gap: var(--qa-s2); }
/* A quiet link in a stacked panel is still a sentence, so it starts where the
   sentences above it start. Buttons centre their text by default, which put
   these in the middle of the sheet looking like headings. */
.qa2-ask > .qa2-quiet-link { align-self: flex-start; }
.qa2-ask-who .is-on { border-color: var(--qa-accent-line); color: var(--qa-accent); }
.qa2-ask-skills { display: grid; grid-template-columns: 1fr 1fr; gap: var(--qa-s2); }
.qa2-ask-skill {
  padding: var(--qa-s2) var(--qa-s3);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  color: var(--qa-ink);
  text-align: left;
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: border-color var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease);
}
.qa2-ask-skill:hover { border-color: var(--qa-accent-line); background: var(--qa-accent-soft); }
.qa2-ask-more {
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  padding: var(--qa-s3);
  background: var(--qa-chip);
  border-radius: var(--qa-radius);
}
.qa2-ask-row { display: flex; flex-direction: column; gap: var(--qa-s2); }
/* Nothing found, nothing yet, nothing wrong — the one empty-state voice the
   DM's authoring surfaces share. It replaces qa-dm-empty, which was one of five
   spellings of the same faint line. */
.qa2-empty {
  margin: 0;
  padding: var(--qa-s3) 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.5;
  color: var(--qa-ink-faint);
}
.qa2-ask-secret {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  cursor: pointer;
}

/* ---- narrower ---------------------------------------------------------------
   The two REFERENCE surfaces give ground first and the bar keeps its size, for
   the same reason as on the player screen: it is the only one anybody operates.
   Below 900 the whole thing stacks — three floating surfaces on a phone is
   three surfaces you cannot read. */
@media (max-width: 1179px) {
  .qa-dm { --qa2-spine: 232px; --qa2-journal: 268px; }
  .qa-dm .qa2-spine { max-height: calc(100% - var(--qa-hud-inset) * 2 - 320px); }
}

@media (max-width: 900px) {
  .qa-dm { height: auto; overflow: visible; }
  /* The map stops being the ground and becomes the first thing in the column.
     A DM on a phone with no board at all is worse than a small board — this is
     the one screen where the map IS the shared fact. */
  .qa-dm .qa2-map.is-fill { position: relative; inset: auto; height: 46vh; }
  /* The nameplate and the frame controls were the two surfaces still pinned to
     the viewport once everything else stacked, so they landed on top of the
     turn order. */
  .qa-dm .qa2-scene,
  .qa-dm .qa2-controls,
  .qa2-leftrail,
  .qa-dm .qa2-journal,
  .qa2-deskstack,
  .qa2-pill.is-endfight {
    position: static;
    transform: none;
    width: auto;
    max-height: none;
    margin: var(--qa-s3);
  }
  /* The rail stops being a column of its own height and becomes two panels in
     the page's flow — so the turn order can be as long as the cast is, and the
     workbench as long as whatever is open, rather than both fighting over a
     viewport that is mostly keyboard. */
  .qa2-leftrail { display: block; }
  .qa2-leftrail > * { margin-bottom: var(--qa-s3); }
  .qa-dm .qa2-leftrail .qa2-spine,
  .qa-dm .qa2-leftrail .qa2-pill.is-spine { max-height: none; }
  .qa2-bench { overflow: visible; }
  .qa2-bench-body { overflow: visible; }
  .qa2-ask-skills, .qa2-ruling-skills { grid-template-columns: 1fr; }
  .qa-dm .qa2-scene { align-items: flex-start; text-align: left; }
  .qa-dm .qa2-controls { justify-content: flex-end; }
  .qa2-desk-hp { width: 120px; }
}


/* ---- the compendium --------------------------------------------------------
   Opens OVER the table, never instead of it: looking a rule up must not cost
   you the game. The map, the log and whose turn it is all stay where they were. */
/* The rules, as CONTENT. This used to be its own full-screen scrim and panel;
   now the DM's workbench and the player's sheet each supply their own frame, so
   what is left is the search, the filters and the list. */
.qa-comp {
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  min-height: 0;
  min-width: 0;
}
.qa-comp-search { flex: none; }
.qa-comp-types { display: flex; flex-wrap: wrap; gap: var(--qa-s2); flex: none; }
.qa-comp-types .is-on { border-color: var(--qa-accent-line); color: var(--qa-accent); }

.qa-comp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qa-comp-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--qa-s2) var(--qa-s3);
  text-align: left;
  background: none;
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: background var(--qa-dur) var(--qa-ease), border-color var(--qa-dur) var(--qa-ease);
}
.qa-comp-row:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }
.qa-comp-row-name { font-family: var(--qa-font-display); font-size: var(--qa-text-body); color: var(--qa-ink); }
/* The plain line is the one that teaches, so it is the one the list shows. */
.qa-comp-row-plain {
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.45;
  color: var(--qa-ink-dim);
}

.qa-comp-entry { overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-comp-back { align-self: flex-start; }
.qa-comp-name { margin: 0; font-family: var(--qa-font-display); font-size: var(--qa-text-lg); color: var(--qa-ink); }
.qa-comp-plain {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.55;
  color: var(--qa-ink);
}
/* The printed rule sits quieter than the sentence that explains it — correct,
   available, and deliberately not the first thing the eye lands on. */
.qa-comp-srd {
  margin: 0;
  padding-top: var(--qa-s3);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.6;
  color: var(--qa-ink-dim);
  white-space: pre-wrap;
}

/* ---- the shared screen -----------------------------------------------------
   A television at the end of the table has no hands and no pointer, so there
   are no hover states and no controls here at all. Its one job is being
   readable from four feet away, which is why everything is scaled up and
   thinned out relative to a personal screen. */
.qa-td { position: relative; height: 100vh; overflow: hidden; }

.qa-td-scene {
  position: absolute;
  z-index: 2;
  top: var(--qa-hud-inset);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--qa-s3) var(--qa-s5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--qa-s2);
  text-align: center;
}
.qa-td-name {
  font-family: var(--qa-font-display);
  /* The display size, because this is read across a room rather than at
     arm's length — the one place the top of the ramp is the right answer. */
  font-size: var(--qa-text-display);
  color: var(--qa-ink);
  line-height: 1.05;
}
/* Whose turn it is, in the accent, because it is the one thing anybody looks
   up to check. */
.qa-td-state {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-body);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-accent);
}

.qa-td-order {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: var(--qa-hud-inset);
  transform: translateY(-50%);
  padding: var(--qa-s4);
  max-height: 80%;
  overflow: hidden;
}
.qa-td-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-td-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--qa-s5);
  padding-left: var(--qa-s3);
  border-left: 2px solid transparent;
}
.qa-td-row.is-acting { border-left-color: var(--qa-accent); }
.qa-td-who { font-family: var(--qa-font-display); font-size: var(--qa-text-lg); color: var(--qa-ink); }
.qa-td-row.is-acting .qa-td-who { color: var(--qa-accent); }
.qa-td-state-word {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
  font-variant-numeric: tabular-nums;
}

.qa-td-log {
  position: absolute;
  z-index: 2;
  right: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: min(520px, 40%);
  padding: var(--qa-s4);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
}
.qa-td-line {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.5;
  color: var(--qa-ink);
}
.qa-td-line-who {
  display: block;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}


/* ---- adding a creature ----------------------------------------------------- */
.qa-add-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qa-add-hand { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa-add-numbers { display: grid; grid-template-columns: 1fr 1fr; gap: var(--qa-s2); }
.qa-add-actions { display: flex; align-items: center; gap: var(--qa-s3); }


`;

/**
 * The play screen's styles, on top of the app's shared design layer. Rendering
 * DesignStyles here rather than expecting the host to remember it means a
 * screen is always self-sufficient; duplicate style tags are harmless.
 */
export function ScreenStyles(): ReactElement {
  return (
    <>
      <DesignStyles />
      <style>{CSS}</style>
    </>
  );
}
