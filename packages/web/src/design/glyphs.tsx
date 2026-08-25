/**
 * design/glyphs — the app's small marks, as inline SVG.
 *
 * WHY NOT EMOJI. The one place v2 uses emoji is the reactions row, where the
 * emoji IS the message. Everywhere else — action tiles, frame controls — the
 * marks are drawn: emoji carry their own palette and their own era, and eight
 * of them across a warm-dark frame reads as a toolbar someone assembled from
 * whatever was to hand. These are hairline strokes in `currentColor`, so they
 * inherit ink, dim, faint and accent from whatever they sit inside and cost the
 * theme nothing.
 *
 * WHY NOT ICON-ONLY TILES. v1's action bar is icons plus a detail strip. v2
 * puts the NAME on the tile and the glyph beside it, because the product's
 * actual user is someone who has never played before: an icon is a puzzle, a
 * name is an answer (law 5, teach by doing). The glyph is there to make a row
 * scannable once you already know it, not to carry the meaning alone.
 */
import type { ReactElement } from 'react';

export type GlyphName =
  | 'blade' | 'bow' | 'shield' | 'boot' | 'exit' | 'counter' | 'flask' | 'spark'
  | 'heal' | 'bolt' | 'flame' | 'ward' | 'bless' | 'sidestep'
  | 'eye' | 'hand' | 'plus' | 'send' | 'gear' | 'quill' | 'sound' | 'menu'
  | 'close' | 'chevronLeft' | 'chevronRight' | 'chevronUp' | 'chevronDown' | 'pause' | 'die'
  | 'lock' | 'search' | 'check' | 'grip'
  | 'rain' | 'tremor' | 'blood' | 'eclipse' | 'screen';

/**
 * ONE AUTHORING CONSTRAINT. This file is scanned by the HUD type-hygiene suite,
 * which looks for literal CSS durations — and SVG's lowercase smooth-curve
 * command produces them by accident: `-3.8s-2` in path data is indistinguishable
 * from a 3.8-second animation to a regular expression. Write curves with the
 * explicit C/Q forms rather than the s/t shorthands and the question does not
 * arise. (Uppercase S happens to be safe, but there is no reason to risk the
 * habit.)
 */
