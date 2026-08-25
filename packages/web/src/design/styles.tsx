/**
 * design/styles — the app's shared component stylesheet.
 *
 * WHAT LIVES HERE vs. IN A SCREEN'S OWN STYLESHEET. This file owns CHROME and
 * BEHAVIOUR: what a surface is made of (fill, border, radius, padding, rhythm,
 * shadow), what its controls look like, how they respond to hover and focus,
 * and what happens under reduced motion. It owns no POSITIONS. Where a panel
 * sits belongs to the screen composing it — see v2/ScreenStyles.tsx, which
 * adds `position: absolute` and coordinates to the same `.qa2-panel` class
 * this file defines. Keeping placement out is what lets an authoring surface
 * (wizard step, planner row, compendium entry) use the identical chrome inside
 * an ordinary document flow.
 *
 * WHY A STYLESHEET AND NOT INLINE STYLES. Inline styling cost the original
 * hub three things every surface needs: real `:hover`/`:focus-visible` without
 * a `useState` per control, `@media (prefers-reduced-motion)` (design request
 * §8, non-negotiable), and pseudo-elements. Every value below is still a
 * `--qa-*` token — `test/hud-type-hygiene.test.ts` scans this file for hex,
 * rgb(), literal durations and numeric font sizes exactly as it scans the
 * components.
 *
 * ON THE `qa2-` PREFIX. It is historical — this design language began as the
 * second generation of the play screen, and the first is now deleted. Read it
 * as "the Questra component layer", deliberately distinct from the `--qa-*`
 * design TOKENS it consumes, so a class and a custom property never read as
 * the same thing. Renaming ~200 references buys nothing but risk.
 *
 * THE STILL-EQUIVALENT DISCIPLINE. Nothing here animates INTO its resting
 * state from a hidden one via a persistent transform. An element's plain CSS
 * IS the finished state, and the keyframes run FROM a hidden state TO nothing.
 * So the reduced-motion block can simply say `animation: none` and every
 * moving part is left correctly drawn rather than stuck at zero. That is what
 * "design the reduced state" means in practice.
 *
 * ONE EDITING HAZARD, paid for repeatedly: the CSS below is a template
 * literal, so a BACKTICK anywhere inside it — including inside a CSS comment,
 * where quoting a class name is the natural thing to do — closes the string and
 * the whole file stops parsing. Write class names bare in those comments. The
 * type-hygiene suite asserts this file carries exactly the two backticks that
 * open and close the literal.
 */
import type { ReactElement } from 'react';
import { ThemeFonts } from '../theme/fonts.js';

