/**
 * design — the app's shared design layer.
 *
 * Everything a Questra surface is built from that is not specific to one
 * screen: the type ramp as named roles, the icon set, the reusable parts, and
 * the stylesheet that gives them their chrome and their behaviour.
 *
 * WHY THIS EXISTS. The play screen was rebuilt first and grew a coherent
 * language — one chrome contract, one type ramp, one focus ring, one
 * reduced-motion guarantee — while the older primitives each hand-rolled their
 * own surfaces inline: 104 style objects, 55 numeric font sizes and 17
 * hardcoded font families across eight files, none of them under the hygiene
 * guard. Put the two halves side by side and they read as different products.
 * Promoting the language out of one screen and into this layer is what lets
 * every surface share it rather than re-invent it.
 *
 * IMPORT FROM HERE, not from the individual modules — the barrel is the
 * public shape, and it keeps a component's import list short enough that
 * reaching for a one-off inline style looks like the odd choice it is.
 */
export { DesignStyles } from './styles.js';

export type { DerivationRow, ExplainVM } from './explain.js';

export { Glyph, glyphFor, type GlyphName } from './glyphs.js';

export {
  Ctl,
  Field,
  Help,
  Eyebrow,
  ExplainLine,
  ExplainValue,
  HP,
  Meter,
  Micro,
  Tag,
  type ChipTone,
} from './parts.js';

export {
  castName,
  eyebrow,
  heroName,
  heroTitle,
  itemName,
  micro,
  narration,
  prose,
  quote,
  rollTotal,
  sceneName,
  statMeta,
  statValue,
} from './type.js';
