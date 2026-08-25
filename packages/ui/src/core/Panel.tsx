/**
 * Panel — the glass surface every floating UI sits on.
 *
 * The design's panels are translucent glass over a dark ground, not opaque
 * cards. All four glass values come from the active [data-qa-theme]; nothing
 * here is hardcoded, so slate/ivory re-theme this with zero edits.
 */
import type { CSSProperties, ReactNode } from 'react';

export type PanelTone = 'glass' | 'solid';

export interface PanelProps {
  children: ReactNode;
  /** `glass` floats over the map; `solid` is for surfaces that must stay legible over anything. */
  tone?: PanelTone;
  /** Large radius for full surfaces; the default suits inline blocks. */
  large?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Names the region when the panel IS the landmark (e.g. a player's whole HUD). */
  'aria-label'?: string;
}

export function Panel({ children, tone = 'glass', large = false, className, style, 'aria-label': ariaLabel }: PanelProps) {
  const base: CSSProperties = {
    background: tone === 'solid' ? 'var(--qa-glass-solid)' : 'var(--qa-glass)',
    border: 'var(--qa-hairline) solid var(--qa-glass-border)',
    borderRadius: large ? 'var(--qa-radius-lg)' : 'var(--qa-radius)',
    color: 'var(--qa-ink)',
    ...(tone === 'glass'
      ? {
          backdropFilter: 'blur(var(--qa-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--qa-glass-blur))',
        }
      : {}),
  };

  return (
    <div className={className} style={{ ...base, ...style }} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