const CSS = `
/* ---- the shared chrome contract -------------------------------------------
   One radius, one padding, one rhythm, one fill. Every floating surface in the
   app is this class plus a placement supplied by whoever is composing it. The
   contract exists because the previous generation learned it the hard way: it
   was never the merging of cards that held a layout together, it was agreeing
   on the chrome. Add a surface through this class and it cannot drift. */
.qa2-panel {
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  padding: var(--qa-s3) var(--qa-s4);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  background: var(--qa-glass);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  box-shadow: var(--qa-shadow);
}

/* A surface collapsed to a small pill rather than a strip welded to an edge —
   a floating HUD should not grow an edge when it shrinks. Placement is the
   composing screen's business; this is only what it is made of. */
.qa2-pill {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-round);
  background: var(--qa-glass);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  box-shadow: var(--qa-shadow);
  color: var(--qa-ink-dim);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-pill:hover { color: var(--qa-ink); border-color: var(--qa-accent-line); }
.qa2-pill-dot { width: 6px; height: 6px; flex: none; border-radius: var(--qa-radius-round); background: var(--qa-accent); }

/* ---- controls -------------------------------------------------------------- */
.qa2-ctl {
  width: 36px;
  height: 36px;
  flex: none;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  color: var(--qa-ink-dim);
  cursor: pointer;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-ctl:hover { color: var(--qa-ink); border-color: var(--qa-accent-line); }
.qa2-ctl.is-on { color: var(--qa-accent); border-color: var(--qa-accent-line); }

/*
 * EVERY NUMBER IS TAPPABLE (design request §5). A "?" circle beside each value
 * becomes a field of punctuation at any real density. Instead the readout's own
 * LABEL carries a dotted underline — the long-standing "there is more behind
 * this word" mark — and the whole readout is the button. It costs no space,
 * scales down to a log's breakdown rows, and reads as annotation rather than
 * chrome.
 */
.qa2-explain {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: help;
}
.qa2-explain > .qa2-explain-label {
  border-bottom: var(--qa-hairline) dotted var(--qa-ink-faint);
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-explain:hover > .qa2-explain-label { color: var(--qa-accent); border-bottom-color: var(--qa-accent); }
.qa2-explain.is-row { flex-direction: row; align-items: baseline; gap: var(--qa-s2); }

.qa2-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--qa-s1);
  padding: 1px var(--qa-s2);
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius-sm);
  background: var(--qa-chip);
  color: var(--qa-ink-dim);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-chip:hover { border-color: var(--qa-accent-line); color: var(--qa-ink); }
.qa2-chip.is-danger { color: var(--qa-danger); background: var(--qa-danger-soft); }
.qa2-chip.is-accent { color: var(--qa-accent); background: var(--qa-accent-soft); }
.qa2-chip.is-static { cursor: default; }
/* One chip in a set is lit; the others sit back so the choice reads at a
   glance instead of as several equal boxes. They keep a hairline, though:
   these are the things you are being invited to press, and a chip with no
   edge at all reads as a label nobody expects to be tappable. */
.qa2-chip[aria-pressed] { background: transparent; border-color: var(--qa-glass-border); }

/* A row of offers — the presets above a free-text box. Same chip, sized for a
   finger rather than for the dense play HUD, because on an authoring screen
   these ARE the teaching mechanism (law 5) and a 1px target teaches nothing. */
.qa2-offers { display: flex; flex-wrap: wrap; gap: var(--qa-s2); }
.qa2-offers .qa2-chip { padding: var(--qa-s2) var(--qa-s3); }
.qa2-chip.is-selected { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); color: var(--qa-accent); }
/* A chip that carries its own delete: the label is one target, the ✕ another,
   so removing a tag is never a mis-tap away from toggling it. */
.qa2-chip-face { border: none; background: none; padding: 0; cursor: pointer; }
.qa2-chip-x {
  display: grid;
  place-items: center;
  border: none;
  background: none;
  padding: 0;
  color: var(--qa-ink-faint);
  cursor: pointer;
  transition: color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-chip-x:hover { color: var(--qa-danger); }

/* The one accent-FILLED element on a surface. Used sparingly, by contract —
   design request §2: one accent, never decorative. */
.qa2-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s1) var(--qa-s3);
  border-radius: var(--qa-radius-sm);
  background: var(--qa-chip);
  color: var(--qa-ink-dim);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}
.qa2-badge.is-yours { background: var(--qa-accent); color: var(--qa-accent-ink); box-shadow: 0 0 18px -4px var(--qa-accent-glow); }

/* ---- the primary call to action ---------------------------------------------
   The one button on a shell screen (Landing's Enter, Join's Join) that gets the
   accent SPENT rather than hinted at — everywhere else on these screens the
   accent stays reserved, same "one accent, never decorative" law the HUD
   already keeps. Built from the same materials as qa2-badge.is-yours (accent
   fill + its glow token) at a size meant for a thumb, not a HUD chip. */
.qa2-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s3) var(--qa-s6);
  border: none;
  border-radius: var(--qa-radius-round);
  background: var(--qa-accent);
  color: var(--qa-accent-ink);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  box-shadow: 0 0 32px -6px var(--qa-accent-glow), var(--qa-shadow);
  transition: transform var(--qa-dur-fast) var(--qa-ease), box-shadow var(--qa-dur-fast) var(--qa-ease);
}
.qa2-cta:hover { transform: translateY(-1px); box-shadow: 0 0 40px -4px var(--qa-accent-glow), var(--qa-shadow); }
.qa2-cta:active { transform: translateY(0); }
.qa2-cta[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.qa2-cta[aria-disabled="true"]:hover { transform: none; }
/* The quiet second action beside a CTA — "sign in" under "Enter". A link, not
   a button: it never competes for the one accent. */
.qa2-quiet-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--qa-ink-faint);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  transition: color var(--qa-dur-fast) var(--qa-ease), text-decoration-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-quiet-link:hover { color: var(--qa-ink); text-decoration-color: var(--qa-ink-faint); }

.qa2-meter { width: 96px; height: 4px; border-radius: var(--qa-radius-round); background: var(--qa-chip); overflow: hidden; }
.qa2-meter > span { display: block; height: 100%; border-radius: var(--qa-radius-round); background: var(--qa-ink-dim); transition: width var(--qa-dur-slow) var(--qa-ease); }

/* ---- hit points ------------------------------------------------------------
   Temporary hit points sit ON the bar as a hatched overlay rather than as a
   second number: they ARE hit points, and somebody reading their health should
   not have to add two figures together. */
.qa2-hpwrap { position: relative; height: 10px; border-radius: var(--qa-radius-round); background: var(--qa-chip); overflow: hidden; }
.qa2-hpfill { position: absolute; inset: 0 auto 0 0; border-radius: var(--qa-radius-round); background: var(--qa-success); transition: width var(--qa-dur-slow) var(--qa-ease); }
.qa2-hpfill.is-bloodied { background: var(--qa-danger); }
.qa2-hptemp {
  position: absolute;
  top: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(115deg, var(--qa-gold) 0 2px, transparent 2px 6px);
  background-color: var(--qa-gold-soft);
}

/* ---- pips ------------------------------------------------------------------
   A countable track: death saves, spell slots, uses remaining. Filled reads as
   spent-or-held depending on the caller's tone class, which is why the base is
   an empty ring rather than a dot. */
.qa2-pips { display: flex; gap: var(--qa-s2); }
.qa2-savepip {
  width: 14px;
  height: 14px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  background: transparent;
}
.qa2-savepip.is-success { background: var(--qa-success); border-color: var(--qa-success); }
.qa2-savepip.is-failure { background: var(--qa-danger); border-color: var(--qa-danger); }

/* ---- icon tiles and empty sockets -----------------------------------------
   A square you can act on, and a dashed square where one will go. Dashed means
   "not yours yet" everywhere in the app, so nothing already-owned is ever drawn
   dashed. */
.qa2-tile {
  position: relative;
  width: 46px;
  height: 46px;
  flex: none;
  display: grid;
  place-items: center;
  padding: 0;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease);
}
.qa2-tile:hover { border-color: var(--qa-accent-line); background: var(--qa-accent-soft); transform: translateY(-1px); }
.qa2-tile[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
.qa2-tile[aria-disabled="true"]:hover { border-color: var(--qa-glass-border); background: var(--qa-chip); transform: none; }
.qa2-glyph { flex: none; color: var(--qa-ink-dim); }
.qa2-tile:hover .qa2-glyph { color: var(--qa-accent); }
/* The one number allowed on a tile face: how many uses are left. "Have I still
   got one of these" must be answerable without hovering; "what is its damage
   die" need not be. */
.qa2-tile-badge {
  position: absolute;
  right: 3px;
  bottom: 1px;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  color: var(--qa-ink-dim);
  line-height: 1;
}
.qa2-tile[aria-disabled="true"] .qa2-tile-badge { color: var(--qa-danger); }
/* Solid, never dashed — an overflowing item very much IS yours, it just does
   not fit. Tinted with the accent so it reads as a door, not a seventh icon. */
.qa2-tile.is-overflow { color: var(--qa-accent); border-style: solid; }
.qa2-tile.is-overflow:hover { background: var(--qa-accent-soft); border-color: var(--qa-accent); }

.qa2-socket {
  width: 46px;
  height: 46px;
  flex: none;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) dashed var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: transparent;
  color: var(--qa-ink-faint);
  cursor: pointer;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-socket:hover { color: var(--qa-accent); border-color: var(--qa-accent-line); }

/* ---- the open line ---------------------------------------------------------
   The escape hatch, drawn as an ordinary row rather than a button in a corner:
   describing something should feel like the next option in a list, not like an
   admission the interface failed you (law 2). */
.qa2-open {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: transparent;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-open:focus-within { border-color: var(--qa-accent-line); background: var(--qa-chip); }
.qa2-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qa-ink);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
}
.qa2-input::placeholder { color: var(--qa-ink-faint); }
.qa2-input[type="textarea"], textarea.qa2-input { resize: vertical; min-height: 64px; line-height: 1.45; }

/* ---- overlays -------------------------------------------------------------- */
.qa2-scrim { position: absolute; inset: 0; z-index: 5; background: var(--qa-scrim); border: none; padding: 0; cursor: pointer; animation: qa2-fade var(--qa-dur-fast) var(--qa-ease); }
.qa2-sheet {
  position: absolute;
  z-index: 6;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  background: var(--qa-glass-solid);
  box-shadow: var(--qa-shadow-pop);
  display: flex;
  flex-direction: column;
  animation: qa2-rise var(--qa-dur) var(--qa-ease-out);
}
.qa2-sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--qa-s3); padding: var(--qa-s4); border-bottom: var(--qa-hairline) solid var(--qa-glass-border); }
/* flex:1 so a sheet with a fixed height (a side-docked panel, the folio) pins
   its footer to the bottom instead of letting it float up under the content.
   min-height:0 is what actually lets it scroll — without it a flex child
   refuses to shrink below its content and the overflow never engages. */
.qa2-sheet-body { flex: 1 1 auto; min-height: 0; padding: var(--qa-s4); overflow-y: auto; display: flex; flex-direction: column; gap: var(--qa-s3); scrollbar-width: thin; }
.qa2-rowline { display: flex; align-items: baseline; justify-content: space-between; gap: var(--qa-s3); padding-bottom: var(--qa-s1); border-bottom: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-rowline.is-sum { border-bottom: none; border-top: var(--qa-hairline) solid var(--qa-ink-faint); padding-top: var(--qa-s2); }

.qa2-tabs { display: flex; gap: var(--qa-s1); padding: 0 var(--qa-s4); border-bottom: var(--qa-hairline) solid var(--qa-glass-border); flex: none; }
.qa2-tab {
  padding: var(--qa-s3) var(--qa-s3);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--qa-ink-faint);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-tab:hover { color: var(--qa-ink-dim); }
.qa2-tab.is-on { color: var(--qa-ink); border-bottom-color: var(--qa-accent); }
.qa2-tab[aria-disabled="true"] { opacity: 0.4; cursor: default; }

.qa2-menuitem {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-menuitem:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }
.qa2-menuitem.is-on { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); }

.qa2-seg { display: inline-flex; border: var(--qa-hairline) solid var(--qa-glass-border); border-radius: var(--qa-radius); overflow: hidden; }
.qa2-seg > button {
  padding: var(--qa-s2) var(--qa-s3);
  border: none;
  background: transparent;
  color: var(--qa-ink-dim);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  transition: background var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-seg > button + button { border-left: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-seg > button.is-on { background: var(--qa-accent-soft); color: var(--qa-accent); }
.qa2-step { display: inline-flex; align-items: center; border: var(--qa-hairline) solid var(--qa-glass-border); border-radius: var(--qa-radius); }
.qa2-step > button { width: 28px; height: 26px; border: none; background: transparent; color: var(--qa-ink-dim); cursor: pointer; font-family: var(--qa-font-mono); }
.qa2-step > button:hover { color: var(--qa-accent); }

/* ---- the authoring surfaces ------------------------------------------------
   The DM's screens are made of a handful of shapes repeated: a labelled field,
   a row in a list, a numbered card. They each hand-rolled their own before,
   which is why a wizard step and a planner row could sit side by side looking
   like two products. */

/* A field is its label and its control, boxed together so the label belongs to
   the thing under it rather than floating above the gap. */
.qa2-field { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-field-box {
  display: flex;
  flex-direction: column;
  gap: var(--qa-s2);
  padding: var(--qa-s3) var(--qa-s4);
  border-left: 3px solid var(--qa-ink-faint);
  border-radius: var(--qa-radius-sm);
  background: var(--qa-chip);
}
/* The DM's half. Weight only — Design has not supplied a secret tint, and a
   session must not invent one (theme tokens.test.ts guards its absence). */
.qa2-field-box.is-secret { border-left-color: var(--qa-ink-dim); }
.qa2-field-input {
  width: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qa-ink);
  resize: none;
}
.qa2-field-input.is-multiline { resize: vertical; }
.qa2-field-input::placeholder { color: var(--qa-ink-faint); }
/* Guidance under a field. Quiet, italic, and never where an error would go. */
.qa2-help { margin: 0; color: var(--qa-ink-faint); font-style: italic; }

/* One row in a list of things — a pickable NPC, a scene in a session. Rows are
   flat until you touch them, so a long list reads as a list and not as forty
   competing cards. */
.qa2-row {
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-row:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }
.qa2-row.is-picked { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); }
.qa2-row.is-static { cursor: default; }
.qa2-row.is-static:hover { background: transparent; border-color: transparent; }
/* The mark that says "picked". Reserved even when empty, so ticking an item
   does not shove the whole row sideways. */
.qa2-row-tick { width: 16px; flex: none; display: grid; place-items: center; color: var(--qa-accent); }

/* A picker: a search line over a scrolling list of rows. It is boxed because
   it is one control — a search that scrolled away from its own results would
   be two. */
.qa2-picker {
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  overflow: hidden;
}
.qa2-picker-search {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s3);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
  color: var(--qa-ink-faint);
}
.qa2-picker-search:focus-within { color: var(--qa-accent); }
.qa2-picker-list { list-style: none; margin: 0; padding: var(--qa-s2); max-height: 420px; overflow-y: auto; scrollbar-width: thin; }
.qa2-picker-empty { margin: 0; padding: var(--qa-s4); color: var(--qa-ink-faint); font-style: italic; }

/* A card in an ordered list: its position, its content, its controls. The
   number is information — it is the answer to "which scene is this" — which is
   the only reason this list is numbered and the journal's is not. */
.qa2-seq { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-card {
  display: flex;
  align-items: flex-start;
  gap: var(--qa-s3);
  padding: var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  transition: border-color var(--qa-dur-fast) var(--qa-ease), opacity var(--qa-dur-fast) var(--qa-ease);
}
.qa2-card.is-dragging { opacity: 0.45; border-color: var(--qa-accent-line); }
.qa2-card.is-over { border-color: var(--qa-accent); }
.qa2-card-no {
  width: 26px;
  height: 26px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--qa-radius-round);
  background: var(--qa-glass-solid);
  color: var(--qa-ink-dim);
}
.qa2-card-grip { color: var(--qa-ink-faint); cursor: grab; }
.qa2-card-grip:active { cursor: grabbing; }
/* Row controls: small, square, quiet until hovered — same family as qa2-ctl
   but sized for a list rather than a frame. */
.qa2-mini {
  width: 24px;
  height: 24px;
  flex: none;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-sm);
  background: transparent;
  color: var(--qa-ink-dim);
  cursor: pointer;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-mini:hover:not(:disabled) { color: var(--qa-accent); border-color: var(--qa-accent-line); }
.qa2-mini:disabled { opacity: 0.35; cursor: not-allowed; }
.qa2-mini.is-danger:hover:not(:disabled) { color: var(--qa-danger); border-color: var(--qa-danger); }

/* ---- a card that interrupted you -------------------------------------------
   Glass over the map, in three bands: what this is, what it says, what you can
   do about it. The assistant's suggestion and a held prompt are different
   things arriving for different reasons, but they arrive the SAME WAY — over
   whatever you were looking at, asking for one decision — so they are made of
   the same material and laid out to the same rhythm. Only the width and the
   contents differ.

   Spelled out rather than composed from qa2-panel: a panel owns its own
   padding and gap, and these pad each band separately so the footer can reach
   the edges. Same tokens, so they still read as one material. */
.qa2-modal {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  overflow: hidden;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  background: var(--qa-glass);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  box-shadow: var(--qa-shadow-pop);
  animation: qa2-rise var(--qa-dur) var(--qa-ease);
  color: var(--qa-ink);
}
.qa2-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s3);
  padding: var(--qa-s3) var(--qa-s4) var(--qa-s2);
}
.qa2-modal-body { display: flex; flex-direction: column; gap: var(--qa-s3); padding: 0 var(--qa-s4) var(--qa-s4); }
.qa2-modal-foot {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  flex-wrap: wrap;
  padding: var(--qa-s3) var(--qa-s4);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
  background: var(--qa-glass-solid);
}
/* The one mark that says a machine wrote this and not the person next to you.
   It never varies with placement. */
.qa2-ai-who { display: flex; align-items: center; gap: var(--qa-s2); }
.qa2-ai-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: var(--qa-radius-round);
  background: var(--qa-accent);
  box-shadow: 0 0 8px var(--qa-accent-glow);
}
.qa2-ai.is-float { width: 560px; }
/* Docked in the journal's stream instead: no glass of its own, because it is
   already sitting on the rail's, and an accent rule down the left edge so it
   reads as a card inside the rail rather than a second rail. */
.qa2-ai.is-inline {
  width: 100%;
  border-left: 2px solid var(--qa-accent-line);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
  animation: none;
}
/* In a rail there is no room to push Reject to the far edge. The button
   sizing is passed as a style prop rather than set here: Button writes its
   padding inline, and an inline style beats a class every time. */
.qa2-ai.is-inline .qa2-modal-foot { gap: var(--qa-s1); background: transparent; }

/* ---- a prompt somebody is holding ------------------------------------------
   Same material, one addition: a countdown. It MIRRORS the server's timeout
   and does not enforce it — the server declines on its own clock — so the bar
   is information, never the mechanism. It turns danger-coloured at ten
   seconds, which is the only moment this card raises its voice. */
.qa2-prompt { width: 480px; }
.qa2-prompt.is-urgent { border-color: var(--qa-danger); }
.qa2-prompt-clock { height: 3px; flex: none; background: var(--qa-glass-border); }
.qa2-prompt-clock > span {
  display: block;
  height: 100%;
  background: var(--qa-accent);
  transition: width var(--qa-dur) linear, background var(--qa-dur) var(--qa-ease);
}
.qa2-prompt.is-urgent .qa2-prompt-clock > span { background: var(--qa-danger); }
.qa2-prompt-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--qa-s1); }
/* A label and its value share a line — unless the value is a whole sentence,
   which never survives being squeezed into the right half of a narrow rail.
   Consequences stack under their label and read left to right like prose. */
.qa2-modal .qa2-rowline > :first-child { flex: none; white-space: nowrap; }
.qa2-modal .qa2-rowline.is-note { flex-direction: column; align-items: flex-start; gap: 2px; }
/* Blinks while the model is still writing, so a half-finished sentence does
   not read as a finished one. */
.qa2-ai-caret {
  display: inline-block;
  width: 2px;
  height: 1.05em;
  vertical-align: -2px;
  margin-left: 2px;
  background: var(--qa-accent);
  animation: qa2-blink var(--qa-dice-settle) steps(1) infinite;
}
/* The ladder, when there is no model to ask. Every rung is pickable — the
   whole point of the fallback is that YOU set the difficulty, so offering
   three tiles and only applying the recommended one was a menu that lied. */
.qa2-ai-opts { display: flex; gap: var(--qa-s2); }
.qa2-ai-opt {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-ai-opt:hover { border-color: var(--qa-accent-line); }
.qa2-ai-opt.is-picked { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); }
.qa2-ai-done { display: flex; align-items: center; gap: var(--qa-s3); }
.qa2-ai-seal { width: 8px; height: 8px; flex: none; border-radius: var(--qa-radius-round); background: var(--qa-ink-faint); }
.qa2-ai-seal.is-applied { background: var(--qa-success); }
.qa2-ai-undo {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--qa-ink-faint);
  cursor: pointer;
  transition: color var(--qa-dur) var(--qa-ease);
}
.qa2-ai-undo:hover { color: var(--qa-ink); }

/* ---- the map ---------------------------------------------------------------
   One renderer serves the planner, the DM screen and the play screen, so its
   chrome lives here rather than beside any one of them. Two fits:

   contain — an element on a page. Keeps its own radius, border and shadow.
   fill    — the ground beneath a floating HUD. Edge to edge, no chrome of its
             own, and a vignette so glass panels keep their contrast at the
             corners where they sit (design request §8: text must stay legible
             over ANY map).

   Cells stay SQUARE in both. The grid layer keeps its aspect ratio and centres
   inside the fill, rather than stretching to the container — stretching would
   make cells rectangular, and distFt assumes square cells, so a stretched map
   would draw range rings that disagree with the engine's own geometry. */
.qa2-map { position: relative; overflow: hidden; user-select: none; }
.qa2-map.is-contain { border-radius: var(--qa-radius); border: var(--qa-hairline) solid var(--qa-glass-border); box-shadow: var(--qa-shadow); }
.qa2-map.is-fill { position: absolute; inset: 0; z-index: 0; display: grid; place-items: center; }
/*
 * THE GROUND UNDER THE GRID, AND WHY IT IS LAYERED RATHER THAN FLAT.
 *
 * A room whose terrainImageRef resolves to a real picture never shows this —
 * the art covers it. But most rooms do not have art yet, and until 2026-08-25
 * those played on one flat radial wash, which is what made both play screens
 * read as panels floating over nothing. The map is meant to be the hero of both
 * of them; a hero cannot be an empty field.
 *
 * Soft patches of the warm map tone, unevenly placed, so the ground has grain
 * and a sense of somewhere rather than a single vignette. Every value is a
 * --qa-map-* token, so dropping a real terrain image in as the top layer
 * changes nothing above it and nothing here.
 */
.qa2-map-ground {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(34% 42% at 24% 30%, var(--qa-map-hi) 0%, transparent 68%),
    radial-gradient(28% 34% at 74% 60%, var(--qa-map-hi) 0%, transparent 70%),
    radial-gradient(42% 38% at 56% 88%, var(--qa-map-mid) 0%, transparent 72%),
    radial-gradient(30% 30% at 88% 18%, var(--qa-map-mid) 0%, transparent 74%),
    radial-gradient(130% 105% at 52% 36%, var(--qa-map-hi) 0%, var(--qa-map-mid) 42%, var(--qa-map-lo) 100%);
}
.qa2-map.is-fill .qa2-map-ground::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(126% 108% at 50% 42%, transparent 62%, var(--qa-map-lo) 100%);
  opacity: 0.55;
}
/* The grid itself. Square cells, centred, never taller or wider than the room
   it is drawing. */
.qa2-map-grid { position: relative; max-width: 100%; max-height: 100%; }
.qa2-map.is-contain .qa2-map-grid { width: 100%; }
.qa2-map-cell {
  position: absolute;
  box-sizing: border-box;
  border: none;
  padding: 0;
  display: grid;
  place-items: center;
  background: transparent;
}
.qa2-map-cell.is-fogged { background: var(--qa-scrim); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); }
.qa2-map-cell.is-aoe { background: var(--qa-accent-soft); }
.qa2-map-cell.is-difficult { background: repeating-linear-gradient(45deg, var(--qa-gold-soft) 0 4px, transparent 4px 10px); }
/* An asset's footprint says one thing: can I walk through it. Blocking reads
   solid and outlined, passable reads dashed and empty. No glyph, no legend. */
.qa2-map-asset {
  position: absolute;
  box-sizing: border-box;
  border: var(--qa-hairline) dashed var(--qa-ink-faint);
  border-radius: var(--qa-radius-sm);
  background: transparent;
  pointer-events: none;
}
.qa2-map-asset.is-blocking {
  border-style: solid;
  border-color: var(--qa-glass-border);
  background: var(--qa-chip);
}

/* ---- tokens ----------------------------------------------------------------
   A creature on the map. The ring carries allegiance, which the ROOM does not
   know — a room holds positions, not sides — so the caller supplies it from
   the projection. Enemies get a word rather than a number under them: an
   enemy's exact hit points are the DM's to reveal, and a player is owed enough
   to make a decision and no more. */
.qa2-token {
  position: absolute;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.qa2-token-disc {
  position: absolute;
  inset: 12%;
  border-radius: var(--qa-radius-round);
  border: 2px solid var(--qa-glass-border);
  background: var(--qa-glass-solid);
  color: var(--qa-ink-dim);
  display: grid;
  place-items: center;
}
.qa2-token.is-ally .qa2-token-disc { border-color: var(--qa-success); color: var(--qa-ink); }
.qa2-token.is-foe .qa2-token-disc { border-color: var(--qa-danger); color: var(--qa-ink); }
.qa2-token.is-you .qa2-token-disc { border-color: var(--qa-accent); box-shadow: 0 0 0 3px var(--qa-accent-soft); color: var(--qa-ink); }
.qa2-token.is-acting .qa2-token-disc { animation: qa2-breathe var(--qa-dice-settle) var(--qa-ease) infinite alternate; }
.qa2-token.is-down .qa2-token-disc, .qa2-token.is-staged .qa2-token-disc { opacity: 0.55; }
.qa2-token-tag {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: var(--qa-s1);
  padding: 0 var(--qa-s1);
  border-radius: var(--qa-radius-sm);
  background: var(--qa-glass-solid);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--qa-ink-dim);
}
.qa2-token-tag.is-hurt { color: var(--qa-danger); }
.qa2-token-tag.is-down { color: var(--qa-ink-faint); }

/* ---- quality floor ---------------------------------------------------------
   Scoped by class-prefix rather than to one screen's root. The earlier version
   of these rules keyed off the play screen's own wrapper, which meant any
   surface using this layer OUTSIDE that screen silently lost its focus ring
   and its reduced-motion guarantee — the two things least likely to be noticed
   missing and most costly to omit. Matching on the prefix covers every surface
   built from this layer, wherever it is mounted. */
[class*="qa2-"]:focus-visible,
[class*="qa2-"] :focus-visible {
  outline: 2px solid var(--qa-accent);
  outline-offset: 2px;
  border-radius: var(--qa-radius-sm);
}
/* Normalise a bare button so it inherits the surface it sits in rather than
   the browser's default. The :not() is load-bearing: a descendant selector
   out-specifies a single class, so without it this quietly overrode the font
   of every control that is ITSELF a styled button — qa2-chip lost its mono
   caps and rendered as large serif the moment one was placed inside any qa2-
   container. Reset the buttons nobody has styled; leave the rest alone.

   THE ESCAPE HATCH IS THE WHOLE qa FAMILY, NOT JUST qa2- (2026-08-25). It used
   to read :not([class*=qa2-]), which spared this layer's own controls and
   caught EVERY control on the DM screen, because those carry the single-a qa-
   prefix — and qa-console2-tab does not contain the substring qa2-. The result
   was that a rule meant to normalise unstyled buttons silently overrode the
   declared font-family AND font-size of the entire DM control set, which then
   inherited 16px body serif from whatever panel it sat in. That is what the
   owner was looking at when they said the DM screen's type was inconsistent
   with the player's: it literally was, by one selector. Any button carrying a
   class in the qa family styles itself and is left alone. */
[class*="qa2-"] button:not([class*="qa"]) { font: inherit; color: inherit; }
.qa2-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes qa2-sweep { from { transform: scaleX(0); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes qa2-rise { from { transform: translateY(var(--qa-s3)); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes qa2-land { from { transform: scale(1.14); opacity: 0.4; } to { transform: none; opacity: 1; } }
@keyframes qa2-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes qa2-breathe { from { box-shadow: 0 0 0 3px var(--qa-accent-soft); } to { box-shadow: 0 0 0 7px var(--qa-accent-soft); } }
@keyframes qa2-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }

/*
 * The still equivalents. Because every rule above describes the FINISHED state
 * and the keyframes run from a hidden state to nothing, switching animation off
 * leaves each moving part correctly drawn — a swept accent stays swept, a
 * settled total stays settled, a ringed token keeps its ring. Nothing
 * disappears, which is what "design the reduced state" actually asks for.
 */
@media (prefers-reduced-motion: reduce) {
  [class*="qa2-"],
  [class*="qa2-"]::before,
  [class*="qa2-"]::after {
    animation: none !important;
    transition: none !important;
  }
  .qa2-tile:hover { transform: none; }
}
`;

/**
 * Injected by any surface built from this layer. Idempotent — duplicate
 * <style> tags are harmless, so a screen and a standalone primitive can both
 * render it without coordinating.
 *
 * IT CARRIES THE TYPEFACES, and that is not a detail. @questra/theme has always
 * named three families, and until now the only thing in the repo that LOADED
 * them was the shell — so every play surface resolved --qa-font-display and
 * --qa-font-body to the same Georgia fallback and --qa-font-mono to whatever
 * the system had. Measured on 2026-08-25: the display stack and the body stack
 * rendered to identical widths, which means the ramp's central rule (prose is a
 * serif, data is mono) and the display-vs-body distinction underneath it had
 * never once been visible. A layer that owns the type ramp has to own its
 * delivery too, or the ramp is a description of a screen nobody has seen.
 */
export function DesignStyles(): ReactElement {
  return (
    <>
      <ThemeFonts />
      <style>{CSS}</style>
    </>
  );
}
