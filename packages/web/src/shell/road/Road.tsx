/**
 * shell/road/Road — the table every shell screen sits at.
 *
 * WHAT THIS REPLACED, AND WHY THE FIRST VERSION WAS WRONG (owner review,
 * 2026-08-20: "it feels inconsistent to the player view... the road itself
 * doesn't align with what we're looking to build"). It was an eye-level road
 * running to a horizon, and it failed against the play screen on three counts
 * at once — only the first of which was fixable by recolouring:
 *
 *   1  TEMPERATURE. The road was blue-black with a steel-grey surface and a
 *      night sky. The play screen is warm: brown-black ground, terracotta
 *      accent, bone type on a lit tabletop. Back to back they read as two
 *      products.
 *   2  CAMERA — the real problem. The play screen's ground is a map seen from
 *      DIRECTLY ABOVE: flat, gridded in five-foot cells, with tokens on it. The
 *      road was a perspective view from eye level. Those are not the same world
 *      at two distances, they are two incompatible cameras, and no palette
 *      change reconciles them.
 *   3  VOCABULARY. The play screen is discrete glass PANELS floating over the
 *      map, held off the window by --qa-hud-inset. The shell had no panels at
 *      all, so even recoloured it would not have looked related.
 *
 * So this is now the same table, drawn from the same material: the identical
 * --qa-map-* tokens, the same 58px minor and 290px major grid, the same
 * legibility vignette. The shell is the table before anyone has sat down.
 *
 * DISTANCE now means how much of the table you can see and how lit it is,
 * rather than where a horizon falls:
 *
 *   near   Landing, Join            the table lit and close, a token or two at rest
 *   camp   Home, Create, placeholder  pulled back and dimmer; content is the subject
 *   far    the nav                   a wash of the same warmth, no grid
 *
 * It reads --qa-* directly and deliberately. This is the one place the shell is
 * SUPPOSED to be identical to the play screen rather than merely harmonious, so
 * it uses the guarded token set rather than the shell's own --rd-* layer.
 */
import type { ReactElement } from 'react';

export type RoadDistance = 'near' | 'camp' | 'far';

export interface RoadProps {
  distance?: RoadDistance;
  /** Landing and Join only: the table wakes once the visitor has answered. */
  moving?: boolean;
}

/**
 * A few figures at rest on the empty table. Deliberately NOT a combat
 * arrangement — no facing, no clustering, nothing aimed at anything. They read
 * as pieces set down before a game starts, which is exactly what the shell is.
 * Positions are percentages so they hold at any viewport.
 */
const AT_REST: Array<{ x: number; y: number; tone: 'ally' | 'you' }> = [
  { x: 22, y: 38, tone: 'ally' },
  { x: 31, y: 62, tone: 'ally' },
  { x: 74, y: 44, tone: 'ally' },
  { x: 81, y: 68, tone: 'ally' },
  { x: 62, y: 78, tone: 'you' },
];

export function Road({ distance = 'near', moving = false }: RoadProps): ReactElement {
  /* Behind the nav, no grid: a 56px bar has no room for a five-foot cell, and a
     grid squeezed into it reads as noise rather than as the same table. */
  if (distance === 'far') {
    return <div className="rd-table is-far" />;
  }

  return (
    <>
      <div className={'rd-table is-' + distance + (moving ? ' is-awake' : '')}>
        <div className="rd-ground" />
        {distance === 'near' && (
          <div className="rd-pieces" aria-hidden="true">
            {AT_REST.map((p) => (
              <span
                key={String(p.x) + '-' + String(p.y)}
                className={'rd-piece is-' + p.tone}
                style={{ left: p.x + '%', top: p.y + '%' }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="rd-vignette" />
    </>
  );
}
