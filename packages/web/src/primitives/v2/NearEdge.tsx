/**
 * v2/NearEdge — your side of the table, as TWO floating panels with a gap
 * between them.
 *
 * WHY TWO AND NOT ONE (owner direction, 2026-08-16). An earlier pass ran these
 * as one continuous band flush to the bottom of the window, with hairlines
 * dividing three bays. Together with a left rail and a right rail that made a
 * continuous C around the map, and the map stopped being what you were looking
 * at. These are now discrete panels floating over a full-bleed map, held off
 * the window and off each other.
 *
 * WHAT STOPS THEM DISAGREEING is the shared chrome contract in ScreenStyles —
 * `.qa2-panel` is one radius, one padding, one internal rhythm, one fill, one
 * shadow, and every surface on the screen is built from it. That is the lesson
 * the v1 hub paid for: it was never the merging that held those cards together,
 * it was the contract.
 *
 * WHO YOU ARE sits in the bottom-left corner: portrait, hit points, Armor Class,
 * what is on you, and the six scores. It is read, not operated.
 *
 * WHAT YOU CAN DO is CENTRED on the screen, because it is the one surface a hand
 * returns to — every game with an action bar centres it, for that reason. It is
 * also the panel the round's accent arrives at, and the one that keeps its size
 * longest as the window narrows.
 *
 * WHERE THE ROLL LANDS is a card that rises directly above the action panel,
 * left-aligned with it. Same place every time, but it only takes map while
 * there is something to say — as a permanent third bay it left a column of the
 * HUD standing empty between rolls.
 *
 * THE OPEN LINE. Under the economies, past a hairline, one plain input: "Or
 * describe what you do…". The row above is what the rules can resolve; the line
 * below is what the story can. Law 2 is not a slogan here, it is a row.
 *
 * THE FLIP. When `dying` is present and its phase is not 'up', the action
 * panel's contents are replaced by the death-save ladder and the identity panel
 * dims. Pure function of the view-model — the server's ladder drives it.
 *
 * THE ACTION PANEL COLLAPSES TOO (owner direction, 2026-08-19), same pattern as
 * the spine and the journal: a chevron collapses it to a pill in the same spot,
 * carrying the same phrase its own turn-badge would show ("Your turn", "Wren is
 * up") so it stays informative collapsed. The chevron itself lives at the end of
 * `TurnLine`'s row, sharing the same `marginLeft: auto` push the movement meter
 * already claims — an earlier pass floated it as its own absolutely-positioned
 * corner button and it landed directly on top of the meter's "ft" text, since
 * both were independently pushing for the same corner. The You panel does NOT
 * collapse with it — a player who wants a quieter action row still wants their
 * own hit points visible, so the two toggle independently, exactly like the
 * spine and journal already do.
 */
import { useState, type FormEvent, type ReactElement } from 'react';
import { Avatar, Button } from '@questra/ui';
import { ActionRows } from './ActionRows.js';
import { ExplainValue, Eyebrow, Glyph, heroName, HP, itemName, Meter, narration, prose, rollTotal, statMeta, Tag } from '../../design/index.js';
import type { DyingVM, Economy, ExplainVM, HeroVM, ResultVM, TileVM } from './viewModel.js';

export interface NearEdgeTargetVM {
  id: string;
  name: string;
  selected: boolean;
}

export interface NearEdgeProps {
  hero: HeroVM;
  tiles: TileVM[];
  turn: {
    active: boolean;
    /** who is up, when it is not you. */
    activeName?: string;
    movement?: { left: number; max: number };
    targets?: NearEdgeTargetVM[];
    spent?: Partial<Record<Economy, boolean>>;
    /** out of combat: nobody is taking turns, so the badge says so instead of lying. */
    exploring?: boolean;
  };
  /** present and not 'up' ⇒ the action panel flips to the death-save ladder. */
  dying?: DyingVM;
  /** the settled roll. Absent ⇒ no roll card, and the map keeps that space. */
  result?: ResultVM;
  /** whether the action panel is expanded. Collapses to a pill, same as the spine and journal. */
  actOpen: boolean;
  onToggleAct: () => void;
  onUse: (tileId: string) => void;
  onExplain?: (e: ExplainVM) => void;
  onEquip?: (economy: Economy) => void;
  onTarget?: (id: string) => void;
  onOpenFolio?: (tab?: 'abilities' | 'stats' | 'inventory' | 'equipment') => void;
  onRollDeathSave?: () => void;
  /** the escape hatch. Omit and the open line does not render. */
  onDescribe?: (text: string) => void;
}

