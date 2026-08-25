/**
 * v2/Overlays — the four surfaces that open on top of the frame, and the one
 * that opens on top of everything.
 *
 * They share a rule: an overlay opens INSIDE the map area, never over the whole
 * window. The frame stays visible around it — the round spine keeps counting,
 * the journal keeps arriving, your own hit points stay where they were. A
 * player who taps a number to ask a question should not lose the table while
 * they read the answer.
 *
 * Explaining a number is NOT here — InfoPanel absorbed it, so the play
 * screen and the compendium show one sheet rather than two. See
 * primitives/InfoPanel.tsx.
 * ComposeSheet   — advantage, a situational adjustment, and the live formula,
 *                  in the moment before a roll is committed.
 * Folio          — your character sheet, rising from the near edge because that
 *                  is where your sheet sits at a real table.
 * TableMenu      — settings, safety, a breather, help, and the way out.
 * PauseOverlay   — the safety signal. It names no one and gives no reason.
 */
import { useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Button } from '@questra/ui';
import { Eyebrow, Glyph, heroName, itemName, narration, prose, quote, rollTotal, sceneName, statMeta, statValue } from '../../design/index.js';
import type { ExplainVM, HeroVM } from './viewModel.js';

// ---- shared chrome ---------------------------------------------------------

function Sheet({
  label,
  title,
  kicker,
  onClose,
  style,
  children,
}: {
  label: string;
  title: string;
  kicker?: string;
  onClose: () => void;
  style: CSSProperties;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="qa2-sheet" role="dialog" aria-modal="true" aria-label={label} style={style}>
      <div className="qa2-sheet-head">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)', minWidth: 0 }}>
          {kicker !== undefined && <Eyebrow>{kicker}</Eyebrow>}
          <h2 style={{ ...sceneName, margin: 0 }}>{title}</h2>
        </span>
        <button type="button" className="qa2-ctl" style={{ width: 28, height: 28 }} onClick={onClose} aria-label="Close">
          <Glyph name="close" size={13} />
        </button>
      </div>
      {children}
    </section>
  );
}

/** The click-anywhere-else dismiss. A button so keyboards can reach it too. */
export function Scrim({ onClose }: { onClose: () => void }): ReactElement {
  return <button type="button" className="qa2-scrim" onClick={onClose} aria-label="Close this and go back to the table" />;
}

// ---- the moment before a roll ---------------------------------------------

export type RollStance = 'advantage' | 'straight' | 'disadvantage';

export interface ComposeSheetProps {
  /** what is about to be rolled — "Longsword vs the skirmisher". */
  label: string;
  /** the character's own bonus for this roll. */
  bonus: number;
  /** what it is being compared against, if the player is allowed to know. */
  against?: { label: string; value: number };
  onRoll: (stance: RollStance, situational: number) => void;
  onCancel: () => void;
}

const STANCE_LABEL: Record<RollStance, string> = {
  advantage: 'Advantage',
  straight: 'Straight',
  disadvantage: 'Disadvantage',
};

const STANCE_BLURB: Record<RollStance, string> = {
  advantage: 'Roll two dice and keep the better one.',
  straight: 'One die, as it comes.',
  disadvantage: 'Roll two dice and keep the worse one.',
};

