/**
 * CharacterWizard — class, origin, abilities, name (spec §5 steps 1-3, plus the
 * one piece of identity a character cannot do without).
 *
 * WHAT IS AND IS NOT HERE. The spec runs to six steps, a homebrew class builder
 * with a balance checker, an AI co-pilot on every step, a voice library and an
 * AI portrait reveal. This is the cut that produces a PLAYABLE character: the
 * choices the engine needs to compute a real sheet. Steps 4-6 depend on things
 * that do not exist yet (portrait generation is a deterministic stub, the TTS
 * vendor is undecided and M6), so they are absent rather than faked.
 *
 * WHY THE STEPS ARE NUMBERED, when numbered markers are usually decoration:
 * this sequence is real. Background bonuses cannot be spent before a background
 * is chosen, and the sheet cannot compute before abilities are placed. The
 * numbers encode a dependency the player will actually feel, so they earn their
 * place — see the step list's blockers, which say what each one is waiting for.
 *
 * EVERY STEP IS REACHABLE AT ANY TIME. The numbering describes dependency, not
 * permission: a player who wants to name their character first should be able
 * to, and one who changes their mind about a class after placing abilities
 * should not have to start again. Only the FINISH is gated, and it says exactly
 * what is missing.
 */
import { useMemo, useState, type ReactElement } from 'react';
import type { Ability, CharacterChoices } from '@questra/contracts';
import { ShellStyles } from '../shell/ShellStyles.js';
import { Road } from '../shell/road/Road.js';
import { usePrefersReducedMotion } from '../shell/shared.js';
import { CharacterPanel } from './CharacterPanel.js';
import {
  BACKGROUND_OPTIONS, CLASS_OPTIONS, SPECIES_OPTIONS,
  backgroundById, classById, sheetFor, type ClassOption,
} from './rules.js';
import {
  ABILITY_LABEL, ABILITY_ORDER, ABILITY_PLAIN, STANDARD_ARRAY,
  bonusTotal, useCharacterDraft, type StepId,
} from './useCharacterDraft.js';

export interface CharacterWizardProps {
  /** The campaign this character is being made for, shown for context. */
  campaignName?: string;
  /** Saving — the finish button reports it rather than looking inert. */
  busy?: boolean;
  onFinish: (choices: CharacterChoices) => void;
  onCancel: () => void;
}

/**
 * The one ability the randomiser should favour.
 *
 * A few classes declare "str_or_dex" — genuinely either, and the SRD means it.
 * Choosing Dexterity there is not arbitrary: it also drives armour class and
 * initiative, so somebody who does not yet know the difference gets the more
 * forgiving character.
 */
function primaryAbilityOf(klass: ClassOption | undefined): Ability | undefined {
  if (!klass) return undefined;
  const raw = klass.primaryAbility;
  if (raw === 'str_or_dex') return 'dex';
  return (ABILITY_ORDER as string[]).includes(raw) ? (raw as Ability) : undefined;
}

const COMPLEXITY_LABEL: Record<string, string> = {
  low: 'Easy to run',
  average: 'A bit more to track',
  high: 'Lots of options',
};

