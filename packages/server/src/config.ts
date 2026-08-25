/**
 * Dev-env config (ADR-0015) — reads the environment into a typed config, and loads
 * .env.local for local dev/tests if present. Production sets real env vars; the app
 * reads DATABASE_URL / QUESTRA_JWT_SECRET either way (no code difference).
 *
 * Store selection is DATABASE_URL-driven: set ⇒ Postgres (durable), unset ⇒
 * in-memory (bare dev without a database, and CI).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Minimal .env.local loader — no dotenv dep. Only sets keys not already in env. */
export function loadDotEnvLocal(): void {
  // repo root is three levels up from packages/server/src
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, '../../../.env.local'), join(here, '../.env.local')];
  for (const path of candidates) {
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
    return; // first found wins
  }
}

export interface ServerConfig {
  port: number;
  /** Set ⇒ Postgres stores; unset ⇒ in-memory (dev/CI). */
  databaseUrl: string | undefined;
  /** JWT signing secret (ADR-0004). Required whenever auth is wired. */
  jwtSecret: string | undefined;
  /** The web app's origin, for the /auth + /campaigns CORS allowlist (credentialed —
   *  the refresh cookie needs a named origin, `*` can't carry credentials). */
  webOrigin: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: env.PORT ? Number(env.PORT) : 8787,
    databaseUrl: env.DATABASE_URL || undefined,
    jwtSecret: env.QUESTRA_JWT_SECRET || undefined,
    webOrigin: env.QUESTRA_WEB_ORIGIN || 'http://localhost:5173',
  };
}
