/**
 * design/parts — the repeats every surface is assembled from.
 *
 * These exist so that "every number is tappable" (design request §5) is a thing
 * the app DOES rather than a thing each surface remembers to do. A readout
 * built with `ExplainValue` cannot ship without its derivation, because the
 * derivation is the prop that makes it render — the promise is enforced by the
 * type, not by reviewer diligence.
 *
 * They are in the shared layer because the authoring surfaces need them just as
 * much as the play screen does: a wizard step showing a computed ability
 * modifier, a planner row showing a session count, and a combatant's Armor
 * Class are the same readout wearing different data.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Glyph, type GlyphName } from './glyphs.js';
import { eyebrow, micro, prose, statMeta, statValue } from './type.js';
import type { ExplainVM } from './explain.js';

/**
 * A small caps heading. Faint by default — it never competes with what it names.
 *
 * THE TONE IS A NAMED SET OF THREE, not a colour a caller passes in. Two things
 * on the play screens need an eyebrow that is not faint: a panel that is WAITING
 * ON somebody takes the accent, and something only the DM can see takes gold.
 * Both were previously done by hand-rolling a second caps span beside the real
 * one, which is how a screen ends up with four spellings of the same label.
 */
export function Eyebrow({
  children,
  tone = 'faint',
  style,
}: {
  children: ReactNode;
  tone?: 'faint' | 'accent' | 'gold';
  style?: CSSProperties;
}): ReactElement {
  const colour = tone === 'accent' ? 'var(--qa-accent)' : tone === 'gold' ? 'var(--qa-gold)' : undefined;
  return <span style={{ ...eyebrow, ...(colour !== undefined ? { color: colour } : {}), ...style }}>{children}</span>;
}

/**
 * A label-over-value readout whose LABEL carries the dotted underline — the
 * affordance that says "there is more behind this word". The whole thing is one
 * button, so the tap target is the readout rather than a 12px glyph beside it.
 */
export function ExplainValue({
  label,
  explain,
  onExplain,
  value,
  tone,
  row = false,
}: {
  label: string;
  explain: ExplainVM;
  onExplain?: (e: ExplainVM) => void;
  /** override the displayed value; defaults to the explain's own. */
  value?: string;
  tone?: 'gold' | 'danger' | 'accent';
  /** lay the label and value side by side instead of stacked. */
  row?: boolean;
}): ReactElement {
  const colour =
    tone === 'gold' ? 'var(--qa-gold)'
    : tone === 'danger' ? 'var(--qa-danger)'
    : tone === 'accent' ? 'var(--qa-accent)'
    : 'var(--qa-ink)';
  return (
    <button
      type="button"
      className={row ? 'qa2-explain is-row' : 'qa2-explain'}
      onClick={onExplain ? () => onExplain(explain) : undefined}
      aria-label={`${label} ${value ?? explain.value} — show how this number is worked out`}
    >
      <span className="qa2-explain-label" style={eyebrow}>{label}</span>
      <span style={{ ...statValue, color: colour }}>{value ?? explain.value}</span>
    </button>
  );
}

/** The same affordance at rail scale — a mono line, not a stacked readout. */
export function ExplainLine({
  label,
  explain,
  onExplain,
}: {
  label: string;
  explain: ExplainVM;
  onExplain?: (e: ExplainVM) => void;
}): ReactElement {
  return (
    <button
      type="button"
      className="qa2-explain is-row"
      style={{ width: '100%', justifyContent: 'space-between' }}
      onClick={onExplain ? () => onExplain(explain) : undefined}
      aria-label={`${label} ${explain.value} — show how this number is worked out`}
    >
      <span className="qa2-explain-label" style={statMeta}>{label}</span>
      <span style={{ ...statMeta, color: 'var(--qa-ink)' }}>{explain.value}</span>
    </button>
  );
}

export type ChipTone = 'neutral' | 'danger' | 'accent';

/** A tappable tag — a condition, a target, a state worth naming. */
export function Tag({
  children,
  tone = 'neutral',
  selected,
  onClick,
  onRemove,
  title,
}: {
  children: ReactNode;
  tone?: ChipTone;
  /**
   * Present ⇒ this tag is one of a set you choose between, and it renders
   * `aria-pressed` either way so the unchosen ones can sit back visually.
   * Absent ⇒ it is a label (a condition, a hurt word), not a choice.
   */
  selected?: boolean | undefined;
  /** absent ⇒ the tag renders as a <span>, so it can live inside other buttons. */
  onClick?: (() => void) | undefined;
  /**
   * Present ⇒ the tag carries its own ✕. This is what a tag the user WROTE
   * looks like: a preset can be un-toggled and is still on offer afterwards,
   * but something you typed has nowhere to go back to, so it needs a delete
   * rather than a deselect.
   */
  onRemove?: (() => void) | undefined;
  title?: string;
}): ReactElement {
  const cls = [
    'qa2-chip',
    tone === 'danger' ? 'is-danger' : tone === 'accent' ? 'is-accent' : '',
    selected === true ? 'is-selected' : '',
    onClick === undefined ? 'is-static' : '',
  ].filter(Boolean).join(' ');

  if (onRemove !== undefined) {
    const label = typeof children === 'string' ? children : 'tag';
    return (
      <span className={cls} title={title}>
        {onClick === undefined ? children : (
          <button type="button" className="qa2-chip-face" onClick={onClick} aria-pressed={selected}>{children}</button>
        )}
        <button type="button" className="qa2-chip-x" onClick={onRemove} aria-label={`Remove ${label}`}>
          <Glyph name="close" size={9} />
        </button>
      </span>
    );
  }

  // A tag with nothing to do is a <span>: these render inside other buttons
  // (the spine's notches), and a button inside a button is invalid markup that
  // swallows the outer control's clicks.
  if (onClick === undefined) {
    return <span className={cls} title={title}>{children}</span>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} title={title} aria-pressed={selected}>
      {children}
    </button>
  );
}

