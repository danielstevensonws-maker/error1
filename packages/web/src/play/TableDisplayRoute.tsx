/**
 * TableDisplayRoute — the shared screen's whole front door.
 *
 * A TELEVISION HAS NO ACCOUNT, and that is the design rather than a shortcut.
 * Making somebody sign a shared screen into a personal account would mean the
 * room's display carries one person's identity — their name in the corner,
 * their whispers in the log, their session expiring mid-fight. So it presents a
 * table_display credential instead: minted by the DM, revocable, tied to the
 * campaign and to nobody.
 *
 * THE TOKEN IS THE URL. That is a deliberate trade: anyone with the link can
 * see the table's public view, which is exactly what a screen in the middle of
 * a room already shows to everyone present. Regenerating revokes every prior
 * one (campaign-service), so a link that leaves the room can be cut off. The
 * credential grants no writes at all — a leaked link is a spectator, never a
 * participant.
 *
 * IT NEVER SEES A SECRET. A table_display viewer's payload is filtered exactly
 * like a player's, server-side, so whispers and DM-only lines never arrive
 * here. This route could not leak one if it tried, which is what makes hanging
 * it on a wall safe.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { Room } from '@questra/contracts';
import { TableDisplay } from './TableDisplay.js';
import { ShellStyles } from '../shell/ShellStyles.js';
import { Road } from '../shell/road/Road.js';
import { useSync, API_BASE } from './useSync.js';
import { projectionToView, type Projection } from './projectionToView.js';
import { roomWithMoves } from './roomWithMoves.js';
import { castWithArrivals } from './castWithArrivals.js';
import type { EffectId } from './ImmersionConsole.js';

export interface TableDisplayRouteProps {
  /** The play session this screen watches, from the link the DM handed over. */
  playSessionId: string;
  /** The table_display credential — the whole of this screen's authority. */
  token: string;
}

export function TableDisplayRoute({ playSessionId, token }: TableDisplayRouteProps): ReactElement {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [effect, setEffect] = useState<EffectId | null>(null);

  const sync = useSync({ playSessionId, token, enabled: true });

  useEffect(() => { sync.onEffect((e) => { setEffect(e); }); }, [sync]);
  useEffect(() => {
    if (!effect) return;
    const t = window.setTimeout(() => { setEffect(null); }, 2000);
    return () => { window.clearTimeout(t); };
  }, [effect]);

  /* The map, fetched with the display credential rather than a session — the
     server filters it for this viewer exactly as it would for a player. */
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/table-display/${playSessionId}/room`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (r) => (r.ok ? (await r.json()) as Room : Promise.reject(new Error('no room'))))
      .then((r) => { if (!cancelled) { setRoom(r); setError(null); } })
      .catch(() => { if (!cancelled) setError('This screen could not open the table.'); });
    return () => { cancelled = true; };
  }, [playSessionId, token]);

  /**
   * The room with the log applied — the same derivation the play screen uses.
   *
   * THE TELEVISION HAD THE FROZEN MAP TOO. It fetches the room once over HTTP
   * and nothing replayed the socket on top of it, so the screen in the middle
   * of the table showed tokens wherever they stood when it was switched on: no
   * movement, and no creature the DM brought in. It is the one screen everybody
   * is looking at, which made it the worst place for that to be true.
   */
  const liveRoom = useMemo(() => roomWithMoves(room, sync.events), [room, sync.events]);

  const view = useMemo(() => {
    const snapshot = (sync.snapshot ?? { combatants: {}, round: 1, nextSeq: 0 }) as Projection;
    const projection = castWithArrivals(snapshot, sync.events);
    return projectionToView({
      projection,
      room: liveRoom,
      /* A display plays nobody — the same as a DM, for a different reason. */
      myCharacter: null,
      role: 'table_display',
      events: sync.events,
      campaignName: '',
    });
  }, [sync.snapshot, sync.events, liveRoom]);

  if (error ?? !liveRoom) {
    return (
      <div className="rd qa-make is-still">
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-label">The shared screen</p>
          <p className="rd-detail">
            {error ?? 'Waiting for the table…'}
          </p>
        </main>
      </div>
    );
  }

  return <TableDisplay view={view} room={liveRoom} campaignName="" effect={effect} />;
}
