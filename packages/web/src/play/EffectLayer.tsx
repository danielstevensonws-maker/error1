/**
 * EffectLayer — what thunder looks like (Brief 10 §4).
 *
 * REDUCE MOTION SUPPRESSES EVERY EFFECT, and this is non-negotiable rather than
 * a preference. The suppression lives here, at the RECEIVING end, because it is
 * a property of the person watching and not of the effect: a DM must never have
 * to remember who at their table gets motion sick, and a player must never have
 * to ask them to stop.
 *
 * Suppressed means nothing renders at all — not a slower shake, not a dimmer
 * flash. A global rule that collapses durations still leaves a screen lurching,
 * which is the exact thing the setting exists to prevent.
 *
 * IT COVERS THE MAP AND NOTHING ELSE READS IT. Pointer events pass straight
 * through: an effect that swallows a click during a fight is worse than no
 * effect. Every one is a fixed-length animation that ends by removing itself,
 * so nothing accumulates over a four-hour session.
 */
import type { ReactElement } from 'react';
import type { EffectId } from './ImmersionConsole.js';
import { usePrefersReducedMotion } from '../shell/shared.js';
import { EffectStyles } from './EffectStyles.js';

export interface EffectLayerProps {
  effect: EffectId | null;
}

export function EffectLayer({ effect }: EffectLayerProps): ReactElement | null {
  const reduced = usePrefersReducedMotion();

  /* The whole feature, off. Accessibility beats atmosphere every time. */
  if (!effect || reduced) return null;

  return (
    <div className={`qa-fx is-${effect}`} aria-hidden="true">
      <EffectStyles />
      {effect === 'rain' && <div className="qa-fx-rain" />}
      {effect === 'thunder' && <div className="qa-fx-flash" />}
      {effect === 'torch' && <div className="qa-fx-torch" />}
      {effect === 'blood' && <div className="qa-fx-blood" />}
      {effect === 'fade' && <div className="qa-fx-fade" />}
    </div>
  );
}
