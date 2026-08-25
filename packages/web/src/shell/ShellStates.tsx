/**
 * shell/ShellStates — the page-level wait and failure states (Brief 14 §4).
 *
 * Shared rather than per-screen: an error boundary that phrases itself
 * differently on every page teaches a person nothing about what the app does
 * when something goes wrong.
 *
 * Both now speak the shell's language (road/RoadStyles) rather than the play
 * screen's, so they can be dropped onto any shell route without dragging the
 * whole design layer in behind them.
 */
import type { ReactElement } from 'react';

/**
 * A quiet page-level wait. Never a spinner graphic — the shell's visual
 * language is prose and mono, not iconography — just the mono voice saying
 * what is being waited on. The label always names the thing ("Finding your
 * table"), because "Loading…" tells a person nothing they could act on.
 */
export function ShellLoading({ label }: { label: string }): ReactElement {
  return (
    <div className="qa-shell-loading">
      <p className="rd-micro">{label}</p>
    </div>
  );
}

/**
 * Recovery, not an apology: errors do not say sorry and are never vague about
 * what happened. `detail` is the server's own plain-language reason when there
 * is one, and `action` is the way out — a failure state with no route forward
 * is a dead end wearing a message.
 */
export function ShellError({ title, detail, action }: {
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}): ReactElement {
  return (
    <div className="qa-shell-error">
      <p className="rd-label">{title}</p>
      {detail && <p className="rd-detail">{detail}</p>}
      {action && (
        <div className="rd-actions">
          <button type="button" className="qa2-cta" onClick={action.onClick}>{action.label}</button>
        </div>
      )}
    </div>
  );
}
