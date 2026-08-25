/**
 * shell/session — the account session as React context. Holds the SHORT-LIVED
 * access token in memory only (never localStorage — an XSS'd page shouldn't be
 * able to read it back out later), and leans on the httpOnly refresh cookie
 * (Brief 14 §1) to re-establish a session on load and to survive an access
 * token expiring mid-visit.
 *
 * `authedRequest` is what every other shell screen calls through: it attaches
 * the current token, and on a 401 tries exactly one silent refresh before
 * giving up — a page that's been open past the 15-minute access-token TTL
 * should not dead-end the next request into an avoidable sign-in prompt.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { SelfAccountSchema, type SelfAccount } from '@questra/contracts';
import { apiRequest, ApiError } from './api.js';

export interface SessionApi {
  account: SelfAccount | null;
  /** Still resolving the page-load refresh — render a loading state, not Landing. */
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * The current access token, for the ONE consumer that cannot use
   * authedRequest: the sync socket, whose hello carries the token in the
   * message body rather than an Authorization header.
   *
   * Deliberately a getter rather than a value: the token is held in a ref and
   * rotates on refresh, so a snapshot handed out at render time would go stale.
   * Returns null while the session is still resolving — not an error, just not
   * ready yet. Nothing else should call this; use authedRequest.
   */
  accessToken: () => string | null;
  /** For Home/Join/Nav: an authenticated call that refreshes once on a 401. */
  authedRequest: <T>(path: string, opts?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown }) => Promise<T>;
}

const SessionContext = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession() called outside <SessionProvider>.');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }): ReactElement {
  const [account, setAccount] = useState<SelfAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  /* The single in-flight page-load refresh, shared by every caller — see the
     mount effect for why sharing it is load-bearing rather than an optimisation. */
  const bootstrapRef = useRef<Promise<{ access: string; exp: number } | null> | null>(null);

  /** GET /auth/me — the one source of the display name, everywhere a session starts. */
  const fetchSelf = useCallback(async (token: string): Promise<SelfAccount> => {
    return SelfAccountSchema.parse(await apiRequest<SelfAccount>('/auth/me', { token }));
  }, []);

  const applyToken = useCallback(async (access: string) => {
    tokenRef.current = access;
    setAccount(await fetchSelf(access));
  }, [fetchSelf]);

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    await apiRequest('/auth/signup', { method: 'POST', body: { email, password, displayName } });
    // signup does not log in by itself (email verification is a separate step per
    // the ladder) — but the M3 shell has nowhere to send an unverified visitor
    // except back to Landing, so it logs in immediately behind it; verification
    // status is carried on the account (emailVerified) and can gate features
    // later without blocking "create → join → play" today.
    const { access } = await apiRequest<{ access: string; exp: number }>('/auth/login', { method: 'POST', body: { email, password } });
    await applyToken(access);
  }, [applyToken]);

  const login = useCallback(async (email: string, password: string) => {
    const { access } = await apiRequest<{ access: string; exp: number }>('/auth/login', { method: 'POST', body: { email, password } });
    await applyToken(access);
  }, [applyToken]);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {}); // best-effort — clear local state regardless
    tokenRef.current = null;
    setAccount(null);
  }, []);

  const authedRequest = useCallback(async <T,>(path: string, opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}): Promise<T> => {
    try {
      return await apiRequest<T>(path, { ...opts, token: tokenRef.current });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && tokenRef.current) {
        const refreshed = await apiRequest<{ access: string; exp: number }>('/auth/refresh', { method: 'POST' }).catch(() => null);
        if (refreshed) {
          tokenRef.current = refreshed.access;
          return apiRequest<T>(path, { ...opts, token: tokenRef.current });
        }
        tokenRef.current = null;
        setAccount(null);
      }
      throw err;
    }
  }, []);

  /**
   * On mount: try the refresh cookie silently. A visitor with no cookie (or an
   * expired one) just lands on Landing — that is not an error state.
   *
   * THE PROMISE IS SHARED ACROSS CALLS, AND THAT IS LOAD-BEARING. Refresh
   * tokens ROTATE — service.ts revokes the old one the moment it is redeemed —
   * and React StrictMode deliberately double-invokes mount effects in
   * development. The naive version fired two refreshes: the first rotated the
   * cookie, the second presented the now-dead token, got a 401, and left
   * `account` null. The visitor was then bounced from /home to Landing despite
   * holding a perfectly good session, and only on a reload, which made it look
   * like a routing bug rather than an auth one.
   *
   * A `cancelled` flag cannot fix this — it guards the state update, not the
   * duplicate request that already burned the token. So the in-flight promise
   * is memoised on a ref: both invocations await the same single redemption.
   * This is also correct outside StrictMode, where any two concurrent callers
   * would race the same way.
   */
  useEffect(() => {
    let cancelled = false;
    bootstrapRef.current ??= apiRequest<{ access: string; exp: number }>('/auth/refresh', { method: 'POST' })
      .catch(() => null);

    void bootstrapRef.current
      .then(async (r) => {
        if (cancelled || !r) return;
        await applyToken(r.access);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [applyToken]);

  /* A getter, not a snapshot: the token rotates on refresh, so anything that
     captured a value at render time would hold a stale one. */
  const accessToken = useCallback((): string | null => tokenRef.current, []);

  const value = useMemo<SessionApi>(
    () => ({ account, loading, signup, login, logout, authedRequest, accessToken }),
    [account, loading, signup, login, logout, authedRequest, accessToken],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
