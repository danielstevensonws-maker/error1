/**
 * DirectorBar — the one surface a DM works the table from.
 *
 * WHERE IT SITS, AND WHY THAT IS THE WHOLE IDEA. It occupies the position, the
 * width and the chrome of the PLAYER's action bar: bottom-centre, floating over
 * the map, the surface a hand returns to. On a player's screen that place means
 * "the thing you act with"; on a DM's it means "the thing you act on". One
 * position, one meaning, learned once — which is exactly what the two screens
 * were missing when the owner said they did not look like the same product.
 *
 * IT HAS TWO STATES, NOT FIVE TABS. The version this replaces was a strip of
 * five permanent tabs — Sound, Music, NPCs, Map, Effects — plus a separate
 * roster panel, plus a separate panel of private verbs, all three of which
 * overlapped one another at any ordinary laptop width. Five tabs make five
 * concerns equally present and therefore equally invisible.
 *
 *   NOTHING FOCUSED   the table: the mood, the session verbs, the rests
 *   SOMEBODY FOCUSED  that creature: who they are, and what you can do to them
 *
 * Focus arrives by tapping a name in the turn order or a token on the map, so
 * THE RUNNING ORDER IS THE NAVIGATION. A DM never joins two lists by eye to act
 * on one creature, which is what a roster beside a console asked them to do.
 *
 * THE GRAMMAR IS THE PLAYER'S ACTION ROWS, DELIBERATELY: an eyebrow, a row of
 * icon tiles, and one detail strip underneath that names whatever the pointer
 * is on and carries every refusal. For a player the rows are the economies the
 * rules let them spend; for a DM they are what the fiction lets them spend.
 * Same grammar, different vocabulary — and the greying-with-a-reason promise
 * (law 5: an icon is never the only way to find out what something is) now
 * holds on this screen too, which it did not before.
 *
 * THE FOOTER IS THE ESCAPE HATCH, in the same place the player's is. Theirs
 * says "or describe what you do"; this one names somebody who was never on the
 * board — the innkeeper, the voice behind the door, the god who answers. Most
 * of the people a DM speaks as never become tokens.
 */
import { useState, type ReactElement } from 'react';
import { Eyebrow, Glyph, HP, Tag, castName, prose, statMeta, type GlyphName } from '../design/index.js';
import type { SpineEntryVM } from '../primitives/v2/viewModel.js';
import type { EffectId } from './ImmersionConsole.js';

/** Somebody at the table, as the DM's roster knows them. */
export interface BarSeat {
  accountId: string;
  displayName: string;
  characterName: string | null;
  here: boolean;
}

/**
 * One tile. `refusal` is the sentence shown in the detail strip in place of the
 * detail, and it is what makes the tile inert — the same shape the player's
 * tiles use, so a control that will not work explains itself the same way on
 * either screen rather than just going grey.
 */
interface Verb {
  id: string;
  glyph: GlyphName;
  name: string;
  detail: string;
  refusal?: string | null;
  onPress?: () => void;
  /**
   * Present ⇒ this tile OPENS something in the workbench rather than doing
   * something outright, and the tile reports whether it is the one open. A
   * press on the open one closes it; a press on another swaps.
   *
   * The distinction is worth carrying in the data: a DM should be able to tell
   * at a glance which tiles change the world (thunder, a rest) and which merely
   * change what is on their own screen.
   */
  opens?: boolean;
  isOpen?: boolean;
}

/**
 * The atmosphere one-shots, named for what a DM would say rather than for the
 * CSS behind them. These push to every screen at the table at once, which makes
 * this row the only control on the DM's screen that everybody feels.
 */