/** The phrase both the open panel's badge and its collapsed pill show — one source, so they cannot drift apart. */
function turnPhrase(turn: NearEdgeProps['turn'], isDying: boolean): string {
  if (isDying) return 'Holding on';
  if (turn.exploring === true) return 'No turn order — go ahead';
  if (turn.active) return 'Your turn';
  return `${turn.activeName ?? 'Someone else'} is up`;
}

export function NearEdge({
  hero,
  tiles,
  turn,
  dying,
  result,
  actOpen,
  onToggleAct,
  onUse,
  onExplain,
  onEquip,
  onTarget,
  onOpenFolio,
  onRollDeathSave,
  onDescribe,
}: NearEdgeProps): ReactElement {
  const isDying = dying !== undefined && dying.phase !== 'up';
  // The accent only travels into your panel when the ROUND arrives at you.
  // Out of combat there is no round, so it stays quiet.
  const yours = turn.active && !isDying && turn.exploring !== true;

  // A fragment, not a wrapper: these are two independently anchored panels —
  // you in the corner, the bar you act from centred — and a shared parent would
  // only put them back in a row.
  return (
    <>
      <YouPanel hero={hero} dimmed={isDying} {...(onExplain !== undefined ? { onExplain } : {})} {...(onOpenFolio !== undefined ? { onOpenFolio } : {})} />

      {!actOpen ? (
        <button type="button" className="qa2-pill is-act" onClick={onToggleAct} aria-expanded={false} aria-label="Show your action bar">
          {yours && <span className="qa2-pill-dot" />}
          {turnPhrase(turn, isDying)}
        </button>
      ) : (
        <section className={yours ? 'qa2-panel qa2-act is-yours' : 'qa2-panel qa2-act'} aria-label="What you can do">
          {result !== undefined && <RollCard result={result} />}

          <TurnLine turn={turn} isDying={isDying} onToggleAct={onToggleAct} {...(onTarget !== undefined ? { onTarget } : {})} />

          {isDying ? (
            <DeathSaves state={dying} {...(onRollDeathSave !== undefined ? { onRoll: onRollDeathSave } : {})} />
          ) : (
            <>
              <ActionRows
                tiles={tiles}
                onUse={onUse}
                {...(onExplain !== undefined ? { onExplain } : {})}
                {...(onEquip !== undefined ? { onEquip } : {})}
                {...(onOpenFolio !== undefined ? { onShowMore: () => onOpenFolio('abilities') } : {})}
                {...(turn.spent !== undefined ? { spent: turn.spent } : {})}
              />
              {onDescribe !== undefined && <OpenLine onDescribe={onDescribe} />}
            </>
          )}
        </section>
      )}
    </>
  );
}

// ---- who you are -----------------------------------------------------------

