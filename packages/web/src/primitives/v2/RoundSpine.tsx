/**
 * v2/RoundSpine — THE SIGNATURE. The left edge of the frame is the round,
 * drawn as a timeline.
 *
 * WHAT IT REPLACES AND WHY. The design request asks for a "party rail":
 * one card per party member, portrait and HP. That answers "how is everyone
 * doing" — a real question, but not the one a player actually has. During
 * somebody else's turn the question in the room is *when am I up*, and v1 could
 * not answer it at all: whose turn it is was a single badge with no sense of
 * what came before or after. Turn order is the one genuine sequence on this
 * screen, which is why this is the one place numbering earns its keep.
 *
 * So the panel is initiative order, top to bottom, with a hairline running down
 * it. Segments already spent carry the accent; segments still ahead carry the
 * frame's own border. The acting notch holds the filled dot. When the line
 * reaches YOUR notch, the same accent continues along the top edge of the near
 * edge (see `.qa2-act.is-yours::before` in ScreenStyles) — one accent, one
 * journey per round, arriving at the surface you act from.
 *
 * WHAT ENEMIES GET. Their name, their place in the order, and one word for how
 * hurt they are — Unhurt, Hurt, Bloodied, Down. Never a number and never a bar.
 * An enemy's exact hit points are the DM's to reveal when the DM chooses; a
 * player is owed enough to make a decision and no more. The word is also what
 * the table already says out loud, which is the point.
 *
 * The cast is set in the display serif and the numbers in mono, so the rail
 * reads as a cast list with a running order rather than a table of rows.
 */
import type { ReactElement } from 'react';
import { castName, Eyebrow, Glyph, HP, Micro, prose, statMeta, Tag } from '../../design/index.js';
import type { SpineEntryVM } from './viewModel.js';

export interface RoundSpineProps {
  round: number;
  cast: SpineEntryVM[];
  open: boolean;
  onToggle: () => void;
  /** click a name — the host targets a foe or looks at an ally. */
  onSelect?: (id: string) => void;
  /** the id currently aimed at, so the spine and the map agree. */
  targetId?: string;
  /**
   * WHOSE SPINE THIS IS. The running order is the same fact for both people at
   * the table, so it is the same component — but a player is WAITING IN it and
   * a DM is DRIVING it, and the two want different sentences at the foot of it.
   * A player asks when am I up; a DM asks who is up and what is next.
   *
   * Sharing the component rather than forking it is the point: the DM screen's
   * worst problem was speaking a second design language, and turn order was the
   * largest surface where it did.
   */
  voice?: 'player' | 'dm';
  /**
   * The baton, rendered at the FOOT of the timeline — where the round is
   * actually going. DM only: advancing the turn is the most-pressed control in
   * a fight, and putting it at the end of the line makes pressing it the literal
   * act of moving the accent one notch on. Absent ⇒ no baton is drawn.
   */
  baton?: {
    label: string;
    onPress: () => void;
    /**
     * Present ⇒ the baton is inert and says this instead of acting. Same
     * contract as a director-bar tile: a control that cannot work explains
     * itself rather than going quiet. Found by running the app — an empty
     * table offered ROLL FOR INITIATIVE, which rolls initiative for nobody.
     */
    refusal?: string | null;
  };
}

/** "You're next" beats "you're 4th" — the countdown a player can act on. */
function cueFor(cast: SpineEntryVM[], inCombat: boolean): { line: string; urgent: boolean } {
  if (!inCombat) return { line: 'Nobody is counting turns. Say what you do.', urgent: false };

  const you = cast.find((c) => c.kind === 'you');
  if (you === undefined) return { line: 'Watching this one.', urgent: false };
  if (you.acting) return { line: 'Your turn. Take your time.', urgent: true };

  const actingAt = cast.findIndex((c) => c.acting);
  const youAt = cast.indexOf(you);

  const away = youAt > actingAt ? youAt - actingAt : cast.length - actingAt + youAt;
  if (away === 1) return { line: "You're next.", urgent: true };
  return { line: `${away} turns until yours.`, urgent: false };
}

/**
 * The DM's version of the same sentence. They are not waiting for a turn, so a
 * countdown would answer a question they do not have. What they need is who the
 * table is waiting on right now and who it lands on next — the two facts that
 * decide what they say in the next ten seconds.
 */
