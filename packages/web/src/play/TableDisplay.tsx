/**
 * TableDisplay — the screen in the middle of the table (Brief 14 §2, M3).
 *
 * THIS IS A THIRD ROLE, NOT A THIRD SCREEN'S WORTH OF FEATURES. A television
 * propped at the end of the table has no hands: nobody taps it, nobody types on
 * it, and it belongs to the room rather than to a person. So it renders the
 * shared truth — the map, whose turn it is, what was just said — and offers no
 * controls at all. Every affordance it could grow would be one somebody has to
 * walk around the table to use.
 *
 * WHAT IT MUST NEVER SHOW is the reason this is a real role with its own
 * credential rather than "the DM's screen, zoomed out": everyone can see it,
 * including the players. A whisper meant for one person and a DM's private
 * notes would be broadcast to the room. That is settled server-side — a
 * table_display viewer's payload is filtered exactly like a player's — but the
 * consequence for this component is that it has no secrets to leak by mistake,
 * which is what makes it safe to hang on a wall.
 *
 * IT IS READ AT DISTANCE. Everything is scaled up and thinned out: five log
 * lines rather than fifty, names rather than numbers, no hover states because
 * there is no pointer. The failure mode of a shared screen is being unreadable
 * from four feet away, and that is the only thing its layout optimises for.
 */
import type { ReactElement } from 'react';
import type { Room } from '@questra/contracts';
import { MapCanvas, type TokenPresentation } from '../primitives/MapCanvas.js';
import { ScreenStyles } from '../primitives/v2/ScreenStyles.js';
import { EffectLayer } from './EffectLayer.js';
import type { EffectId } from './ImmersionConsole.js';
import type { PlayView } from './projectionToView.js';

export interface TableDisplayProps {
  view: PlayView;
  room: Room;
  campaignName: string;
  effect: EffectId | null;
}

/** How much of the log a shared screen carries. Enough for context, not a wall. */
const LINES = 5;

export function TableDisplay({ view, room, campaignName, effect }: TableDisplayProps): ReactElement {
  const exploring = view.turn.exploring;
  const recent = view.entries.slice(-LINES);

  /**
   * WHO EACH DISC IS. The room stores a creature reference and nothing else, so
   * a map drawn without this labels every token from the raw id — which is how
   * a screen in the middle of the table came to show a pair of goblins as
   * "FO FO" (found by running the app once monsters could reach this screen at
   * all, 2026-08-25). The cast already carries the names and the hurt words a
   * player is owed; this is the same join the play screens make.
   *
   * It says no more than the cast does. An enemy's exact hit points are not in
   * here because they are not in the cast either — `filterStream` and
   * `castFrom` settle that upstream, and a television is the last place to
   * start making exceptions.
   */
  const present: Record<string, TokenPresentation> = {};
  for (const c of view.cast) {
    present[c.id] = {
      name: c.name,
      side: c.kind === 'foe' ? 'foe' : 'ally',
      acting: c.acting,
      ...(c.status ? { tag: c.status } : c.hurt ? { tag: c.hurt } : {}),
    };
  }

  return (
    <div className="qa2-screen qa-td">
      <ScreenStyles />
      <MapCanvas room={room} mode="play" fit="fill" present={present} />

      {/* The one thing everybody looks up to check: whose turn is it. */}
      <div className="qa2-panel qa-td-scene">
        <span className="qa-td-name">{campaignName}</span>
        {exploring ? (
          <span className="qa-td-state">Not in a fight</span>
        ) : (
          <span className="qa-td-state">
            Round {String(view.scene.round)}
            {view.turn.activeName ? ` · ${view.turn.activeName}` : ''}
          </span>
        )}
      </div>

      {/* The turn order, at a size somebody reads across a table. No hit points
          for enemies — this screen is looked at by the players. */}
      <aside className="qa2-panel qa-td-order">
        <ul className="qa-td-list">
          {view.cast.map((c) => (
            <li key={c.id} className={'qa-td-row' + (c.acting ? ' is-acting' : '')}>
              <span className="qa-td-who">{c.name}</span>
              <span className="qa-td-state-word">
                {c.status ?? (c.hp ? `${String(c.hp.current)}/${String(c.hp.max)}` : (c.hurt ?? ''))}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* The last few lines, so somebody glancing up catches what they missed. */}
      <section className="qa2-panel qa-td-log">
        {recent.length === 0 ? (
          <p className="qa-td-line">The table is quiet.</p>
        ) : (
          recent.map((e) => (
            <p key={e.id} className="qa-td-line">
              <span className="qa-td-line-who">{e.actor}</span>
              {e.text}
            </p>
          ))
        )}
      </section>

      <EffectLayer effect={effect} />
    </div>
  );
}
