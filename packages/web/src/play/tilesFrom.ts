/**
 * The action rows — what you can actually do, from your own sheet.
 *
 * THESE WERE EMPTY BY DESIGN AND THAT WAS THE RIGHT CALL AT THE TIME: a tile
 * that does nothing when tapped is worse than no tile. Now that intents reach
 * the server and come back as events, they can be real.
 *
 * THE SHEET IS THE ONLY SOURCE. Every number here — the +5, the 1d8 + 3 — comes
 * off `ComputedSheet` with the arithmetic that produced it attached. Nothing is
 * recalculated, because a recalculation could disagree with the character sheet
 * the player is looking at, and the player would have no way to tell which was
 * lying. This is the same rule the hero panel follows.
 *
 * ECONOMY IS WHAT A TURN IS MADE OF. Sorting attacks into Action and features
 * into their own row is not decoration: "what can I still do this turn?" is the
 * question a new player asks most, and the rows ARE the answer.
 */
import type { ComputedSheet } from '@questra/contracts';
import type { TileVM } from '../primitives/v2/viewModel.js';
import type { GlyphName } from '../design/index.js';

const sign = (n: number): string => (n >= 0 ? `+${String(n)}` : `−${String(Math.abs(n))}`);

/**
 * A weapon's glyph, guessed from its name.
 *
 * A guess is honest here: the SRD does not tag weapons by shape, and the glyph
 * is decoration on a tile whose text already says exactly what it is. Getting
 * it wrong costs a slightly odd icon, not a wrong number.
 */
function glyphOf(name: string): GlyphName {
  const n = name.toLowerCase();
  /* Thrown and fired weapons are the one distinction worth drawing: it changes
     where you can stand, which is the only thing the icon could usefully say. */
  if (n.includes('bow') || n.includes('sling') || n.includes('dart') || n.includes('javelin')) return 'bow';
  return 'blade';
}

/** How the damage expression reads on a tile face. */
function damageText(damage: unknown): string {
  if (typeof damage === 'string') return damage;
  if (damage && typeof damage === 'object') {
    const d = damage as { dice?: string; expr?: string; text?: string };
    return d.dice ?? d.expr ?? d.text ?? '';
  }
  return '';
}

export function tilesFrom(sheet: ComputedSheet | null): TileVM[] {
  if (!sheet) return [];
  const tiles: TileVM[] = [];

  for (const a of sheet.attacks) {
    const dmg = damageText(a.damage);
    tiles.push({
      id: `attack:${a.name}`,
      name: a.name,
      economy: 'action',
      glyph: glyphOf(a.name),
      /* The tile face carries the two numbers that decide a swing, in the
         order they happen: hit first, then damage. */
      meta: [sign(a.toHit), dmg].filter(Boolean).join(' · '),
      detail: `${a.name}: roll ${sign(a.toHit)} to hit${dmg ? `, then ${dmg} ${a.damageType} damage` : ''}.`,
      /**
       * Tapping opens the compose sheet with the bonus already in the formula,
       * and deliberately carries no `against`: a player does not know a target's
       * armour class before they swing, so it appears in the verdict afterwards
       * and nowhere earlier.
       */
      roll: { bonus: a.toHit },
      /* Legality is the server's answer and arrives with the projection.
         Nothing is greyed on a guess made here. */
      greyReason: null,
      explain: {
        id: `attack-${a.name}`,
        kicker: 'Attack',
        title: a.name,
        value: sign(a.toHit),
        rows: a.toHitDerivation.map((m) => ({ label: m.label, value: sign(m.value) })),
        rule: 'Roll a twenty-sided die and add this. Meet or beat their armour class and you hit.',
      },
    });
  }

  for (const f of sheet.features) {
    tiles.push({
      id: `feature:${f.id}`,
      name: f.name,
      /* Features without a declared economy are actions — the common case, and
         a wrong row is more confusing than a conservative one. */
      economy: 'action',
      glyph: 'spark',
      ...(f.resource
        ? { resource: `${String(f.resource.remaining)} of ${String(f.resource.max)}` }
        : {}),
      detail: f.resource
        ? `${f.name}. ${String(f.resource.remaining)} of ${String(f.resource.max)} left — a rest brings them back.`
        : `${f.name}.`,
      greyReason: null,
      explain: {
        id: `feature-${f.id}`,
        kicker: 'Feature',
        title: f.name,
        value: f.resource ? `${String(f.resource.remaining)}/${String(f.resource.max)}` : '—',
        rows: f.resource
          ? [{ label: 'Left today', value: String(f.resource.remaining) }]
          : [],
        rule: 'Something your character can do that most cannot.',
      },
    });
  }

  return tiles;
}