export function ComposeSheet({ label, bonus, against, onRoll, onCancel }: ComposeSheetProps): ReactElement {
  const [stance, setStance] = useState<RollStance>('straight');
  const [situational, setSituational] = useState(0);

  const total = bonus + situational;
  const sign = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <Sheet
      label="Set up this roll"
      kicker="About to roll"
      title={label}
      onClose={onCancel}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(400px, calc(100% - var(--qa-s6)))' }}
    >
      <div className="qa2-sheet-body">
        <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
          <Eyebrow>How you are rolling</Eyebrow>
          <span className="qa2-seg" role="group" aria-label="How you are rolling">
            {(Object.keys(STANCE_LABEL) as RollStance[]).map((s) => (
              <button key={s} type="button" className={s === stance ? 'is-on' : ''} onClick={() => setStance(s)} aria-pressed={s === stance}>
                {STANCE_LABEL[s]}
              </button>
            ))}
          </span>
          <span style={prose}>{STANCE_BLURB[stance]}</span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--qa-s3)' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)' }}>
            <Eyebrow>Anything else helping or hurting</Eyebrow>
            <span style={prose}>The DM may hand you one of these.</span>
          </span>
          <span className="qa2-step">
            <button type="button" onClick={() => setSituational((n) => n - 1)} aria-label="One less">
              &minus;
            </button>
            <span style={{ ...statMeta, minWidth: 30, textAlign: 'center', color: 'var(--qa-ink)' }}>{sign(situational)}</span>
            <button type="button" onClick={() => setSituational((n) => n + 1)} aria-label="One more">
              +
            </button>
          </span>
        </span>

        <div className="qa2-rowline is-sum">
          <span style={{ ...prose, color: 'var(--qa-ink)' }}>
            d20 {sign(bonus)}{situational !== 0 ? ` ${sign(situational)}` : ''}
            {against !== undefined ? ` vs ${against.label} ${against.value}` : ''}
          </span>
          <span style={statValue}>{sign(total)}</span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--qa-s2)', justifyContent: 'flex-end' }}>
          <Button variant="quiet" onClick={onCancel}>Not yet</Button>
          <Button variant="primary" onClick={() => onRoll(stance, situational)}>
            <Glyph name="die" size={14} />
            Roll it
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// ---- your character sheet --------------------------------------------------

export type FolioTab = 'abilities' | 'stats' | 'inventory' | 'equipment';

export interface InventoryLineVM {
  id: string;
  name: string;
  qty?: number;
  note?: string;
  /** worn or wielded right now — the equipment tab's half. */
  equipped?: boolean;
  flavour?: string;
}

export interface FeatureLineVM {
  id: string;
  name: string;
  text: string;
  resource?: string;
}

export interface FolioProps {
  hero: HeroVM;
  features: FeatureLineVM[];
  inventory: InventoryLineVM[];
  initialTab?: FolioTab;
  /** a caster's spell list. Absent ⇒ this character does not cast, said plainly. */
  spells?: { slots: { level: number; max: number; used: number }[]; prepared: { id: string; name: string; note: string }[]; saveDC: number; attack: number };
  onExplain?: (e: ExplainVM) => void;
  onClose: () => void;
}

const TABS: { id: FolioTab; label: string }[] = [
  { id: 'abilities', label: 'Abilities & Spells' },
  { id: 'stats', label: 'Stats' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'equipment', label: 'Equipment' },
];

export function Folio({ hero, features, inventory, initialTab = 'stats', spells, onExplain, onClose }: FolioProps): ReactElement {
  const [tab, setTab] = useState<FolioTab>(initialTab);

  return (
    <Sheet
      label={`${hero.name}'s character sheet`}
      kicker={`${hero.className} · Level ${hero.level}`}
      title={hero.name}
      onClose={onClose}
      // A sheet, not a wall: it stops when it has said everything. Stretching it
      // to the full map area left its columns stranded in a field of empty panel.
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(1040px, calc(100% - var(--qa-s6)))',
        maxHeight: 'calc(100% - var(--qa-s7))',
        minHeight: 340,
      }}
    >
      <div className="qa2-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className={t.id === tab ? 'qa2-tab is-on' : 'qa2-tab'} aria-selected={t.id === tab} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="qa2-sheet-body" role="tabpanel">
        {tab === 'abilities' && <AbilitiesTab features={features} {...(spells !== undefined ? { spells } : {})} heroName={hero.name} />}
        {tab === 'stats' && <StatsTab hero={hero} {...(onExplain !== undefined ? { onExplain } : {})} />}
        {tab === 'inventory' && <InventoryTab lines={inventory} coins={hero.coins} />}
        {tab === 'equipment' && <InventoryTab lines={inventory.filter((l) => l.equipped === true)} coins={hero.coins} equipmentOnly />}
      </div>
    </Sheet>
  );
}

function Columns({ children }: { children: ReactNode }): ReactElement {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--qa-s5)', alignItems: 'start' }}>{children}</div>;
}

