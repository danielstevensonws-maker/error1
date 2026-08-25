/**
 * What players want to do, waiting on the DM.
 *
 * THREE ANSWERS, NOT TWO. The obvious build gives a DM yes and no, and it is
 * wrong: the most common real answer to "can I do this?" is neither — it is
 * "try it and we will see", which is what a roll is for. So the middle button
 * turns the request into a check, and that is the one placed first among the
 * three because it is the one reached for most.
 *
 * IT SITS WHERE THE ACCENT MEANS "NEEDS YOU". On this screen the accent is
 * reserved for things waiting on a decision, and a player who has described
 * something and is waiting is the clearest case there is.
 *
 * REFUSING IS NOT RUDE AND IS NOT A FAILURE. "No, the door is iron" is a DM
 * doing their job, and the button says what it does rather than apologising for
 * it. What matters is that the player finds out — a request that silently
 * scrolls away is the thing this component exists to prevent.
 */
import { useState, type ReactElement } from 'react';
import { Eyebrow, quote } from '../design/index.js';
import { skillName } from './promptsFrom.js';
import type { RulingRequestVM } from './rulingsFrom.js';

/** The skills a DM reaches for when somebody tries something. */
const FOR_ATTEMPTS = [
  'athletics', 'acrobatics', 'perception', 'insight', 'persuasion', 'arcana',
] as const;

export interface RulingDockProps {
  requests: RulingRequestVM[];
  /**
   * The third argument is the sentence said back to the table — "you can try,
   * but the floor is slick". It has been in the intent schema from the start
   * and had no control, so every ruling landed as a bare yes or no: a player
   * whose idea was refused found out that it was, and never why. A refusal
   * without a reason is the thing most likely to make somebody stop offering
   * ideas, which is the opposite of what this dock is for.
   */
  onRule: (onSeq: number, verdict: 'allow' | 'refuse', note?: string) => void;
  onAskRoll: (onSeq: number, skill: string, creatureIds: string[]) => void;
  /** Who described it, so a roll can be asked of the right person. */
  creatureIdFor: (request: RulingRequestVM) => string | null;
}

export function RulingDock({ requests, onRule, onAskRoll, creatureIdFor }: RulingDockProps): ReactElement | null {
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const rule = (seq: number, verdict: 'allow' | 'refuse'): void => {
    const said = note.trim();
    onRule(seq, verdict, said.length > 0 ? said : undefined);
    setNote('');
  };

  const active = requests[0];
  if (!active) return null;

  const waiting = requests.length - 1;
  const creatureId = creatureIdFor(active);

  return (
    <div className="qa2-panel qa2-ruling" aria-label="Waiting on you">
      <header className="qa2-ruling-head">
        <Eyebrow tone="accent">{active.who} wants to</Eyebrow>
        {waiting > 0 && (
          <span className="qa2-ruling-queued">
            {waiting === 1 ? 'One more' : `${String(waiting)} more`}
          </span>
        )}
      </header>

      {/* Quoted back in the story face, because it is the player's own words —
          the one piece of fiction in a panel otherwise full of controls. */}
      <p style={{ ...quote, margin: 0 }}>{active.text}</p>

      {pickingFor === active.seq ? (
        <>
          <Eyebrow>What do they roll?</Eyebrow>
          <div className="qa2-ruling-skills">
            {FOR_ATTEMPTS.map((s) => (
              <button
                key={s}
                type="button"
                className="qa2-ask-skill"
                onClick={() => {
                  onAskRoll(active.seq, s, creatureId ? [creatureId] : []);
                  setPickingFor(null);
                }}
              >
                {skillName(s)}
              </button>
            ))}
          </div>
          <button type="button" className="qa2-quiet-link" onClick={() => { setPickingFor(null); }}>
            Back
          </button>
        </>
      ) : (
        <>
          {/* "Yes, but" is the answer a table hears most, and it needs somewhere
              to put the "but". Optional and quiet — a bare yes is still one tap. */}
          <span className="qa2-open">
            <input
              className="qa2-input"
              value={note}
              placeholder="Say something back — optional"
              aria-label="What you say back to the table"
              onChange={(e) => { setNote(e.target.value); }}
            />
          </span>

          <div className="qa2-ruling-actions">
            {/* First, because "try it and we will see" is the commonest answer. */}
            <button type="button" className="qa2-cta" onClick={() => { setPickingFor(active.seq); }}>
              Ask for a roll
            </button>
            <button type="button" className="qa2-pill" onClick={() => { rule(active.seq, 'allow'); }}>
              It works
            </button>
            <button type="button" className="qa2-quiet-link" onClick={() => { rule(active.seq, 'refuse'); }}>
              Not this time
            </button>
          </div>
        </>
      )}
    </div>
  );
}
