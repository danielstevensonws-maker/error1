/**
 * The async half of resolveToken (Brief 14 §1) — every other wire test supplies a
 * synchronous resolveToken and asserts on `received` immediately after `hello()`,
 * which is only safe because SyncCore special-cases the sync return and skips the
 * microtask an `await` would cost. This file is what proves the OTHER branch —
 * resolveToken returning a Promise, the shape `makeResolveToken` (the real
 * Brief 14 auth: a JWT verify + a Postgres membership lookup) actually returns —
 * still resolves `hello` correctly once awaited.
 */
import { describe, it, expect } from 'vitest';
import type { ServerMsg } from '@questra/contracts';
import { SyncCore, type ResolvedToken } from '../src/sync-core.js';
import { connectMemory } from '../src/transport.js';

const PS = 'ps-async';

function newAsyncCore(table: Record<string, ResolvedToken>) {
  return new SyncCore({
    resolveToken: async (token, playSessionId) => {
      await Promise.resolve(); // force a real microtask hop, like a DB lookup would
      const r = table[token];
      return r && r.playSessionId === playSessionId ? r : null;
    },
    resolveIntent: () => ({ ok: false, reason: 'not used' }),
  });
}

describe('resolveToken returning a Promise', () => {
  it('a valid token still gets a welcome once the promise settles', async () => {
    const core = newAsyncCore({ 'tok-good': { accountId: 'acct-1', role: 'player', playSessionId: PS } });
    const client = connectMemory(core);
    client.send({ m: 'hello', playSessionId: PS, token: 'tok-good' });

    // the send has not landed yet — onHello is mid-await
    expect(client.received).toHaveLength(0);

    await Promise.resolve();
    await Promise.resolve();

    const welcome = client.received.find((m): m is Extract<ServerMsg, { m: 'welcome' }> => m.m === 'welcome');
    expect(welcome?.viewer.role).toBe('player');
  });

  it('an unknown token still gets an auth error, not a hang', async () => {
    const core = newAsyncCore({});
    const client = connectMemory(core);
    client.send({ m: 'hello', playSessionId: PS, token: 'tok-nope' });

    await Promise.resolve();
    await Promise.resolve();

    expect(client.received.some((m) => m.m === 'error' && m.code === 'auth')).toBe(true);
  });

  it('a rejected resolveToken reports an error instead of an unhandled rejection', async () => {
    const core = new SyncCore({
      resolveToken: async () => { throw new Error('db is down'); },
      resolveIntent: () => ({ ok: false, reason: 'not used' }),
    });
    const client = connectMemory(core);
    client.send({ m: 'hello', playSessionId: PS, token: 'anything' });

    await Promise.resolve();
    await Promise.resolve();

    expect(client.received.some((m) => m.m === 'error')).toBe(true);
  });
});
