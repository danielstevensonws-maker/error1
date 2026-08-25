/**
 * The ws + Fastify transport adapter (ADR-0011) — the thin layer that binds real
 * WebSocket sockets to SyncCore through the Connection interface. All protocol
 * logic lives in SyncCore; this file only translates sockets ↔ messages.
 *
 * Run with `npm run dev -w @questra/server`. The SyncCore passed in carries the
 * real `resolveToken` (Brief 14 §1: `makeResolveToken`) when auth is wired; the
 * intent resolver is still the engine pipeline seam (Brief 02).
 */
import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer, type WebSocket } from 'ws';
import { ClientMsgSchema, type ServerMsg } from '@questra/contracts';
import { SyncCore } from './sync-core.js';
import type { Connection } from './transport.js';

export interface StartOptions {
  port?: number;
  core: SyncCore;
  /**
   * Optional auth wiring (Brief 14 §1). When present, /auth/* routes mount and the
   * SyncCore's `resolveToken` should be `makeResolveToken(repo, tokenCfg)`. Absent
   * ⇒ a bare sync server (dev without accounts, tests).
   */
  auth?: (app: FastifyInstance) => void;
  /**
   * Load a campaign's characters before its play session is created, so the
   * session can seat them. Optional: a bare sync server (tests, dev without
   * accounts) has no roster to load and seats nobody.
   */
  primeCampaignRoster?: (playSessionId: string) => Promise<void>;
  /** The web app's origin (undefined ⇒ no CORS registered — tests hit the app directly). */
  corsOrigin?: string;
}

/** Start the HTTP (Fastify) + WebSocket (ws) server. Returns a stop() handle. */
export async function start(opts: StartOptions): Promise<{ port: number; stop: () => Promise<void> }> {
  const primeRoster = opts.primeCampaignRoster ?? (async () => { /* no accounts wired */ });
  const app = Fastify({ logger: false });
  if (opts.corsOrigin) {
    // credentialed (the refresh cookie) — `*` can't carry credentials, so this is a
    // named origin, not a wildcard (ADR-0004 spirit: least surface, not "allow everyone").
    await app.register(cors, { origin: opts.corsOrigin, credentials: true });
  }
  app.get('/health', async () => ({ ok: true }));
  opts.auth?.(app);

  const server = app.server;
  const wss = new WebSocketServer({ server });
  let connSeq = 0;

  wss.on('connection', (socket: WebSocket) => {
    const connId = `ws-${++connSeq}`;
    const conn: Connection = {
      connId,
      send(msg: ServerMsg) {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
      },
      close(reason?: string) {
        socket.close(1000, reason);
      },
    };
    opts.core.onConnect(conn);

    socket.on('message', (data) => {
      let json: unknown;
      try { json = JSON.parse(String(data)); } catch { return conn.send({ m: 'error', code: 'bad_message' }); }
      const parsed = ClientMsgSchema.safeParse(json);
      if (!parsed.success) return conn.send({ m: 'error', code: 'bad_message' });

      /* TWO THINGS HAVE TO HAPPEN BEFORE A HELLO IS HANDLED, and both are async
         while the seam that needs them is not.

         The roster first: a session seats its characters when it is created,
         and creation happens inside onMessage's hello path, which cannot await.
         So it is loaded here and cached for the synchronous seam to read.

         Then the DURABLE LOG. SyncCore.hydrate loads a session's events back out
         of the store, and until 2026-08-25 nothing called it — the method
         existed, its own comment said "the transport awaits this on the first
         hello", and the transport did not. Only the durability test called it,
         directly, so the test passed while the real server started every session
         from an empty log: with Postgres wired, a DM could bring a monster in,
         see it written to play_event, restart, and find the board empty.

         Ordered, not parallel: hydrate creates the session if it does not exist,
         and creating it reads the roster cache. Priming after that would seat
         nobody. Both are best-effort — a table that cannot reach the store
         should still open, empty, rather than refuse the connection. */
      if (parsed.data.m === 'hello') {
        const { playSessionId } = parsed.data;
        void primeRoster(playSessionId)
          .catch(() => { /* an unprimed session seats nobody; the next hello retries */ })
          .then(() => opts.core.hydrate(playSessionId))
          .catch((err: unknown) => { console.error('[questra] could not restore the log for', playSessionId, err); })
          .then(() => opts.core.onMessage(conn, parsed.data));
        return;
      }
      opts.core.onMessage(conn, parsed.data);
    });
    socket.on('close', () => opts.core.onDisconnect(conn));
  });

  const requested = opts.port ?? 8787;
  await app.listen({ port: requested, host: '0.0.0.0' });

  /* The port it ACTUALLY got, not the one it was asked for. They differ for
     exactly one input — 0, meaning "any free port" — and that is the input a
     test needs, so returning the request made start() impossible to connect to
     from a test and left main.ts with no coverage at all. */
  const bound = app.server.address();
  const port = typeof bound === 'object' && bound !== null ? bound.port : requested;

  return {
    port,
    stop: async () => {
      wss.close();
      await app.close();
    },
  };
}

// ---------------------------------------------------------------- entrypoint
/**
 * Run directly (`npm run dev -w @questra/server`) — the ADR-0015 dev-env entrypoint.
 * Loads .env.local, builds the wired app (Postgres if DATABASE_URL is set), mounts
 * /auth/* + the real resolveToken, and listens on 0.0.0.0 so a second physical
 * device can join. Guarded so importing this module (tests) does not start a server.
 */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { loadDotEnvLocal, readConfig } = await import('./config.js');
  const { createApp } = await import('./app.js');
  loadDotEnvLocal();
  const config = readConfig();
  const built = createApp(config);
  const { port } = await start({ core: built.core, auth: built.auth, primeCampaignRoster: built.primeCampaignRoster, port: config.port, corsOrigin: config.webOrigin });
  const where = config.databaseUrl ? 'Postgres (durable)' : 'in-memory (no DATABASE_URL)';
  console.log(`[questra] server on http://0.0.0.0:${port} — store: ${where}`);
  const shutdown = async () => { await built.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
