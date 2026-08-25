/**
 * PlayerViewV2 — "The Near Edge". The whole player screen, second concept.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE THESIS
 *
 * v1 arranges a character sheet on a screen. v2 arranges the TABLE you are
 * sitting at. Your side is the near edge along the bottom, the cast sits down
 * the left in the order they act, the journal is at your right hand, and the
 * scene is across from you. Every panel earns its position from where that
 * thing actually is when five friends play this game in one room.
 *
 * THE MAP IS THE HERO (owner direction, 2026-08-16). An earlier pass ran these
 * surfaces flush to the window, which made the HUD a frame — a continuous C
 * down the left, along the bottom and up the right — and made the map what was
 * left over. Chrome is the wrong thing to look at for three hours.
 *
 * So the map is full bleed and every surface is a DISCRETE PANEL floating over
 * it, held off the window by `--qa-hud-inset` and off each other by the spacing
 * scale. The map runs underneath and shows between them. What keeps separate
 * panels from disagreeing is the shared chrome contract in ScreenStyles —
 * `.qa2-panel`, one radius, one padding, one rhythm, one fill — which is the
 * lesson the v1 hub paid for: it was never the merging that held those cards
 * together, it was the contract.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE SIGNATURE — see RoundSpine.tsx
 *
 * The left edge is the round drawn as a timeline. Spent turns dim, the accent
 * fills the line behind them, and when it reaches your notch the same accent
 * continues along the top edge of the near edge. One accent, one journey per
 * round, arriving at the surface you act from. It answers the question a player
 * actually has while somebody else is talking — WHEN AM I UP — which is law 4
 * doing work rather than being quoted.
 *
 * THE QUIET SECOND MOVE — see NearEdge.tsx
 *
 * Under the action row, past a hairline, one plain input: "Or describe what you
 * do". The row above is what the rules can resolve; the line below is what the
 * story can. Law 2 is not a slogan on this screen, it is a row.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS COMPONENT OWNS
 *
 * UI state only, exactly as v1's seam demands: which overlay is open, whether
 * the spine and journal are expanded, whether sound is off. Not one hit point,
 * not one legality decision, not one die. Everything the screen renders arrives
 * as a view-model from `viewModel.ts`, and every refusal on it is the string
 * the server would send back.
 *
 * The one flow it does own is the roll choreography, which is presentation:
 * tapping an attack opens the compose sheet, and committing there calls `onUse`
 * with the stance the player chose. The dice themselves are somebody else's
 * brief, and the result lands in the near edge's right bay wherever it comes
 * from.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { JournalRail } from './JournalRail.js';
import { NearEdge, type NearEdgeTargetVM } from './NearEdge.js';
import { RoundSpine } from './RoundSpine.js';
import { SceneRail } from './SceneRail.js';
import { ScreenStyles } from './ScreenStyles.js';
import { MapCanvas, type TokenPresentation } from '../MapCanvas.js';
import type { Room } from '@questra/contracts';
import { InfoPanel, fromExplain } from '../InfoPanel.js';
import {
  ComposeSheet, Folio, PauseOverlay, Scrim, TableMenu,
  type FeatureLineVM, type FolioProps, type FolioTab, type InventoryLineVM, type MenuAction, type RollStance,
} from './Overlays.js';
import type {
  DyingVM, Economy, ExplainVM, HeroVM, LogEntryVM, ResultVM, SpineEntryVM, TileVM,
} from './viewModel.js';

export interface PlayerViewV2Props {
  scene: { title: string; subtitle: string; round: number; elapsed: string };
  hero: HeroVM;
  /** the round, in initiative order — allies with hit points, enemies with a word. */
  cast: SpineEntryVM[];
  /** the room itself — real geometry, real fog, drawn by the one map renderer. */
  room: Room;
  /** who each creature is TO THIS VIEWER; the room does not know. */
  present?: Record<string, TokenPresentation>;
  tiles: TileVM[];
  turn: {
    active: boolean;
    activeName?: string;
    movement?: { left: number; max: number };
    targets?: NearEdgeTargetVM[];
    spent?: Partial<Record<Economy, boolean>>;
    /** out of combat — no round, no order, and the frame says so. */
    exploring?: boolean;
  };
  entries: LogEntryVM[];
  notes?: { title: string; lines: string[] };
  pendingCount?: number;
  /** present and not 'up' ⇒ the near edge flips to the death-save ladder. */
  dying?: DyingVM;
  /** the settled roll, shown in the near edge's right bay. */
  result?: ResultVM;
  features: FeatureLineVM[];
  inventory: InventoryLineVM[];
  spells?: FolioProps['spells'];
  onUse?: (tileId: string, roll?: { stance: RollStance; situational: number }) => void;
  onDescribe?: (text: string) => void;
  onSend?: (text: string) => void;
  onTarget?: (id: string) => void;
  /** Tapping a square — the destination when a move is being planned. */
  onCell?: (cell: { x: number; y: number }) => void;
  /** Where a planned move starts, drawn as the reach ring. */
  measureFrom?: { x: number; y: number };
  onEquip?: (economy: Economy) => void;
  onReact?: (emoji: string) => void;
  onRollDeathSave?: () => void;
  onMenuPick?: (action: MenuAction) => void;
  defaultSpineOpen?: boolean;
  defaultJournalOpen?: boolean;
  defaultActOpen?: boolean;
  /**
   * Which sheet is already open when the screen mounts. The app uses it to
   * deep-link (a notification that opens the journal's ruling, "show me my
   * sheet" from the lobby); the stories use it to put each overlay on screen
   * without a scripted click.
   */
  defaultOverlay?: Overlay;
  /** how tall the frame is. Defaults to the viewport. */
  height?: string;
}