const MOOD: { id: EffectId; glyph: GlyphName; name: string; detail: string }[] = [
  { id: 'thunder', glyph: 'bolt', name: 'Thunder', detail: 'Thunder — a crack overhead, on every screen at the table.' },
  { id: 'rain', glyph: 'rain', name: 'Rain', detail: 'Rain — it starts to pour.' },
  { id: 'torch', glyph: 'flame', name: 'Torchlight', detail: 'Torchlight — the light gutters, and steadies again.' },
  { id: 'shake', glyph: 'tremor', name: 'Tremor', detail: 'Tremor — the ground moves under everyone.' },
  { id: 'blood', glyph: 'blood', name: 'Blood', detail: 'Blood — the edges go red. Worth saving for something.' },
  { id: 'fade', glyph: 'eclipse', name: 'Blackout', detail: 'Blackout — everything goes dark. The loudest one you have.' },
];

export interface DirectorBarProps {
  cast: SpineEntryVM[];
  seats: BarSeat[];
  /** who is focused, if anybody — set by the turn order or by the map. */
  focusedId: string | null;
  onFocus: (creatureId: string | null) => void;
  /** out of a fight. Rests are legal here and nowhere else. */
  exploring: boolean;
  /** who the DM is speaking as, so the footer can say so. */
  voice: { creatureId?: string; name: string } | null;
  onVoice: (v: { creatureId?: string; name: string } | null) => void;
  onEffect: (e: EffectId) => void;
  onRest: (rest: 'short' | 'long') => void;
  onAddCreature: () => void;
  onRemoveCreature: (creatureId: string) => void;
  onAskCheck: () => void;
  onRules: () => void;
  onMoveCreature: (creatureId: string) => void;
  onWhisper: (accountId: string) => void;
  onShowScreenLink: () => void;
  /**
   * WHICH TOOL IS OPEN IN THE WORKBENCH, and the one call that changes it.
   * Passing null closes whatever is open and the workbench falls back to the
   * glossary — which is why closing is never a dead end.
   */
  openTool?: string | null;
  onTool?: (tool: string | null) => void;
  /** the creature currently being carried, so the Move tile can say so. */
  movingId?: string | null;
  /**
   * Who actually stands on the map. A creature can exist in the turn order and
   * have no token: the server's add_creature writes a combatant and emits the
   * event, but nothing writes a token into the room, so anything a DM brings in
   * mid-session is in the running order and not on the board. Until that is
   * fixed server-side the Move tile has to say so rather than doing nothing —
   * which is exactly what it did before (found by running the app).
   */
  onBoard?: (creatureId: string) => boolean;
}