function YouPanel({
  hero,
  dimmed,
  onExplain,
  onOpenFolio,
}: {
  hero: HeroVM;
  dimmed: boolean;
  onExplain?: (e: ExplainVM) => void;
  onOpenFolio?: (tab?: 'abilities' | 'stats' | 'inventory' | 'equipment') => void;
}): ReactElement {
  return (
    <section
      className="qa2-panel qa2-you"
      aria-label={`${hero.name}, your character`}
      style={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity var(--qa-dur) var(--qa-ease)' }}
    >
      <button
        type="button"
        className="qa2-portrait"
        onClick={onOpenFolio ? () => onOpenFolio() : undefined}
        disabled={onOpenFolio === undefined}
        aria-label={`${hero.name}, ${hero.className} level ${hero.level} — open your character sheet`}
      >
        <Avatar initial={hero.initial} shape="square" size={46} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span className="qa2-portrait-name" style={{ ...heroName, fontSize: 'var(--qa-text-lg)' }}>{hero.name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s1)' }}>
            <Eyebrow>{hero.className} · Level {hero.level}</Eyebrow>
            {onOpenFolio !== undefined && <Glyph name="chevronRight" size={11} />}
          </span>
        </span>
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--qa-s4)' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <Eyebrow>Hit points</Eyebrow>
          <HP current={hero.hp.current} max={hero.hp.max} temp={hero.hp.temp} bloodied={hero.bloodied} />
        </span>
        <ExplainValue label="Armor" explain={hero.ac} {...(onExplain !== undefined ? { onExplain } : {})} />
      </div>

      {/*
        This block used to be a reserved gap that only filled when something went
        wrong, which left a healthy character's panel with a hole in it. It now
        always says what is true, and the empty state does real teaching: a
        player who has never played learns conditions exist before one lands.
      */}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)' }}>
        <Eyebrow>Conditions</Eyebrow>
        {hero.bloodied || hero.conditions.length > 0 ? (
          <span style={{ display: 'flex', gap: 'var(--qa-s1)', flexWrap: 'wrap' }}>
            {hero.bloodied && <Tag tone="danger">Bloodied</Tag>}
            {hero.conditions.map((c) => (
              <Tag key={c.id} tone="danger" onClick={onExplain ? () => onExplain(c.explain) : undefined} title={`${c.name} — what it does`}>
                {c.name}
              </Tag>
            ))}
          </span>
        ) : (
          <span style={prose}>Nothing on you.</span>
        )}
      </span>

      {/*
        Concentration is a state you can LOSE, and losing it silently is how a
        table ends up arguing about whether Bless was still up. It gets the
        accent — the only place on this panel that does — because it is the one
        thing here that is quietly ticking. Single by rule: casting another
        concentration spell drops this one, which is why it reads as one badge
        and never as a list.
      */}
      {hero.concentratingOn !== undefined && (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)' }}>
          <Eyebrow>Holding</Eyebrow>
          <span style={{ display: 'flex' }}>
            <Tag tone="accent">{hero.concentratingOn}</Tag>
          </span>
        </span>
      )}

      {/* All six scores on one line. They are reference, not controls, so they
          get the least ink here and open their full working when tapped. */}
      <span className="qa2-abils">
        {hero.abilities.map((a) => (
          <button
            key={a.key}
            type="button"
            className="qa2-abil"
            onClick={onExplain ? () => onExplain(a.explain) : undefined}
            aria-label={`${a.explain.title} ${a.explain.value} — show how this number is worked out`}
          >
            <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink-faint)' }}>{a.short}</span>
            <span style={{ ...statMeta, color: 'var(--qa-ink)' }}>{a.explain.value}</span>
          </button>
        ))}
      </span>
    </section>
  );
}

// ---- what this turn is -----------------------------------------------------

function TurnLine({
  turn,
  isDying,
  onTarget,
  onToggleAct,
}: {
  turn: NearEdgeProps['turn'];
  isDying: boolean;
  onTarget?: (id: string) => void;
  onToggleAct: () => void;
}): ReactElement {
  const move = turn.movement;
  const exploring = turn.exploring === true;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)', flexWrap: 'wrap' }}>
      <span className={turn.active && !isDying && !exploring ? 'qa2-badge is-yours' : 'qa2-badge'}>
        {turnPhrase(turn, isDying)}
      </span>

      {turn.targets !== undefined && turn.targets.length > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)' }}>
          <Eyebrow>Aimed at</Eyebrow>
          {turn.targets.map((t) => (
            <Tag
              key={t.id}
              selected={t.selected}
              onClick={onTarget ? () => onTarget(t.id) : undefined}
              title={t.selected ? `Aimed at the ${t.name}` : `Aim at the ${t.name} instead`}
            >
              {t.name}
            </Tag>
          ))}
        </span>
      )}

      {/* ONE flex item claims the row-end push, not two: the move meter and the
          collapse toggle share a single marginLeft:auto wrapper rather than each
          carrying their own, which is what let the toggle land on top of "ft"
          instead of beside it the first time this was wired up. */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)', marginLeft: 'auto' }}>
        {move !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)' }}>
            <Eyebrow>Move</Eyebrow>
            <Meter value={move.left} max={move.max} label={`${move.left} of ${move.max} feet of movement left`} />
            <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)' }}>{move.left} of {move.max} ft</span>
          </span>
        )}
        <button type="button" className="qa2-ctl" style={{ width: 24, height: 24 }} onClick={onToggleAct} aria-label="Hide your action bar" aria-expanded>
          <Glyph name="chevronDown" size={13} />
        </button>
      </span>
    </div>
  );
}

