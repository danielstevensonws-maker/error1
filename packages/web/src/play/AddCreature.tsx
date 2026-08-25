/**
 * Putting something on the board for the party to fight.
 *
 * WITHOUT THIS THE MAP IS EMPTY and every attack row is dead — a fight is the
 * party rolling initiative against nobody (owner, 2026-08-25: "there's no
 * enemies on the board, so I'm not sure what this enemy thing is"). The whole
 * combat layer had nothing to point at.
 *
 * IT SEARCHES THE REAL COMPENDIUM. The SRD monsters are already loaded and
 * already searchable — the same route the rules browser uses — so a DM types
 * "gob" and gets the actual goblin with its actual hit points, rather than
 * typing numbers in by hand.
 *
 * BUT HAND-ENTRY STAYS, because a DM inventing something at the table is
 * normal and a compendium that refuses to hold their idea sends them back to
 * paper. The fields are the three a creature genuinely needs: what it is
 * called, how much it can take, and how hard it is to hit.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Eyebrow, Glyph } from '../design/index.js';

interface MonsterRow {
  id: string;
  name: string;
  plain: string;
}

/**
 * A monster's hit points, out of a payload this client does not own.
 *
 * WHY THIS FUNCTION EXISTS. The compendium returns `meta.hp` as
 * `{ average, dice }` — 10 and "3d6" for a goblin — and this file used to
 * declare it as `number` and pass it straight through. TypeScript could not
 * catch it, because the declaration was an ASSERTION about an unvalidated
 * response rather than a fact. The intent went out with an object where the
 * schema wants an integer, the server answered `bad_message`, and nothing on
 * the DM's screen said so — so "Bring something in" appeared to do nothing at
 * all, for the single most important set-up move a DM makes.
 *
 * Both shapes are accepted because the dataset is external and mid-revision;
 * anything unreadable falls back rather than refusing, since a monster with a
 * guessed 10 hit points that a DM can correct beats a monster they cannot place.
 */
function hpOf(hp: unknown): number {
  if (typeof hp === 'number' && Number.isFinite(hp) && hp > 0) return Math.round(hp);
  if (hp !== null && typeof hp === 'object' && 'average' in hp) {
    const avg = (hp as { average?: unknown }).average;
    if (typeof avg === 'number' && Number.isFinite(avg) && avg > 0) return Math.round(avg);
  }
  return 10;
}

/** Armour class, same reasoning — a plain number today, defended anyway. */
function acOf(ac: unknown): number {
  return typeof ac === 'number' && Number.isFinite(ac) && ac > 0 ? Math.round(ac) : 12;
}

export interface AddCreatureProps {
  fetchJson: <T>(path: string) => Promise<T>;
  onAdd: (creature: { name: string; maxHp: number; ac: number; monsterId?: string }) => void;
}

export function AddCreature({ fetchJson, onAdd }: AddCreatureProps): ReactElement {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<MonsterRow[]>([]);
  const [byHand, setByHand] = useState(false);
  const [name, setName] = useState('');
  const [hp, setHp] = useState('');
  const [ac, setAc] = useState('');

  useEffect(() => {
    if (byHand) return;
    let cancelled = false;
    const params = new URLSearchParams({ type: 'monster' });
    if (query.trim()) params.set('q', query.trim());
    fetchJson<{ entries: MonsterRow[] }>(`/compendium?${params.toString()}`)
      .then((r) => { if (!cancelled) setRows(r.entries); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [byHand, query, fetchJson]);

  const addFromCompendium = (row: MonsterRow): void => {
    /* The list carries what a DM needs to choose; the full entry carries the
       numbers. Fetching it on pick rather than for every row keeps the search
       cheap. */
    fetchJson<{ id: string; name: string; meta?: Record<string, unknown> }>(`/compendium/${row.id}`)
      .then((entry) => {
        onAdd({
          name: entry.name,
          maxHp: hpOf(entry.meta?.['hp']),
          ac: acOf(entry.meta?.['ac']),
          monsterId: entry.id,
        });
        setQuery('');
      })
      .catch(() => { /* the list stays open; nothing was placed */ });
  };

  const addByHand = (): void => {
    const n = name.trim();
    const h = Number(hp);
    const a = Number(ac);
    if (!n || !Number.isFinite(h) || h <= 0 || !Number.isFinite(a) || a <= 0) return;
    onAdd({ name: n, maxHp: h, ac: a });
    setByHand(false);
    setName(''); setHp(''); setAc('');
  };

  return (
    <div className="qa2-ask qa-add">
      {byHand ? (
        <form
          className="qa-add-hand"
          onSubmit={(e) => { e.preventDefault(); addByHand(); }}
        >
          <span className="qa2-open">
            <input className="qa2-input" placeholder="What is it called?" aria-label="Name"
              value={name} onChange={(e) => { setName(e.target.value); }} />
          </span>
          <div className="qa-add-numbers">
            <span className="qa2-open">
              <input className="qa2-input" placeholder="Hit points" aria-label="Hit points"
                inputMode="numeric" value={hp} onChange={(e) => { setHp(e.target.value); }} />
            </span>
            <span className="qa2-open">
              <input className="qa2-input" placeholder="Armour class" aria-label="Armour class"
                inputMode="numeric" value={ac} onChange={(e) => { setAc(e.target.value); }} />
            </span>
          </div>
          <div className="qa-add-actions">
            <button type="submit" className="qa2-cta">Put it on the board</button>
            <button type="button" className="qa2-quiet-link" onClick={() => { setByHand(false); }}>
              Search instead
            </button>
          </div>
        </form>
      ) : (
        <>
          <span className="qa2-open">
            <Glyph name="search" size={14} />
            <input
              className="qa2-input"
              placeholder="Search — goblin, wolf, bandit"
              aria-label="Search creatures"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
            />
          </span>
          <ul className="qa-add-list">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" className="qa-comp-row" onClick={() => { addFromCompendium(r); }}>
                  <span className="qa-comp-row-name">{r.name}</span>
                  <span className="qa-comp-row-plain">{r.plain}</span>
                </button>
              </li>
            ))}
            {rows.length === 0 && (
              <li><p className="qa2-empty">Nothing matches that yet.</p></li>
            )}
          </ul>
          {/* A DM inventing something at the table is normal, and a compendium
              that refuses to hold their idea sends them back to paper. */}
          <button type="button" className="qa2-quiet-link" onClick={() => { setByHand(true); }}>
            Make one up instead
          </button>
        </>
      )}
    </div>
  );
}
