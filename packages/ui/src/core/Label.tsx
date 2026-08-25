/**
 * Label — the quiet eyebrow above a value or a section.
 *
 * Half of the design's signature scale contrast: a whisper-quiet label over a
 * loud value. Always faint, always small-caps, never competing with what it
 * names.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface LabelProps {
  children: ReactNode;
  /** Render as the element that owns it (e.g. a <legend>) when semantics demand. */
  as?: 'span' | 'div' | 'legend';
  htmlFor?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

export function Label({ children, as = 'span', htmlFor, id, className, style }: LabelProps) {
  const css: CSSProperties = {
    display: 'block',
    fontFamily: 'var(--qa-font-body)',
    fontSize: '0.6875rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--qa-ink-faint)',
    ...style,
  };

  if (htmlFor !== undefined) {
    return (
      <label htmlFor={htmlFor} id={id} className={className} style={css}>
        {children}
      </label>
    );
  }

  const Tag = as;
  return (
    <Tag id={id} className={className} style={css}>
      {children}
    </Tag>
  );
}