export function DirectorBar(props: DirectorBarProps): ReactElement {
  const {
    cast, seats, focusedId, onFocus, exploring, voice, onVoice, onEffect, onRest,
    onAddCreature, onRemoveCreature, onAskCheck, onRules, onMoveCreature,
    onWhisper, onShowScreenLink, movingId = null, onBoard,
    openTool = null, onTool,
  } = props;

  const [hovered, setHovered] = useState<Verb | null>(null);
  const [offBoard, setOffBoard] = useState('');

  const focused = cast.find((c) => c.id === focusedId) ?? null;
  const seat = focused ? seats.find((s) => s.characterName === focused.name) ?? null : null;

  const mood = MOOD.map<Verb>((m) => ({
    id: `mood:${m.id}`,
    glyph: m.glyph,
    name: m.name,
    detail: m.detail,
    onPress: () => { onEffect(m.id); },
  }));

  const table = tableVerbs({ exploring, onAskCheck, onAddCreature, onRules, onShowScreenLink, onRest, openTool });
  const rests = restVerbs({ exploring, onRest });
  const theirs = focused === null
    ? []
    : creatureVerbs({
        focused, seat, movingId, onVoice, onWhisper, onAskCheck, onMoveCreature, onRemoveCreature, onFocus,
        placed: onBoard === undefined || onBoard(focused.id),
        openTool,
      });

  const all = focused === null ? [...mood, ...table, ...rests] : theirs;

  /* The strip is never blank: with nothing under the pointer it falls back to
     the first tile that is actually available, so it reads as an explanation
     rather than as a gap waiting to be filled. */
  const shown = hovered ?? all.find((v) => v.refusal == null) ?? all[0] ?? null;
  const refused = shown != null && shown.refusal != null;

  return (
    <section className="qa2-panel qa2-desk" aria-label={focused ? `Working on ${focused.name}` : 'The table'}>
      {focused !== null && <FocusHead entry={focused} seat={seat} onClear={() => { onFocus(null); }} />}

      <div className="qa2-econ-stack">
        {focused === null ? (
          <>
            {/* The mood first: it is the lever that makes a scene land, and it
                used to sit four clicks deep behind a tab nobody opened. */}
            <div className="qa2-econ-row is-secondary">
              <Row label="The mood" verbs={mood} onHover={setHovered} />
            </div>
            {/* Nearest the hand, because these are the ones pressed most. */}
            <div className="qa2-econ-row is-primary">
              <Row label="The table" verbs={table} onHover={setHovered} />
              <Row label="The party" verbs={rests} onHover={setHovered} />
            </div>
          </>
        ) : (
          <div className="qa2-econ-row is-primary">
            <Row label="What you can do" verbs={theirs} onHover={setHovered} />
          </div>
        )}
      </div>

      {/* The tiles' other half: fixed height, never blank, and the only place a
          refusal is allowed to appear. With nothing under the pointer and
          nobody chosen it teaches the screen instead of going quiet — the one
          sentence a DM needs on their first session is that the turn order is
          how you get at a creature. */}
      <p className="qa2-detail" aria-live="polite" style={{ margin: 0 }}>
        {hovered === null && focused === null ? (
          <span style={prose}>Tap anybody in the turn order — or a token on the map — to work on them.</span>
        ) : shown === null ? (
          <span style={prose}>Nothing to do here just yet.</span>
        ) : refused ? (
          <span style={{ ...prose, color: 'var(--qa-danger)' }}>{shown.refusal}</span>
        ) : (
          <span style={prose}>{shown.detail}</span>
        )}
      </p>

      {/* The escape hatch, in the same place the player's is. Theirs is the
          story the rules cannot resolve; this is the person the board does not
          contain. */}
      {focused === null && (
        <form
          className="qa2-desk-voice"
          onSubmit={(e) => {
            e.preventDefault();
            const n = offBoard.trim();
            if (!n) return;
            onVoice({ name: n });
            setOffBoard('');
          }}
        >
          <label className="qa2-sr" htmlFor="qa-offboard">Speak as somebody who is not on the board</label>
          <Glyph name="quill" size={14} />
          <span className="qa2-open" style={{ flex: 1 }}>
            <input
              id="qa-offboard"
              className="qa2-input"
              value={offBoard}
              placeholder={
                voice !== null && voice.creatureId === undefined
                  ? `Speaking as ${voice.name} — type somebody else to change`
                  : 'Speak as somebody not on the board — the innkeeper…'
              }
              autoComplete="off"
              onChange={(e) => { setOffBoard(e.target.value); }}
            />
          </span>
          <button type="submit" className="qa2-ctl" aria-label="Become them" disabled={offBoard.trim().length === 0}>
            <Glyph name="check" size={14} />
          </button>
        </form>
      )}
    </section>
  );
}

/**
 * Who you are working on — the player's own identity block, saying the things a
 * DM needs instead of the things a player does: exact hit points for everybody
 * including the monsters, armour class, and whose character this is.
 */