/** A 36px glass square in the top rail. */
export function Ctl({
  glyph,
  label,
  on = false,
  onClick,
}: {
  glyph: GlyphName;
  label: string;
  on?: boolean;
  onClick?: () => void;
}): ReactElement {
  return (
    <button type="button" className={on ? 'qa2-ctl is-on' : 'qa2-ctl'} onClick={onClick} aria-label={label} title={label} aria-pressed={on}>
      <Glyph name={glyph} />
    </button>
  );
}

/**
 * The hit-point bar. Temporary hit points render as a hatched overlay ON the
 * bar rather than as a separate "+N temporary" line, because they ARE hit
 * points — a player reading their health should not have to add two numbers.
 */
export function HP({
  current,
  max,
  temp = 0,
  bloodied = false,
  showText = true,
}: {
  current: number;
  max: number;
  temp?: number;
  bloodied?: boolean;
  showText?: boolean;
}): ReactElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const tempPct = max > 0 ? Math.max(0, Math.min(1 - pct, temp / max)) : 0;
  // Spans throughout: this renders inside the spine's notch buttons, which may
  // only contain phrasing content.
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)' }}>
      <span
        className="qa2-hpwrap"
        style={{ flex: 1, display: 'block' }}
        role="img"
        aria-label={`${current} of ${max} hit points${temp > 0 ? `, plus ${temp} temporary` : ''}`}
      >
        <span className={bloodied ? 'qa2-hpfill is-bloodied' : 'qa2-hpfill'} style={{ width: `${pct * 100}%` }} />
        {tempPct > 0 && <span className="qa2-hptemp" style={{ left: `${pct * 100}%`, width: `${tempPct * 100}%` }} />}
      </span>
      {showText && (
        <span style={{ ...statMeta, color: bloodied ? 'var(--qa-danger)' : 'var(--qa-ink-dim)' }}>
          {current}/{max}{temp > 0 ? ` +${temp}` : ''}
        </span>
      )}
    </span>
  );
}

/** A thin bar for a quantity that is not health — movement left, most often. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }): ReactElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className="qa2-meter" style={{ display: 'block' }} role="img" aria-label={label}>
      <span style={{ width: `${pct * 100}%` }} />
    </span>
  );
}

/** The smallest data on the screen — an initiative number, an HP fraction. */
export function Micro({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactElement {
  return <span style={{ ...micro, ...style }}>{children}</span>;
}

/**
 * A labelled text field, for the DM's authoring surfaces.
 *
 * The label is boxed WITH its control rather than floating above it, because
 * these fields arrive in stacks — scene notes over cast over secrets — and a
 * label separated from its box by the stack's gap attaches itself to the field
 * above just as readily as the one below.
 *
 * `secret` is a reminder to the DM about what they are typing and NOTHING
 * MORE. What actually keeps DM-only text out of a player's payload is
 * `eventVisibleTo` / `filterStream` in contracts; if a style were the only
 * thing standing between a player and a secret, the system would already be
 * broken.
 */
export function Field({
  id,
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  rows = 2,
  secret = false,
  mark,
}: {
  id: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  /** the DM-only half: a lock on the label and a heavier rule down the edge. */
  secret?: boolean;
  /** an extra mark beside the label, when the field needs one of its own. */
  mark?: GlyphName;
}): ReactElement {
  const glyph = mark ?? (secret ? 'lock' : undefined);
  const shared = {
    id,
    value,
    placeholder,
    className: multiline ? 'qa2-field-input is-multiline' : 'qa2-field-input',
    onChange: (e: { target: { value: string } }) => onChangeText(e.target.value),
    style: prose,
  };
  return (
    <span className={secret ? 'qa2-field-box is-secret' : 'qa2-field-box'}>
      <label htmlFor={id} style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 'var(--qa-s1)' }}>
        {glyph !== undefined && <Glyph name={glyph} size={11} />}
        {label}
      </label>
      {multiline ? <textarea rows={rows} {...shared} /> : <input type="text" {...shared} />}
    </span>
  );
}

/** The quiet line under a field. Guidance — never where an error would go. */
export function Help({ children }: { children: ReactNode }): ReactElement {
  return <p className="qa2-help" style={prose}>{children}</p>;
}
