/**
 * Chip — a small inline tag.
 *
 * Tones carry meaning, not decoration: `accent` marks provenance (the Homebrew
 * badge — a tint, never a warning), `danger` marks a real problem, `gold` marks
 * something notable (a hand-entered roll). `neutral` is the default wash.
 */
import type { CSSProperties, ReactNode } from 'react';

export type ChipTone = 'neutral' | 'accent' | 'danger' | 'success' | 'gold';

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  /** Numbers read in mono — "prose is a serif, data is mono". */
  mono?: boolean;
  className?: string;
  style?: CSSProperties;
}

const TONE: Record<ChipTone, CSSProperties> = {
  neutral: { background: 'var(--qa-chip)', color: 'var(--qa-ink-dim)' },
  accent: { background: 'var(--qa-accent-soft)', color: 'var(--qa-accent)' },
  danger: { background: 'var(--qa-chip)', color: 'var(--qa-danger)' },
  success: { background: 'var(--qa-chip)', color: 'var(--qa-success)' },
  gold: { background: 'var(--qa-chip)', color: 'var(--qa-gold)' },
};

export function Chip({ children, tone = 'neutral', mono = false, className, style }: ChipProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--qa-s1)',
        padding: 'var(--qa-s1) calc(var(--qa-s4) / 2)',
        borderRadius: 'var(--qa-radius)',
        fontFamily: mono ? 'var(--qa-font-mono)' : 'var(--qa-font-body)',
        fontSize: '0.8125rem',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...TONE[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