function dmCueFor(cast: SpineEntryVM[], inCombat: boolean): { line: string; urgent: boolean } {
  if (cast.length === 0) return { line: 'Nobody is on the board yet.', urgent: false };
  if (!inCombat) return { line: 'No fight running. The table is yours.', urgent: false };

  const at = cast.findIndex((c) => c.acting);
  const now = cast[at];
  if (now === undefined) return { line: 'Nobody is up.', urgent: false };
  const next = cast[(at + 1) % cast.length];
  if (next === undefined || next.id === now.id) return { line: `${now.name} is up.`, urgent: true };
  return { line: `${now.name} is up. ${next.name} follows.`, urgent: true };
}

export function RoundSpine({ round, cast, open, onToggle, onSelect, targetId, voice = 'player', baton }: RoundSpineProps): ReactElement {
  // Out of combat there IS no running order, so the rail stops pretending there
  // is one: it becomes a party roster, the initiative column disappears, and
  // the timeline goes quiet. The same surface, told the truth about the moment.
  const inCombat = cast.some((c) => c.acting);
  const dm = voice === 'dm';
  const cue = dm ? dmCueFor(cast, inCombat) : cueFor(cast, inCombat);
  // The round NUMBER lives in the top rail; repeating it here at equal weight
  // would leave a player checking two places for one fact. The rail says which
  // round it is, the spine says what the order within it is.
  const heading = inCombat ? 'Turn order' : 'At the table';
  // A DM's roster is the whole table INCLUDING what they brought — so out of
  // combat it is not "at the table", it is everything standing on the board.
  const dmHeading = inCombat ? 'Turn order' : 'On the board';

  // Collapsed, it becomes a small pill rather than a strip welded to the window
  // edge: a HUD that floats should not grow an edge when it shrinks.
  if (!open) {
    return (
      <button type="button" className="qa2-pill is-spine" onClick={onToggle} aria-expanded={false} aria-label={inCombat ? 'Show the turn order' : 'Show the party'}>
        {cue.urgent && <span className="qa2-pill-dot" />}
        {inCombat ? `Round ${round} · ${cue.line}` : `${dm ? dmHeading : 'At the table'} · ${cue.line}`}
      </button>
    );
  }

  return (
    <aside className={dm ? 'qa2-panel qa2-spine is-dm' : 'qa2-panel qa2-spine'} aria-label={inCombat ? 'Turn order' : dm ? 'On the board' : 'The party'}>
      <div className="qa2-spine-head">
        <Eyebrow>{dm ? dmHeading : heading}</Eyebrow>
        <button type="button" className="qa2-ctl" style={{ width: 24, height: 24 }} onClick={onToggle} aria-label="Hide this" aria-expanded>
          <Glyph name="chevronLeft" size={13} />
        </button>
      </div>

      {/* An empty board is a DM's first thirty seconds with this screen, and it
          used to be a hairline with nothing under it. Say what to do next. */}
      {cast.length === 0 ? (
        <p className="qa2-cast-empty" style={{ ...prose, margin: 0 }}>
          {dm
            ? 'Nobody is on the board yet. Bring something in from the bar below, and it appears here.'
            : 'Nobody is on the board yet.'}
        </p>
      ) : (
        <ol className="qa2-cast">
          {cast.map((c) => (
            <li key={c.id}>
              <Notch entry={c} onSelect={onSelect} aimed={targetId === c.id} showInitiative={inCombat} dm={dm} />
            </li>
          ))}
        </ol>
      )}

      <div className="qa2-cue">
        <Eyebrow>{inCombat ? 'Up next' : 'Right now'}</Eyebrow>
        <p style={{ ...prose, color: cue.urgent ? 'var(--qa-accent)' : 'var(--qa-ink-dim)', margin: 0 }}>{cue.line}</p>

        {/* THE BATON. The round is a line, and this is the end of it — pressing
            it is the act of moving the accent one notch on. A DM presses this
            more than anything else on the screen during a fight, and it used to
            live in a bottom strip with nine other buttons at the same weight. */}
        {baton !== undefined && (
          <button
            type="button"
            className="qa2-baton"
            aria-disabled={baton.refusal != null}
            aria-label={baton.refusal != null ? `${baton.label} — ${baton.refusal}` : baton.label}
            title={baton.refusal ?? undefined}
            onClick={() => { if (baton.refusal == null) baton.onPress(); }}
          >
            <span className="qa2-baton-mark" aria-hidden="true" />
            {baton.label}
          </button>
        )}
      </div>
    </aside>
  );
}