// ---- the escape hatch ------------------------------------------------------

function OpenLine({ onDescribe }: { onDescribe: (text: string) => void }): ReactElement {
  const [text, setText] = useState('');
  const submit = (ev: FormEvent): void => {
    ev.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onDescribe(trimmed);
    setText('');
  };
  return (
    <form className="qa2-open" onSubmit={submit}>
      <Glyph name="quill" size={14} />
      <label className="qa2-sr" htmlFor="qa2-open-line">Describe what you do</label>
      <input
        id="qa2-open-line"
        className="qa2-input"
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        placeholder="Or describe what you do — the DM will pick it up"
        autoComplete="off"
      />
      <button type="submit" className="qa2-ctl" style={{ width: 26, height: 26 }} aria-label="Send this to the table">
        <Glyph name="send" size={13} />
      </button>
    </form>
  );
}

// ---- where the dice land ---------------------------------------------------

function RollCard({ result }: { result: ResultVM }): ReactElement {
  return (
    <aside className="qa2-panel qa2-roll" aria-live="polite" aria-label="Your last roll">
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Eyebrow>Last roll</Eyebrow>
        <span style={prose}>{result.label}</span>
      </span>

      <div className="qa2-result">
        <span className="qa2-total" style={rollTotal}>{result.total}</span>
        <span className={`qa2-verdict is-${result.tone}`}>{result.verdict}</span>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {result.rows.map((r) => (
          <li key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--qa-s2)' }}>
            <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)' }}>{r.label}</span>
            <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink)' }}>{r.value}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// ---- the dying ladder ------------------------------------------------------

const HEADLINE: Record<DyingVM['phase'], string> = {
  dying: 'Making death saves',
  stable: 'Stable',
  dead: 'Dead',
  up: 'Back on your feet',
};

const BLURB: Record<DyingVM['phase'], string> = {
  dying: 'A 10 or higher is a success. Three successes and you hold on; three failures and the story ends.',
  stable: 'You hold on. Unconscious, but breathing — healing or an hour will wake you.',
  dead: 'The DM can still overrule fate. Nothing at this table is final until the story says so.',
  up: "You're back. Bloodied, but standing.",
};

function DeathSaves({ state, onRoll }: { state: DyingVM; onRoll?: () => void }): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s4)', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)', flex: 1, minWidth: 220 }}>
        <span style={{ ...narration, color: state.phase === 'dead' ? 'var(--qa-danger)' : 'var(--qa-ink)' }}>
          {HEADLINE[state.phase]}
        </span>
        <p style={{ ...prose, margin: 0, maxWidth: '44ch' }}>{BLURB[state.phase]}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)' }}>
          <Eyebrow style={{ width: 66 }}>Holding on</Eyebrow>
          <span className="qa2-pips" role="img" aria-label={`${state.successes} of 3 successes`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < state.successes ? 'qa2-savepip is-success' : 'qa2-savepip'} />
            ))}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)' }}>
          <Eyebrow style={{ width: 66 }}>Slipping</Eyebrow>
          <span className="qa2-pips" role="img" aria-label={`${state.failures} of 3 failures`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < state.failures ? 'qa2-savepip is-failure' : 'qa2-savepip'} />
            ))}
          </span>
        </span>
      </div>

      <Button
        variant="primary"
        onClick={onRoll}
        disabled={state.phase !== 'dying' || onRoll === undefined}
        title={state.phase !== 'dying' ? 'There is nothing to roll right now.' : 'Roll your death save'}
      >
        <span style={itemName}>Roll a death save</span>
      </Button>
    </div>
  );
}
