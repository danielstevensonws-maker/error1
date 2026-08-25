/**
 * AcceptTweakRejectCard — the universal AI-output card (Orchestration spec §4;
 * CLAUDE.md law #2 "the app must never say no" pairs with "AI suggests, the
 * DM decides"; component-list A3).
 *
 * Any AI output that populates UI renders through this ONE card; there is no
 * second AI presentation anywhere in the product. The play screen's journal
 * had quietly become one — its own quote-plus-buttons block, in its own visual
 * language, doing this card's job — so it now renders this card inline instead.
 * That is what `placement` is for:
 *
 *   float   it interrupted you. A glass card over the map, its own shadow.
 *   inline  it is one item in the journal's stream. No glass of its own, an
 *           accent rule down the left edge, and the same three motions.
 *
 * THE INVARIANT: nothing an AI writes is applied until a human presses Accept
 * (or edits it via Tweak and saves, or picks a Fallback option). Reject always
 * leaves the scene untouched.
 *
 * THE HOST OWNS THE STATE MACHINE. This component never transitions itself —
 * it only reports intent via callbacks (onAccept/onReject/…) and the host
 * flips `state`/`outcome` in response (see the InteractiveLoop story). That
 * keeps the state machine visible and testable in the caller, the same way
 * InfoPanel's open/close lives in its caller, not inside the panel.
 *
 * Content is agnostic via `kind`: "text" renders prose, "structured" renders
 * label/value rows (a ruling's check/DC/consequence). See aiOutputToCard.ts
 * for the @questra/contracts → StructuredRow[] mapping — a new AI output
 * schema needs a mapping there, never a change here.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { Button } from '@questra/ui';
import { DesignStyles, Eyebrow, narration, prose, quote, statMeta, statValue } from '../design/index.js';

export type CardState = 'streaming' | 'draft' | 'tweak' | 'fallback' | 'resolved';
export type CardKind = 'text' | 'structured';
export type CardOutcome = 'accepted' | 'tweaked' | 'rejected';

/** Over the map, or inside the journal's stream. Default "float". */
export type CardPlacement = 'float' | 'inline';

export interface StructuredRow {
  label: string;
  value: string;
  /** "value" = serif prose · "number" = mono numeral · "note" = italic consequence line. Default "value". */
  variant?: 'value' | 'number' | 'note';
}

export interface FallbackOption {
  name: string;
  value: string;
  recommended?: boolean;
}

export interface AcceptTweakRejectCardProps {
  state: CardState;
  /** Body shape for draft/streaming/tweak. Default "text". */
  kind?: CardKind;
  /** Default "float". */
  placement?: CardPlacement;
  /** Header eyebrow. Default "Suggestion" (or "Fallback" in the fallback state). */
  eyebrow?: string;
  /** Header source tag, e.g. "DM Narration" / "DM Ruling". */
  source?: string;

  /**
   * What the player said that prompted this. Shown above the body so a
   * suggestion in a busy journal still says what it is answering.
   */
  quoted?: string;
  /** Prose body (draft/streaming/tweak seed). */
  text?: string;
  /** Structured ruling body. */
  rows?: StructuredRow[];

  /** Fallback prompt + options — the non-AI path (ADR: AI always has a non-AI fallback). */
  fallbackPrompt?: string;
  fallbackOptions?: FallbackOption[];

  /**
   * Footer labels. Accept defaults to "Accept", or on the ladder to the rung
   * currently armed ("Use Moderate (13)") so the button never names a
   * difficulty other than the one it will apply.
   */
  acceptLabel?: string;
  tweakLabel?: string;
  rejectLabel?: string;

  /** Outcome shown in the resolved state. Default "accepted". */
  outcome?: CardOutcome;

  onAccept?: (option?: FallbackOption) => void;
  onReject?: () => void;
  onTweak?: () => void;
  onSaveTweak?: (text: string) => void;
  onCancelTweak?: () => void;
  onUndo?: () => void;
  /**
   * Fires alongside onAccept/onSaveTweak/onReject. Orchestration §4: "the
   * card logs accept/tweak/reject outcomes — that acceptance-rate telemetry
   * is the quality metric for every prompt."
   */
  onOutcome?: (outcome: CardOutcome) => void;
}