function Notch({
  entry,
  onSelect,
  aimed,
  showInitiative,
  dm = false,
}: {
  entry: SpineEntryVM;
  onSelect?: ((id: string) => void) | undefined;
  aimed: boolean;
  showInitiative: boolean;
  /** a DM's notch carries armour class and says foe out loud; a player's does not. */
  dm?: boolean;
}): ReactElement {
  const cls = [
    'qa2-notch',
    entry.acting ? 'is-acting' : '',
    entry.acted && !entry.acting ? 'is-acted' : '',
    /* A DM is not in the running order, so no notch on their spine is
       marked as theirs — the accent belongs to whoever is UP. */
    entry.kind === 'you' && !dm ? 'is-you' : '',
    dm && entry.kind === 'foe' ? 'is-foe' : '',
    /* The one the director's bar is currently showing. A quiet fill rather
       than a word: the bar underneath already names them at full size, and a
       second label would be the same fact twice. */
    dm && aimed ? 'is-open' : '',
    entry.hurt === 'Down' || entry.status === 'Dying' ? 'is-down' : '',
  ].filter(Boolean).join(' ');

  const label =
    (entry.kind === 'foe'
      ? `${entry.name}, initiative ${entry.initiative}, ${entry.hurt ?? 'unhurt'}`
      : `${entry.name}, initiative ${entry.initiative}${entry.hp ? `, ${entry.hp.current} of ${entry.hp.max} hit points` : ''}`)
    + (dm && aimed ? '. Open on the director bar.' : '');

  return (
    <button
      type="button"
      className={cls}
      onClick={onSelect ? () => onSelect(entry.id) : undefined}
      aria-label={label}
      aria-current={entry.acting ? 'step' : undefined}
      style={onSelect !== undefined ? { cursor: 'pointer' } : undefined}
    >
      <span className="qa2-dot" aria-hidden="true" />

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--qa-s2)', minWidth: 0 }}>
          {showInitiative && <Micro style={{ flex: 'none', width: 18 }}>{String(entry.initiative).padStart(2, '0')}</Micro>}
          <span style={{ ...castName, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
          {/* A DM is not IN the running order, so nothing on their spine is
              marked YOU — the character a DM happens to own on the fixture is
              still just somebody at the table to them. */}
          {entry.kind === 'you' && !dm && <Micro style={{ flex: 'none', color: 'var(--qa-accent)' }}>YOU</Micro>}
          {aimed && entry.kind === 'foe' && !dm && <Micro style={{ flex: 'none', color: 'var(--qa-accent)' }}>AIMED</Micro>}
          {/* ARMOUR CLASS, DM ONLY, ON THE TOP LINE. It is the number every
              attack in the room is measured against, which makes it the one a
              DM reads most — and the one a player has not earned about an
              enemy. Right-aligned so the column reads down at a glance. */}
          {dm && entry.ac !== undefined && (
            <Micro style={{ flex: 'none', marginLeft: 'auto', color: 'var(--qa-ink-dim)' }}>AC {entry.ac}</Micro>
          )}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', paddingLeft: showInitiative ? 26 : 0, minWidth: 0 }}>
          {entry.role !== undefined && (
            <span style={{ ...statMeta, flex: 'none', fontSize: 'var(--qa-text-whisper)' }}>{entry.role}</span>
          )}

          {/* Allies show the number. Enemies show the word — see the header. */}
          {entry.hp !== undefined ? (
            <span style={{ flex: 1, minWidth: 40 }}>
              <HP
                current={entry.hp.current}
                max={entry.hp.max}
                bloodied={entry.hp.current > 0 && entry.hp.current <= Math.floor(entry.hp.max / 2)}
              />
            </span>
          ) : entry.hurt !== undefined ? (
            <Tag tone={entry.hurt === 'Bloodied' || entry.hurt === 'Down' ? 'danger' : 'neutral'}>{entry.hurt}</Tag>
          ) : null}

          {entry.status !== undefined && <Tag tone="danger">{entry.status}</Tag>}
        </span>
      </span>
    </button>
  );
}