export function CharacterWizard({ campaignName, busy = false, onFinish, onCancel }: CharacterWizardProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const api = useCharacterDraft();
  const { draft, steps, choices } = api;
  const [open, setOpen] = useState<StepId>('class');

  /* The sheet recomputes whenever the choices are complete. Before that the
     panel shows its empty shape — the engine is never handed a half-character. */
  const sheet = useMemo(() => (choices ? sheetFor(choices) : null), [choices]);

  const klass = classById(draft.classId);
  const background = backgroundById(draft.backgroundId);
  const spent = bonusTotal(draft.backgroundBonuses);
  const blockers = steps.filter((s) => !s.done);

  return (
    <div className={'rd qa-wiz' + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="camp" />

      <div className="qa-wiz-frame">
        <header className="qa-wiz-head">
          <div>
            <p className="rd-label">{campaignName ? `Joining ${campaignName}` : 'A new character'}</p>
            <h1 className="rd-title">Who are you?</h1>
          </div>
          <button type="button" className="qa2-quiet-link" onClick={onCancel}>Not now</button>
        </header>

        <div className="qa-wiz-body">
          <div className="qa-wiz-steps">
            {steps.map((step, i) => (
              <section key={step.id} className={open === step.id ? 'qa-step is-open' : 'qa-step'}>
                <button
                  type="button"
                  className="qa-step-head"
                  aria-expanded={open === step.id}
                  onClick={() => setOpen(step.id)}
                >
                  <span className="qa-step-n">{i + 1}</span>
                  <span className="qa-step-label">{step.label}</span>
                  <span className="qa-step-state rd-micro">
                    {step.done ? 'Done' : step.blocker}
                  </span>
                </button>

                {open === step.id && (
                  <div className="qa-step-body">
                    {step.id === 'class' && (
                      <>
                        <p className="rd-detail">
                          This is what you do when something goes wrong. Nothing here is a
                          mistake — the ones at the top just ask less of you at the table.
                        </p>
                        <ul className="qa-pick-grid">
                          {CLASS_OPTIONS.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={draft.classId === c.id ? 'qa-pick is-picked' : 'qa-pick'}
                                aria-pressed={draft.classId === c.id}
                                onClick={() => api.chooseClass(c.id)}
                              >
                                <span className="qa-pick-name">{c.name}</span>
                                <span className="qa-pick-plain">{c.plain}</span>
                                <span className="qa-pick-meta rd-micro">
                                  {COMPLEXITY_LABEL[c.complexity]} · {c.hitDie}
                                  {c.casterType !== 'none' && ' · casts spells'}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {step.id === 'origin' && (
                      <>
                        <p className="rd-label">Species</p>
                        <ul className="qa-pick-grid is-tight">
                          {SPECIES_OPTIONS.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className={draft.speciesId === s.id ? 'qa-pick is-picked' : 'qa-pick'}
                                aria-pressed={draft.speciesId === s.id}
                                onClick={() => api.chooseSpecies(s.id)}
                              >
                                <span className="qa-pick-name">{s.name}</span>
                                <span className="qa-pick-plain">{s.plain}</span>
                                <span className="qa-pick-meta rd-micro">{s.sizeLabel} · {s.speedFt} ft</span>
                              </button>
                            </li>
                          ))}
                        </ul>

                        <p className="rd-label">Background</p>
                        <p className="rd-detail">What you did before any of this started.</p>
                        <ul className="qa-pick-grid is-tight">
                          {BACKGROUND_OPTIONS.map((b) => (
                            <li key={b.id}>
                              <button
                                type="button"
                                className={draft.backgroundId === b.id ? 'qa-pick is-picked' : 'qa-pick'}
                                aria-pressed={draft.backgroundId === b.id}
                                onClick={() => api.chooseBackground(b.id, b.abilityOptions)}
                              >
                                <span className="qa-pick-name">{b.name}</span>
                                <span className="qa-pick-plain">{b.plain}</span>
                                <span className="qa-pick-meta rd-micro">{b.skills.join(' · ')}</span>
                              </button>
                            </li>
                          ))}
                        </ul>

                        {background && (
                          <div className="qa-spend">
                            <p className="rd-label">
                              Your background adds 3 points — {3 - spent} left
                            </p>
                            <p className="rd-detail">
                              Put +2 in one and +1 in another, or +1 in all three.
                            </p>
                            <div className="qa-spend-rows">
                              {background.abilityOptions.map((a) => (
                                <div key={a} className="qa-spend-row">
                                  <span className="qa-spend-name">{ABILITY_LABEL[a]}</span>
                                  <div className="qa-spend-opts" role="group" aria-label={ABILITY_LABEL[a]}>
                                    {[0, 1, 2].map((amount) => {
                                      const current = draft.backgroundBonuses[a] ?? 0;
                                      /* Offering an amount that would overspend is worse
                                         than disabling it — the player learns the budget
                                         by seeing what is still affordable. */
                                      const wouldTotal = spent - current + amount;
                                      return (
                                        <button
                                          key={amount}
                                          type="button"
                                          className={current === amount ? 'qa2-chip is-selected' : 'qa2-chip'}
                                          aria-pressed={current === amount}
                                          disabled={wouldTotal > 3}
                                          onClick={() => api.spendBonus(a, amount)}
                                        >
                                          {amount === 0 ? 'none' : `+${amount}`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {step.id === 'abilities' && (
                      <>
                        <div className="qa-assign-head">
                          <p className="rd-detail">
                            Six numbers, six abilities. Put the big ones where your class
                            will use them — tap a number to move it, or tap it again to
                            take it back off.
                          </p>
                          {/* The way out for anyone who does not yet know what a good
                              spread looks like. It favours the class's own ability, so
                              it hands back something playable rather than a random mess
                              a beginner could not tell was bad. */}
                          <button
                            type="button"
                            className="qa2-quiet-link qa-roll"
                            onClick={() => api.rollAbilities(primaryAbilityOf(klass))}
                          >
                            Choose for me
                          </button>
                        </div>
                        <div className="qa-assign">
                          {ABILITY_ORDER.map((a) => (
                            <div key={a} className="qa-assign-row">
                              <div className="qa-assign-who">
                                <span className="qa-assign-name">{ABILITY_LABEL[a]}</span>
                                <span className="qa-assign-plain rd-micro">{ABILITY_PLAIN[a]}</span>
                              </div>
                              <div className="qa-assign-opts" role="group" aria-label={ABILITY_LABEL[a]}>
                                {STANDARD_ARRAY.map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    className={draft.assignment[a] === v ? 'qa2-chip is-selected' : 'qa2-chip'}
                                    aria-pressed={draft.assignment[a] === v}
                                    onClick={() => api.assign(a as Ability, v)}
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {step.id === 'name' && (
                      <>
                        <p className="rd-detail">What the rest of the table will call you.</p>
                        <label className="rd-field">
                          <span>Name</span>
                          <input
                            type="text"
                            value={draft.name}
                            placeholder="Torvald"
                            onChange={(e) => api.setName(e.target.value)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>

          <CharacterPanel draft={draft} sheet={sheet} />
        </div>

        <footer className="qa-wiz-foot">
          {/* The gate says what is missing rather than just refusing. A disabled
              button with no reason is the commonest way a form loses somebody. */}
          {blockers.length > 0 && (
            <p className="rd-detail qa-wiz-left">
              Still to do: {blockers.map((b) => b.label.toLowerCase()).join(', ')}.
            </p>
          )}
          <button
            type="button"
            className="qa2-cta"
            disabled={choices === null || busy}
            onClick={() => { if (choices) onFinish(choices); }}
          >
            {busy ? 'Saving' : choices ? 'That’s me' : 'Not finished yet'}
          </button>
        </footer>
      </div>
    </div>
  );
}
