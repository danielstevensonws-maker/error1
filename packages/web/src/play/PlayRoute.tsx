/**
 * PlayRoute — the table, live.
 *
 * Everything else in the app exists to get somebody here: an account, a
 * campaign, a join code, a character, a map, a socket. This is the first screen
 * that renders all of it at once.
 *
 * ONE SCREEN, TWO ROLES — NOT TWO SCREENS. The map, the log and the design
 * language are shared; what differs is the panels around them and the data that
 * arrives. A player receives a room with unrevealed cells already stripped and
 * never sees a whisper meant for somebody else, because `filterRoomForViewer`
 * and `eventVisibleTo` settle that server-side before the payload is built.
 * Re-deciding any of it here would be a second security model free to disagree
 * with the first.
 *
 * WHAT A NEW PLAYER GETS. Every number on the near edge arrives with the
 * arithmetic that produced it, straight off the computed sheet — tap armour
 * class and read where it came from. That is the product's whole promise: you
 * learn the rules by playing, not before playing.
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { CampaignSession, Intent, Room } from '@questra/contracts';
import { PlayerViewV2 } from '../primitives/v2/PlayerViewV2.js';
import { DmScreen } from './DmScreen.js';
import { promptsFrom } from './promptsFrom.js';
import { rulingsFrom } from './rulingsFrom.js';
import { roomWithMoves } from './roomWithMoves.js';
import { useMapAction } from './useMapAction.js';
import { tilesFrom } from './tilesFrom.js';
import { PromptDock, type PromptVM } from './PromptDock.js';
import type { EffectId } from './ImmersionConsole.js';
import { EffectLayer } from './EffectLayer.js';
import { Compendium } from './Compendium.js';
import { Eyebrow, Glyph } from '../design/index.js';
import { ShellStyles } from '../shell/ShellStyles.js';
import { Road } from '../shell/road/Road.js';
import { usePrefersReducedMotion } from '../shell/shared.js';
import type { SessionApi } from '../shell/session.js';
import { useSync } from './useSync.js';
import { projectionToView, type MyCharacter, type Projection } from './projectionToView.js';
import { castWithArrivals } from './castWithArrivals.js';

export interface PlayRouteProps {
  campaignId: string;
  session: SessionApi;
  onLeave: () => void;
}

export function PlayRoute({ campaignId, session, onLeave }: PlayRouteProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [table, setTable] = useState<CampaignSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * The roster and the map, in parallel — neither depends on the other, and
   * serialising them would double the wait before the table appears.
   *
   * REFETCHED WHEN THE PAGE COMES BACK INTO VIEW, not only on mount. A player
   * who rebuilds their character in another tab, or leaves this one open
   * overnight, was otherwise looking at a snapshot taken when the page first
   * loaded — showing a character that no longer exists, with no way to tell
   * that was what had happened (owner, 2026-08-20: rebuilt as an Orc Monk and
   * the table still showed the Goliath Fighter it replaced).
   *
   * Focus rather than a poll: the roster changes when a PERSON does something,
   * and coming back to the tab is exactly when that has just happened.
   */
  useEffect(() => {
    let cancelled = false;

    const load = (): void => {
      Promise.all([
        session.authedRequest<CampaignSession>(`/campaigns/${campaignId}/session`),
        session.authedRequest<Room>(`/campaigns/${campaignId}/room`),
      ])
        .then(([t, r]) => { if (!cancelled) { setTable(t); setRoom(r); setLoadError(null); } })
        .catch((e) => {
          /* Only surface a failure if there is nothing on screen yet. A refetch
             that fails while the table is already rendered should leave the
             table alone rather than replacing it with an error. */
          if (!cancelled && !table) setLoadError(e instanceof Error ? e.message : 'Could not open this table.');
        });
    };

    load();
    const onFocus = (): void => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    /* `table` is deliberately not a dependency: it is read only inside the
       error branch, and depending on it would restart the listeners on every
       successful load. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, session]);

  const sync = useSync({
    playSessionId: table?.playSessionId ?? '',
    token: session.accessToken(),
    enabled: table !== null,
  });

  /* Who this viewer plays. A DM has no character, which is not a missing value
     — it is what running the game means. */
  const myCharacter = useMemo<MyCharacter | null>(() => {
    const me = table?.members.find((m) => m.accountId === session.account?.id);
    return me?.character ?? null;
  }, [table, session.account?.id]);

  /* Every character's CURRENT name, so the cast list is not stale for the same
     reason the hero panel was — see projectionToView's note on rebuilt
     characters. */
  const rosterNames = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of table?.members ?? []) if (m.character) out[m.character.id] = m.character.name;
    return out;
  }, [table]);

  /**
   * One place that turns an intent into a sent frame, so no caller has to
   * remember how an idempotency key is built. Every key is unique per press:
   * the server re-acks a repeat rather than re-emitting, which is protection
   * against a double-click, not a reason to reuse one deliberately.
   */
  const send = useCallback((intent: Intent): void => {
    sync.sendIntent({
      idempotencyKey: `${intent.kind}-${String(Date.now())}-${String(Math.random()).slice(2, 8)}`,
      intent,
    });
  }, [sync]);

  /**
   * Reaction prompts waiting on this viewer (Brief 08). The server owns which
   * one is active and when it expires; this only holds what has arrived and
   * not yet been closed by a taken/declined event.
   */
  const prompts = useMemo<PromptVM[]>(
    () => promptsFrom(sync.events, rosterNames, myCharacter?.id ?? null),
    [sync.events, rosterNames, myCharacter],
  );

  /* What players have described and the DM has not answered. */
  const rulings = useMemo(() => rulingsFrom(sync.events, rosterNames), [sync.events, rosterNames]);

  /* What this character can do, straight off their sheet. */
  const tiles = useMemo(() => tilesFrom(myCharacter?.sheet ?? null), [myCharacter]);

  /* The compendium is public — the SRD is the same text in every campaign — but
     going through authedRequest keeps one path to the API rather than two. */
  const fetchJson = useCallback(
    <T,>(path: string): Promise<T> => session.authedRequest<T>(path),
    [session],
  );
  const [rulesOpen, setRulesOpen] = useState(false);


  /**
   * Atmosphere effects are ephemeral by design (Brief 10 §4) — they play and
   * are gone, leaving nothing in the log to replay at somebody reconnecting.
   *
   * The server echoes an effect to EVERY viewer including whoever sent it, so
   * there is one path that draws one: what the DM sees is what the table sees,
   * rather than a local preview that could differ from the broadcast.
   */
  const [effect, setEffect] = useState<EffectId | null>(null);
  useEffect(() => { sync.onEffect((e) => { setEffect(e); }); }, [sync]);
  useEffect(() => {
    if (!effect) return;
    const t = window.setTimeout(() => { setEffect(null); }, 2000);
    return () => { window.clearTimeout(t); };
  }, [effect]);

  /**
   * The room with everybody standing where they are now. A room is fetched once
   * and never changes; token_moved events flow past on the socket. Replaying
   * them here is what makes movement visible at all — before this the map was
   * frozen at page load no matter how much the table moved.
   */
  const liveRoom = useMemo(() => roomWithMoves(room, sync.events), [room, sync.events]);

  /**
   * Pointing at the map: tap yourself to move, tap an enemy to aim at them.
   * Speed comes off the sheet rather than assumed, because a Goliath's
   * thirty-five feet is exactly the sort of thing a hardcoded six squares
   * gets wrong forever.
   */
  const mapAction = useMapAction({
    room: liveRoom,
    myCreatureId: myCharacter?.id ?? null,
    speedFt: myCharacter?.sheet.speedFt.value ?? 30,
    onMove: (tokenId, path) => {
      send({ kind: 'move', tokenId, path: path as [{ x: number; y: number }, ...{ x: number; y: number }[]] });
    },
  });

  const view = useMemo(() => {
    /* The snapshot is the engine's projection, opaque to contracts — the sync
       client deliberately does not fold it, so this is where it becomes a
       shape the screen understands. */
    const snapshot = (sync.snapshot ?? { combatants: {}, round: 1, nextSeq: 0 }) as Projection;
    /* Plus everybody who has arrived since the snapshot was taken. The snapshot
       comes once at hello and creature_added streams past afterwards, exactly
       as token_moved does for the room — see castWithArrivals. */
    const projection = castWithArrivals(snapshot, sync.events);
    return projectionToView({
      projection,
      room: liveRoom,
      myCharacter,
      role: table?.yourRole ?? 'player',
      events: sync.events,
      campaignName: table?.campaignName ?? '',
      rosterNames,
    });
  }, [sync.snapshot, sync.events, liveRoom, myCharacter, table, rosterNames]);

  /**
   * Who each token is TO THIS VIEWER — the room stores a creatureRef and knows
   * nothing about allegiance, so the map cannot colour a token without this.
   * The chosen target is marked here too, because "which one am I aiming at"
   * has to be visible on the board rather than only in a menu.
   */
  const present = useMemo(() => {
    const out: Record<string, { name: string; side: 'you' | 'ally' | 'foe'; tag?: string }> = {};
    for (const c of view.cast) {
      out[c.id] = {
        name: c.name,
        side: c.kind,
        ...(mapAction.targetId === c.id
          ? { tag: 'Aiming' }
          : c.status ? { tag: c.status } : c.hurt ? { tag: c.hurt } : {}),
      };
    }
    return out;
  }, [view, mapAction.targetId]);

  if (loadError) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-label">This table will not open</p>
          <p className="rd-detail">{loadError}</p>
          <div className="rd-actions">
            <button type="button" className="qa2-cta" onClick={onLeave}>Back to your campaigns</button>
          </div>
        </main>
      </div>
    );
  }

  /* The map is the one thing the screen cannot draw without. Everything else
     degrades — an empty cast, no log — but a table with no floor is nothing. */
  if (!liveRoom || !table) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-micro">Setting out the table…</p>
        </main>
      </div>
    );
  }

  /**
   * The DM runs the game rather than playing a character, so they get their own
   * screen: everybody's numbers instead of one character's, and the composer
   * they narrate from. Same map, same glass, same corners.
   */
  if (table.yourRole === 'dm') {
    return (
      <DmScreen
        view={view}
        room={liveRoom}
        campaignName={table.campaignName}
        seats={table.members
          .filter((m) => m.role === 'player')
          .map((m) => ({
            accountId: m.accountId,
            displayName: m.displayName,
            characterName: m.character?.name ?? null,
            here: sync.present.some((p) => p.accountId === m.accountId),
          }))}
        prompts={prompts}
        onLeave={onLeave}
        notice={sync.error}
        onDismissNotice={sync.clearError}
        onSay={(text) => {
          /* Straight onto the shared log, where every connected player sees it.
             The DM narrating and a player describing an action take the SAME
             path — one composer, one event, no separate chat to keep in sync. */
          send({ kind: 'free_text', creatureId: 'dm', text });
        }}
        onWhisper={(toAccountId, text) => { send({ kind: 'whisper', toAccountId, text }); }}
        onStartCombat={() => { send({ kind: 'start_combat' }); }}
        onEndCombat={() => { send({ kind: 'end_combat' }); }}
        onAdvanceTurn={() => { send({ kind: 'advance_turn' }); }}
        onRest={(rest) => { send({ kind: 'rest', rest }); }}
        onAnswerPrompt={(promptId, take, optionName) => {
          send(optionName === undefined
            ? { kind: 'prompt_reply', promptId, take }
            : { kind: 'prompt_reply', promptId, take, optionName });
        }}
        onEffect={(e) => { sync.sendEffect(e); }}
        effect={effect}
        fetchJson={fetchJson}
        rulings={rulings}
        onAskCheck={({ skill, creatureIds, secret, dc, reason }) => {
          /* dc and reason have been in the intent schema since the beginning
             and had no control on the screen, so every ask went out bare. Both
             are still optional: deciding a number before hearing what somebody
             is trying is the habit this product exists to break. */
          send({
            kind: 'ask_for_check',
            skill: skill as never,
            creatureIds,
            secret,
            ...(dc !== undefined ? { dc } : {}),
            ...(reason !== undefined ? { reason } : {}),
          });
        }}
        onRule={(onSeq, verdict, note) => {
          send(note === undefined
            ? { kind: 'rule_on', onSeq, verdict }
            : { kind: 'rule_on', onSeq, verdict, note });
        }}
        /* The link for a screen in the middle of the table. It was mintable
           only from the lobby, which meant a DM who decided mid-session to put
           the map on the television had to leave the table to do it. Asking
           again mints a fresh one and revokes every prior link, which is how a
           display gets cut off when a session moves house. */
        onTableScreenLink={() =>
          session
            .authedRequest<{ token: string }>(`/campaigns/${campaignId}/table-display-token`, { method: 'POST' })
            .then(({ token }) => `${window.location.origin}/display/${table.playSessionId}?t=${token}`)
        }
        onSpeakAs={(as, text) => {
          send(as.creatureId === undefined
            ? { kind: 'speak_as', name: as.name, text }
            : { kind: 'speak_as', creatureId: as.creatureId, name: as.name, text });
        }}
        onRemoveCreature={(creatureId) => { send({ kind: 'remove_creature', creatureId }); }}
        onMove={(tokenId, path) => {
          send({ kind: 'move', tokenId, path: path as [{ x: number; y: number }, ...{ x: number; y: number }[]] });
        }}
        onAddCreature={(c) => {
          send(c.monsterId === undefined
            ? { kind: 'add_creature', name: c.name, maxHp: c.maxHp, ac: c.ac }
            : { kind: 'add_creature', name: c.name, maxHp: c.maxHp, ac: c.ac, monsterId: c.monsterId });
        }}
      />
    );
  }

  /**
   * A player who has not made a character has nobody for the near edge to be.
   * Saying so plainly beats inventing one, and the lobby is where they fix it.
   */
  if (!view.hero) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-label">{table.campaignName}</p>
          <h1 className="rd-title">The table is set</h1>
          <p className="rd-detail">
            You have not made a character yet, so there is nobody for you to play.
          </p>
          <ul className="qa-lobby-list">
            {view.cast.map((c) => (
              <li key={c.id} className="qa-seat is-here">
                <span className="qa-seat-dot" aria-hidden="true" />
                <span className="qa-seat-name">{c.name}</span>
                <span className="rd-micro qa-seat-role">
                  {c.hp ? `${String(c.hp.current)}/${String(c.hp.max)}` : (c.hurt ?? '')}
                </span>
              </li>
            ))}
          </ul>
          <div className="rd-actions">
            <button type="button" className="qa2-cta" onClick={onLeave}>Back to the lobby</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <PlayerViewV2
        scene={view.scene}
        hero={view.hero}
        cast={view.cast}
        room={liveRoom}
        present={present}
        {...(mapAction.moveFrom ? { measureFrom: mapAction.moveFrom } : {})}
        onTarget={mapAction.onTokenClick}
        onCell={mapAction.onCellClick}
        /* Real cards off the character's own sheet, with the arithmetic behind
           every number — the thing that makes tapping one teach you why it
           worked. */
        tiles={tiles}
        turn={view.turn}
        entries={view.entries}
        {...(view.dying ? { dying: view.dying } : {})}
        features={[]}
        inventory={[]}
        /**
         * Using a tile is an attack on whoever is selected. Targeting is the
         * next real piece of the map; until it exists, the first foe standing
         * is a better answer than a card that does nothing, and the server
         * refuses anything illegal with a sentence the player can read.
         */
        onUse={(tileId) => {
          if (!view.hero) return;

          /**
           * A FEATURE HAS NO TARGET AND NO MECHANICAL PATH YET, so it goes
           * through the escape hatch as a described action — which is exactly
           * what Law 2 is for. It reaches the DM's ruling dock and gets a real
           * answer, rather than the silent nothing that used to happen when a
           * tile did not start with "attack:" (owner, 2026-08-25: "the ability
           * seemed not to work").
           */
          if (tileId.startsWith('feature:')) {
            const tile = tiles.find((t) => t.id === tileId);
            send({
              kind: 'free_text',
              creatureId: view.hero.id,
              text: `uses ${tile?.name ?? 'a feature'}.`,
            });
            return;
          }

          if (!tileId.startsWith('attack:')) return;
          /* Whoever you aimed at on the map. With one enemy on the board the
             fallback keeps it a single tap, which is the common case. */
          const foe = view.cast.find((c) => c.id === mapAction.targetId)
            ?? view.cast.find((c) => c.kind === 'foe' && c.status !== 'Down');
          /**
           * Nothing to hit is a SENTENCE, not a silent no-op. Swinging at an
           * empty room used to do nothing at all, which reads as a broken
           * button rather than as an empty board.
           */
          if (!foe) {
            send({
              kind: 'free_text',
              creatureId: view.hero.id,
              text: `swings ${tileId.slice('attack:'.length)} — but there is nothing here to hit.`,
            });
            return;
          }
          send({
            kind: 'attack',
            attackerId: view.hero.id,
            targetId: foe.id,
            actionName: tileId.slice('attack:'.length),
          });
        }}
        /* Law 2's escape hatch, on the player's side: describe what you want to
           do and it becomes part of the table's record rather than being
           refused for not matching a button. */
        onDescribe={(text) => {
          if (view.hero) send({ kind: 'free_text', creatureId: view.hero.id, text });
        }}
        onSend={(text) => {
          if (view.hero) send({ kind: 'free_text', creatureId: view.hero.id, text });
        }}
        onRollDeathSave={() => {
          /* Flat d20, nothing added: the one roll in the game where being a
             high-level character does not help, and the server owns it. */
          if (view.hero) send({ kind: 'death_save', creatureId: view.hero.id });
        }}
        onMenuPick={(action) => {
          if (action === 'leave') onLeave();
          /* "What does Frightened mean?" is the question this product exists
             to answer without anybody leaving the table, and 'help' is already
             the menu's word for needing to know something. */
          if (action === 'help') setRulesOpen(true);
        }}
      />
      {/**
       * THE PLAYER GETS THE COMPENDIUM AS AN OVERLAY, because they have nowhere
       * else to put it — the DM's screen has a workbench in the left rail and
       * this one does not. Compendium itself is content with no frame, so the
       * caller decides: a panel on the bench there, a sheet over the map here.
       * Same split the design layer keeps everywhere — chrome is shared,
       * placement belongs to whoever is composing the screen.
       */}
      {rulesOpen && (
        <div className="qa2-over">
          <div className="qa2-scrim" onClick={() => { setRulesOpen(false); }} aria-hidden="true" />
          <div className="qa2-panel qa2-rulesheet" role="dialog" aria-label="Rules">
            <div className="qa2-bench-head">
              <Eyebrow>Rules</Eyebrow>
              <button type="button" className="qa2-ctl" onClick={() => { setRulesOpen(false); }} aria-label="Close">
                <Glyph name="close" size={13} />
              </button>
            </div>
            <Compendium fetchJson={fetchJson} />
          </div>
        </div>
      )}
      {/* A player answers their own reactions — an opportunity attack is theirs
          to take or let pass, and the card queues where they are looking. */}
      <PromptDock
        prompts={prompts}
        onAnswer={(promptId, take, optionName) => {
          /**
           * A check and a reaction are both cards in this dock but they close
           * differently: a reaction is answered by promptId, a check by
           * actually rolling. Telling them apart on the id prefix keeps one
           * dock for both rather than making the player learn two.
           */
          if (promptId.startsWith('ask-')) {
            if (take && view.hero) {
              const skill = (optionName ?? '').replace(/^Roll /, '').toLowerCase().replace(/ /g, '_');
              send({ kind: 'roll_check', creatureId: view.hero.id, skill: skill as never, askId: promptId });
            }
            return;
          }
          send(optionName === undefined
            ? { kind: 'prompt_reply', promptId, take }
            : { kind: 'prompt_reply', promptId, take, optionName });
        }}
      />
      <EffectLayer effect={effect} />
    </>
  );
}
