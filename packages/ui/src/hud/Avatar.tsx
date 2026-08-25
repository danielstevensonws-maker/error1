/**
 * Avatar — an initial tile for party cards, the sheet header, and hero lists.
 *
 * The old design's --qa-class-* per-class tint family (Fighter/Wizard/etc.
 * each their own hue) isn't in the current token set yet, so `color` defaults
 * to the app's one accent rather than a fabricated class palette — callers
 * can still pass an explicit colour once that token family exists.
 */
import type { CSSProperties, ReactElement } from 'react';

export interface AvatarProps {
  /** Single display-serif initial. */
  initial: string;
  /** Identity tint — defaults to the app accent. */
  color?: string;
  shape?: 'square' | 'circle';
  /** Edge length in px. */
  size?: number;
  style?: CSSProperties;
}

export function Avatar({ initial, color = 'var(--qa-accent)', shape = 'square', size = 40, style = {} }: AvatarProps): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: shape === 'circle' ? 'var(--qa-radius-round)' : 'var(--qa-radius-sm)',
        background: `color-mix(in srgb, ${color} 24%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 60%, transparent)`,
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--qa-font-display)',
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        color: 'var(--qa-ink)',
        ...style,
      }}
    >
      {initial}
    </div>
  );
}
