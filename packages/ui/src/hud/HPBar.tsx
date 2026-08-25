/**
 * HPBar — party/creature hit-point bar. Turns danger-red below 40% (the
 * colour shift IS the information — glanceable danger with no numbers,
 * CLAUDE.md law 4). `foe` bars read danger throughout, since an enemy's
 * exact HP fraction isn't something a player should have to parse.
 *
 * Reads only @questra/theme --qa-* tokens.
 */
import type { CSSProperties, ReactElement } from 'react';

export interface HPBarProps {
  value?: number;
  max?: number;
  /** Show the mono "22/27" readout after the bar. */
  showText?: boolean;
  /** Enemy bar — reads danger at all fill levels. */
  foe?: boolean;
  /** Track height in px. Default 5. */
  height?: number;
  style?: CSSProperties;
}

export function HPBar({ value = 0, max = 1, showText = true, foe = false, height = 5, style = {} }: HPBarProps): ReactElement {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const low = pct < 0.4;
  const fill = foe || low ? 'var(--qa-danger)' : 'var(--qa-success)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...style }}>
      <div
        style={{
          flex: 1,
          height,
          borderRadius: 'var(--qa-radius-round)',
          background: 'var(--qa-chip)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            borderRadius: 'var(--qa-radius-round)',
            background: fill,
            transition: 'width var(--qa-dur-slow) var(--qa-ease)',
          }}
        />
      </div>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--qa-font-mono)',
            fontSize: 'var(--qa-text-whisper)',
            color: 'var(--qa-ink-dim)',
            whiteSpace: 'nowrap',
          }}
        >
          {value}/{max}
        </span>
      )}
    </div>
  );
}