function FocusHead({
  entry, seat, onClear,
}: {
  entry: SpineEntryVM;
  seat: BarSeat | null;
  onClear: () => void;
}): ReactElement {
  const bloodied = entry.hp !== undefined && entry.hp.current > 0 && entry.hp.current <= Math.floor(entry.hp.max / 2);
  return (
    <div className="qa2-desk-head">
      <span className={entry.kind === 'foe' ? 'qa2-desk-chip is-foe' : 'qa2-desk-chip'} aria-hidden="true">
        {entry.name.slice(0, 1)}
      </span>

      <span className="qa2-desk-who">
        <span style={castName}>{entry.name}</span>
        <span className="qa2-desk-line" style={statMeta}>
          {entry.role ?? (entry.kind === 'foe' ? 'Yours to run' : 'At the table')}
          {entry.ac !== undefined ? ` · AC ${String(entry.ac)}` : ''}
          {seat !== null ? ` · ${seat.displayName}${seat.here ? '' : ' is away'}` : ''}
        </span>
      </span>

      <span className="qa2-desk-vitals">
        {/* The bar needs a width to grow into: HP lays its track out with
            flex:1, which collapses to nothing inside a shrink-to-fit box. */}
        {entry.hp !== undefined
          ? <span className="qa2-desk-hp"><HP current={entry.hp.current} max={entry.hp.max} bloodied={bloodied} /></span>
          : entry.hurt !== undefined
            ? <Tag tone={entry.hurt === 'Bloodied' || entry.hurt === 'Down' ? 'danger' : 'neutral'}>{entry.hurt}</Tag>
            : null}
        {entry.status !== undefined && <Tag tone="danger">{entry.status}</Tag>}
      </span>

      <button type="button" className="qa2-ctl" onClick={onClear} aria-label="Back to the table">
        <Glyph name="close" size={13} />
      </button>
    </div>
  );
}

function Row({
  label, verbs, onHover,
}: {
  label: string;
  verbs: Verb[];
  onHover: (v: Verb | null) => void;
}): ReactElement {
  return (
    <div className="qa2-econ">
      <span className="qa2-econ-label"><Eyebrow>{label}</Eyebrow></span>
      <span className="qa2-slots">
        {verbs.map((v) => {
          const off = v.refusal != null;
          const open = v.opens === true && v.isOpen === true;
          return (
            <button
              key={v.id}
              type="button"
              className={open ? 'qa2-tile is-open' : 'qa2-tile'}
              aria-disabled={off}
              /* A tile that opens a panel is a toggle, and says so to a screen
                 reader as well as to the eye. One that acts is not. */
              {...(v.opens === true ? { 'aria-pressed': open } : {})}
              aria-label={
                off ? `${v.name} — ${v.refusal ?? ''}`
                  : open ? `${v.name}. Open — press again to close.`
                    : `${v.name}. ${v.detail}`
              }
              title={off ? (v.refusal ?? undefined) : v.detail}
              onClick={() => { if (!off && v.onPress) v.onPress(); }}
              onMouseEnter={() => { onHover(v); }}
              onMouseLeave={() => { onHover(null); }}
              onFocus={() => { onHover(v); }}
              onBlur={() => { onHover(null); }}
            >
              <Glyph name={v.glyph} size={22} />
            </button>
          );
        })}
      </span>
    </div>
  );
}

/* ---- the vocabularies ------------------------------------------------------
   Plain functions returning data, so every tile a DM can see is readable in one
   place and a refusal is written beside the thing it refuses rather than
   inferred three components away. */

function tableVerbs(o: {
  exploring: boolean;
  onAskCheck: () => void;
  onAddCreature: () => void;
  onRules: () => void;
  onShowScreenLink: () => void;
  onRest: (r: 'short' | 'long') => void;
  openTool: string | null;
}): Verb[] {
  return [
    {
      id: 'table:ask',
      glyph: 'die',
      name: 'Ask for a roll',
      detail: 'Ask for a roll — name a skill and who owes it. The commonest sentence at any table.',
      opens: true,
      isOpen: o.openTool === 'ask',
      onPress: o.onAskCheck,
    },
    {
      id: 'table:add',
      glyph: 'plus',
      name: 'Bring something in',
      detail: 'Bring something in — a monster out of the rules, or anything you invent.',
      opens: true,
      isOpen: o.openTool === 'add',
      onPress: o.onAddCreature,
    },
    {
      id: 'table:rules',
      glyph: 'search',
      name: 'Look up a rule',
      detail: 'Look up a rule — monsters, spells and conditions, without leaving the table.',
      opens: true,
      isOpen: o.openTool === 'rules',
      onPress: o.onRules,
    },
    {
      id: 'table:screen',
      glyph: 'screen',
      name: 'Put it on the TV',
      detail: 'Put it on the TV — a link for a screen in the middle of the table. It shows what the players can see and nothing else.',
      opens: true,
      isOpen: o.openTool === 'screen',
      onPress: o.onShowScreenLink,
    },
  ];
}

