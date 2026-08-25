/**
 * design/explain — the shape of an interrogable number.
 *
 * WHY THIS IS IN THE DESIGN LAYER AND NOT WITH THE GAME VIEW-MODELS. "A value,
 * the itemised rows that produced it, and a plain-English sentence about what
 * it means" is a PRESENTATION shape, not a rules one. An Armor Class, a spell
 * save DC, a homebrew class's damage-per-round estimate and a campaign's
 * session count are all the same thing to the screen, and all of them want the
 * same affordance: a readout whose label carries a dotted underline, tapped to
 * reveal the working.
 *
 * Keeping it here rather than in a game module is what lets `ExplainValue` and
 * the explain sheet live in the design layer at all — otherwise every shared
 * part would reach back into a specific screen's view-models for its types,
 * which is the wrong direction and would make the layer un-reusable by the
 * authoring surfaces (wizard, planner, compendium) that have no combatants at
 * all.
 *
 * Design request §5: "every number is tappable… nothing on this screen is
 * allowed to be a number the player can't interrogate." This interface is that
 * promise, typed — a value cannot be rendered through the shared readout
 * without carrying the means to justify itself.
 */

/** One itemised line of a derivation: "Chain Mail" / "16". */
export interface DerivationRow {
  label: string;
  value: string;
}

/** A number plus everything the explain sheet needs to justify it. */
export interface ExplainVM {
  id: string;
  /** the small-caps line above the title — what KIND of thing this is. */
  kicker: string;
  title: string;
  value: string;
  rows: DerivationRow[];
  /** plain English, the way a person would say it out loud. */
  rule: string;
  /** one line of colour. Optional, and never carries information. */
  flavour?: string;
}
