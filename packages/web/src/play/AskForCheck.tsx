/**
 * "Give me a perception check." — the DM's most-used sentence, as a control.
 *
 * SKILLS ARE NOT ALPHABETICAL HERE. The eighteen SRD skills sorted by name put
 * Acrobatics first and Perception tenth, which is exactly backwards: a handful
 * get asked for constantly and the rest almost never. The common ones lead, so
 * the usual ask is one tap rather than a hunt through a list mid-sentence.
 *
 * WHO IT IS FOR DEFAULTS TO EVERYONE, because "everyone give me a perception
 * check" is the single most common form of this. Narrowing to one person is the
 * deliberate act, not the default one — unless the DM arrived here with
 * somebody already focused on the director's bar, in which case they have
 * already said who they mean and being asked again is a tax.
 *
 * THE DIFFICULTY AND THE REASON ARE OPTIONAL AND THAT IS THE POINT. Both have
 * been in the intent schema since the beginning and neither had a control, so
 * every ask went out bare: no number to beat and no sentence saying why. A DM
 * who has decided the ledge is DC 13 could not say so, and a player who tapped
 * a card had no idea what they were rolling for. They sit behind one quiet link
 * rather than in the main flow, because deciding a number before you have heard
 * what somebody is trying is the habit this product is meant to break.
 *
 * SECRET IS A REAL TOOL, NOT A GIMMICK: players must not know they failed to
 * spot the ambush, because knowing they failed is itself information. It is off
 * by default — the ordinary case is said out loud, where everyone hears the ask
 * and watches the roll.
 */
import { useState, type ReactElement } from 'react';
import { Eyebrow, prose } from '../design/index.js';
import { skillName } from './promptsFrom.js';

/** The skills a DM actually reaches for, in the order they reach for them. */
const COMMON = [
  'perception', 'insight', 'investigation', 'persuasion', 'stealth', 'athletics',
] as const;

const REST = [
  'acrobatics', 'animal_handling', 'arcana', 'deception', 'history', 'intimidation',
  'medicine', 'nature', 'performance', 'religion', 'sleight_of_hand', 'survival',
] as const;

/**
 * The SRD's own difficulty ladder, in its own words. A DM new to this does not
 * know that 15 is "medium" and should not have to learn a number to use the
 * feature — they pick the word and the number follows.
 */
const DIFFICULTY = [
  { dc: 10, word: 'Easy' },
  { dc: 15, word: 'Medium' },
  { dc: 20, word: 'Hard' },
] as const;

export interface CheckTarget {
  creatureId: string;
  name: string;
}

export interface AskForCheckProps {
  /** Everyone who could be asked — the players at the table. */
  targets: CheckTarget[];
  /** Somebody already chosen on the director's bar, so the ask arrives pointed. */
  preselect?: string;
  onAsk: (ask: { skill: string; creatureIds: string[]; secret: boolean; dc?: number; reason?: string }) => void;
}

export function AskForCheck({ targets, preselect, onAsk }: AskForCheckProps): ReactElement {
  const [showAll, setShowAll] = useState(false);
  /* Empty means everybody — the common case, so it is where this starts. */
  const [only, setOnly] = useState<string | null>(preselect ?? null);
  const [secret, setSecret] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [dc, setDc] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const ask = (skill: string): void => {
    const trimmed = reason.trim();
    onAsk({
      skill,
      creatureIds: only ? [only] : [],
      secret,
      ...(dc !== null ? { dc } : {}),
      ...(trimmed ? { reason: trimmed } : {}),
    });
  };

  return (
    <div className="qa2-ask">
      {/* Who owes it. "Everyone" first because it is the usual answer. */}
      <div className="qa2-ask-who">
        <button
          type="button"
          className={'qa2-pill' + (only === null ? ' is-on' : '')}
          aria-pressed={only === null}
          onClick={() => { setOnly(null); }}
        >
          Everyone
        </button>
        {targets.map((t) => (
          <button
            key={t.creatureId}
            type="button"
            className={'qa2-pill' + (only === t.creatureId ? ' is-on' : '')}
            aria-pressed={only === t.creatureId}
            onClick={() => { setOnly(t.creatureId); }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="qa2-ask-skills">
        {COMMON.map((s) => (
          <button key={s} type="button" className="qa2-ask-skill" onClick={() => { ask(s); }}>
            {skillName(s)}
          </button>
        ))}
        {showAll && REST.map((s) => (
          <button key={s} type="button" className="qa2-ask-skill" onClick={() => { ask(s); }}>
            {skillName(s)}
          </button>
        ))}
      </div>

      {!showAll && (
        <button type="button" className="qa2-quiet-link" onClick={() => { setShowAll(true); }}>
          The rest of them
        </button>
      )}

      {/* Behind a link, because the good habit is to hear what somebody is
          trying BEFORE deciding how hard it is. */}
      {!detailed ? (
        <button type="button" className="qa2-quiet-link" onClick={() => { setDetailed(true); }}>
          Set a difficulty, or say why
        </button>
      ) : (
        <div className="qa2-ask-more">
          <span className="qa2-ask-row">
            <Eyebrow>How hard</Eyebrow>
            <span className="qa2-ask-who">
              <button
                type="button"
                className={'qa2-pill' + (dc === null ? ' is-on' : '')}
                aria-pressed={dc === null}
                onClick={() => { setDc(null); }}
              >
                You decide after
              </button>
              {DIFFICULTY.map((d) => (
                <button
                  key={d.dc}
                  type="button"
                  className={'qa2-pill' + (dc === d.dc ? ' is-on' : '')}
                  aria-pressed={dc === d.dc}
                  onClick={() => { setDc(d.dc); }}
                >
                  {d.word} · {d.dc}
                </button>
              ))}
            </span>
          </span>

          <span className="qa2-ask-row">
            <Eyebrow>Why</Eyebrow>
            <span className="qa2-open">
              <input
                className="qa2-input"
                value={reason}
                placeholder="You hear something behind the door…"
                aria-label="Why you are asking"
                onChange={(e) => { setReason(e.target.value); }}
              />
            </span>
          </span>
        </div>
      )}

      {/* Off by default: the ordinary ask is said out loud. */}
      <label className="qa2-ask-secret">
        <input type="checkbox" checked={secret} onChange={(e) => { setSecret(e.target.checked); }} />
        <span style={prose}>Roll it myself — do not tell them</span>
      </label>
    </div>
  );
}
