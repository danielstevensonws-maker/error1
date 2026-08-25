/**
 * PromptDock — where a decision that cannot wait goes (Brief 08 §1).
 *
 * ONE COMPONENT, SIX USES. An opportunity attack, a reaction feature, a readied
 * action, a legendary action, legendary resistance and a lair action are all the
 * same shape: something happened, somebody holds a choice, the fight is paused
 * on them. Building six cards would mean six places for the timeout to be wrong.
 *
 * ONE AT A TIME, THE REST QUEUED. A stack of simultaneous prompts is how a
 * player ends up answering the wrong one — so exactly one card is answerable and
 * the queue behind it is a count, not a pile. The server owns which is active
 * (`activePromptFor`); this renders the answer.
 *
 * WHY THE TIMER IS SHOWN AND NOT HIDDEN. A prompt that expires silently reads
 * as a bug ("I clicked and nothing happened"). Sixty seconds counting down says
 * the table is waiting for you, and running out is a real answer — declining —
 * rather than a failure. Letting it lapse is a legitimate way to play.
 */
import { useEffect, useState, type ReactElement } from 'react';

export interface PromptOptionVM {
  name: string;
  /** What taking it costs, in words: "Your reaction", "2 legendary actions". */
  cost?: string;
}

export interface PromptVM {
  promptId: string;
  /** What kind of interruption this is, in plain words. */
  kind: string;
  /** The sentence that explains why you are being asked. */
  context: string;
  options: PromptOptionVM[];
  /** Seconds remaining when this card was handed over. */
  timeoutSec: number;
}

export interface PromptDockProps {
  prompts: PromptVM[];
  onAnswer: (promptId: string, take: boolean, optionName?: string) => void;
}

export function PromptDock({ prompts, onAnswer }: PromptDockProps): ReactElement | null {
  const active = prompts[0];
  const queued = prompts.length - 1;

  if (!active) return null;

  return (
    <div className="qa2-panel qa2-prompt" role="alertdialog" aria-label={active.kind}>
      <header className="qa2-prompt-head">
        <span className="qa2-prompt-kind">{active.kind}</span>
        {/* No clock on a card that is not interrupting anything. A reaction
            pauses a fight and must resolve; a check waits for the player, and
            a countdown would rush somebody deciding how to describe what they
            do — the opposite of what this product is for. */}
        {active.timeoutSec > 0 && <Countdown key={active.promptId} seconds={active.timeoutSec} />}
      </header>

      <p className="qa2-prompt-context">{active.context}</p>

      <div className="qa2-prompt-options">
        {active.options.map((o) => (
          <button
            key={o.name}
            type="button"
            className="qa2-cta qa2-prompt-take"
            onClick={() => onAnswer(active.promptId, true, o.name)}
          >
            {o.name}
            {o.cost && <span className="qa2-prompt-cost">{o.cost}</span>}
          </button>
        ))}
        {/* Declining is a real choice, not a dismissal — it spends nothing and
            the fight moves on. */}
        <button
          type="button"
          className="qa2-quiet-link"
          onClick={() => onAnswer(active.promptId, false)}
        >
          Let it pass
        </button>
      </div>

      {queued > 0 && (
        <p className="qa2-prompt-queued">
          {queued === 1 ? 'One more waiting' : `${String(queued)} more waiting`}
        </p>
      )}
    </div>
  );
}

/**
 * The clock, counting down where it can be seen.
 *
 * Local state on purpose: the deadline is the server's, and this only DRAWS the
 * time left. If the two disagree the server wins — it decides when the prompt
 * expires, and this card vanishing is the consequence of that event arriving,
 * not of the number here reaching zero.
 */
function Countdown({ seconds }: { seconds: number }): ReactElement {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    const t = window.setInterval(() => { setLeft((n) => (n > 0 ? n - 1 : 0)); }, 1000);
    return () => { window.clearInterval(t); };
  }, [seconds]);

  return (
    <span className={'qa2-prompt-clock' + (left <= 10 ? ' is-urgent' : '')}>
      {left > 0 ? `${String(left)}s` : 'Time'}
    </span>
  );
}
