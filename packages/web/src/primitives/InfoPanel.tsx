/**
 * InfoPanel — THE reference surface. One sheet, three layers, two entry paths.
 *
 * WHAT THIS ABSORBED. The play screen grew its own `ExplainSheet` while this
 * panel already existed, and the two were doing the same job in two visual
 * languages: "here is a number, here is the working behind it, here is what it
 * means in plain English." That is one surface, so it is now one component.
 * The play screen passes an `ExplainVM` through `fromExplain()`; the wizard and
 * compendium pass an entity through `entityToInfoPanel()`. Same sheet either
 * way — which is the point, because a player who taps Armor Class mid-combat
 * and a DM who opens a spell in the compendium are asking the same question.
 *
 * THE THREE LAYERS (progressive disclosure, never a wall of text)
 *   L1  the summary — one sentence, always visible.
 *   L2  the derivation — the itemised rows that produced the value.
 *   L3  the verbatim rules text — collapsed by default, for the pedant moment.
 *
 * THE TWO ENTRY PATHS decide only which layer leads, nothing else:
 *   "explain" (the ? on a number)  → leads with L2, never shows a Choose footer.
 *   "read"    (an entity's card)   → leads with L1, may show Choose in a picker.
 *
 * WHERE IT SITS follows from the same distinction, because the two paths are
 * interrupted differently. Explaining happens mid-play, so the sheet is
 * CENTRED over the map: anchored to nothing, and — importantly — not covering
 * the panel whose number you just tapped. Reading happens while browsing, so
 * it takes the SIDE, leaving the list you are scanning in view beside it.
 * `placement` overrides when a caller knows better.
 *
 * NO ORPHAN MATH (design request §5). Every number in the app is reachable
 * through this panel, and `ExplainVM` makes that structural rather than
 * aspirational: a value cannot be rendered through the shared readout without
 * carrying the means to justify itself here.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { DesignStyles, Eyebrow, Glyph, prose, narration, quote, rollTotal, sceneName, statMeta, statValue, type ExplainVM } from '../design/index.js';
import type { DerivationLine, InfoPanelData } from './entityToInfoPanel.js';

/** How the panel was entered — sets which layer leads. */
export type InfoPanelMode = 'explain' | 'read';

/** Centred over the work, or docked to the side of it. */
export type InfoPanelPlacement = 'center' | 'side';

export interface InfoPanelProps {
  data: InfoPanelData;
  open?: boolean;
  onClose: () => void;
  /** Path 1 vs Path 2. Default "read". */
  openMode?: InfoPanelMode;
  /** Defaults to "center" when explaining, "side" when reading. */
  placement?: InfoPanelPlacement;
  /**
   * Whether a Choose footer appears. Honoured only in "read" mode — when
   * explaining, the panel is pure reference and the footer is always absent.
   */
  showChoose?: boolean;
  onChoose?: (data: InfoPanelData) => void;
  /** Footer label; defaults to "Choose". */
  chooseLabel?: string;
}

/**
 * The adapter that let this panel absorb the play screen's explain sheet.
 * `ExplainVM` is the design layer's shape for "an interrogable number"; this
 * widens it into the panel's three-layer shape without inventing anything —
 * `rule` is the summary, `flavour` rides along, and there is no L3 because a
 * derived number has no verbatim rules text to quote.
 */
export function fromExplain(e: ExplainVM): InfoPanelData {
  return {
    name: e.title,
    kind: e.kicker,
    summary: e.rule,
    value: e.value,
    derivation: e.rows.map((r) => ({ label: r.label, value: r.value })),
    ...(e.flavour !== undefined ? { flavour: e.flavour } : {}),
  };
}

