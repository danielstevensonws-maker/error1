/**
 * The durable log, restored over the ACTUAL WebSocket — not by calling hydrate.
 *
 * WHY THIS EXISTS, AND WHY THE TEST BESIDE IT WAS NOT ENOUGH.
 * `persistence.golden.test.ts` proves the store round-trips: it appends through
 * Postgres, builds a fresh SyncCore, and calls `core2.hydrate(PS)` directly.
 * That passed for weeks while the real server restored nothing, because nothing
 * in the transport ever called `hydrate`. Its own doc comment said "the
 * transport awaits this on the first hello"; the transport did not. The only
 * caller was the test.
 *
 * So this one refuses the shortcut. It boots the real `start()` — Fastify, the
 * ws server, `main.ts`'s hello path — connects a real socket, and asks what a
 * client is actually told. That is the seam the other test steps over, and
 * `main.ts` had no test of any kind before this.
 *
 * The failure it pins is not subtle: with Postgres wired, a DM could bring a
 * monster in, watch the event land in `play_event`, restart the server, and
 * find the board empty (found by running it, 2026-08-25).
 *
 * SKIPS CLEANLY without a database, like its neighbour, so `check:all` and CI
 * stay green without one. Bring it up with:
 *   docker compose up -d && npm run migrate:up -w @questra/server
 */
import { describe, it, expect, afterAll } from 'vitest';
import pg from 'pg';
import { WebSocket } from 'ws';
import type { PlayEvent, ServerMsg } from '@questra/contracts';
import { SyncCore, PostgresEventStore, type ResolvedToken, type IntentResolver } from '../src/index.js';
import { start } from '../src/main.js';

const DATABASE_URL = process.env.DATABASE_URL;
const PS = `ps-wire-${Date.now()}`;
const TOKEN = 'tok-dm';

async function postgresReady(): Promise<boolean> {
  if (!DATABASE_URL) return false;
  const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 1500 });
  try {
    await pool.query('SELECT 1 FROM play_event LIMIT 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

const resolveToken = (token: string, playSessionId: string): ResolvedToken | null =>
  token === TOKEN && playSessionId === PS
    ? { role: 'dm', accountId: 'acct-dm', playSessionId: PS }
    : null;

/** Turns any intent into one narration event, so the test owns the log's shape. */
const resolveIntent: IntentResolver = (envelope, state) => ({
  ok: true,
  events: [{
    seq: state.nextSeq,
    id: `e-${String(state.nextSeq)}`,
    at: '2026-08-25T00:00:00.000Z',
    causeId: `c-${String(state.nextSeq)}`,
    actor: { kind: 'dm' as const, accountId: 'acct-dm' },
    visibility: 'public' as const,
    body: {
      t: 'narration' as const,
      text: (envelope.intent as { text?: string }).text ?? '',
      from: 'dm' as const,
    },
  } satisfies PlayEvent],
});

/** Boot a real server on an ephemeral port, as a restart would. */
async function boot() {
  const store = new PostgresEventStore(DATABASE_URL!);
  const core = new SyncCore({ resolveToken, resolveIntent, store });
  const handle = await start({ core, port: 0 });
  return { core, store, handle };
}

/** Say hello over a real socket and collect what comes back. */
async function helloAndListen(port: number, forMs = 900): Promise<ServerMsg[]> {
  const got: ServerMsg[] = [];
  const ws = new WebSocket(`ws://127.0.0.1:${String(port)}`);
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => { resolve(); });
    ws.on('error', reject);
  });
  ws.on('message', (raw) => { got.push(JSON.parse(String(raw)) as ServerMsg); });
  ws.send(JSON.stringify({ m: 'hello', playSessionId: PS, token: TOKEN }));
  await new Promise((r) => setTimeout(r, forMs));
  ws.close();
  return got;
}

const LINE = 'The floor gives way.';

/* Probed at COLLECTION time, so a missing database shows as SKIPPED in the
   reporter rather than as a passing test that quietly returned. That confusion
   is exactly what let the neighbouring durability suite report green for weeks
   without ever reaching Postgres. */
const ready = await postgresReady();

describe.skipIf(!ready)('a session restored over the wire', () => {
  afterAll(async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL! });
    await pool.query('DELETE FROM idempotency WHERE play_session_id = $1', [PS]).catch(() => {});
    /* play_event refuses DELETE by trigger — it is append-only by design, which
       is the property under test. The rows are keyed to a per-run session id, so
       they are inert rather than in the way. */
    await pool.end().catch(() => {});
  });

  it('gives a reconnecting client the log a previous process wrote', async () => {
    // --- process #1: say something, and make sure it reached the store -------
    const first = await boot();
    const port1 = first.handle.port;
    const ws = new WebSocket(`ws://127.0.0.1:${String(port1)}`);
    await new Promise<void>((resolve, reject) => { ws.on('open', () => { resolve(); }); ws.on('error', reject); });
    ws.send(JSON.stringify({ m: 'hello', playSessionId: PS, token: TOKEN }));
    await new Promise((r) => setTimeout(r, 400));
    ws.send(JSON.stringify({
      m: 'intent',
      envelope: { idempotencyKey: 'k-wire-0001', intent: { kind: 'free_text', creatureId: 'dm', text: LINE } },
    }));
    await new Promise((r) => setTimeout(r, 600));
    await first.core.flush(PS);
    ws.close();
    await first.handle.stop();
    await first.store.close();

    // --- process #2: a fresh everything, exactly as a restart gives you ------
    const second = await boot();
    const got = await helloAndListen(second.handle.port);
    await second.handle.stop();
    await second.store.close();

    const text = JSON.stringify(got);
    expect(
      text.includes(LINE),
      'a restarted server must replay what the last one wrote — hydrate has to be called by the TRANSPORT, not only by a test',
    ).toBe(true);
  }, 30_000);

  /**
   * REPLAY MUST NOT DOUBLE THE LOG. `hydrate` adopts the durable log only when
   * the session has produced nothing in memory yet, and that guard is the only
   * thing standing between a reconnect and a table seeing every line twice.
   * Worth pinning here rather than in a unit test, because the guard is reached
   * through the transport and the transport is what was skipping it.
   */
  it('replays the line once, not once per connection', async () => {
    const s = await boot();

    const first = await helloAndListen(s.handle.port);
    const second = await helloAndListen(s.handle.port);

    await s.handle.stop();
    await s.store.close();

    const count = (msgs: ServerMsg[]): number =>
      msgs.filter((m) => JSON.stringify(m).includes(LINE)).length;

    expect(count(first), 'the line the previous process wrote').toBe(1);
    expect(count(second), 'a second client joining must not double it').toBe(1);
  }, 30_000);
});
