/**
 * v2/JournalRail — the right edge: one place for everything the table said.
 *
 * ONE AREA, NOT THREE. The design request is explicit that the journal, the
 * log, and the rolls are a single area rather than three tabs a player has to
 * choose between: what happened, what was rolled, and what the assistant is
 * proposing all arrive in one stream in the order they happened, because that
 * is the order a table experiences them in. The player's own notes ride at the
 * top as a pinned callout, and the DM's secret notes never appear at all.
 *
 * ROLLS COLLAPSE (design request §6). A roll is one line — what was rolled and
 * what it came to. Tapping it opens the working: the die, each named modifier,
 * and the verdict against whatever it was compared to. Expanded by default
 * would turn a busy round into a wall of arithmetic, and law 4 says nothing on
 * this screen may demand reading while somebody is talking.
 *
 * A RULING SUGGESTION IS A PROPOSAL, NEVER A RULING. When the assistant reads a
 * player's free text it offers a roll and a difficulty with three responses —
 * ask for it, change it, skip it. Law 1: the engine resolves the maths, the
 * table decides the fiction. Nothing in this card applies itself.
 *
 * Collapsed, the rail is a thin strip with a rotated label and a dot when
 * something is waiting, exactly as in the LOG CLOSED reference — a player who
 * wants the map back gets the map back without losing the notification.
 */
import { useState, type FormEvent, type ReactElement } from 'react';
import { AcceptTweakRejectCard } from '../AcceptTweakRejectCard.js';
import { Eyebrow, Glyph, narration, prose, statMeta, statValue } from '../../design/index.js';
import type { LogEntryVM } from './viewModel.js';

const REACTIONS = ['👏', '🔥', '😂', '😮', '✨', '❤️'] as const;

export interface JournalRailProps {
  entries: LogEntryVM[];
  /** the player's own notes for this scene, pinned above the feed. */
  notes?: { title: string; lines: string[] };
  open: boolean;
  onToggle: () => void;
  /** how many suggestions are waiting — shown on the collapsed strip. */
  pendingCount?: number;
  onSend?: (text: string) => void;
  onReact?: (emoji: string) => void;
  /**
   * WHAT THIS RAIL IS CALLED AND WHAT THE COMPOSER DOES. Both people at the
   * table read the same stream in the same order, so it is the same component
   * — but a player is SAYING something into it and a DM is NARRATING the world
   * from it, and the placeholder has to tell the truth about which.
   */
  title?: string;
  placeholder?: string;
  /**
   * The DM performing rather than narrating. Present ⇒ the composer takes the
   * gold border that means "this is your voice, not the world's", and the
   * placeholder names who is talking. One composer, two acts — a DM should
   * never hunt for a second box to be a goblin in.
   */
  speakingAs?: string | null;
  onStopSpeaking?: () => void;
  /**
   * Marks the pinned notes as DM-only. The lines themselves never reach a
   * player — filterStream settles that server-side — but a DM glancing at
   * their own screen mid-sentence needs to know at a look which half of it is
   * safe to read out loud.
   */
  notesArePrivate?: boolean;
}

