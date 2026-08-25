/**
 * DmScreen — the screen you run the game from (Brief 10 §3).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE THESIS
 *
 * The player's screen is THE NEAR EDGE: your side of the table, organised by
 * the round drawn as a timeline down the left. This is the same table seen from
 * THE HEAD OF IT — the same timeline in the same place, except that a player is
 * waiting in it and a DM is driving it.
 *
 * So the turn order is not a readout here, it is the NAVIGATION. Tap a name and
 * the bar at the bottom becomes that creature and everything you can do to them
 * appears in it. A DM should never have to join a roster to a console by eye
 * mid-fight, which is exactly what the previous arrangement asked for.
 *
 * THE SIGNATURE IS THE BATON. On a player's screen the accent travels down the
 * spine and arrives at the panel they act from. Here it travels the same line —
 * and the control that moves it sits at the FOOT of the timeline, where the
 * round is actually going. Advancing the turn is spatially the act of pushing
 * the accent one notch on, rather than a button in a strip of nine others.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT WENT WRONG BEFORE, AND WHAT IT COST
 *
 * Two passes failed the same way: this screen invented its own design language
 * instead of speaking the one the player's screen already had. The second pass
 * was a left column of hand-rolled panels, a five-tab console and a journal
 * welded to the window edge — and at 1600×900 the roster, the console and the
 * ruling dock all overlapped each other, so three surfaces were unreadable at
 * an ordinary laptop size.
 *
 * Underneath the composition there were two mechanical faults that no amount of
 * rearranging would have fixed, and both are now repaired at the source:
 *
 *   1. A rule in the design layer — [class*=qa2-] button:not([class*=qa2-]) —
 *      out-specified every single-class rule on this screen, because the DM's
 *      controls carry the single-a qa- prefix. Every button here silently lost
 *      its declared mono caps and rendered at inherited 16px body serif. The
 *      screen's type was not inconsistent by taste; it was inconsistent by one
 *      selector.
 *   2. Nothing in the repo loaded the three typefaces @questra/theme names, so
 *      the display face and the body face both resolved to Georgia. The ramp's
 *      rule — prose is a serif, data is mono — had never been visible.
 *
 * THE FIX FOR THE REST IS TO STOP INVENTING. Everything on this screen is now
 * either a shared design-layer part or a component the player's screen already
 * uses: RoundSpine for the order, JournalRail for the log, .qa2-panel for the
 * chrome, the type ramp's roles for every size. What is genuinely new — the
 * DirectorBar — is built out of the player action bar's own grammar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE ACCENT IS RATIONED, AND THAT IS MOST OF WHY THE OLD ONE READ AS FLAT.
 *
 *   terracotta   whoever the table is waiting for. Nothing else.
 *   danger       hurt: bloodied bars, dying, conditions.
 *   success      health. Every hit-point bar used to be terracotta, including
 *                the full ones, so the accent marked nothing by marking all.
 *   gold         yours alone — your voice, your notes, your secrets.
 *
 * The DM receives the WHOLE room — unrevealed cells, hidden creatures, the lot
 * — because filterRoomForViewer passes their payload through untouched. That
 * asymmetry is settled server-side; nothing here decides it.
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { Cell, Room } from '@questra/contracts';
import { MapCanvas, type TokenPresentation } from '../primitives/MapCanvas.js';
import { ScreenStyles } from '../primitives/v2/ScreenStyles.js';
import { RoundSpine } from '../primitives/v2/RoundSpine.js';
import { JournalRail } from '../primitives/v2/JournalRail.js';
import { Ctl, Eyebrow, Glyph, prose, sceneName, statMeta } from '../design/index.js';
import { PromptDock, type PromptVM } from './PromptDock.js';
import { EffectLayer } from './EffectLayer.js';
import { Compendium } from './Compendium.js';
import { AskForCheck } from './AskForCheck.js';
import { AddCreature } from './AddCreature.js';
import { RulingDock } from './RulingDock.js';
import { DirectorBar } from './DirectorBar.js';
import { Glossary } from './Glossary.js';
import type { EffectId } from './ImmersionConsole.js';
import type { RulingRequestVM } from './rulingsFrom.js';
import type { PlayView } from './projectionToView.js';

/**
 * The tools that open on the workbench. Absent ⇒ the glossary, which is the
 * resting state rather than an empty column.
 */
