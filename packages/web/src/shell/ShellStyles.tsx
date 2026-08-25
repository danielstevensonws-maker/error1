/**
 * shell/ShellStyles — where each shell screen's own layout lives.
 *
 * The split is the same one the play screen keeps: road/RoadStyles owns the
 * shared LANGUAGE (the table, panel chrome, the two type voices, form
 * controls, focus, reduced motion) and this file owns only what is true of one
 * screen — where things sit. A rule that would be right on more than one
 * screen belongs in RoadStyles.
 *
 * Everything here reads --qa-* spacing and radius directly, because the shell
 * is now built from the same scale as the play screen rather than a parallel
 * one. That is the whole point of the 2026-08-20 rework.
 *
 * EDITING HAZARD: the CSS below is a template literal, so a BACKTICK anywhere
 * inside it — including in a comment — closes the string and the file stops
 * parsing. Write class and property names bare. shell-token-hygiene asserts
 * the backtick count from the const CSS declaration onward is exactly two.
 */
import type { ReactElement } from 'react';
import { RoadStyles } from './road/RoadStyles.js';

const CSS = `
/* ---- Landing and Join: a panel on the table --------------------------------
   Both hold a conversation, and both put it in the same place: one glass panel
   sitting on the map, held off the window by the play screen's own inset. The
   panel is what makes these read as the same product as the table — the
   previous pass had prose floating directly on the background, which no
   surface in the play screen ever does. */
.qa-landing, .qa-join {
  display: grid;
  grid-template-rows: 1fr auto;
  padding: var(--qa-hud-inset);
}
.qa-scene-panel {
  align-self: center;
  justify-self: center;
  width: min(600px, 100%);
  margin: var(--qa-s6) 0;
  padding: var(--qa-s6);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s5);
}
.qa-scene-head { display: flex; flex-direction: column; gap: var(--qa-s2); }
/* Reserved height so the scene does not jump when the campaign name lands. */
.qa-join .qa-scene-head { min-height: 62px; }

.qa-landing-skip {
  position: absolute;
  z-index: 3;
  top: var(--qa-hud-inset);
  right: var(--qa-hud-inset);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
  background: none;
  border: none;
  padding: var(--qa-s2);
  cursor: pointer;
  transition: color var(--qa-dur) var(--qa-ease);
}
.qa-landing-skip:hover { color: var(--qa-ink); }

.qa-landing-foot {
  position: relative;
  z-index: 2;
  max-width: 62ch;
  margin: 0 auto;
  padding: var(--qa-s4) 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.55;
  color: var(--qa-ink-faint);
  text-align: center;
}
.qa-landing-foot b { color: var(--qa-ink-dim); font-weight: 400; }

/* ---- Home: the table between sessions --------------------------------------
   No conversation and nothing to sit through: content starts at the top,
   because this is a screen you came to in order to click something. */
.qa-home-content {
  position: relative;
  z-index: 2;
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--qa-s8) var(--qa-hud-inset);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s7);
}
.qa-home-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--qa-s5);
  flex-wrap: wrap;
}
.qa-home-head > div { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa-home-section { display: flex; flex-direction: column; gap: var(--qa-s3); }

/* auto-FIT with a CEILING, which is the pair of decisions this row needs:
   auto-fill leaves phantom tracks (two campaigns clinging to the left of a
   1000px row with nothing beside them), while auto-fit with a 1fr max turns a
   single campaign into a banner. A 330px ceiling keeps a card card-shaped
   however many there are. */
.qa-home-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 330px));
  justify-content: start;
  gap: var(--qa-s3);
}

.qa-camp {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s2);
  min-height: 116px;
  padding: var(--qa-s4);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--qa-dur) var(--qa-ease), transform var(--qa-dur) var(--qa-ease);
}
.qa-camp:hover { border-color: var(--qa-accent-line); transform: translateY(-2px); }
/* The role line is DATA, so it takes the mono voice's caps treatment. Left
   lowercase it read as prose and competed with the campaign name beside it. */
.qa-camp .rd-micro { text-transform: uppercase; }
.qa-camp-name { font-family: var(--qa-font-display); font-size: var(--qa-text-lg); color: var(--qa-ink); line-height: 1.15; }
/* The accent means you, and running a campaign is the strongest sense of
   yours on this screen — the same reservation the play screen makes for your
   own token. Nothing else here is accented. */
.qa-camp.is-yours { border-left: 2px solid var(--qa-accent-line); }
.qa-camp.is-yours .rd-micro { color: var(--qa-accent); }

.qa-home-empty { display: flex; flex-direction: column; gap: var(--qa-s3); padding: var(--qa-s6); max-width: 52ch; }
.qa-home-notice { margin: 0; }

/* ---- Create and the campaign placeholder ----------------------------------- */
.qa-make { display: grid; place-items: center; padding: var(--qa-hud-inset); }
.qa-make-panel {
  width: min(520px, 100%);
  padding: var(--qa-s6);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s4);
}
.qa-make-panel .rd-form { width: 100%; }

.qa-make-link {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--qa-s1);
  padding: var(--qa-s3) var(--qa-s4);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-left: 2px solid var(--qa-accent-line);
  border-radius: var(--qa-radius);
}
.qa-make-link-url {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  line-height: 1.5;
  color: var(--qa-ink);
  word-break: break-all;
}

/* ---- Attribution: a document, so it reads like one --------------------------
   Wider measure and larger leading than the rest of the shell: this is the one
   screen somebody may actually READ rather than act on, and the required
   licence statement has to survive being read carefully. */
.qa-legal { display: grid; place-items: start center; padding: var(--qa-hud-inset); }
.qa-legal-panel {
  width: min(660px, 100%);
  margin: var(--qa-s7) 0;
  padding: var(--qa-s7);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s6);
}
.qa-legal-head { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa-legal-section { display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-legal-section .rd-detail { max-width: none; }

/* The required statement is set apart deliberately: it is quoted text that must
   not be reworded, so it should not look like the prose around it that can be. */
.qa-legal-statement {
  margin: 0;
  padding: var(--qa-s4);
  background: var(--qa-chip);
  border-left: 2px solid var(--qa-accent-line);
  border-radius: var(--qa-radius);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.65;
  color: var(--qa-ink);
}
.qa-legal-statement a { color: var(--qa-accent); text-decoration: underline; text-underline-offset: 2px; word-break: break-word; }
.qa-legal-statement a:hover { color: var(--qa-ink); }

.qa-legal-link {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
  background: none;
  border: none;
  padding: var(--qa-s1);
  cursor: pointer;
  transition: color var(--qa-dur) var(--qa-ease);
}
.qa-legal-link:hover { color: var(--qa-ink); }

/* ---- Lobby: the room filling up --------------------------------------------
   A seat you can see is empty is the whole point, so the roster renders every
   member and presence only changes their WEIGHT. Nothing appears or disappears
   as people connect — a list that reflows while you are reading it makes it
   harder to tell who arrived. */
.qa-lobby { display: grid; place-items: center; padding: var(--qa-hud-inset); }
.qa-lobby-panel {
  width: min(520px, 100%);
  padding: var(--qa-s6);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--qa-s4);
}
.qa-lobby-head { display: flex; flex-direction: column; gap: var(--qa-s2); min-height: 56px; }
.qa-lobby-note { color: var(--qa-ink-faint); }

.qa-lobby-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--qa-s1); }
.qa-seat {
  display: flex;
  align-items: baseline;
  gap: var(--qa-s3);
  padding: var(--qa-s2) var(--qa-s3);
  border-radius: var(--qa-radius);
  border: var(--qa-hairline) solid transparent;
  transition: border-color var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease);
}
.qa-seat.is-here { background: var(--qa-chip); border-color: var(--qa-glass-border); }

/* Present is a filled dot, expected is an outline. Colour alone would fail
   anyone who cannot distinguish it, so the fill does the work. */
.qa-seat-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  align-self: center;
}
.qa-seat.is-here .qa-seat-dot { background: var(--qa-success); border-color: var(--qa-success); }

.qa-seat-name {
  flex: 1;
  font-family: var(--qa-font-display);
  font-size: var(--qa-text-body);
  color: var(--qa-ink-dim);
}
.qa-seat.is-here .qa-seat-name { color: var(--qa-ink); }
.qa-seat-you { color: var(--qa-accent); }
.qa-seat-role { flex: none; color: var(--qa-ink-faint); text-transform: uppercase; }

/* ---- The character wizard --------------------------------------------------
   Two columns: the steps you work through, and the character filling in beside
   them. The panel is STICKY rather than scrolling away — its whole job is to
   show consequence, and a payoff you have to scroll back to see is not one. */
.qa-wiz { display: block; padding: var(--qa-hud-inset); }
.qa-wiz-frame {
  position: relative;
  z-index: 2;
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--qa-s6) 0 var(--qa-s8);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s6);
}
.qa-wiz-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--qa-s5); flex-wrap: wrap; }
.qa-wiz-head > div { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa-wiz-body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: var(--qa-s5); align-items: start; }
.qa-wiz-steps { display: flex; flex-direction: column; gap: var(--qa-s3); min-width: 0; }
.qa-wiz-foot { display: flex; align-items: center; justify-content: flex-end; gap: var(--qa-s4); flex-wrap: wrap; }
.qa-wiz-left { margin-right: auto; max-width: none; }

/* ---- one step ---- */
.qa-step {
  background: var(--qa-glass);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  overflow: hidden;
}
.qa-step.is-open { border-color: var(--qa-accent-line); }
.qa-step-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  padding: var(--qa-s4);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
/* The number is a step count, and the sequence is real — a background bonus
   cannot be spent before a background exists. It carries a state, not just an
   index: lit once the step is the one being worked on. */
.qa-step-n {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  color: var(--qa-ink-faint);
}
.qa-step.is-open .qa-step-n { border-color: var(--qa-accent-line); color: var(--qa-accent); }
.qa-step-label { flex: 1; font-family: var(--qa-font-display); font-size: var(--qa-text-lg); color: var(--qa-ink); }
.qa-step-state { flex: none; color: var(--qa-ink-faint); text-transform: uppercase; }
.qa-step-body { display: flex; flex-direction: column; gap: var(--qa-s3); padding: 0 var(--qa-s4) var(--qa-s4); }

/* ---- the pick grids ---- */
.qa-pick-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: var(--qa-s2); }
.qa-pick {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--qa-s1);
  padding: var(--qa-s3);
  text-align: left;
  cursor: pointer;
  background: var(--qa-chip);
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  transition: border-color var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease);
}
.qa-pick:hover { border-color: var(--qa-glass-border); }
.qa-pick.is-picked { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); }
.qa-pick-name { font-family: var(--qa-font-display); font-size: var(--qa-text-body); color: var(--qa-ink); }
.qa-pick-plain { font-family: var(--qa-font-body); font-size: var(--qa-text-label); line-height: 1.45; color: var(--qa-ink-dim); }
.qa-pick-meta { color: var(--qa-ink-faint); text-transform: uppercase; }
.qa-pick.is-picked .qa-pick-meta { color: var(--qa-accent); }

/* ---- the background spend and the ability assignment ---- */
.qa-spend, .qa-assign { display: flex; flex-direction: column; gap: var(--qa-s3); padding-top: var(--qa-s2); }
/* The instruction and its escape hatch share a line: the button belongs
   beside the sentence it is an alternative to, not stranded below the list. */
.qa-assign-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--qa-s4); flex-wrap: wrap; }
.qa-assign-head .rd-detail { flex: 1; min-width: 240px; }
.qa-roll { flex: none; white-space: nowrap; }
.qa-spend-rows { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa-spend-row, .qa-assign-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s4);
  flex-wrap: wrap;
  padding-bottom: var(--qa-s2);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
}
.qa-spend-name, .qa-assign-name { font-family: var(--qa-font-body); font-size: var(--qa-text-body); color: var(--qa-ink); }
.qa-assign-who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.qa-assign-plain { color: var(--qa-ink-faint); text-transform: none; letter-spacing: normal; }
.qa-spend-opts, .qa-assign-opts { display: flex; gap: var(--qa-s1); flex: none; }
.qa-assign-opts .qa2-chip, .qa-spend-opts .qa2-chip { min-width: 38px; justify-content: center; padding: var(--qa-s2); }
.qa-assign-opts .qa2-chip:disabled, .qa-spend-opts .qa2-chip:disabled { opacity: 0.3; cursor: not-allowed; }

/* ---- the character panel ---- */
.qa-cp {
  position: sticky;
  top: var(--qa-hud-inset);
  padding: var(--qa-s5);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s4);
}
.qa-cp-head { display: flex; flex-direction: column; gap: var(--qa-s1); }
.qa-cp-name { margin: 0; font-family: var(--qa-font-display); font-size: var(--qa-text-title); line-height: 1.1; color: var(--qa-ink); }
.qa-cp-line { margin: 0; font-family: var(--qa-font-body); font-size: var(--qa-text-label); color: var(--qa-ink-dim); }

.qa-cp-vitals { display: grid; grid-template-columns: 1fr 1fr; gap: var(--qa-s3); }
.qa-cp-stat { display: flex; flex-direction: column; gap: 2px; }
.qa-cp-stat-label { font-family: var(--qa-font-mono); font-size: var(--qa-text-whisper); letter-spacing: var(--qa-tracking-caps); text-transform: uppercase; color: var(--qa-ink-faint); }
.qa-cp-stat-value { font-family: var(--qa-font-mono); font-size: var(--qa-text-lg); color: var(--qa-ink); }
.qa-cp-stat.is-empty .qa-cp-stat-value { color: var(--qa-ink-faint); }
/* The arithmetic under a number is the point of this panel, not a footnote —
   it is how a first-time player learns where 12 hit points came from. */
.qa-cp-why { font-family: var(--qa-font-mono); font-size: var(--qa-text-whisper); line-height: 1.5; color: var(--qa-ink-faint); }
.qa-cp-plus { padding: 0 3px; }

.qa-cp-abilities { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--qa-s2); }
.qa-cp-ab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: var(--qa-s2);
  background: var(--qa-chip);
  border-radius: var(--qa-radius);
}
.qa-cp-ab-name { font-family: var(--qa-font-mono); font-size: var(--qa-text-whisper); letter-spacing: var(--qa-tracking-caps); color: var(--qa-ink-faint); }
.qa-cp-ab-score { font-family: var(--qa-font-mono); font-size: var(--qa-text-body); color: var(--qa-ink); }
.qa-cp-ab-mod { font-family: var(--qa-font-mono); font-size: var(--qa-text-whisper); color: var(--qa-accent); }
.qa-cp-ab.is-empty .qa-cp-ab-score { color: var(--qa-ink-faint); }

.qa-cp-block { display: flex; flex-direction: column; gap: var(--qa-s1); }
.qa-cp-list { margin: 0; font-family: var(--qa-font-body); font-size: var(--qa-text-label); line-height: 1.5; color: var(--qa-ink-dim); }

@media (max-width: 900px) {
  /* The panel stops being sticky and moves ABOVE the steps: on a narrow screen
     a sticky sidebar would eat the room the choices need, and the summary is
     more useful as a running header than as a column. */
  .qa-wiz-body { grid-template-columns: minmax(0, 1fr); }
  .qa-cp { position: static; order: -1; }
  .qa-wiz-frame { padding-top: var(--qa-s4); }
}

/* ---- shell states ---------------------------------------------------------- */
.qa-shell-loading { display: flex; align-items: center; justify-content: center; min-height: 40vh; }
.qa-shell-error { display: flex; flex-direction: column; gap: var(--qa-s3); }

/* ---- Nav: the quiet part ----------------------------------------------------
   It carries .rd for the tokens, but .rd is written for a PAGE — min-height
   100vh and its own stacking. Both have to be undone or the bar grows to fill
   the viewport. Anything that takes .rd without being a full page needs this
   same pair of resets. */
.qa-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s4);
  padding: var(--qa-s3) var(--qa-hud-inset);
  background: var(--qa-glass-solid);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
}
.qa-nav-brand {
  font-family: var(--qa-font-display);
  font-size: var(--qa-text-lg);
  color: var(--qa-ink);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.qa-nav-links { display: flex; align-items: center; gap: var(--qa-s1); }
.qa-nav-account { display: flex; align-items: center; gap: var(--qa-s4); }
/* the only accented thing in the bar is your own name */
.qa-nav-you { font-family: var(--qa-font-mono); font-size: var(--qa-text-whisper); letter-spacing: var(--qa-tracking-caps); color: var(--qa-accent); }

@media (max-width: 720px) {
  .qa-scene-panel { padding: var(--qa-s4); margin: var(--qa-s4) 0; }
  .qa-home-content { padding-top: var(--qa-s6); gap: var(--qa-s6); }
  .qa-home-head { align-items: flex-start; }
  .qa-make-panel { padding: var(--qa-s4); }
}

/* The shared-screen link: long, and meant to be copied rather than read. */
.qa-display-link {
  display: block;
  width: 100%;
  margin-top: var(--qa-s2);
  padding: var(--qa-s2) var(--qa-s3);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  color: var(--rd-dim);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--rd-line);
  border-radius: var(--qa-radius);
}
`;

/** The shell's screen layouts on top of the shared table language. */
export function ShellStyles(): ReactElement {
  return (
    <>
      <RoadStyles />
      <style>{CSS}</style>
    </>
  );
}