export function AcceptTweakRejectCard({
  state,
  kind = 'text',
  placement = 'float',
  eyebrow,
  source,
  quoted,
  text = '',
  rows = [],
  fallbackPrompt = "The assistant couldn't reach a ruling. Set the difficulty yourself:",
  fallbackOptions = [],
  acceptLabel,
  tweakLabel = 'Tweak',
  rejectLabel = 'Reject',
  outcome = 'accepted',
  onAccept,
  onReject,
  onTweak,
  onSaveTweak,
  onCancelTweak,
  onUndo,
  onOutcome,
}: AcceptTweakRejectCardProps): ReactElement {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [tweakText, setTweakText] = useState(text);

  // Which rung of the ladder is armed. The recommendation is only a starting
  // position — see the option tiles for why it has to be changeable.
  const recommended = fallbackOptions.find((o) => o.recommended) ?? fallbackOptions[0];
  const [picked, setPicked] = useState<string | undefined>(recommended?.name);
  useEffect(() => setPicked(recommended?.name), [recommended?.name]);

  // Seed + focus (caret at end) only on ENTERING tweak mode — `text` is
  // deliberately not a dependency, or every keystroke upstream would stomp
  // the in-progress edit.
  useEffect(() => {
    if (state !== 'tweak') return;
    setTweakText(text);
    const el = taRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const structured = kind === 'structured';
  const isFallback = state === 'fallback';
  const isDecision = state === 'draft' || state === 'fallback';
  // Tweak is offered whenever the host can honour it, prose or ruling. The
  // card used to refuse it on structured content, which quietly conflated two
  // different things: a ruling's rows are not free-text editable (true — the
  // tweak MODE below stays prose-only), and a ruling cannot be argued with
  // (false, and law 1 says the opposite). A structured host answers Tweak by
  // opening the difficulty ladder; a prose host opens the editor.
  const showTweakBtn = state === 'draft' && onTweak !== undefined;
  const showFooter = state === 'draft' || state === 'fallback' || state === 'tweak';

  const resolvedEyebrow = eyebrow ?? (isFallback ? 'Fallback' : 'Suggestion');
  const resolvedSource = source ?? (structured ? 'DM Ruling' : 'DM Narration');

  const done: Record<CardOutcome, string> = {
    accepted: 'Accepted — applied to the scene.',
    tweaked: 'Saved your changes — applied to the scene.',
    rejected: 'Rejected — nothing was applied.',
  };

  // Button writes its padding as an inline style, so a class cannot shrink it
  // — the size has to arrive the same way. Three full-size buttons overflow a
  // rail; compacting them keeps the three motions on one or two tidy lines.
  const btn: CSSProperties | undefined =
    placement === 'inline' ? { padding: 'var(--qa-s1) var(--qa-s3)', fontSize: 'var(--qa-text-label)' } : undefined;

  // On the ladder, Accept names what it will apply — and has to keep naming it
  // as the pick moves, or the button says Moderate while Hard is armed. An
  // explicit label still wins: a caller who wants "Ask for the roll" gets it.
  const pickedOption = fallbackOptions.find((o) => o.name === picked);
  const accept =
    acceptLabel ?? (isFallback && pickedOption !== undefined ? `Use ${pickedOption.name} (${pickedOption.value})` : 'Accept');

  const handleAccept = (): void => {
    const option = isFallback ? pickedOption : undefined;
    onAccept?.(option);
    onOutcome?.('accepted');
  };
  const handleReject = (): void => {
    onReject?.();
    onOutcome?.('rejected');
  };
  const handleSaveTweak = (): void => {
    onSaveTweak?.(tweakText);
    onOutcome?.('tweaked');
  };

  return (
    <section
      className={`qa2-modal qa2-ai is-${placement}`}
      role="region"
      aria-label={`${resolvedEyebrow} — ${structured ? 'DM ruling' : 'narration'}`}
      aria-busy={state === 'streaming'}
    >
      <DesignStyles />

      <header className="qa2-modal-head">
        <span className="qa2-ai-who">
          <span className="qa2-ai-dot" title="An assistant wrote this" />
          <Eyebrow>{resolvedEyebrow}</Eyebrow>
        </span>
        <span style={statMeta}>{resolvedSource}</span>
      </header>

      <div className="qa2-modal-body">
        {quoted !== undefined && <p style={{ ...quote, margin: 0 }}>&ldquo;{quoted}&rdquo;</p>}

        {state === 'draft' && !structured && <p style={{ ...narration, margin: 0, whiteSpace: 'pre-line' }}>{text}</p>}

        {state === 'draft' && structured && rows.map((row) => <RulingRow key={row.label} row={row} />)}

        {state === 'streaming' && (
          <p style={{ ...narration, margin: 0, whiteSpace: 'pre-line' }}>
            {text}
            <span className="qa2-ai-caret" aria-hidden="true" />
          </p>
        )}

        {state === 'tweak' && (
          <span className="qa2-open">
            <textarea
              ref={taRef}
              className="qa2-input"
              value={tweakText}
              onChange={(e) => setTweakText(e.target.value)}
              aria-label="Edit the suggestion"
              style={{ ...prose, minHeight: 148, width: '100%' }}
            />
          </span>
        )}

        {state === 'fallback' && (
          <>
            <p style={{ ...prose, margin: 0 }}>{fallbackPrompt}</p>
            <div className="qa2-ai-opts" role="radiogroup" aria-label="Difficulty">
              {fallbackOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  role="radio"
                  aria-checked={option.name === picked}
                  className={`qa2-ai-opt${option.name === picked ? ' is-picked' : ''}`}
                  onClick={() => setPicked(option.name)}
                >
                  <span style={prose}>{option.name}</span>
                  <span style={statValue}>{option.value}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {state === 'resolved' && (
          <div className="qa2-ai-done">
            <span className={`qa2-ai-seal${outcome === 'rejected' ? '' : ' is-applied'}`} />
            <span style={prose}>{done[outcome]}</span>
            <button type="button" className="qa2-ai-undo" style={statMeta} onClick={() => onUndo?.()}>
              Undo
            </button>
          </div>
        )}
      </div>

      {/* deciding happens HERE, and only here */}
      {showFooter && (
        <footer className="qa2-modal-foot">
          {isDecision && (
            <>
              <Button variant="primary" style={btn} onClick={handleAccept}>{accept}</Button>
              {showTweakBtn && <Button style={btn} onClick={() => onTweak?.()}>{tweakLabel}</Button>}
              {/* Pushing Reject to the far edge separates a destructive motion
                  from the ones beside it. A rail has no far edge to push to. */}
              {placement === 'float' && <span style={{ flex: 1 }} />}
              <Button variant="danger" style={btn} onClick={handleReject}>{rejectLabel}</Button>
            </>
          )}

          {state === 'tweak' && (
            <>
              <Button variant="primary" style={btn} onClick={handleSaveTweak}>Save changes</Button>
              <Button style={btn} onClick={() => onCancelTweak?.()}>Cancel</Button>
            </>
          )}
        </footer>
      )}
    </section>
  );
}

/** One ruling row — mono label, value styled by what it IS rather than where it sits. */
function RulingRow({ row }: { row: StructuredRow }): ReactElement {
  return (
    <div className={`qa2-rowline${row.variant === 'note' ? ' is-note' : ''}`}>
      <span style={statMeta}>{row.label}</span>
      <span style={valueRole(row.variant)}>{row.value}</span>
    </div>
  );
}

function valueRole(variant: StructuredRow['variant']): CSSProperties {
  if (variant === 'number') return statValue;
  // A consequence is a sentence, so it reads left to right like one. The other
  // two are answers to a label and hang off the right edge beside it.
  if (variant === 'note') return { ...prose, fontStyle: 'italic', color: 'var(--qa-ink-dim)' };
  return { ...prose, textAlign: 'right' };
}