export function JournalRail({
  entries, notes, open, onToggle, pendingCount = 0, onSend, onReact,
  title = 'Assistant · Journal', placeholder = 'Say something, or ask the assistant',
  speakingAs = null, onStopSpeaking, notesArePrivate = false,
}: JournalRailProps): ReactElement {
  const [draft, setDraft] = useState('');

  // Collapsed, a pill in the corner rather than a strip down the window edge —
  // the point of collapsing it is to give the map back, and a full-height strip
  // gives back rather less than it looks like.
  if (!open) {
    return (
      <button type="button" className="qa2-pill is-journal" onClick={onToggle} aria-expanded={false} aria-label="Show the journal">
        {pendingCount > 0 && <span className="qa2-pill-dot" />}
        {pendingCount > 0 ? `${title} · ${pendingCount} waiting` : title}
      </button>
    );
  }

  const send = (ev: FormEvent): void => {
    ev.preventDefault();
    const text = draft.trim();
    if (text.length === 0 || onSend === undefined) return;
    onSend(text);
    setDraft('');
  };

  return (
    <aside className="qa2-panel qa2-journal" aria-label="Journal">
      <div className="qa2-journal-head">
        <Eyebrow>{title}</Eyebrow>
        <button type="button" className="qa2-ctl" style={{ width: 24, height: 24 }} onClick={onToggle} aria-label="Hide the journal" aria-expanded>
          <Glyph name="chevronRight" size={13} />
        </button>
      </div>

      <div className="qa2-feed">
        {notes !== undefined && (
          <div className={notesArePrivate ? 'qa2-notes is-private' : 'qa2-notes'}>
            <Eyebrow tone={notesArePrivate ? 'gold' : 'faint'}>{notesArePrivate ? `${notes.title} · yours alone` : notes.title}</Eyebrow>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
              {notes.lines.map((line) => (
                <li key={line} style={prose}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* marginTop:auto sits the stream on the composer — a short evening's
            log pinned to the top of a tall rail reads as an empty room. It is
            inline because a plain `margin: 0` here would out-specify the
            stylesheet and quietly undo it. */}
        <ol style={{ listStyle: 'none', margin: 0, marginTop: 'auto', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--qa-s4)' }}>
          {entries.map((e) => (
            <li key={e.id}>
              <Entry entry={e} />
            </li>
          ))}
        </ol>

        {entries.length === 0 && notes === undefined && (
          <p style={{ ...prose, margin: 0 }}>Rolls and story gather here once the session starts.</p>
        )}
      </div>

      {onReact !== undefined && (
        <div className="qa2-react">
          {REACTIONS.map((emoji) => (
            <button key={emoji} type="button" className="qa2-reactbtn" onClick={() => onReact(emoji)} aria-label={`React with ${emoji}`}>
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      )}

      {onSend !== undefined && (
        <form className={speakingAs !== null ? 'qa2-compose is-voiced' : 'qa2-compose'} onSubmit={send}>
          <label className="qa2-sr" htmlFor="qa2-journal-input">
            {speakingAs !== null ? `Speak as ${speakingAs}` : 'Say something to the table'}
          </label>
          {/* The voice tag sits INSIDE the composer rather than above it, so
              there is no moment where a DM has typed a line and cannot see
              whose mouth it is about to come out of. */}
          {speakingAs !== null && (
            <span className="qa2-voicetag">
              {speakingAs}
              {onStopSpeaking !== undefined && (
                <button type="button" className="qa2-voicetag-x" onClick={onStopSpeaking} aria-label={`Stop speaking as ${speakingAs}`}>
                  <Glyph name="close" size={9} />
                </button>
              )}
            </span>
          )}
          <span className="qa2-open" style={{ flex: 1 }}>
            <input
              id="qa2-journal-input"
              className="qa2-input"
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              placeholder={speakingAs !== null ? `What does ${speakingAs} say?` : placeholder}
              autoComplete="off"
            />
          </span>
          <button type="submit" className="qa2-ctl" aria-label={speakingAs !== null ? `Say it as ${speakingAs}` : 'Send'}>
            <Glyph name="send" size={14} />
          </button>
        </form>
      )}
    </aside>
  );
}

function Entry({ entry }: { entry: LogEntryVM }): ReactElement {
  const [openRoll, setOpenRoll] = useState(false);

  // A proposal renders as THE AI card, inline. The rail used to draw its own
  // quote-plus-buttons block, which meant the product had two ways of showing
  // an assistant's output and only one of them carried the accept/tweak/reject
  // guarantee. Same card, same three motions, docked in the stream.
  if (entry.tone === 'suggestion' && entry.suggestion !== undefined) {
    const s = entry.suggestion;
    return (
      <div className="qa2-entry">
        <Eyebrow>{entry.actor}</Eyebrow>
        <AcceptTweakRejectCard
          placement="inline"
          state={s.outcome !== undefined ? 'resolved' : 'draft'}
          kind={s.rows !== undefined ? 'structured' : 'text'}
          eyebrow="Suggestion"
          source={s.rows !== undefined ? 'DM Ruling' : 'DM Narration'}
          quoted={entry.text}
          {...(s.detail !== undefined ? { text: s.detail } : {})}
          {...(s.rows !== undefined ? { rows: s.rows } : {})}
          {...(s.outcome !== undefined ? { outcome: s.outcome } : {})}
          {...(s.acceptLabel !== undefined ? { acceptLabel: s.acceptLabel } : {})}
          {...(s.tweakLabel !== undefined ? { tweakLabel: s.tweakLabel } : {})}
          {...(s.rejectLabel !== undefined ? { rejectLabel: s.rejectLabel } : {})}
          {...(s.onAccept !== undefined ? { onAccept: s.onAccept } : {})}
          {...(s.onTweak !== undefined ? { onTweak: s.onTweak } : {})}
          {...(s.onReject !== undefined ? { onReject: s.onReject } : {})}
          {...(s.onUndo !== undefined ? { onUndo: s.onUndo } : {})}
        />
      </div>
    );
  }

  if (entry.tone === 'roll' && entry.roll !== undefined) {
    const roll = entry.roll;
    return (
      <div className="qa2-entry">
        <Eyebrow>{entry.actor}</Eyebrow>
        <button
          type="button"
          className="qa2-rollrow"
          onClick={() => setOpenRoll((v) => !v)}
          aria-expanded={openRoll}
          aria-label={`${entry.text}, total ${roll.total}. ${roll.verdict}. Show how this was worked out.`}
        >
          <span style={{ ...prose, color: 'var(--qa-ink)' }}>{entry.text}</span>
          <span style={statValue}>{roll.total}</span>
        </button>
        {openRoll && (
          <>
            <ul className="qa2-breakdown">
              {roll.rows.map((r) => (
                <li key={r.label}>
                  <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)' }}>{r.label}</span>
                  <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink)' }}>{r.value}</span>
                </li>
              ))}
            </ul>
            <span className={`qa2-verdict is-${roll.tone}`} style={{ marginTop: 'var(--qa-s2)', marginLeft: 'var(--qa-s3)' }}>
              {roll.verdict}
            </span>
          </>
        )}
      </div>
    );
  }

  const isStory = entry.tone === 'narration';
  return (
    <div className="qa2-entry">
      <Eyebrow>{entry.actor}</Eyebrow>
      <p style={{ ...(isStory ? narration : prose), margin: 0 }}>{entry.text}</p>
    </div>
  );
}
