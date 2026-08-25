/**
 * v2/ActionRows — two rows: Bonus and Reaction sharing the top, Action alone
 * on the bottom, plus the one line that is not an economy at all.
 *
 * ACTION ALONE, NEAREST YOU (owner direction, 2026-08-18). v1's `ActionBar`
 * already split it this way for the reason stated in its own header: Action
 * is "usually the busiest economy" and Bonus+Reaction's real tile counts are
 * small enough to share a line without crowding. v2 keeps that split and
 * flips which end Action sits on — it is the row you touch on almost every
 * turn, so it belongs on the edge nearest you, with the rows you consult less
 * often stacked above it.
 *
 * ICON TILES (2026-08-16). Square icons, not named tiles — a named tile costs
 * roughly three times the width, and the map is supposed to be what you are
 * looking at. The meaning moves to the detail strip below instead.
 *
 * WHAT CARRIES THE MEANING is the detail strip, fixed height, already here
 * from v1. It names whatever the mouse or keyboard is on — "Longsword — +5 to
 * hit, 1d8 + 3 slashing on a hit." — and with nothing focused it falls back
 * to the first legal tile, so it is never blank. An icon is a shortcut for a
 * player who already knows the row, never the only way to find out what
 * something is (law 5). Every tile carries the same sentence as its
 * accessible name and its tooltip — three routes to the information, none of
 * them colour or shape alone (§8).
 *
 * THE SPENT PIP. Each economy's label carries a small dot: filled while that
 * economy is still available this turn, hollow once it is used. The server's
 * state, not a local count — the row reports, it does not decide.
 *
 * THE SOCKETS AND THE OVERFLOW TILE are one ceiling, `MAX_SLOTS`, run in
 * opposite directions — not two separate numbers. Sockets and real tiles are
 * the identical 46px square, so "how many empty ones fit" and "how many real
 * ones fit before the row needs help" are the same physical question; an
 * earlier pass answered it with two different constants and produced rows
 * that could show a growth socket and an overflow tile at once, which is
 * nonsense (see `MAX_SLOTS`'s own comment in viewModel.ts for the full story).
 * Under the cap, dashed squares pad the row out — real progression slots,
 * where a future ability will sit, and why a level-1 character's bar reads as
 * room to grow rather than as a product with most of the lights off. Over the
 * cap, the row adds one "+N" tile instead of a wall of shrinking icons —
 * never a locked door, since it opens the folio's Abilities & Spells tab
 * (law 2: the app never says no, it sometimes says "the rest are over here").
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { Eyebrow, Glyph, prose, statValue } from '../../design/index.js';
import { MAX_SLOTS, type Economy, type ExplainVM, type TileVM } from './viewModel.js';

const ECONOMY_LABEL: Record<Economy, string> = { action: 'Action', bonus: 'Bonus', reaction: 'Reaction' };

export interface ActionRowsProps {
  tiles: TileVM[];
  onUse: (tileId: string) => void;
  onExplain?: (e: ExplainVM) => void;
  /** tap an empty socket — the host opens "pick something for this slot". */
  onEquip?: (economy: Economy) => void;
  /** tap the overflow tile — the host opens the folio to Abilities & Spells. */
  onShowMore?: () => void;
  spent?: Partial<Record<Economy, boolean>>;
}