export type ToolId = 'ask' | 'add' | 'rules' | 'screen' | 'whisper';

/**
 * What the workbench calls itself. Named for what the DM is DOING rather than
 * for the component underneath — "Bring something in", not "AddCreature" — so
 * the heading matches the tile they just pressed.
 */
const BENCH_LABEL: Record<ToolId | 'glossary', string> = {
  glossary: 'What the words mean',
  ask: 'Ask for a roll',
  add: 'Bring something in',
  rules: 'Rules',
  screen: 'The screen in the middle of the table',
  whisper: 'Whisper · yours alone',
};

export interface DmSeat {
  accountId: string;
  displayName: string;
  characterName: string | null;
  here: boolean;
}

export interface DmScreenProps {
  view: PlayView;
  room: Room;
  campaignName: string;
  seats: DmSeat[];
  prompts: PromptVM[];
  rulings: RulingRequestVM[];
  effect: EffectId | null;
  fetchJson: <T>(path: string) => Promise<T>;
  onLeave: () => void;
  onSay: (text: string) => void;
  onSpeakAs: (as: { creatureId?: string; name: string }, text: string) => void;
  onWhisper: (toAccountId: string, text: string) => void;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onAdvanceTurn: () => void;
  onRest: (rest: 'short' | 'long') => void;
  onAnswerPrompt: (promptId: string, take: boolean, optionName?: string) => void;
  onAskCheck: (ask: { skill: string; creatureIds: string[]; secret: boolean; dc?: number; reason?: string }) => void;
  onRule: (onSeq: number, verdict: 'allow' | 'refuse', note?: string) => void;
  onAddCreature: (c: { name: string; maxHp: number; ac: number; monsterId?: string }) => void;
  onRemoveCreature: (creatureId: string) => void;
  onEffect: (effect: EffectId) => void;
  onMove: (tokenId: string, path: Cell[]) => void;
  /**
   * Mint a link for the screen in the middle of the table. Absent ⇒ the tile
   * says so rather than pretending; the lobby is the other place it lives.
   */
  onTableScreenLink?: () => Promise<string>;
  /**
   * The last thing the server refused, in its own words.
   *
   * A DM PRESSING SOMETHING AND SEEING NOTHING IS THE WORST FAILURE THIS SCREEN
   * HAS, and it was the shipped behaviour: useSync has always recorded rejected
   * intents on `error`, and nothing rendered it. A malformed add_creature came
   * back as bad_message and the sheet simply closed — so bringing a monster in
   * off the compendium looked like a button that did nothing, with no way to
   * tell whether it had worked. Surfacing it is not a nicety.
   */
  notice?: string | null;
  onDismissNotice?: () => void;
}