export type Overlay =
  | { kind: 'none' }
  | { kind: 'explain'; explain: ExplainVM }
  | { kind: 'compose'; tile: TileVM }
  | { kind: 'folio'; tab: FolioTab }
  | { kind: 'menu' }
  | { kind: 'pause' };

export function PlayerViewV2({
  scene,
  hero,
  cast,
  room,
  present,
  tiles,
  turn,
  entries,
  notes,
  pendingCount = 0,
  dying,
  result,
  features,
  inventory,
  spells,
  onUse,
  onDescribe,
  onSend,
  onTarget,
  onCell,
  measureFrom,
  onEquip,
  onReact,
  onRollDeathSave,
  onMenuPick,
  defaultSpineOpen = true,
  defaultJournalOpen = true,
  defaultActOpen = true,
  defaultOverlay,
  height = '100vh',
}: PlayerViewV2Props): ReactElement {
  const [spineOpen, setSpineOpen] = useState(defaultSpineOpen);
  const [journalOpen, setJournalOpen] = useState(defaultJournalOpen);
  const [actOpen, setActOpen] = useState(defaultActOpen);
  const [muted, setMuted] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(defaultOverlay ?? { kind: 'none' });

  const close = (): void => setOverlay({ kind: 'none' });

  // Escape always goes back to the table. No overlay on this screen is a place
  // a player can get stuck, which is the same promise as law 2 at the chrome
  // level: there is always a way out of whatever you opened.
  useEffect(() => {
    if (overlay.kind === 'none') return undefined;
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay.kind]);

  const explain = (e: ExplainVM): void => setOverlay({ kind: 'explain', explain: e });

  const use = (tileId: string): void => {
    const tile = tiles.find((t) => t.id === tileId);
    // An attack goes through the compose sheet — advantage and any situational
    // adjustment are decided BEFORE the die, never argued about after it.
    if (tile?.roll !== undefined) {
      setOverlay({ kind: 'compose', tile });
      return;
    }
    onUse?.(tileId);
  };

  const targetId = turn.targets?.find((t) => t.selected)?.id;

  return (
    <div
      className={[
        'qa2-screen',
        spineOpen ? '' : 'is-spine-closed',
        journalOpen ? '' : 'is-journal-closed',
      ].filter(Boolean).join(' ')}
      style={{ height }}
    >
      <ScreenStyles />

      <MapCanvas
        room={room}
        mode="play"
        fit="fill"
        {...(present !== undefined ? { present } : {})}
        {...(onTarget !== undefined ? { onTokenClick: onTarget } : {})}
        {...(onCell !== undefined ? { onCellClick: onCell } : {})}
        {...(measureFrom !== undefined ? { measureFrom } : {})}
      />

      <SceneRail
        title={scene.title}
        subtitle={scene.subtitle}
        round={scene.round}
        elapsed={scene.elapsed}
        turn={{ name: turn.activeName ?? hero.name, isYou: turn.active, ...(turn.exploring !== undefined ? { exploring: turn.exploring } : {}) }}
        journalOpen={journalOpen}
        muted={muted}
        onToggleJournal={() => setJournalOpen((v) => !v)}
        onToggleMute={() => setMuted((v) => !v)}
        onOpenMenu={() => setOverlay({ kind: 'menu' })}
      />

      <RoundSpine
        round={scene.round}
        cast={cast}
        open={spineOpen}
        onToggle={() => setSpineOpen((v) => !v)}
        {...(onTarget !== undefined ? { onSelect: onTarget } : {})}
        {...(targetId !== undefined ? { targetId } : {})}
      />

      <JournalRail
        entries={entries}
        {...(notes !== undefined ? { notes } : {})}
        open={journalOpen}
        onToggle={() => setJournalOpen((v) => !v)}
        pendingCount={pendingCount}
        {...(onSend !== undefined ? { onSend } : {})}
        {...(onReact !== undefined ? { onReact } : {})}
      />

      <NearEdge
        hero={hero}
        tiles={tiles}
        turn={turn}
        {...(dying !== undefined ? { dying } : {})}
        {...(result !== undefined ? { result } : {})}
        actOpen={actOpen}
        onToggleAct={() => setActOpen((v) => !v)}
        onUse={use}
        onExplain={explain}
        {...(onEquip !== undefined ? { onEquip } : {})}
        {...(onTarget !== undefined ? { onTarget } : {})}
        {...(onRollDeathSave !== undefined ? { onRollDeathSave } : {})}
        {...(onDescribe !== undefined ? { onDescribe } : {})}
        onOpenFolio={(tab) => setOverlay({ kind: 'folio', tab: tab ?? 'stats' })}
      />

      {/* InfoPanel is a self-contained dialog and brings its own scrim, so the
          screen must not stack a second one behind it — two would darken the
          map twice. Every other overlay is a bare sheet and needs this one. */}
      {overlay.kind !== 'none' && overlay.kind !== 'explain' && <Scrim onClose={close} />}

      <div className="qa2-over">
        {/* The same panel the compendium opens — centred here rather than
            docked, because explaining happens mid-play and must not cover the
            panel whose number was just tapped. */}
        {overlay.kind === 'explain' && (
          <InfoPanel data={fromExplain(overlay.explain)} openMode="explain" onClose={close} />
        )}

        {overlay.kind === 'compose' && (
          <ComposeSheet
            label={
              overlay.tile.economy === 'action' && turn.targets !== undefined
                ? `${overlay.tile.name} on the ${turn.targets.find((t) => t.selected)?.name ?? 'target'}`
                : overlay.tile.name
            }
            bonus={overlay.tile.roll?.bonus ?? 0}
            {...(overlay.tile.roll?.against !== undefined ? { against: overlay.tile.roll.against } : {})}
            onRoll={(stance, situational) => {
              close();
              onUse?.(overlay.tile.id, { stance, situational });
            }}
            onCancel={close}
          />
        )}

        {overlay.kind === 'folio' && (
          <Folio
            hero={hero}
            features={features}
            inventory={inventory}
            initialTab={overlay.tab}
            {...(spells !== undefined ? { spells } : {})}
            onExplain={explain}
            onClose={close}
          />
        )}

        {overlay.kind === 'menu' && (
          <TableMenu
            onClose={close}
            onPick={(action) => {
              if (action === 'safety') {
                setOverlay({ kind: 'pause' });
                return;
              }
              if (action === 'journal') {
                setJournalOpen(true);
                close();
                return;
              }
              close();
              onMenuPick?.(action);
            }}
          />
        )}

        {overlay.kind === 'pause' && <PauseOverlay onResume={close} />}
      </div>
    </div>
  );
}

export type { FeatureLineVM, InventoryLineVM, MenuAction, RollStance } from './Overlays.js';
export type { NearEdgeTargetVM } from './NearEdge.js';
