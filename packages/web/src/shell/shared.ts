/**
 * shell/shared — the two things every shell screen needs and none of them
 * should own privately.
 *
 * The screens differ in what they say and where things sit; what they must NOT
 * differ in is what happens when somebody actually signs up, or whether they
 * respect a reduced-motion preference. Both are behaviour, so both live here.
 */
import { useCallback, useEffect, useState } from 'react';
import type { SessionApi } from './session.js';

/**
 * True when the visitor has asked the OS for less motion.
 *
 * The shell leans on JS-driven choreography (narration that types at speech
 * cadence, a table that wakes when you answer), and CSS
 * alone cannot switch those off — @questra/theme's global reduced-motion rule
 * collapses animation DURATIONS but a setInterval keeps right on ticking. So
 * each screen reads this and renders the settled end state directly.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (): void => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Every concept is the same screen with the same two jobs, so they share a shape. */
export interface ConceptProps {
  session: SessionApi;
  onEntered: () => void;
}

export type AuthMode = 'signup' | 'login';

export interface AuthState {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  busy: boolean;
  error: string | null;
  submit: (e: { preventDefault: () => void }) => void;
}

/**
 * Sign-up / sign-in, with the failure path treated as a real state rather
 * than an afterthought: a rejected password leaves every field intact and
 * says what to do next, because retyping an email you already typed is the
 * fastest way to lose someone at the door.
 */
export function useAuth(session: SessionApi, onEntered: () => void): AuthState {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback((e: { preventDefault: () => void }): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        if (mode === 'signup') await session.signup(email, password, displayName);
        else await session.login(email, password);
        onEntered();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through. Check the details and try again.');
      } finally {
        setBusy(false);
      }
    })();
  }, [mode, email, password, displayName, session, onEntered]);

  return { mode, setMode, email, setEmail, password, setPassword, displayName, setDisplayName, busy, error, submit };
}
