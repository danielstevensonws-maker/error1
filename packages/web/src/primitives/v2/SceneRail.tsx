/**
 * v2/SceneRail — the scene's nameplate, and the controls, as two separate
 * things floating at the top of the map.
 *
 * These used to be one bar spanning the whole width, which is a frame edge by
 * another name. They are now a centred nameplate and a cluster of buttons in
 * the corner, with the map running underneath and between them.
 *
 * The scene's name is the only piece of pure fiction in the chrome, so it takes
 * the display serif and the centre. The round and the clock sit under it in
 * mono, because they are measurement.
 *
 * Whose turn it is appears here as a quiet phrase, not as a second badge. The
 * loud version lives on the panel you act from; saying it twice at equal weight
 * would leave a player checking two places for one fact.
 */
import type { ReactElement } from 'react';
import { Ctl, sceneName, statMeta } from '../../design/index.js';

export interface SceneRailProps {
  title: string;
  subtitle: string;
  round: number;
  elapsed: string;
  /** whose turn it is right now. `isYou` swaps the phrase and the colour. */
  turn: { name: string; isYou: boolean; exploring?: boolean };
  journalOpen: boolean;
  muted: boolean;
  onToggleJournal: () => void;
  onToggleMute: () => void;
  onOpenMenu: () => void;
  onOpenSettings?: () => void;
}

export function SceneRail({
  title,
  subtitle,
  round,
  elapsed,
  turn,
  journalOpen,
  muted,
  onToggleJournal,
  onToggleMute,
  onOpenMenu,
  onOpenSettings,
}: SceneRailProps): ReactElement {
  return (
    <>
      <header className="qa2-panel qa2-scene">
        <h1 style={{ ...sceneName, margin: 0 }}>{title}</h1>
        <p style={{ ...statMeta, margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', fontSize: 'var(--qa-text-whisper)', letterSpacing: 'var(--qa-tracking-caps)', textTransform: 'uppercase' }}>
          <span>{subtitle}</span>
          {/* Out of combat there is no round, so the readout leaves rather than
              showing a zero. A number that means "not applicable" is a number a
              player has to decode. */}
          {round > 0 && <span style={{ color: 'var(--qa-ink)' }}>Round {round}</span>}
          <span>{elapsed}</span>
          <span style={{ color: turn.isYou && turn.exploring !== true ? 'var(--qa-accent)' : 'var(--qa-ink-dim)' }}>
            {turn.exploring === true ? 'exploring' : turn.isYou ? 'your turn' : `${turn.name} is up`}
          </span>
        </p>
      </header>

      <div className="qa2-controls">
        <Ctl glyph="quill" label={journalOpen ? 'Hide the journal' : 'Show the journal'} on={journalOpen} onClick={onToggleJournal} />
        <Ctl glyph="sound" label={muted ? 'Turn sound on' : 'Turn sound off'} on={!muted} onClick={onToggleMute} />
        {onOpenSettings !== undefined && <Ctl glyph="gear" label="Settings" onClick={onOpenSettings} />}
        <Ctl glyph="menu" label="Table menu" onClick={onOpenMenu} />
      </div>
    </>
  );
}