function AbilitiesTab({ features, spells, heroName: who }: { features: FeatureLineVM[]; spells?: FolioProps['spells']; heroName: string }): ReactElement {
  return (
    <Columns>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
        <Eyebrow>What you can do</Eyebrow>
        {features.map((f) => (
          <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)' }}>
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--qa-s3)' }}>
              <span style={{ ...itemName, fontSize: 'var(--qa-text-body)' }}>{f.name}</span>
              {f.resource !== undefined && <span style={statMeta}>{f.resource}</span>}
            </span>
            <p style={{ ...prose, margin: 0 }}>{f.text}</p>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
        <Eyebrow>Spells</Eyebrow>
        {spells === undefined ? (
          // An honest empty state, not a locked door. A Fighter is not missing
          // anything — this half of the sheet simply is not theirs.
          <p style={{ ...prose, margin: 0 }}>
            {who} does not cast spells. Nothing is missing here — this half of the sheet belongs to characters who do.
          </p>
        ) : (
          <>
            <span style={{ display: 'flex', gap: 'var(--qa-s4)' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Eyebrow>Save DC</Eyebrow>
                <span style={statValue}>{spells.saveDC}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Eyebrow>Spell attack</Eyebrow>
                <span style={statValue}>+{spells.attack}</span>
              </span>
            </span>
            {spells.slots.map((s) => (
              <span key={s.level} style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)' }}>
                <Eyebrow style={{ width: 56 }}>Level {s.level}</Eyebrow>
                <span className="qa2-pips">
                  {Array.from({ length: s.max }, (_, i) => (
                    <span key={i} className={i < s.max - s.used ? 'qa2-savepip is-success' : 'qa2-savepip'} />
                  ))}
                </span>
              </span>
            ))}
            {spells.prepared.map((sp) => (
              <div key={sp.id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ ...itemName, fontSize: 'var(--qa-text-body)' }}>{sp.name}</span>
                <span style={prose}>{sp.note}</span>
              </div>
            ))}
          </>
        )}
      </section>
    </Columns>
  );
}

function StatsTab({ hero, onExplain }: { hero: HeroVM; onExplain?: (e: ExplainVM) => void }): ReactElement {
  return (
    <Columns>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
        <Eyebrow>Ability scores</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--qa-s2)' }}>
          {hero.abilities.map((a) => (
            <button
              key={a.key}
              type="button"
              className="qa2-menuitem"
              style={{ alignItems: 'center' }}
              onClick={onExplain ? () => onExplain(a.explain) : undefined}
              aria-label={`${a.explain.title} ${a.explain.value} — show how this is worked out`}
            >
              <Eyebrow>{a.explain.title}</Eyebrow>
              <span style={{ ...heroName, fontSize: 'var(--qa-text-lg)' }}>{a.explain.value}</span>
              <span style={statMeta}>score {a.score}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
        <Eyebrow>Saving throws</Eyebrow>
        {hero.saves.map((s) => (
          <button key={s.key} type="button" className="qa2-explain is-row" style={{ width: '100%', justifyContent: 'space-between' }} onClick={onExplain ? () => onExplain(s.explain) : undefined}>
            <span className="qa2-explain-label" style={prose}>{s.label}</span>
            <span style={statMeta}>{s.explain.value}</span>
          </button>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
        <Eyebrow>Skills you are trained in</Eyebrow>
        {hero.skills.length === 0 && <p style={{ ...prose, margin: 0 }}>Nothing yet — training arrives with levels and backgrounds.</p>}
        {hero.skills.map((s) => (
          <button key={s.key} type="button" className="qa2-explain is-row" style={{ width: '100%', justifyContent: 'space-between' }} onClick={onExplain ? () => onExplain(s.explain) : undefined}>
            <span className="qa2-explain-label" style={prose}>{s.label}</span>
            <span style={statMeta}>{s.explain.value}</span>
          </button>
        ))}
      </section>

      {/*
        Speed, what you notice, initiative and hit dice used to have a permanent
        bay on the near edge. They are reference — you read them between turns,
        never during one — so they moved in here when the HUD stopped being a
        frame and started being panels you can see the map around. Initiative
        also lives on the round spine, where it does its real work.
      */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
        <Eyebrow>Your other numbers</Eyebrow>
        {[hero.speed, hero.passivePerception, hero.initiative].map((e) => (
          <button key={e.id} type="button" className="qa2-explain is-row" style={{ width: '100%', justifyContent: 'space-between' }} onClick={onExplain ? () => onExplain(e) : undefined}>
            <span className="qa2-explain-label" style={prose}>{e.title}</span>
            <span style={statMeta}>{e.value}</span>
          </button>
        ))}
        <span className="qa2-rowline">
          <span style={prose}>Hit dice</span>
          <span style={statMeta}>{hero.hitDice.max}{hero.hitDice.die}</span>
        </span>
        <span className="qa2-rowline">
          <span style={prose}>Carrying</span>
          <span style={{ ...statMeta, color: 'var(--qa-gold)' }}>{hero.coins}</span>
        </span>
      </section>
    </Columns>
  );
}

function InventoryTab({ lines, coins, equipmentOnly = false }: { lines: InventoryLineVM[]; coins: string; equipmentOnly?: boolean }): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
      {!equipmentOnly && (
        <div className="qa2-rowline">
          <span style={{ ...prose, color: 'var(--qa-ink)' }}>Coin</span>
          <span style={{ ...statMeta, color: 'var(--qa-gold)' }}>{coins}</span>
        </div>
      )}
      {lines.length === 0 && <p style={{ ...prose, margin: 0 }}>Nothing worn or wielded right now.</p>}
      {lines.map((l) => (
        <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--qa-s3)' }}>
            <span style={{ ...itemName, fontSize: 'var(--qa-text-body)' }}>
              {l.name}
              {l.qty !== undefined && l.qty > 1 ? ` ×${l.qty}` : ''}
            </span>
            {l.note !== undefined && <span style={statMeta}>{l.note}</span>}
          </span>
          {l.flavour !== undefined && <span style={{ ...quote, fontSize: 'var(--qa-text-label)', color: 'var(--qa-ink-dim)' }}>{l.flavour}</span>}
        </div>
      ))}
    </div>
  );
}

// ---- the menu --------------------------------------------------------------

export type MenuAction = 'settings' | 'safety' | 'breather' | 'journal' | 'help' | 'lobby' | 'leave';

const MENU: { id: MenuAction; label: string; blurb: string }[] = [
  { id: 'safety', label: 'Safety tools', blurb: 'Raise a pause, or set what this table keeps off the page. No reason needed, ever.' },
  { id: 'breather', label: 'Take a breather', blurb: 'Step away for a minute. The table holds your turn and knows you are back soon.' },
  { id: 'help', label: 'How do I play', blurb: 'What your rows mean right now, in plain language. Read from where you actually are.' },
  { id: 'journal', label: 'Journal and notes', blurb: 'The story so far, what you rolled, and anything you jotted down.' },
  { id: 'settings', label: 'Settings', blurb: 'Sound, motion, text size, and how much the assistant offers.' },
  { id: 'lobby', label: 'Back to the lobby', blurb: 'Leave the table running and go see the campaign.' },
  { id: 'leave', label: 'Leave the table', blurb: 'Sign off for tonight. Everything is saved.' },
];

export function TableMenu({ onPick, onClose }: { onPick: (a: MenuAction) => void; onClose: () => void }): ReactElement {
  return (
    <Sheet
      label="Table menu"
      title="This table"
      onClose={onClose}
      // Directly under the control it came from, which is the one overlay with
      // a natural anchor on this screen.
      style={{ right: 'var(--qa-hud-inset)', top: 'calc(var(--qa-hud-inset) + 44px)', width: 'min(340px, calc(100% - var(--qa-s6)))' }}
    >
      <div className="qa2-sheet-body" style={{ gap: 'var(--qa-s1)' }}>
        {MENU.map((m) => (
          <button key={m.id} type="button" className="qa2-menuitem" onClick={() => onPick(m.id)}>
            <span style={{ ...itemName, fontSize: 'var(--qa-text-body)' }}>{m.label}</span>
            <span style={prose}>{m.blurb}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/**
 * The safety signal. Any player or the DM can raise it, at any time, without
 * saying why — so this overlay names nobody and asks nothing. It is quiet on
 * purpose: the point is to take the pressure out of the room, and a loud alarm
 * would do the opposite of that.
 */
export function PauseOverlay({ onResume }: { onResume: () => void }): ReactElement {
  return (
    <Sheet
      label="The table is paused"
      kicker="Safety"
      title="Let's pause here"
      onClose={onResume}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(420px, calc(100% - var(--qa-s6)))' }}
    >
      <div className="qa2-sheet-body">
        <p style={{ ...narration, margin: 0 }}>
          Someone at the table asked for a pause. No reason given, and none needed. The DM will steer somewhere else, and
          you can pick the scene back up whenever everyone is ready.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={onResume}>Ready to carry on</Button>
        </div>
      </div>
    </Sheet>
  );
}
