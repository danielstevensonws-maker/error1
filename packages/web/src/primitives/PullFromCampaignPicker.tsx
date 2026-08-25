/**
 * PullFromCampaignPicker — the reference picker (Build Playbook §3;
 * component-list A5; Session Planner design spec).
 *
 * "Reference, don't duplicate." Anywhere the DM points at something that
 * already exists in the campaign (cast, locations, rewards, recurring maps)
 * instead of authoring it fresh — the picked item stays one source of truth,
 * so editing the NPC once updates every scene that references it.
 *
 * Content-agnostic via `PickableItem` — the same seam entityToInfoPanel.ts is
 * for InfoPanel. The caller adapts its campaign entities into this thin
 * shape; the picker itself has no knowledge of cast vs. locations vs.
 * rewards, so a new pullable category needs no component change.
 *
 * Owns no data: `selectedIds` in, `onChange(nextSelectedIds)` out. Search is
 * the picker's own local UI state (not reported to the caller).
 *
 * TWO EMPTIES, NEVER ONE MESSAGE. "Nothing in the campaign yet" and "nothing
 * matched what you typed" are different facts about different problems, and a
 * DM told the wrong one goes looking for a bug in the wrong place.
 */
import { useId, useMemo, useState, type KeyboardEvent, type ReactElement } from 'react';
import { DesignStyles, Glyph, itemName, prose, statMeta } from '../design/index.js';

export interface PickableItem {
  id: string;
  name: string;
  /** Plain-language category, e.g. "Cast", "Location", "Reward". */
  kind: string;
  /** One-line hint: a role, a district, a rarity. */
  hint?: string;
}

export type PickerMode = 'single' | 'multi';

export interface PullFromCampaignPickerProps {
  items: PickableItem[];
  selectedIds: string[];
  onChange: (nextSelectedIds: string[]) => void;
  /** "multi" (default) toggles freely; "single" collapses to at most one id, re-picking clears it. */
  mode?: PickerMode;
  /** Shown when there is nothing at all to pick from (a fresh campaign) — never confused with "no search matches". */
  emptyLabel?: string;
}

function matches(item: PickableItem, query: string): boolean {
  return (
    item.name.toLowerCase().includes(query) ||
    item.kind.toLowerCase().includes(query) ||
    (item.hint?.toLowerCase().includes(query) ?? false)
  );
}

export function PullFromCampaignPicker({
  items,
  selectedIds,
  onChange,
  mode = 'multi',
  emptyLabel = 'Nothing in the campaign to pull from yet.',
}: PullFromCampaignPickerProps): ReactElement {
  const searchId = useId();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? items : items.filter((item) => matches(item, q));
  }, [items, query]);

  const noItemsAtAll = items.length === 0;
  const noMatches = !noItemsAtAll && filtered.length === 0;

  function toggle(id: string): void {
    if (mode === 'single') {
      onChange(selectedIds.includes(id) ? [] : [id]);
      return;
    }
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLLIElement>, id: string): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  }

  return (
    <div className="qa2-picker">
      <DesignStyles />
      <div className="qa2-picker-search">
        <label htmlFor={searchId} className="qa2-sr">Search</label>
        <Glyph name="search" size={13} />
        <input
          id={searchId}
          className="qa2-field-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={prose}
        />
      </div>

      {noItemsAtAll && <Empty text={emptyLabel} />}
      {noMatches && <Empty text="No matches." />}

      {!noItemsAtAll && !noMatches && (
        <ul className="qa2-picker-list" role="listbox" aria-multiselectable={mode === 'multi'}>
          {filtered.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={selected ? 'qa2-row is-picked' : 'qa2-row'}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => onRowKeyDown(e, item.id)}
              >
                {/* Reserved whether or not it is ticked, so picking an item
                    does not shove its name sideways under the cursor. */}
                <span className="qa2-row-tick" aria-hidden="true">
                  {selected && <Glyph name="check" size={12} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...itemName, display: 'block' }}>{item.name}</span>
                  {item.hint !== undefined && (
                    <span style={{ ...prose, color: 'var(--qa-ink-faint)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.hint}
                    </span>
                  )}
                </span>
                <span style={{ ...statMeta, flex: 'none' }}>{item.kind}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }): ReactElement {
  return <p className="qa2-picker-empty" style={prose}>{text}</p>;
}