export function InfoPanel({
  data,
  open = true,
  onClose,
  openMode = 'read',
  placement,
  showChoose = false,
  onChoose,
  chooseLabel = 'Choose',
}: InfoPanelProps): ReactElement | null {
  const panelRef = useRef<HTMLElement>(null);

  const hasDerivation = data.derivation !== undefined && data.derivation.length > 0;
  const hasRules = data.rulesText !== undefined && data.rulesText.trim() !== '';

  const l2Default = openMode === 'explain' && hasDerivation;
  const footerVisible = openMode === 'read' && showChoose;
  const side = (placement ?? (openMode === 'explain' ? 'center' : 'side')) === 'side';

  const [l2Open, setL2Open] = useState(l2Default);
  const [l3Open, setL3Open] = useState(false);

  // Collapse state resets whenever the subject or the entry mode changes —
  // otherwise a freshly-opened panel inherits the previous one's layers.
  useEffect(() => {
    setL2Open(l2Default);
    setL3Open(false);
  }, [data.name, l2Default]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus moves into the panel on open, so keyboard users land inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <DesignStyles />

      <button type="button" className="qa2-scrim" onClick={close} aria-label="Close this and go back" />

      <aside
        ref={panelRef}
        className="qa2-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={data.name}
        tabIndex={-1}
        style={
          side
            ? { top: 0, right: 0, height: '100%', width: 'min(428px, 100%)', borderRadius: 0, outline: 'none' }
            : {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(440px, calc(100% - var(--qa-s6)))',
                maxHeight: '76%',
                outline: 'none',
              }
        }
      >
        <div className="qa2-sheet-head">
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)', minWidth: 0 }}>
            <Eyebrow>{data.kind}</Eyebrow>
            <h2 style={{ ...sceneName, margin: 0 }}>{data.name}</h2>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', flex: 'none' }}>
            {/* Homebrew is a provenance tint, never a warning — the balance
                check is the thing that judges, and it says so elsewhere. */}
            {data.homebrew === true && <span className="qa2-chip is-accent is-static">Homebrew</span>}
            <button type="button" className="qa2-ctl" style={{ width: 28, height: 28 }} onClick={close} aria-label="Close">
              <Glyph name="close" size={13} />
            </button>
          </span>
        </div>

        <div className="qa2-sheet-body">
          {/* The headline number, when the subject IS one. An entity has no
              single value, so this simply does not render for the read path. */}
          {data.value !== undefined && <span style={{ ...rollTotal, alignSelf: 'flex-start' }}>{data.value}</span>}

          {/* L1 — always visible, one sentence, plain language. */}
          <p style={{ ...narration, margin: 0 }}>{data.summary}</p>

          {/* L2 — the working. Leads when explaining, folds away when reading. */}
          {hasDerivation && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
              <Disclosure
                open={l2Open}
                onToggle={() => setL2Open((v) => !v)}
                label="Where the numbers come from"
                id="qa-infopanel-l2"
              />
              {l2Open && (
                <ul id="qa-infopanel-l2" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
                  {data.derivation!.map((line) => (
                    <Row key={line.label} line={line} />
                  ))}
                  {data.value !== undefined && (
                    <li className="qa2-rowline is-sum">
                      <span style={{ ...prose, color: 'var(--qa-ink)' }}>{data.name}</span>
                      <span style={statValue}>{data.value}</span>
                    </li>
                  )}
                </ul>
              )}
            </section>
          )}

          {/* L3 — the verbatim text, for when the summary is not enough. */}
          {hasRules && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
              <Disclosure
                open={l3Open}
                onToggle={() => setL3Open((v) => !v)}
                label="Full rules text"
                id="qa-infopanel-l3"
              />
              {l3Open && (
                <p id="qa-infopanel-l3" style={{ ...prose, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {data.rulesText}
                </p>
              )}
            </section>
          )}

          {data.flavour !== undefined && (
            <p style={{ ...quote, margin: 0, color: 'var(--qa-ink-dim)' }}>{data.flavour}</p>
          )}
        </div>

        {footerVisible && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--qa-s2)', padding: 'var(--qa-s4)', borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)' }}>
            <button type="button" className="qa2-menuitem" style={{ width: 'auto' }} onClick={close}>
              <span style={prose}>Not this one</span>
            </button>
            <button
              type="button"
              className="qa2-badge is-yours"
              style={{ border: 'none', cursor: 'pointer', padding: 'var(--qa-s2) var(--qa-s4)' }}
              onClick={() => onChoose?.(data)}
            >
              {chooseLabel}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

/** A layer's own header — the thing you press to fold it open or shut. */
function Disclosure({ open, onToggle, label, id }: { open: boolean; onToggle: () => void; label: string; id: string }): ReactElement {
  return (
    <button
      type="button"
      className="qa2-explain is-row"
      style={{ width: '100%', justifyContent: 'space-between', cursor: 'pointer' }}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={id}
    >
      <span className="qa2-explain-label" style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)', letterSpacing: 'var(--qa-tracking-caps)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <Glyph name={open ? 'chevronDown' : 'chevronRight'} size={12} />
    </button>
  );
}

/**
 * One derivation line. `parts` is the optional second line — the breakdown
 * under the value — and it stays mono, because it is arithmetic.
 */
function Row({ line }: { line: DerivationLine }): ReactElement {
  return (
    <li className="qa2-rowline" style={{ alignItems: 'flex-start' }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ ...prose, color: 'var(--qa-ink)' }}>{line.label}</span>
        {line.parts !== undefined && <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)' }}>{line.parts}</span>}
      </span>
      <span style={statMeta}>{line.value}</span>
    </li>
  );
}

/**
 * The affordance that opens this panel from beside a number. Kept here rather
 * than in the design layer because it is InfoPanel's own doorway — the shared
 * `ExplainValue` readout is the one most surfaces should reach for, and this
 * is the fallback for places with no label to underline.
 */
export function ExplainButton({ label, onClick }: { label: string; onClick: () => void }): ReactElement {
  return (
    <button type="button" className="qa2-ctl" style={{ width: 20, height: 20 }} onClick={onClick} aria-label={label} title={label}>
      <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)' }}>?</span>
    </button>
  );
}
