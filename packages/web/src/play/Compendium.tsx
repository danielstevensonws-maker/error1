/**
 * Compendium — looking a rule up without leaving the table (GAP-AUDIT B4).
 *
 * THE ONE SENTENCE COMES FIRST, ALWAYS. Every entry has a plain line written
 * for somebody who has never played, and the printed rule underneath it. A
 * player who has just been Frightened needs the first; a table settling an
 * argument needs the second. Showing the verbatim text first would put the
 * hardest reading in front of the person least equipped for it, which is the
 * exact failure this product exists to avoid.
 *
 * IT OPENS OVER THE TABLE, NOT INSTEAD OF IT. Looking something up must never
 * cost you the game — the map, the log and whose turn it is stay where they
 * were. That is the difference between a reference somebody uses mid-fight and
 * one they promise themselves they will read later.
 *
 * SEARCH MATCHES THE PLAIN LINE TOO, which is how a person who does not know
 * the vocabulary actually searches: "can't see" should find Blinded. Matching
 * only names would require already knowing the word you are looking for.
 */
import { useEffect, useState, type ReactElement } from 'react';

interface CompendiumRow {
  id: string;
  name: string;
  entityType: string;
  plain: string;
}

interface CompendiumEntry extends CompendiumRow {
  srd_text: string;
  meta?: Record<string, unknown>;
}

export interface CompendiumProps {
  /** Reads the API; injected so the sheet can be told about a server. */
  fetchJson: <T>(path: string) => Promise<T>;
}

/** The kinds, named as a player would ask for them. */
function typeLabel(t: string): string {
  switch (t) {
    case 'condition': return 'Conditions';
    case 'spell': return 'Spells';
    case 'monster': return 'Creatures';
    case 'class': return 'Classes';
    case 'species': return 'Species';
    case 'background': return 'Backgrounds';
    case 'item': return 'Gear';
    case 'feat': return 'Feats';
    default: return t;
  }
}

export function Compendium({ fetchJson }: CompendiumProps): ReactElement {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [rows, setRows] = useState<CompendiumRow[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [open, setOpen] = useState<CompendiumEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Refetched as the query changes rather than filtered locally: the dataset
     grows past what is worth shipping to every client, and the server already
     knows how to search it. */
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (type) params.set('type', type);

    fetchJson<{ entries: CompendiumRow[]; types: string[] }>(`/compendium?${params.toString()}`)
      .then((r) => {
        if (cancelled) return;
        /* Defaulted rather than trusted. A payload without entries used to set
           rows to undefined and the next render called .map on it, which took
           the WHOLE DM screen down — mid-session, over a rules lookup. A
           surface that opens over a live game has to survive a bad response
           from the thing it is reading. */
        setRows(Array.isArray(r?.entries) ? r.entries : []);
        setTypes(Array.isArray(r?.types) ? r.types : []);
        setError(null);
      })
      .catch(() => { if (!cancelled) setError('Could not reach the rules just now.'); });

    return () => { cancelled = true; };
  }, [query, type, fetchJson]);

  const openEntry = (id: string): void => {
    fetchJson<CompendiumEntry>(`/compendium/${id}`)
      .then((e) => { setOpen(e); })
      .catch(() => { setError('Could not open that entry.'); });
  };

  return (
    <div className="qa-comp">
        <input
          className="qa2-input qa-comp-search"
          value={query}
          placeholder="Search — a name, or what it does"
          aria-label="Search the rules"
          onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
        />

        <div className="qa-comp-types">
          <button
            type="button"
            className={'qa2-pill' + (type === null ? ' is-on' : '')}
            onClick={() => { setType(null); setOpen(null); }}
          >
            Everything
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              className={'qa2-pill' + (type === t ? ' is-on' : '')}
              onClick={() => { setType(t); setOpen(null); }}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>

        {error && <p className="qa2-empty">{error}</p>}

        {/**
         * The opened entry replaces the list rather than sitting beside it: at
         * this width two columns would give each of them too little room to be
         * read, and reading is the entire job.
         */}
        {open ? (
          <article className="qa-comp-entry">
            <button type="button" className="qa2-quiet-link qa-comp-back" onClick={() => { setOpen(null); }}>
              Back to the list
            </button>
            <h2 className="qa-comp-name">{open.name}</h2>
            {/* The sentence written for somebody who has never played. */}
            <p className="qa-comp-plain">{open.plain}</p>
            {/* The printed rule, word for word — what settles an argument. */}
            <p className="qa-comp-srd">{open.srd_text}</p>
          </article>
        ) : (
          <ul className="qa-comp-list">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" className="qa-comp-row" onClick={() => { openEntry(r.id); }}>
                  <span className="qa-comp-row-name">{r.name}</span>
                  <span className="qa-comp-row-plain">{r.plain}</span>
                </button>
              </li>
            ))}
            {rows.length === 0 && !error && (
              <li><p className="qa2-empty">Nothing matches that. Try a shorter word.</p></li>
            )}
          </ul>
        )}
      </div>
  );
}
