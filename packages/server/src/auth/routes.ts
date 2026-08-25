/**
 * Auth HTTP routes (Brief 14 §1) — a thin Fastify shell over AuthService. All flow
 * logic lives in the service (tested by the ladder golden); these handlers only
 * parse input at the boundary (zod), map AuthError → status, and manage the
 * httpOnly refresh cookie. The refresh token lives ONLY in the cookie, never a body.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService, AuthError } from './service.js';

const REFRESH_COOKIE = 'questra_refresh';

const SignupBody = z.object({ email: z.string().email(), password: z.string().min(8), displayName: z.string().min(1).max(80) });
const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
const TokenBody = z.object({ token: z.string().min(1) });
const EmailBody = z.object({ email: z.string().email() });
const ResetConfirmBody = z.object({ token: z.string().min(1), password: z.string().min(8) });

/** Parse a cookie header for the refresh token (no cookie plugin dependency). */
function readRefreshCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === REFRESH_COOKIE) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function setRefreshCookie(reply: { header(k: string, v: string): unknown }, refresh: string): void {
  reply.header(
    'set-cookie',
    `${REFRESH_COOKIE}=${encodeURIComponent(refresh)}; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=2592000`,
  );
}

/**
 * Register /auth/* routes. `currentAccountId` extracts the caller for authenticated
 * routes (deletion) from the Authorization: Bearer access token — supplied by the
 * composition root so this file stays free of token-verify wiring.
 */
export function registerAuthRoutes(
  app: FastifyInstance,
  service: AuthService,
  currentAccountId: (authorization: string | undefined) => Promise<string | null>,
): void {
  const handle = async (reply: { code(n: number): unknown }, fn: () => Promise<unknown>) => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AuthError) {
        reply.code(err.status);
        return { error: err.code, reason: err.message };
      }
      throw err;
    }
  };

  app.post('/auth/signup', async (req, reply) => handle(reply, async () => {
    const b = SignupBody.parse(req.body);
    const { self } = await service.signup(b.email, b.password, b.displayName);
    reply.code(201);
    return self; // verification token goes by email (LogMailer in dev), never in the response
  }));

  app.post('/auth/verify', async (req, reply) => handle(reply, async () => {
    await service.verifyEmail(TokenBody.parse(req.body).token);
    return { ok: true };
  }));

  app.post('/auth/login', async (req, reply) => handle(reply, async () => {
    const b = LoginBody.parse(req.body);
    const { access, exp, refresh } = await service.login(b.email, b.password);
    setRefreshCookie(reply, refresh);
    return { access, exp };
  }));

  app.get('/auth/me', async (req, reply) => handle(reply, async () => {
    const accountId = await currentAccountId(req.headers.authorization);
    if (!accountId) { reply.code(401); return { error: 'auth', reason: 'Please sign in.' }; }
    return service.getSelf(accountId);
  }));

  app.post('/auth/refresh', async (req, reply) => handle(reply, async () => {
    const raw = readRefreshCookie(req.headers.cookie);
    if (!raw) { reply.code(401); return { error: 'no_refresh', reason: 'Please sign in again.' }; }
    const { access, exp, refresh } = await service.refresh(raw);
    setRefreshCookie(reply, refresh);
    return { access, exp };
  }));

  app.post('/auth/logout', async (req, reply) => handle(reply, async () => {
    const raw = readRefreshCookie(req.headers.cookie);
    if (raw) await service.logout(raw);
    reply.header('set-cookie', `${REFRESH_COOKIE}=; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=0`);
    return { ok: true };
  }));

  app.post('/auth/reset/request', async (req, reply) => handle(reply, async () => {
    await service.requestReset(EmailBody.parse(req.body).email);
    return { ok: true }; // always 200 — no account enumeration
  }));

  app.post('/auth/reset/confirm', async (req, reply) => handle(reply, async () => {
    const b = ResetConfirmBody.parse(req.body);
    await service.confirmReset(b.token, b.password);
    return { ok: true };
  }));

  app.delete('/auth/account', async (req, reply) => handle(reply, async () => {
    const accountId = await currentAccountId(req.headers.authorization);
    if (!accountId) { reply.code(401); return { error: 'auth', reason: 'Please sign in.' }; }
    await service.deleteAccount(accountId); // throws AuthError 409 if they own a live campaign
    return { ok: true };
  }));
}
