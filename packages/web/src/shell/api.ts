/**
 * shell/api — the thin fetch client every shell screen talks to the server
 * through. One place that knows the API's base URL, attaches the bearer
 * access token, and turns a `{ error, reason }` body (routes.ts / campaign-routes.ts's
 * shared error shape) into a typed, catchable ApiError.
 *
 * `credentials: 'include'` on every call is what lets the httpOnly refresh
 * cookie (Brief 14 §1: "the refresh token lives ONLY in the cookie") ride
 * along cross-origin to the server on :8787.
 */
const API_BASE = (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

interface ErrorBody { error?: string; reason?: string }

export async function apiRequest<T>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; token?: string | null } = {},
): Promise<T> {
  /* The content-type header is sent ONLY when there is a body to describe.
     Declaring application/json on a bodyless POST makes Fastify reject the
     request with FST_ERR_CTP_EMPTY_JSON_BODY (400) before any handler runs —
     which is exactly what POST /auth/refresh does, since the refresh token
     rides in an httpOnly cookie rather than the body. Every page load was
     firing two failing refresh calls because of this. */
  const hasBody = opts.body !== undefined;
  const res = await fetch(API_BASE + path, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(opts.body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as T & ErrorBody;
  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? 'unknown', json.reason ?? 'Something went wrong. Try again.');
  }
  return json;
}
