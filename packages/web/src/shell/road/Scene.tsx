/**
 * shell/road/Scene — the typed conversation, shared by the only two screens
 * that hold one: Landing and Join.
 *
 * Both screens tell a short second-person scene, ask what you do, answer you
 * back, and only then ask for an account. That is one mechanic, so it is one
 * implementation — the two screens supply different words and nothing else.
 * Home, Nav, Create and the campaign placeholder never import this.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';

export interface Seg { t: string; em?: boolean }

/** telling → asking → replying → entering. Strictly forward. */
export type Phase = 'telling' | 'asking' | 'replying' | 'entering';

/**
 * Reveals a script one character at a time, pausing on punctuation the way a
 * person reading aloud does. A uniform per-character interval reads as a
 * terminal and kills the illusion; a full stop is worth about twenty
 * characters of silence and a comma about seven, so the line breathes where
 * somebody speaking would breathe.
 *
 * It deliberately does NOT rewind when it goes inactive. It used to, and that
 * silently deleted the reply: the reply's active flag is phase === 'replying',
 * so the moment the reply finished and the phase advanced, the scene's answer
 * reset to zero characters and vanished — taking the one beat the whole
 * mechanic exists for with it. Words that have been spoken stay spoken.
 */
export function useSpokenText(segs: Seg[], active: boolean, reduced: boolean, onDone: () => void): number {
  const full = segs.map((s) => s.t).join('');
  const [n, setN] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!active) return;
    if (reduced) { setN(full.length); doneRef.current(); return; }
    let i = 0;
    let timer = 0;
    const step = (): void => {
      i += 1;
      setN(i);
      if (i >= full.length) { doneRef.current(); return; }
      const prev = full[i - 1];
      const delay = prev === '.' ? 560 : prev === ',' ? 185 : prev === ':' ? 300 : prev === '\n' ? 0 : 27;
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, 680);
    return () => window.clearTimeout(timer);
  }, [active, reduced, full]);

  return n;
}

/** Renders the revealed prefix of a script, preserving its emphasis runs. */
export function Spoken({ segs, n }: { segs: Seg[]; n: number }): ReactElement {
  let consumed = 0;
  return (
    <>
      {segs.map((s, i) => {
        const start = consumed;
        consumed += s.t.length;
        const text = s.t.slice(0, Math.max(0, Math.min(s.t.length, n - start)));
        if (!text) return null;
        return s.em ? <em key={i}>{text}</em> : <span key={i}>{text}</span>;
      })}
    </>
  );
}

export interface TurnProps {
  phase: Phase;
  answer: string;
  setAnswer: (v: string) => void;
  spokenAnswer: string;
  placeholder: string;
  onAnswer: () => void;
  reduced: boolean;
}

/**
 * "What do you do?" and the answer line — a real input before you commit, your
 * own words in ember afterwards. Blank submits are accepted and treated as the
 * first suggested action: a person who presses Enter on an empty field has
 * still chosen to go on, and refusing them a scene over an empty box would be
 * the exact pedantry this product exists to remove.
 */
export function Turn({ phase, answer, setAnswer, spokenAnswer, placeholder, onAnswer, reduced }: TurnProps): ReactElement {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'asking' && !reduced) ref.current?.focus();
  }, [phase, reduced]);

  return (
    <div className="rd-turn">
      <p className="rd-label">What do you do?</p>
      {/* Deliberately the play screen's own free-text control — the input that
          sits under the action rows reading "Or describe what you do". Same
          chip background, same hairline, same accent-on-focus. A visitor who
          signs up here meets the identical widget the first time they play, so
          the mechanic reads as a preview rather than as a landing-page trick. */}
      {phase === 'asking' ? (
        <form onSubmit={(e) => { e.preventDefault(); onAnswer(); }}>
          <div className="rd-prompt">
            <input
              ref={ref}
              className="rd-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={placeholder}
              aria-label="What do you do"
            />
          </div>
        </form>
      ) : (
        <div className="rd-prompt is-said"><p className="rd-answer">{spokenAnswer}</p></div>
      )}
    </div>
  );
}
