/**
 * wizard/CharacterPanel — the right-hand panel that fills in as you choose.
 *
 * THE SIGNATURE OF THIS SCREEN. The spec's centrepiece is a silhouette that
 * updates on every choice; we are not drawing figures, so the payoff is the
 * NUMBERS ARRIVING instead. Every slot is present from the first frame, empty
 * and waiting, and choices land in them. A panel that grew as you filled it
 * would hide how much is left; a panel that shows the whole shape from the
 * start tells a first-time player what a character even consists of.
 *
 * SLOTS ARE NOT PLACEHOLDERS. An empty slot shows what will go there ("HP",
 * "AC") in the dim mono voice, so the panel reads as a sheet waiting to be
 * filled rather than as a broken layout.
 *
 * WHY EVERY NUMBER CAN EXPLAIN ITSELF. The engine returns each value with a
 * `derivation` — HP is "Hit die (max at level 1) 10 + CON 2" — which is the
 * spec's info-layer 2 already computed. Showing it under the number rather than
 * behind a tap is the whole difference between a character sheet that teaches
 * and one that asserts. This is the one screen where the arithmetic is the
 * point: a player is watching their choices become a person.
 */
import type { ReactElement } from 'react';
import type { Ability, ComputedSheet } from '@questra/contracts';
import { ABILITY_LABEL, ABILITY_ORDER, type CharacterDraft } from './useCharacterDraft.js';
import { backgroundById, classById, speciesById } from './rules.js';

export interface CharacterPanelProps {
  draft: CharacterDraft;
  /** Null until every step is answered — the panel shows its empty shape. */
  sheet: ComputedSheet | null;
}

/** A derivation, rendered as the sum it is: "10 base + 2 CON". */
function Derivation({ rows }: { rows: readonly { label: string; value: number }[] }): ReactElement | null {
  if (rows.length === 0) return null;
  return (
    <span className="qa-cp-why">
      {rows.map((r, i) => (
        <span key={r.label}>
          {i > 0 && <span className="qa-cp-plus">{r.value < 0 ? '−' : '+'}</span>}
          {Math.abs(r.value)} {r.label}
        </span>
      ))}
    </span>
  );
}

function Stat({ label, value, rows }: {
  label: string;
  value: string | number | null;
  rows?: readonly { label: string; value: number }[] | undefined;
}): ReactElement {
  return (
    <div className={value === null ? 'qa-cp-stat is-empty' : 'qa-cp-stat'}>
      <span className="qa-cp-stat-label">{label}</span>
      <span className="qa-cp-stat-value">{value ?? '—'}</span>
      {rows && <Derivation rows={rows} />}
    </div>
  );
}

export function CharacterPanel({ draft, sheet }: CharacterPanelProps): ReactElement {
  const klass = classById(draft.classId);
  const species = speciesById(draft.speciesId);
  const background = backgroundById(draft.backgroundId);

  /* The one-line summary reads as a sentence a person would say out loud —
     "Human Fighter" — and degrades to whatever is known so far rather than
     showing gaps. Before anything is chosen it says what the screen is for. */
  const line = [species?.name, klass?.name].filter(Boolean).join(' ');

  return (
    <aside className="rd-panel qa-cp" aria-label="Your character so far">
      <header className="qa-cp-head">
        <p className="rd-label">Your character</p>
        <h2 className="qa-cp-name">{draft.name.trim() || 'Unnamed'}</h2>
        <p className="qa-cp-line">{line || 'Nobody yet — start with a class.'}</p>
      </header>

      <div className="qa-cp-vitals">
        <Stat label="HP" value={sheet?.hp.value.max ?? null} rows={sheet?.hp.derivation} />
        <Stat
          label="AC"
          value={sheet ? (sheet.acOptions[sheet.acDefault]?.value ?? null) : null}
          rows={sheet ? sheet.acOptions[sheet.acDefault]?.derivation : undefined}
        />
        <Stat label="Speed" value={sheet ? `${String(sheet.speedFt.value)} ft` : null} />
        <Stat label="Initiative" value={sheet ? fmt(sheet.initiative.value) : null} />
      </div>

      <div className="qa-cp-abilities">
        {ABILITY_ORDER.map((a: Ability) => {
          const score = sheet?.abilities[a];
          const assigned = draft.assignment[a];
          const bonus = draft.backgroundBonuses[a];
          /* Before the sheet exists the panel still shows the assignment in
             progress — the value the player just placed, plus any background
             bonus — so abilities are not blank until the very last step. */
          const shown = score?.value ?? (assigned !== undefined ? assigned + (bonus ?? 0) : null);
          const mod = score ? Math.floor((score.value - 10) / 2) : null;
          return (
            <div key={a} className={shown === null ? 'qa-cp-ab is-empty' : 'qa-cp-ab'}>
              <span className="qa-cp-ab-name">{ABILITY_LABEL[a].slice(0, 3).toUpperCase()}</span>
              <span className="qa-cp-ab-score">{shown ?? '—'}</span>
              <span className="qa-cp-ab-mod">{mod === null ? '' : fmt(mod)}</span>
            </div>
          );
        })}
      </div>

      {background && (
        <div className="qa-cp-block">
          <p className="rd-label">Trained in</p>
          <p className="qa-cp-list">{background.skills.join(' · ')}</p>
        </div>
      )}

      {sheet && sheet.features.length > 0 && (
        <div className="qa-cp-block">
          <p className="rd-label">What you can do</p>
          <p className="qa-cp-list">{sheet.features.map((f) => f.name).join(' · ')}</p>
        </div>
      )}
    </aside>
  );
}

/** A modifier always carries its sign — +2 and −1 are read differently. */
function fmt(n: number): string {
  return n >= 0 ? `+${String(n)}` : `−${String(Math.abs(n))}`;
}