/**
 * A rest is a fiction decision — you rest when the story lets you — but you
 * cannot rest mid-swing, and the rule says so on the tile rather than letting a
 * DM press it and wonder why nothing happened.
 */
function restVerbs(o: { exploring: boolean; onRest: (r: 'short' | 'long') => void }): Verb[] {
  const mid = o.exploring ? null : 'There is a fight running. End it before anybody rests.';
  return [
    {
      id: 'rest:short',
      glyph: 'flask',
      name: 'Short rest',
      detail: 'Short rest — about an hour. Hit dice can be spent, and some abilities come back.',
      refusal: mid,
      onPress: () => { o.onRest('short'); },
    },
    {
      id: 'rest:long',
      glyph: 'bless',
      name: 'Long rest',
      detail: 'Long rest — a night. Hit points, spell slots and nearly everything else come back.',
      refusal: mid,
      onPress: () => { o.onRest('long'); },
    },
  ];
}

function creatureVerbs(o: {
  focused: SpineEntryVM;
  seat: BarSeat | null;
  movingId: string | null;
  onVoice: (v: { creatureId?: string; name: string } | null) => void;
  onWhisper: (accountId: string) => void;
  onAskCheck: () => void;
  onMoveCreature: (id: string) => void;
  onRemoveCreature: (id: string) => void;
  onFocus: (id: string | null) => void;
  placed: boolean;
  openTool: string | null;
}): Verb[] {
  const { focused, seat } = o;
  const theirs = seat !== null;
  const walking = o.movingId === focused.id;

  return [
    {
      id: 'who:speak',
      glyph: 'quill',
      name: 'Speak as them',
      detail: `Speak as ${focused.name} — what you type in the journal comes out of their mouth rather than yours.`,
      /* A player's character is theirs to speak for. Saying so beats a tile
         that works and produces a small betrayal at the table. */
      refusal: theirs && seat !== null ? `${focused.name} is ${seat.displayName}'s to speak for.` : null,
      onPress: () => { o.onVoice({ creatureId: focused.id, name: focused.name }); },
    },
    {
      id: 'who:whisper',
      glyph: 'send',
      name: 'Whisper their player',
      detail: seat !== null
        ? `Whisper ${seat.displayName} — only they see it, and it never reaches the log everybody else reads.`
        : 'Whisper their player.',
      refusal: seat === null ? `Nobody is playing ${focused.name}, so there is nobody to whisper to.` : null,
      opens: true,
      isOpen: o.openTool === 'whisper',
      onPress: () => { if (seat !== null) o.onWhisper(seat.accountId); },
    },
    {
      id: 'who:ask',
      glyph: 'die',
      name: 'Ask them for a roll',
      detail: `Ask ${focused.name} for a roll — they get a card they tap, or you roll it yourself and say nothing.`,
      opens: true,
      isOpen: o.openTool === 'ask',
      onPress: o.onAskCheck,
    },
    {
      id: 'who:move',
      glyph: 'boot',
      name: walking ? 'Put them down' : 'Move them',
      detail: walking
        ? `Carrying ${focused.name}. Tap a square to set them down, or press this again to leave them where they were.`
        : `Move ${focused.name} — pick them up, then tap the square they walk to.`,
      refusal: o.placed ? null : `${focused.name} is in the running order but has no token on the map yet, so there is nothing to pick up.`,
      onPress: () => { o.onMoveCreature(focused.id); },
    },
    {
      id: 'who:remove',
      glyph: 'exit',
      name: 'Take off the board',
      detail: `Take ${focused.name} off the board — fled, or a mistake.`,
      refusal: theirs ? 'A character somebody is playing stays on the board.' : null,
      onPress: () => { o.onRemoveCreature(focused.id); o.onFocus(null); },
    },
  ];
}