const PATHS: Record<GlyphName, ReactElement> = {
  // A sword reads as a sword because of the crossguard and the pommel. Without
  // them this was a diagonal stroke that everybody called a pencil.
  blade: <><path d="M13.4 2.6 7.2 8.8" /><path d="m11.2 2.4 2.4 2.4" /><path d="M4.4 11.6 7.2 8.8" /><path d="M2.6 10.2h4.2v4.2" /><path d="M3.4 13.4 2 14.8" /></>,
  bow: <><path d="M4 2.5a9 9 0 0 1 0 11" /><path d="M4 2.5 13.5 8 4 13.5" /><path d="M8.2 8h5.6" /></>,
  shield: <path d="M8 2.2 13 4v4.2c0 3-2.2 5.2-5 6.1-2.8-.9-5-3.1-5-6.1V4l5-1.8Z" />,
  boot: <><path d="M6.2 2.5v7.8" /><path d="M6.2 10.3h3c1.6 0 2 .9 3.4 1.6l1.4.8v1.3H6.2Z" /><path d="M3.6 4.4H1.4M3.6 7H1.4M3.6 9.6H1.4" /></>,
  // Leaving reach without being swung at — a figure stepping out past a line.
  exit: <><path d="M9.4 2.6H3.4v10.8h6" /><path d="M7.2 8h7.2" /><path d="m11.8 5.4 2.6 2.6-2.6 2.6" /></>,
  // A reaction: their move, then yours, coming back the other way.
  counter: <><path d="M3 5.4h7.2a3 3 0 0 1 0 6H5.6" /><path d="m7.8 9.2-2.2 2.2 2.2 2.2" /><path d="M4.6 2.4 2.2 4.8l2.4 2.4" /></>,
  flask: <><path d="M6.5 2.5v3.8L3.4 12a1.6 1.6 0 0 0 1.4 2.4h6.4A1.6 1.6 0 0 0 12.6 12L9.5 6.3V2.5" /><path d="M5.5 2.5h5" /><path d="M4.8 10.2h6.4" /></>,
  spark: <><path d="M8 1.8v3.4M8 10.8v3.4M1.8 8h3.4M10.8 8h3.4" /><path d="m4 4 2.2 2.2M9.8 9.8 12 12M12 4 9.8 6.2M6.2 9.8 4 12" /></>,
  // A caster's row is mostly spells, so these four have to separate from each
  // other AND from the martial marks above at 22px.
  heal: <><path d="M8 4.2v7.6M4.2 8h7.6" /><circle cx="8" cy="8" r="6" /></>,
  bolt: <path d="M9.2 1.8 4 8.6h3.4l-.6 5.6L12 7.4H8.6l.6-5.6Z" />,
  flame: <><path d="M8 1.8C8 1.8 12.4 6.6 12.4 10C12.4 12.4 10.6 14.2 8 14.2C5.4 14.2 3.6 12.4 3.6 10C3.6 6.6 8 1.8 8 1.8Z" /><path d="M8 8.4C8 8.4 10 10.6 10 12.2C10 13.3 9.2 14.2 8 14.2C6.8 14.2 6 13.3 6 12.2C6 10.6 8 8.4 8 8.4Z" /></>,
  // A shield with a mote inside it, NOT a cross — a cross here read as a second
  // heal glyph at 22px, and the two sat one tile apart in a Cleric's row.
  ward: <><path d="M8 1.8 13.4 4v4.4c0 3.2-2.3 5.6-5.4 6.4-3.1-.8-5.4-3.2-5.4-6.4V4L8 1.8Z" /><circle cx="8" cy="7.8" r="1.8" /></>,
  // Something falling on you from above, rather than another enclosed outline.
  bless: <><path d="M8 1.8v4.6M4.6 3.2 6.2 6.6M11.4 3.2 9.8 6.6" /><path d="M3.4 9.4a4.6 4.6 0 0 1 9.2 0" /><path d="M3.4 9.4v3.2M12.6 9.4v3.2M8 11v3.2" /></>,
  // Dodging is movement, not armour: a body slipping aside past a line.
  sidestep: <><path d="M11.6 2.4v11.2" /><path d="M8.6 4.6C5.4 5.6 3.4 6.8 3.4 8s2 2.4 5.2 3.4" /><path d="m5.6 3.6-2.2 1.4 1.6 1.8" /></>,
  eye: <><path d="M1.6 8Q4.6 3.8 8 3.8Q11.4 3.8 14.4 8Q11.4 12.2 8 12.2Q4.6 12.2 1.6 8Z" /><circle cx="8" cy="8" r="1.9" /></>,
  hand: <><path d="M5.5 8V3.6a1.1 1.1 0 0 1 2.2 0V7" /><path d="M7.7 7V2.9a1.1 1.1 0 0 1 2.2 0V7" /><path d="M9.9 7.4V4.6a1.1 1.1 0 0 1 2.2 0v5c0 2.6-1.7 4.6-4.1 4.6-2.2 0-3.4-1.2-4.2-3L3 8.6a1.1 1.1 0 0 1 1.9-1.1l.6 1" /></>,
  plus: <path d="M8 4v8M4 8h8" />,
  send: <path d="M2.2 8 14 3l-4 11-2.4-4.6L2.2 8Z" />,
  gear: <><circle cx="8" cy="8" r="2.2" /><path d="M8 1.6v1.8M8 12.6v1.8M14.4 8h-1.8M3.4 8H1.6M12.5 3.5 11.2 4.8M4.8 11.2l-1.3 1.3M12.5 12.5l-1.3-1.3M4.8 4.8 3.5 3.5" /></>,
  quill: <><path d="M13.6 2.4C9 3 5.6 5.4 4.2 9.2c-.5 1.3-.6 2.6-.6 3.6" /><path d="M3.6 13.4c3.6.6 7-1.4 8.6-4.6" /><path d="M2.4 14.2 5 11.6" /></>,
  sound: <><path d="M3 6.2h2.4L8.6 3.4v9.2L5.4 9.8H3Z" /><path d="M11 6a3 3 0 0 1 0 4" /><path d="M12.8 4.2a5.6 5.6 0 0 1 0 7.6" /></>,
  menu: <path d="M2.6 4.6h10.8M2.6 8h10.8M2.6 11.4h10.8" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  chevronLeft: <path d="M10 3.2 5.4 8l4.6 4.8" />,
  chevronRight: <path d="m6 3.2 4.6 4.8L6 12.8" />,
  // Same proportions as the other two, rotated: the action panel collapses
  // toward the bottom edge it sits on, so its toggle points down.
  chevronDown: <path d="M3.2 6 8 10.6 12.8 6" />,
  pause: <><path d="M6 3.6v8.8M10 3.6v8.8" /></>,
  die: <><rect x="2.6" y="2.6" width="10.8" height="10.8" rx="2" /><circle cx="6" cy="6" r=".9" /><circle cx="10" cy="10" r=".9" /></>,

  // ---- the authoring marks -------------------------------------------------
  // The DM's surfaces were reaching for 🔒 ✓ ✕ ▲ ▼ ⠿ — emoji and box-drawing
  // characters, which is exactly the toolbar-assembled-from-whatever look the
  // header rules out, and which render at a different weight in every font the
  // user might have. Drawn, so they inherit ink like everything else.
  lock: <><rect x="3.4" y="7" width="9.2" height="7" rx="1.4" /><path d="M5.6 7V4.9a2.4 2.4 0 0 1 4.8 0V7" /></>,
  search: <><circle cx="7.2" cy="7.2" r="4.4" /><path d="m10.6 10.6 3 3" /></>,
  check: <path d="m3.2 8.4 3.2 3.2 6.4-7.2" />,
  chevronUp: <path d="M3.2 10.6 8 6l4.8 4.6" />,
  // Two columns of dots: the universal "this row can be dragged" mark, and
  // deliberately quiet — the buttons beside it are the real mechanism.
  grip: <><circle cx="6" cy="4" r=".9" /><circle cx="10" cy="4" r=".9" /><circle cx="6" cy="8" r=".9" /><circle cx="10" cy="8" r=".9" /><circle cx="6" cy="12" r=".9" /><circle cx="10" cy="12" r=".9" /></>,

  // ---- the weather -----------------------------------------------------------
  // The DM's mood row pushes an effect to every screen at the table, and it was
  // reaching for emoji to label them. Emoji carry their own palette and their own
  // era, which is the one thing the header of this file rules out. These are the
  // same hairline marks as everything else, so they take the accent on hover
  // along with the rest of the row.
  //
  // Curves are written with the explicit C/Q forms, never the s/t shorthands —
  // see the authoring note above: a lowercase smooth-curve command produces
  // literal strings like -3.8s-2 that the hygiene scanner cannot tell from a
  // 3.8-second animation.
  rain: <><path d="M4 8.4A3 3 0 0 1 4.5 2.5 4.2 4.2 0 0 1 12 4.2a2.4 2.4 0 0 1 0 4.2" /><path d="M5.4 11v2.4M8 10.4v3.2M10.6 11v2.4" /></>,
  // The ground moving: a flat line that has been shaken out of true.
  tremor: <><path d="M1.6 6.4h2.2l1.6-3 2.4 6 2.2-4.4 1.4 1.4h2.8" /><path d="M2.4 11.4h11.2" /><path d="M4.4 13.8h2M9.6 13.8h2" /></>,
  // A drop, and the ring it lands in. Not a splatter: this marks a moment in
  // the fiction, and a splatter reads as damage taken.
  blood: <><path d="M8 1.8C8 1.8 11.6 6 11.6 8.4A3.6 3.6 0 0 1 4.4 8.4C4.4 6 8 1.8 8 1.8Z" /><path d="M3 13.6Q8 15.2 13 13.6" /></>,
  // The light going out: a disc with the dark already over most of it.
  // No rays: with them it read as a sun, which is the opposite instruction.
  // A disc with the dark already across most of it, and nothing else.
  eclipse: <><circle cx="8" cy="8" r="5.6" /><path d="M8 2.4A5.6 5.6 0 0 0 8 13.6Z" fill="currentColor" stroke="none" /></>,
  // The screen in the middle of the table: a panel on a stand.
  screen: <><rect x="1.8" y="2.6" width="12.4" height="8.2" rx="1.4" /><path d="M8 10.8v2.6" /><path d="M5.4 13.4h5.2" /></>,
};