export function DmScreen(props: DmScreenProps): ReactElement {
  const {
    view, room, campaignName, seats, prompts, rulings, effect, fetchJson,
    onLeave, onSay, onSpeakAs, onWhisper, onStartCombat, onEndCombat, onAdvanceTurn,
    onRest, onAnswerPrompt, onAskCheck, onRule, onAddCreature, onRemoveCreature,
    onEffect, onMove, onTableScreenLink, notice = null, onDismissNotice,
  } = props;

  /* Which creature the whole screen is pointed at. ONE piece of state feeding
     the spine, the map and the bar — the previous version kept a separate
     "spotlit" for the roster and nothing at all for the console, so choosing a
     creature in one place changed nothing in the other. */
  const [focused, setFocused] = useState<string | null>(null);
  const [spineOpen, setSpineOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  /**
   * WHICH TOOL IS ON THE WORKBENCH, and there is only ever one.
   *
   * This was five independent booleans and two of them could be true at once,
   * which is how a DM ended up with the compendium over the ask sheet over the
   * map. One value cannot do that: opening a tool IS closing the last one, by
   * construction rather than by remembering to.
   *
   * Absent is not nothing — it is the glossary, which is what makes closing a
   * tool a safe thing to do rather than a way to end up staring at a hole.
   */
  const [tool, setTool] = useState<ToolId | null>(null);
  const [whisperTo, setWhisperTo] = useState<string | null>(null);
  const [whisperText, setWhisperText] = useState('');
  const [screenLink, setScreenLink] = useState<string | null>(null);
  const [screenLinkError, setScreenLinkError] = useState<string | null>(null);

  /** Press the open one to close it; press another to swap. */
  const toggle = (id: ToolId) => (): void => { setTool((t) => (t === id ? null : id)); };
  const [voice, setVoice] = useState<{ creatureId?: string; name: string } | null>(null);
  const [moving, setMoving] = useState<{ tokenId: string; creatureId: string; from: Cell } | null>(null);

  const exploring = view.turn.exploring;
  const waiting = prompts.length + rulings.length;

  /* Escape backs out of whatever is innermost. A DM's hands are on the keyboard
     between sentences, and reaching for a small ✕ mid-fight is a tax. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (moving !== null) { setMoving(null); return; }
      if (tool !== null) { setTool(null); return; }
      if (focused !== null) setFocused(null);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [moving, tool, focused]);

  /** Who each token is, to the DM: everybody by name, foes marked as foes. */
  const present: Record<string, TokenPresentation> = {};
  for (const c of view.cast) {
    present[c.id] = {
      name: c.name,
      side: c.kind === 'foe' ? 'foe' : 'ally',
      acting: c.acting,
      ...(c.status ? { tag: c.status } : c.hurt ? { tag: c.hurt } : {}),
    };
  }

  /** Pick a creature up, or put it back down. Tapping the same one twice cancels. */
  const carry = (creatureId: string): void => {
    const token = room.tokens.find((t) => t.creatureRef === creatureId || t.id === creatureId);
    if (!token) return;
    setMoving((m) => (m && m.creatureId === creatureId ? null : { tokenId: token.id, creatureId, from: token.cell }));
  };

  const say = (text: string): void => {
    /* One composer, two acts: narrating the world, or performing in it. The
       chosen voice decides which, so the DM never hunts for a second box. */
    if (voice) onSpeakAs(voice, text);
    else onSay(text);
  };

  const showScreenLink = (): void => {
    /* Pressing the open tile closes it, like every other tile on the bar. */
    if (tool === 'screen') { setTool(null); return; }
    setTool('screen');
    if (!onTableScreenLink) {
      setScreenLinkError('A link can only be made from the campaign page just now.');
      setScreenLink(null);
      return;
    }
    setScreenLinkError(null);
    setScreenLink(null);
    onTableScreenLink()
      .then((url) => { setScreenLink(url); })
      .catch(() => { setScreenLinkError('Could not make a link just now. Try again in a moment.'); });
  };

  const whisperSeat = whisperTo !== null ? seats.find((s) => s.accountId === whisperTo) ?? null : null;

  return (
    <div className="qa2-screen qa-dm">
      <ScreenStyles />
      <MapCanvas
        room={room}
        mode="play"
        fit="fill"
        present={present}
        {...(moving ? { measureFrom: moving.from } : {})}
        onTokenClick={(ref) => {
          /* Tapping a token focuses it, exactly as tapping its notch does —
             the map and the turn order are two views of one list. */
          const token = room.tokens.find((t) => t.creatureRef === ref || t.id === ref);
          setFocused(ref);
          if (moving && token && moving.tokenId === token.id) setMoving(null);
        }}
        onCellClick={(cell) => {
          if (!moving) return;
          onMove(moving.tokenId, [moving.from, cell]);
          setMoving(null);
        }}
      />

      {moving && (
        <p className="qa2-hint">
          <Glyph name="boot" size={13} />
          Tap a square to set them down
        </p>
      )}

      {/* The scene, centred over the map — the same anchor and the same shape a
          player's screen uses, so a DM glancing between two devices finds the
          same fact in the same place. */}
      <header className="qa2-panel qa2-scene">
        <h1 style={{ ...sceneName, margin: 0 }}>{campaignName}</h1>
        <p className="qa2-scene-line" style={statMeta}>
          <span>{exploring ? 'No fight running' : `Round ${String(view.scene.round)}`}</span>
          <span aria-hidden="true">·</span>
          <span style={{ color: exploring ? 'var(--qa-ink-dim)' : 'var(--qa-accent)' }}>
            {exploring ? `${String(view.cast.length)} on the board` : view.turn.activeName ? `${view.turn.activeName} is up` : 'Nobody is up'}
          </span>
        </p>
      </header>

      <div className="qa2-controls">
        <Ctl glyph="quill" label={railOpen ? 'Hide the journal' : 'Show the journal'} on={railOpen} onClick={() => { setRailOpen((v) => !v); }} />
        <Ctl glyph="exit" label="Leave the table" onClick={onLeave} />
      </div>

      {/**
       * THE LEFT RAIL: the round on top, the workbench under it.
       *
       * ONE FLEX COLUMN, NOT TWO FLOATING BOXES. The turn order grows with the
       * cast and the workbench takes whatever is left, so no height has to be
       * guessed and the two can never overlap however many creatures are on the
       * board. Guessing is how the previous arrangement put three panels on top
       * of one another.
       */}
      <div className="qa2-leftrail">
        {/* ---- the round, and the baton at the foot of it ----------------- */}
      <RoundSpine
        voice="dm"
        round={view.scene.round}
        cast={view.cast}
        open={spineOpen}
        onToggle={() => { setSpineOpen((v) => !v); }}
        onSelect={(id) => { setFocused((f) => (f === id ? null : id)); }}
        {...(focused !== null ? { targetId: focused } : {})}
        baton={{
          label: exploring ? 'Roll for initiative' : 'Next turn',
          onPress: exploring ? onStartCombat : onAdvanceTurn,
          /* Rolling initiative for nobody is not a fight. Found by opening a
             fresh campaign: the empty table offered the button anyway. */
          refusal: exploring && view.cast.length === 0
            ? 'Nobody is on the board yet. Bring something in first.'
            : null,
        }}
      />

      {/* Ending a fight is not the baton — it is the opposite of it, and giving
          it equal weight beside the control a DM presses every thirty seconds
          is how somebody ends a fight by accident. */}
        {/**
         * THE WORKBENCH. Every tool a DM opens lands here, one at a time, in the
         * column they are already looking at — rather than as a sheet thrown over
         * the map they are running the game on.
         *
         * ITS RESTING STATE IS THE GLOSSARY, which is the whole reason closing a
         * tool is safe: there is no state of this screen where the best space on
         * it is blank. A DM with nothing open gets the words their table keeps
         * asking them about.
         */}
        <section className="qa2-panel qa2-bench" aria-label={BENCH_LABEL[tool ?? 'glossary']}>
          <header className="qa2-bench-head">
            <Eyebrow tone={tool === 'whisper' || tool === 'screen' ? 'gold' : 'faint'}>
              {BENCH_LABEL[tool ?? 'glossary']}
            </Eyebrow>
            {tool !== null && (
              <button type="button" className="qa2-ctl" onClick={() => { setTool(null); }} aria-label="Close, back to the glossary">
                <Glyph name="close" size={13} />
              </button>
            )}
          </header>

          <div className="qa2-bench-body">
            {tool === null && <Glossary onOpenRules={() => { setTool('rules'); }} />}

            {tool === 'ask' && (
              <AskForCheck
                targets={view.cast.filter((c) => c.kind !== 'foe').map((c) => ({ creatureId: c.id, name: c.name }))}
                {...(focused !== null && view.cast.find((c) => c.id === focused)?.kind !== 'foe' ? { preselect: focused } : {})}
                onAsk={(ask) => { onAskCheck(ask); setTool(null); }}
              />
            )}

            {tool === 'add' && (
              <AddCreature fetchJson={fetchJson} onAdd={(c) => { onAddCreature(c); setTool(null); }} />
            )}

            {tool === 'rules' && <Compendium fetchJson={fetchJson} />}

            {tool === 'screen' && (
              <div className="qa2-bench-note">
                <p style={{ ...prose, margin: 0 }}>
                  Open this on a television or a spare laptop. It shows the map and the log exactly as
                  the players see them — never a hidden creature, never a prep note. Making a new link
                  cuts off every old one.
                </p>
                {screenLinkError !== null ? (
                  <p style={{ ...prose, margin: 0, color: 'var(--qa-danger)' }}>{screenLinkError}</p>
                ) : screenLink === null || screenLink === '' ? (
                  <p style={{ ...prose, margin: 0 }}>Making a link…</p>
                ) : (
                  <span className="qa2-open">
                    <input className="qa2-input" readOnly value={screenLink} aria-label="Link for the table screen" onFocus={(e) => { e.target.select(); }} />
                  </span>
                )}
              </div>
            )}

            {tool === 'whisper' && (
              whisperSeat === null ? (
                <p style={{ ...prose, margin: 0 }}>Choose somebody in the turn order to whisper to.</p>
              ) : (
                <form
                  className="qa2-bench-note"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = whisperText.trim();
                    if (!text) return;
                    onWhisper(whisperSeat.accountId, text);
                    setWhisperText('');
                    setTool(null);
                  }}
                >
                  <p style={{ ...prose, margin: 0 }}>
                    Only {whisperSeat.displayName} sees this. It never reaches the log anybody else reads.
                  </p>
                  <span className="qa2-open">
                    <input
                      className="qa2-input"
                      value={whisperText}
                      autoFocus
                      placeholder={`Tell ${whisperSeat.displayName} something only they know`}
                      aria-label={`Whisper to ${whisperSeat.displayName}`}
                      onChange={(e) => { setWhisperText(e.target.value); }}
                    />
                  </span>
                  <button type="submit" className="qa2-cta" disabled={whisperText.trim().length === 0}>Whisper it</button>
                </form>
              )
            )}
          </div>
        </section>
      </div>

      {!exploring && (
        <button type="button" className="qa2-pill is-endfight" onClick={onEndCombat}>
          End the fight
        </button>
      )}

      {/* ONE BOTTOM-CENTRE COLUMN, NOT THREE THINGS AT THE SAME COORDINATES.
          The prompt dock, the ruling dock and the bar all answer "what needs me
          next", so they belong in one place — and the previous version put all
          three at bottom-centre with hand-guessed offsets, which meant whichever
          rendered last covered the others. Stacked in a flex column, no offset
          can be wrong because none is written down: the docks push the bar down
          by exactly their own height and nothing else. */}
      <div className="qa2-deskstack">
        {/* Top of the column, above everything that is waiting on you, because
            a refusal is about the thing you just did. */}
        {notice !== null && (
          <div className="qa2-panel qa2-notice" role="status">
            <Glyph name="close" size={13} />
            <span style={{ ...prose, color: 'var(--qa-ink)', flex: 1 }}>{notice}</span>
            {onDismissNotice !== undefined && (
              <button type="button" className="qa2-ctl" onClick={onDismissNotice} aria-label="Dismiss">
                <Glyph name="close" size={13} />
              </button>
            )}
          </div>
        )}

        <PromptDock prompts={prompts} onAnswer={onAnswerPrompt} />

        <RulingDock
          requests={rulings}
          onRule={onRule}
          onAskRoll={(onSeq, skill, creatureIds) => {
            onAskCheck({ skill, creatureIds, secret: false });
            onRule(onSeq, 'allow');
          }}
          creatureIdFor={(r) => view.cast.find((c) => c.name === r.who)?.id ?? null}
        />

        <DirectorBar
        cast={view.cast}
        seats={seats}
        focusedId={focused}
        onFocus={setFocused}
        exploring={exploring}
        voice={voice}
        onVoice={setVoice}
        onEffect={onEffect}
        onRest={onRest}
        onAddCreature={toggle('add')}
        onRemoveCreature={onRemoveCreature}
        onAskCheck={toggle('ask')}
        onRules={toggle('rules')}
        onMoveCreature={carry}
        onWhisper={(accountId) => { setWhisperTo(accountId); setTool('whisper'); }}
        onShowScreenLink={showScreenLink}
        openTool={tool}
        movingId={moving?.creatureId ?? null}
        onBoard={(creatureId) => room.tokens.some((t) => t.creatureRef === creatureId || t.id === creatureId)}
        />
      </div>

      {/* ---- the journal: the player's own rail, with the DM's voice ------ */}
      <JournalRail
        entries={view.entries}
        open={railOpen}
        onToggle={() => { setRailOpen((v) => !v); }}
        pendingCount={waiting}
        title="Assistant · Journal"
        placeholder="Narrate, roleplay, or ask the assistant"
        speakingAs={voice?.name ?? null}
        onStopSpeaking={() => { setVoice(null); }}
        onSend={say}
      />

      <EffectLayer effect={effect} />
    </div>
  );
}
