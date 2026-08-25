/**
 * Button — the one button.
 *
 * `primary` is the committing action, `quiet` is everything else, `danger` is
 * destructive. Disabled buttons stay VISIBLE and dimmed rather than vanishing
 * (the greying rule: an unavailable action explains itself, it never hides) —
 * callers pass `title`/`aria-label` with the plain-English reason.
 */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'quiet' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const VARIANT: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--qa-accent)',
    color: 'var(--qa-accent-ink)',
    borderColor: 'var(--qa-accent-line)',
  },
  quiet: {
    background: 'transparent',
    color: 'var(--qa-ink-dim)',
    borderColor: 'var(--qa-glass-border)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--qa-danger)',
    borderColor: 'var(--qa-glass-border)',
  },
};

export function Button({ children, variant = 'quiet', style, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        appearance: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--qa-s1)',
        padding: 'calc(var(--qa-s4) / 2) var(--qa-s4)',
        borderRadius: 'var(--qa-radius)',
        borderWidth: 'var(--qa-hairline)',
        borderStyle: 'solid',
        fontFamily: 'var(--qa-font-body)',
        fontSize: '0.9375rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        // Greying: dimmed but present.
        opacity: disabled ? 0.5 : 1,
        transition: `opacity var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease)`,
        ...VARIANT[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