export function ActionRows({ tiles, onUse, onExplain, onEquip, onShowMore, spent = {} }: ActionRowsProps): ReactElement {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const focused = tiles.find((t) => t.id === focusedId);
  const fallback = tiles.find((t) => t.greyReason === null) ?? tiles[0];
  const shown = focused ?? fallback;
  const refused = shown !== undefined && shown.greyReason !== null;

  const renderEconomy = (economy: Economy): ReactNode => {
    const mine = tiles.filter((t) => t.economy === economy);
    const cap = MAX_SLOTS[economy];
    const overflow = Math.max(0, mine.length - cap);
    const visible = overflow > 0 ? mine.slice(0, cap) : mine;
    // ONE ceiling run both directions — this is what keeps sockets and the
    // overflow tile mutually exclusive by construction: when mine.length
    // exceeds cap, this goes negative and clamps to 0, so a row can never
    // show a "there's room to grow" socket in the same breath its "you have
    // more than fits" tile fires.
    const sockets = Math.max(0, cap - mine.length);
    const overflowKey = `overflow:${economy}`;

    return (
      <div key={economy} className="qa2-econ">
        <span className="qa2-econ-label">
          <span
            className={spent[economy] === true ? 'qa2-pip is-spent' : 'qa2-pip'}
            role="img"
            aria-label={spent[economy] === true ? `${ECONOMY_LABEL[economy]} used this turn` : `${ECONOMY_LABEL[economy]} still available`}
          />
          <Eyebrow>{ECONOMY_LABEL[economy]}</Eyebrow>
        </span>

        <span className="qa2-slots">
          {visible.map((tile) => (
            <Tile
              key={tile.id}
              tile={tile}
              onUse={onUse}
              onFocusTile={setFocusedId}
              {...(onExplain !== undefined ? { onExplain } : {})}
            />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              className="qa2-tile is-overflow"
              onClick={onShowMore}
              onMouseEnter={() => setFocusedId(overflowKey)}
              onMouseLeave={() => setFocusedId(null)}
              onFocus={() => setFocusedId(overflowKey)}
              onBlur={() => setFocusedId(null)}
              aria-label={`${overflow} more ${ECONOMY_LABEL[economy].toLowerCase()} ${overflow === 1 ? 'ability' : 'abilities'} — open your character sheet to see them`}
              title={`${overflow} more — open your character sheet`}
            >
              {/* statValue's own inline color would win over the CSS accent
                  tint on .is-overflow, so it is overridden here rather than
                  left to fight the stylesheet. */}
              <span style={{ ...statValue, color: 'var(--qa-accent)' }}>+{overflow}</span>
            </button>
          )}
          {Array.from({ length: sockets }, (_, i) => (
            <button
              key={`socket-${economy}-${i}`}
              type="button"
              className="qa2-socket"
              onClick={onEquip ? () => onEquip(economy) : undefined}
              onMouseEnter={() => setFocusedId(`socket:${economy}`)}
              onMouseLeave={() => setFocusedId(null)}
              onFocus={() => setFocusedId(`socket:${economy}`)}
              onBlur={() => setFocusedId(null)}
              aria-label={`Empty ${ECONOMY_LABEL[economy].toLowerCase()} slot — something of yours will go here as you level up`}
            >
              <Glyph name="plus" size={15} />
            </button>
          ))}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="qa2-econ-stack">
        {/* The two rows you consult, not the one you operate every turn. */}
        <div className="qa2-econ-row is-secondary">
          {renderEconomy('bonus')}
          {renderEconomy('reaction')}
        </div>
        {/* Nearest you, because it is the row your hand returns to. */}
        <div className="qa2-econ-row is-primary">
          {renderEconomy('action')}
        </div>
      </div>

      {/* The icon tiles' other half. Fixed height, never empty, and the only
          place a refusal is allowed to appear. */}
      <p className="qa2-detail" aria-live="polite" style={{ margin: 0 }}>
        {focusedId !== null && focusedId.startsWith('socket:') ? (
          <span style={prose}>An empty slot. Something of yours will go here as you level up.</span>
        ) : focusedId !== null && focusedId.startsWith('overflow:') ? (
          <span style={prose}>More than fit on the bar. Open your character sheet to use the rest.</span>
        ) : shown === undefined ? (
          <span style={prose}>Nothing to do just yet.</span>
        ) : refused ? (
          <span style={{ ...prose, color: 'var(--qa-danger)' }}>{shown.greyReason}</span>
        ) : (
          <span style={prose}>{shown.detail}</span>
        )}
      </p>
    </>
  );
}

function Tile({
  tile,
  onUse,
  onExplain,
  onFocusTile,
}: {
  tile: TileVM;
  onUse: (id: string) => void;
  onExplain?: (e: ExplainVM) => void;
  onFocusTile: (id: string | null) => void;
}): ReactElement {
  const greyed = tile.greyReason !== null;
  // Only the uses-left count survives onto a tile face: "have I still got one
  // of these" has to be answerable without hovering, where "what is its damage
  // die" does not.
  const badge = tile.resource?.split(' ')[0];

  return (
    <button
      type="button"
      className="qa2-tile"
      aria-disabled={greyed}
      aria-label={greyed ? `${tile.name} — ${tile.greyReason}` : `${tile.name}. ${tile.detail}`}
      title={greyed ? (tile.greyReason ?? undefined) : tile.detail}
      onClick={() => {
        if (greyed) return;
        onUse(tile.id);
      }}
      onContextMenu={
        onExplain !== undefined
          ? (ev) => {
              ev.preventDefault();
              onExplain(tile.explain);
            }
          : undefined
      }
      onMouseEnter={() => onFocusTile(tile.id)}
      onMouseLeave={() => onFocusTile(null)}
      onFocus={() => onFocusTile(tile.id)}
      onBlur={() => onFocusTile(null)}
    >
      <Glyph name={tile.glyph} size={22} />
      {badge !== undefined && <span className="qa2-tile-badge" aria-hidden="true">{badge}</span>}
    </button>
  );
}
