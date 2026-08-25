/**
 * Join (Brief 14 §3) — `/join/:code`. "This is the player's entire front door
 * — it gets polish priority" (brief-14 §3).
 *
 * THE SECOND AND LAST CONVERSATION IN THE SHELL. Same mechanic as Landing,
 * different words, because the arriving person is in a different situation:
 * an invite means the party already exists, so the scene starts further along
 * the road. Landing asks whether you will go at all; Join takes that as read
 * and is about catching up to people who left before you.
 *
 * WHAT THE SCENE IS ALLOWED TO CLAIM. `JoinPreview` carries campaignName and
 * nothing else — no host name, no member count — so the copy says "somebody"
 * and never names the DM or counts the party. Writing "Mira went north four
 * days ago" would need hostName and memberCount added to the contract, the
 * unauthenticated handler and the goldens, and it would widen what a public
 * link discloses. Deliberately deferred; do not invent either value here.
 *
 * The campaign's real name IS known, so it is the one piece of hard fact on
 * the screen and it is set as a title rather than folded into the prose —
 * a person following a friend's link needs to see that they are in the right
 * place before they will read anything else.
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { JoinPreview } from '@questra/contracts';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { Spoken, Turn, useSpokenText, type Phase, type Seg } from './road/Scene.js';
import { usePrefersReducedMotion } from './shared.js';
import type { SessionApi } from './session.js';
import { apiRequest, ApiError } from './api.js';

export interface JoinFlowProps {
  code: string;
  session: SessionApi;
  onJoined: (campaignId: string) => void;
}

const SCENE: Seg[] = [
  { t: 'Somebody set this table up and kept a chair back for a fifth.' },
  { t: '\n\nThe map is already marked. Whatever they are planning, it started without you and it has not started yet.' },
];

const REPLY: Seg[] = [
  { t: 'The chair is yours.' },
  { t: '\n\nThey will explain the rest when you get there — and anything they forget, the table handles ' },
  { t: 'for', em: true },
  { t: ' you.' },
];

export function JoinFlow({ code, session, onJoined }: JoinFlowProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('telling');
  const [answer, setAnswer] = useState('');
  const [spokenAnswer, setSpokenAnswer] = useState('');

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<JoinPreview>(`/join/${code}`)
      .then((r) => { if (!cancelled) setPreview(r); })
      .catch((e) => { if (!cancelled) setPreviewError(e instanceof ApiError ? e.message : "That invite link doesn't work anymore."); });
    return () => { cancelled = true; };
  }, [code]);

  /* The scene waits for the preview. Typing a story over a link that turns out
     to be dead is a worse first impression than a half-second of nothing. */
  const ready = preview !== null;
  const sceneN = useSpokenText(SCENE, ready, reduced, () => setPhase((p) => (p === 'telling' ? 'asking' : p)));
  const replyN = useSpokenText(REPLY, phase === 'replying', reduced, () => {
    window.setTimeout(() => setPhase((p) => (p === 'replying' ? 'entering' : p)), 700);
  });

  const moving = phase === 'replying' || phase === 'entering';

  const doJoin = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const r = await session.authedRequest<{ campaignId: string; campaignName: string }>(`/join/${code}`, { method: 'POST' });
      onJoined(r.campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitAuth = (e: { preventDefault: () => void }): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        if (mode === 'signup') await session.signup(email, password, displayName);
        else await session.login(email, password);
        await doJoin();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
        setBusy(false);
      }
    })();
  };

  if (previewError) {
    return (
      <div className={'rd qa-join' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="near" />
        <main className="rd-panel qa-scene-panel">
          <p className="rd-prose is-scene">This link has been closed.</p>
          <p className="rd-label">This invite link no longer works</p>
          <p className="rd-detail">{previewError}</p>
          <p className="rd-detail">Ask whoever sent it for a fresh one — join links can be turned off by the person running the game.</p>
        </main>
      </div>
    );
  }

  return (
    <div className={'rd qa-join' + (moving ? ' is-moving' : '') + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="near" moving={moving} />

      <main className="rd-panel qa-scene-panel">
        {/* The one hard fact on the screen, and the reason a person believes
            they are in the right place. It arrives before the scene does. */}
        <div className="qa-scene-head">
          <p className="rd-label">You have been asked to join</p>
          <h1 className="rd-title">{preview ? preview.campaignName : ' '}</h1>
        </div>

        <p className="rd-prose is-scene"><Spoken segs={SCENE} n={sceneN} /></p>

        {phase !== 'telling' && (
          <Turn
            phase={phase}
            answer={answer}
            setAnswer={setAnswer}
            spokenAnswer={spokenAnswer}
            placeholder="say hello, or ask what you have joined"
            onAnswer={() => { setSpokenAnswer(answer.trim() || 'sit down'); setPhase('replying'); }}
            reduced={reduced}
          />
        )}

        {moving && <p className="rd-prose is-scene is-reply"><Spoken segs={REPLY} n={replyN} /></p>}

        {phase === 'entering' && (
          session.account ? (
            /* Already signed in: no form, one action. The scene has done its
               job and the only thing left is to say yes. */
            <div className="rd-form is-entering">
              <p className="rd-label">Joining as {session.account.displayName}</p>
              {error && <p className="rd-error">{error}</p>}
              <div className="rd-actions">
                <button type="button" className="qa2-cta" disabled={busy} onClick={() => { void doJoin(); }}>
                  {busy ? 'One moment' : 'Catch them up'}
                </button>
              </div>
            </div>
          ) : (
            <form className="rd-form is-entering" onSubmit={submitAuth}>
              <p className="rd-label">{mode === 'signup' ? 'Before you go further' : 'Welcome back'}</p>
              {mode === 'signup' && (
                <label className="rd-field">
                  <span>Name</span>
                  <input type="text" value={displayName} autoComplete="nickname" placeholder="what the others will call you" onChange={(e) => setDisplayName(e.target.value)} />
                </label>
              )}
              <label className="rd-field">
                <span>Email</span>
                <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="rd-field">
                <span>Password</span>
                <input type="password" value={password} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onChange={(e) => setPassword(e.target.value)} />
              </label>
              {error && <p className="rd-error">{error}</p>}
              <div className="rd-actions">
                <button type="submit" className="qa2-cta" disabled={busy}>
                  {busy ? 'One moment' : 'Catch them up'}
                </button>
                <button type="button" className="qa2-quiet-link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
                  {mode === 'signup' ? 'I have an account' : 'I am new here'}
                </button>
              </div>
            </form>
          )
        )}
      </main>
    </div>
  );
}
