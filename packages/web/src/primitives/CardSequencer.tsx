/**
 * CardSequencer — the reorderable card list (Build Playbook §3; component-list
 * A6; Session Planner + Campaign Wrapper design specs).
 *
 * Owns ORDER AND NOTHING ELSE. The caller decides what a card looks like
 * (`SequenceItem.render`); the sequencer frames it, numbers it, and reports
 * the new order via `onReorder`. One primitive serves both "scenes within a
 * session" and "sessions within a campaign" — the only difference is the
 * caller's card component and `itemNoun`.
 *
 * KEYBOARD-FIRST, DRAG SECOND (accessibility is not an enhancement). Every
 * row has explicit Move up / Move down buttons — the primary mechanism, and
 * the only one required to work. Native HTML5 drag is layered on top for
 * mouse users; it is never the only way to reorder.
 *
 * THE NUMBER IS INFORMATION. This is one of the few lists in the product that
 * earns its numbering: "which scene is this" is a real question a DM asks, and
 * the answer changes when the order does. Numbers as decoration are exactly
 * what the design language rules out elsewhere.
 *
 * Plain language (CLAUDE.md non-negotiable #7): the noun comes from the
 * caller and threads through every generated string ("Move scene up",
 * "Moved scene to position 3 of 4") — there is no hardcoded "beat"/"node"
 * jargon to leak.
 */
import { useState, type DragEvent, type ReactElement, type ReactNode } from 'react';
import { DesignStyles, Glyph, statMeta, type GlyphName } from '../design/index.js';

export interface SequenceItem {
  id: string;
  render: ReactNode;
}

export interface CardSequencerProps {
  items: SequenceItem[];
  /** Fires with the FULL reordered id list on every move — the caller owns the array. */
  onReorder: (nextOrderedIds: string[]) => void;
  /** Plural, e.g. "scenes" / "sessions" — singularised internally for labels and announcements. */
  itemNoun: string;
  /** Omit for a fixed-membership list — the remove column only renders when this is supplied. */
  onRemove?: (id: string) => void;
}

function singular(noun: string): string {
  return noun.replace(/s$/, '');
}

/** The one reorder path both buttons and drag call. Bounds-guarded; returns null for a no-op move. */
function moveTo<T>(items: T[], from: number, to: number): T[] | null {
  if (to < 0 || to >= items.length || from === to) return null;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

export function CardSequencer({ items, onReorder, itemNoun, onRemove }: CardSequencerProps): ReactElement {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const noun = singular(itemNoun);
  const handleRemove = onRemove;

  function move(from: number, to: number): void {
    const next = moveTo(items, from, to);
    if (next === null) return;
    onReorder(next.map((item) => item.id));
    setAnnouncement(`Moved ${noun} to position ${to + 1} of ${items.length}.`);
  }

  function onDrop(targetId: string): void {
    if (draggedId === null) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from !== -1 && to !== -1) move(from, to);
    setDraggedId(null);
    setOverId(null);
  }

  return (
    <div>
      <DesignStyles />
      {/* Reordering by keyboard is silent otherwise — you press a button and
          the screen reader says nothing about where the card went. */}
      <span aria-live="polite" className="qa2-sr">{announcement}</span>

      <ol className="qa2-seq">
        {items.map((item, i) => (
          <li
            key={item.id}
            className={[
              'qa2-card',
              draggedId === item.id ? 'is-dragging' : '',
              overId === item.id && draggedId !== item.id ? 'is-over' : '',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(e: DragEvent<HTMLLIElement>) => {
              e.preventDefault();
              setOverId(item.id);
            }}
            onDragLeave={() => setOverId((id) => (id === item.id ? null : id))}
            onDrop={() => onDrop(item.id)}
            onDragEnd={() => {
              setDraggedId(null);
              setOverId(null);
            }}
          >
            <span className="qa2-card-grip" aria-hidden="true">
              <Glyph name="grip" size={14} />
            </span>
            <span className="qa2-card-no" style={statMeta}>{i + 1}</span>

            <span style={{ flex: 1, minWidth: 0 }}>{item.render}</span>

            <span style={{ flex: 'none', display: 'flex', gap: 'var(--qa-s1)' }}>
              <Mini glyph="chevronUp" label={`Move ${noun} up`} disabled={i === 0} onClick={() => move(i, i - 1)} />
              <Mini glyph="chevronDown" label={`Move ${noun} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)} />
              {handleRemove !== undefined && (
                <Mini glyph="close" label={`Remove ${noun}`} danger onClick={() => handleRemove(item.id)} />
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Mini({
  glyph,
  label,
  disabled = false,
  danger = false,
  onClick,
}: {
  glyph: GlyphName;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={danger ? 'qa2-mini is-danger' : 'qa2-mini'}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Glyph name={glyph} size={12} />
    </button>
  );
}
