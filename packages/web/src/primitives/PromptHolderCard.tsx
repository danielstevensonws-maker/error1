/**
 * PromptHolderCard — one card, used six ways (Brief 08 §1; Brief 05 rule 7:
 * the server owns the lifecycle).
 *
 * Renders wherever the prompt's holder lives: a player's reaction (Player
 * View, that player's screen only), a monster/boss/lair (DM View), or anyone
 * when the DM answers for them (DM View, with the `asDm` note). It is an
 * overlay/interrupt surface, not part of either screen's resting layout —
 * one modal-priority prompt at a time per viewer.
 *
 * THE SERVER OWNS THE LIFECYCLE. This card only surfaces the prompt and
 * reports take/decline — it never decides the outcome. The countdown here is
 * a MIRROR of the server's real 60s default timeout, not the authority; the
 * server enforces the timeout independently. Computed from a `Date.now()`
 * baseline captured on mount and ticked every 250ms so it stays accurate
 * even if the tab throttles timers.
 *
 * THE DELIBERATE CONTRACT GAP: `context` is `string[]` — pre-summarised
 * plain lines — not the typed `PromptContext` union directly. Brief 08 §1
 * also names two DM-facing decision kinds ("ruling", "rest" — Playbook §3
 * table) that have no contracts shape yet; keeping the card generic over
 * plain lines means it doesn't need to change the day those land, or the day
 * any of the six existing PromptContext kinds gets a new field. See
 * promptContextToLines.ts for the adapter that formats the six kinds that
 * DO have a contracts shape today (CLAUDE.md non-negotiable #1: no shape
 * gets invented here in a feature).
 *
 * IT IS THE SAME MATERIAL AS THE ASSISTANT'S CARD, and deliberately so: both
 * arrive over whatever you were looking at, asking for one decision. They
 * share `.qa2-modal` — glass, three bands, one rhythm — and differ only in
 * width and contents. Two interrupts that looked like two different products
 * was the drift this rebuild exists to end.
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '@questra/ui';
import { DesignStyles, Eyebrow, heroName, prose, statMeta, statValue } from '../design/index.js';

export interface PromptOptionVM {
  id: string;
  label: string;
  /** e.g. "Reaction", "2 actions", "DC 13 or restrained". */
  detail?: string;
}

export interface PromptHolderCardProps {
  /** Plain-language prompt kind, e.g. "Opportunity Attack", "Legendary Action". */
  kind: string;
  /** The holder's display name, e.g. "Wren", "Ancient White Dragon". */
  holder: string;
  /** Pre-summarised plain lines — see the contract-gap note above. */
  context: string[];
  /** Present for a menu of costed choices (legendary/lair); absent for a bare Take/Decline. */
  options?: PromptOptionVM[];
  /** The DM is exercising the holder's choice on their behalf. */
  asDm?: boolean;
  /** Seconds until auto-decline. Default 60 (Brief 05 rule 7). */
  timeoutSec?: number;
  /** Fires with the chosen option's id, or undefined for the bare Take. */
  onTake: (optionId?: string) => void;
  onDecline: () => void;
}

export function PromptHolderCard({
  kind,
  holder,
  context,
  options,
  asDm = false,
  timeoutSec = 60,
  onTake,
  onDecline,
}: PromptHolderCardProps): ReactElement {
  const startRef = useRef(Date.now());
  const declinedRef = useRef(false);
  const [remaining, setRemaining] = useState(timeoutSec);

  useEffect(() => {
    startRef.current = Date.now();
    declinedRef.current = false;

    const tick = (): void => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const next = Math.max(0, timeoutSec - elapsed);
      setRemaining(next);
      if (next <= 0 && !declinedRef.current) {
        declinedRef.current = true;
        onDecline();
      }
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timeoutSec, onDecline]);

  const remainingWhole = Math.ceil(remaining);
  const urgent = remainingWhole <= 10;
  const pct = Math.max(0, Math.min(100, (remaining / timeoutSec) * 100));

  return (
    <section
      className={urgent ? 'qa2-modal qa2-prompt is-urgent' : 'qa2-modal qa2-prompt'}
      role="alertdialog"
      aria-label={`${kind} — ${holder}`}
    >
      <DesignStyles />

      {/* The countdown mirrors the server's timeout. It is not the mechanism —
          the server declines on its own clock whether this bar exists or not. */}
      <span className="qa2-prompt-clock" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>

      <header className="qa2-modal-head">
        <Eyebrow>{kind}</Eyebrow>
        <time
          aria-label={`${remainingWhole} seconds left`}
          style={{ ...statValue, color: urgent ? 'var(--qa-danger)' : 'var(--qa-ink-faint)' }}
        >
          {remainingWhole}s
        </time>
      </header>

      <div className="qa2-modal-body">
        <h2 style={{ ...heroName, margin: 0 }}>{holder}</h2>

        {asDm && (
          <p style={{ ...prose, margin: 0, fontStyle: 'italic', color: 'var(--qa-ink-faint)' }}>
            Answering for {holder}.
          </p>
        )}

        {context.length > 0 && (
          <ul className="qa2-prompt-lines">
            {context.map((line, i) => (
              <li key={i} style={prose}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      {/*
        THE ACCENT ANSWERS "WHETHER", NOT "WHICH". A bare prompt asks one
        question — take it or not — so Take is the committing action and wears
        the accent. A menu of costed moves asks a different question, and three
        equally accented buttons answered it by shouting all three at once,
        making a one-point Detect look as urgent as a two-point Wing Attack.
        Options are a menu: quiet, equal, with their cost on them.
      */}
      <footer className="qa2-modal-foot">
        {options !== undefined && options.length > 0 ? (
          options.map((option) => (
            <Button key={option.id} onClick={() => onTake(option.id)}>
              {option.label}
              {option.detail !== undefined && <Detail>{option.detail}</Detail>}
            </Button>
          ))
        ) : (
          <Button variant="primary" onClick={() => onTake()}>Take</Button>
        )}
        <span style={{ flex: 1 }} />
        <Button variant="danger" onClick={onDecline}>Decline</Button>
      </footer>
    </section>
  );
}

/** What an option COSTS, riding on the option itself rather than a legend. */
function Detail({ children }: { children: ReactNode }): ReactElement {
  return <span style={{ ...statMeta, marginLeft: 'var(--qa-s2)', opacity: 0.75 }}>{children}</span>;
}