export function Glyph({ name, size = 16 }: { name: GlyphName; size?: number }): ReactElement {
  return (
    <svg
      className="qa2-glyph"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * Which mark an action wears, decided from its own words. A lookup table keyed
 * on ability names would need editing every time the rules data grows a row;
 * this degrades to a neutral spark instead of to a missing glyph.
 */
export function glyphFor(name: string, tags: readonly string[] = []): GlyphName {
  const n = name.toLowerCase();
  // ORDER MATTERS, and the specific cases come first. When tiles carried their
  // names this was forgiving; now that the icon IS the tile, two actions that
  // resolve to the same mark sit side by side in the same row and the row stops
  // being readable. Dash/Disengage and Dodge/Opportunity Attack were exactly
  // that pair, twice over.
  if (/opportunity|reaction|riposte|counter|retaliat/.test(n)) return 'counter';
  if (/disengage|withdraw|retreat/.test(n)) return 'exit';
  // "Shield of Faith" and "Dodge" both used to land on the plain shield, one
  // tile apart. Dodging is movement; a ward is armour. Order the ward test
  // first so the spell keeps the shield and the manoeuvre gets its own mark.
  if (/shield of|armor of|ward|sanctuar|barkskin/.test(n)) return 'ward';
  if (/dodge|evade|parry|sidestep/.test(n)) return 'sidestep';
  if (/block|shield|protect|guard|defend/.test(n)) return 'shield';
  if (/dash|sprint|run|move|step/.test(n)) return 'boot';
  if (/bow|sling|dart|javelin|thrown/.test(n)) return 'bow';
  if (/sword|axe|dagger|mace|spear|hammer|blade|glaive|strike|attack/.test(n)) return 'blade';
  if (/potion|flask|oil|alchem|drink|elixir/.test(n)) return 'flask';
  if (/hide|sneak|search|look|study|perceive|scout/.test(n)) return 'eye';
  if (/grapple|shove|push|help|assist/.test(n)) return 'hand';
  // Spell marks, before the catch-all spark — a caster's row is mostly spells,
  // so "everything glows" would be as unreadable as the duplicate-boot problem.
  if (/heal|cure|mend|restor|life|revivi/.test(n)) return 'heal';
  if (/bolt|lightning|shock|guiding|arrow of/.test(n)) return 'bolt';
  if (/flame|fire|burn|scorch|sear|radian/.test(n)) return 'flame';
  if (/bless|aid|inspir|guidance|resistance/.test(n)) return 'bless';
  // A conjured weapon is still a weapon. It shares the blade with a carried one
  // but never sits in the same economy row, so they cannot be confused.
  if (/spiritual weapon|spirit(ual)? blade|summon.*weapon/.test(n)) return 'blade';
  if (/wind|surge|smite|rage|word|cast|spell/.test(n)) return 'spark';
  if (tags.includes('ranged')) return 'bow';
  if (tags.includes('melee')) return 'blade';
  return 'spark';
}
