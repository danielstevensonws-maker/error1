/**
 * Landing (Brief 14 §3) — the front door.
 *
 * One of the two screens in the shell that holds a conversation, because it is
 * one of the two a person meets once, as a stranger. The scene is the edge of
 * town with the road in front of you: a player reads it as somewhere to be
 * taken, a DM reads it as somewhere to build, and neither has to be asked
 * which they are before they have felt anything.
 *
 * THE PAYOFF IS THE ONE PIECE OF CHOREOGRAPHY HERE. The road is completely
 * still while you are deciding. The moment you answer, the ruts flow toward
 * you, the light at the end brightens and the town behind you dims. You do not
 * read about setting out; the page sets out, because you told it to. Everything
 * else on the screen stays quiet so that lands — see road/RoadStyles for why
 * this ritual is confined to Landing and Join and appears nowhere else.
 */
import { useState, type ReactElement } from 'react';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { Spoken, Turn, useSpokenText, type Phase, type Seg } from './road/Scene.js';
import { useAuth, usePrefersReducedMotion } from './shared.js';
import type { SessionApi } from './session.js';

export interface LandingProps {
  session: SessionApi;
  onEntered: () => void;
  /** ADR-0010: the licence screen must be reachable without an account. */
  onLegal?: () => void;
}

/**
 * The scene had to be rewritten when the ground changed. It used to describe a
 * road running north, which was fine over a horizon and nonsense over a
 * top-down battle map — the words and the picture have to be the same place.
 * What it keeps is the hook: four people are already here, none of them know
 * the rules either, and the fifth chair is the one you are looking at.
 */
const SCENE: Seg[] = [
  { t: 'Five chairs, four of them taken, and a map somebody has already started marking.' },
  { t: '\n\nNobody at this table has played before either. That is rather the point.' },
];

/**
 * Three jobs, in this order: confirm you are in, make the table real, and state
 * the product's actual promise in the fiction's own voice — the rules are
 * handled, you only have to say what you do. That last line is the play
 * screen's prompt, described.
 */
const REPLY: Seg[] = [
  { t: 'Room is made.' },
  { t: '\n\nSomeone slides the dice across to you, and the map turns so it is the right way round from where you are sitting.' },
  { t: '\n\nThe rules are handled. You only have to say what you ' },
  { t: 'do', em: true },
  { t: '.' },
];

export function Landing({ session, onEntered, onLegal }: LandingProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const auth = useAuth(session, onEntered);
  const [phase, setPhase] = useState<Phase>('telling');
  const [answer, setAnswer] = useState('');
  const [spokenAnswer, setSpokenAnswer] = useState('');

  const sceneN = useSpokenText(SCENE, true, reduced, () => setPhase((p) => (p === 'telling' ? 'asking' : p)));
  const replyN = useSpokenText(REPLY, phase === 'replying', reduced, () => {
    window.setTimeout(() => setPhase((p) => (p === 'replying' ? 'entering' : p)), 700);
  });

  /* The road answers the keystroke, not the end of the reply — motion that
     trails the thing that caused it reads as unrelated. */
  const moving = phase === 'replying' || phase === 'entering';

  const setOut = (): void => {
    setSpokenAnswer(answer.trim() || 'sit down');
    setPhase('replying');
  };

  return (
    <div className={'rd qa-landing' + (moving ? ' is-moving' : '') + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="near" moving={moving} />

      <button
        type="button"
        className="qa-landing-skip"
        onClick={() => { auth.setMode('login'); setPhase('entering'); }}
      >
        Sign in
      </button>

      <main className="rd-panel qa-scene-panel">
        <p className="rd-prose is-scene"><Spoken segs={SCENE} n={sceneN} /></p>

        {phase !== 'telling' && (
          <Turn
            phase={phase}
            answer={answer}
            setAnswer={setAnswer}
            spokenAnswer={spokenAnswer}
            placeholder="say hello, or ask what this is, or sit down"
            onAnswer={setOut}
            reduced={reduced}
          />
        )}

        {moving && <p className="rd-prose is-scene is-reply"><Spoken segs={REPLY} n={replyN} /></p>}

        {phase === 'entering' && (
          <form className="rd-form is-entering" onSubmit={auth.submit}>
            <p className="rd-label">{auth.mode === 'signup' ? 'Before you go further' : 'Welcome back'}</p>
            {auth.mode === 'signup' && (
              <label className="rd-field">
                <span>Name</span>
                <input type="text" value={auth.displayName} autoComplete="nickname" placeholder="what the others will call you" onChange={(e) => auth.setDisplayName(e.target.value)} />
              </label>
            )}
            <label className="rd-field">
              <span>Email</span>
              <input type="email" value={auth.email} autoComplete="email" onChange={(e) => auth.setEmail(e.target.value)} />
            </label>
            <label className="rd-field">
              <span>Password</span>
              <input type="password" value={auth.password} autoComplete={auth.mode === 'signup' ? 'new-password' : 'current-password'} onChange={(e) => auth.setPassword(e.target.value)} />
            </label>
            {auth.error && <p className="rd-error">{auth.error}</p>}
            <div className="rd-actions">
              <button type="submit" className="qa2-cta" disabled={auth.busy}>
                {auth.busy ? 'One moment' : auth.mode === 'signup' ? 'Set out' : 'Sign in'}
              </button>
              <button type="button" className="qa2-quiet-link" onClick={() => auth.setMode(auth.mode === 'signup' ? 'login' : 'signup')}>
                {auth.mode === 'signup' ? 'I have an account' : 'I am new here'}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* A page this diegetic owes a newcomer one literal answer to "what is
          this", and it should never be dressed up as part of the fiction. */}
      <footer className="qa-landing-foot">
        <b>Questra</b> is Dungeons &amp; Dragons for people who have never played it.
        Five friends, one browser, one evening — the rules, the dice and the bookkeeping run themselves.
        {onLegal && (
          <>
            {' '}
            <button type="button" className="qa-legal-link" onClick={onLegal}>Credits and licences</button>
          </>
        )}
      </footer>
    </div>
  );
}
