/**
 * node-pg-migrate runner. The repo standardized on `tsx` (not `ts-node`) as its
 * TypeScript runner, but node-pg-migrate only knows how to bootstrap ts-node for
 * `.ts` migrations. This wrapper preloads the tsx ESM loader via NODE_OPTIONS —
 * portable across cmd.exe (Windows/npm) and POSIX shells, with no cross-env dep —
 * then execs the CLI, forwarding args (`up` / `down` / `redo`, etc.).
 *
 * Usage (via package.json): npm run migrate:up -w @questra/server
 *
 * IT READS .env.local ITSELF, because nothing else here does. The SERVER loads
 * that file through config.ts's loadDotEnvLocal, so a developer who follows
 * .env.example — put DATABASE_URL in .env.local, run the migrations — used to
 * get "client password must be a string" from a script that had never looked at
 * the file. The env var still wins if it is already set, exactly as the server
 * treats it, so CI and production are unaffected.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, '..');
const args = process.argv.slice(2);

/* The same two candidates and the same do-not-override rule as the server's own
   loader (packages/server/src/config.ts). Kept as a copy rather than an import
   because that loader is TypeScript and this script runs as plain node. */
for (const path of [join(serverDir, '../../.env.local'), join(serverDir, '.env.local')]) {
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch { continue; }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key && process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim();
  }
  break;
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Put it in .env.local (see .env.example) and start the');
  console.error('database with: docker compose up -d');
  process.exit(1);
}

// The repo standardized on `tsx` (not `ts-node`). node-pg-migrate v7 has a native
// `--tsx` flag (it require()s `tsx/cjs` itself) — so we run its JS entrypoint
// directly with that flag, no ts-node and no NODE_OPTIONS loader needed. Resolve
// the entrypoint from the hoisted install so PATH is irrelevant on Windows.
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('node-pg-migrate/package.json'));
const entry = join(pkgDir, 'bin', 'node-pg-migrate.js');

const result = spawnSync(
  process.execPath,
  [entry, '--tsx', '--tsconfig', 'tsconfig.json', '-m', 'src/store/migrations', ...args],
  { cwd: serverDir, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
