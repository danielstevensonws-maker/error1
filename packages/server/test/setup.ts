/**
 * Test setup: give vitest the same environment the server gets.
 *
 * WHY THIS EXISTS. Three suites here talk to a real Postgres and skip when
 * DATABASE_URL is unset — which is the right behaviour for CI. But nothing gave
 * vitest that variable: the SERVER reads .env.local through config.ts's loader,
 * and the test process never did. So the moment a developer configured a
 * database exactly as .env.example tells them to, the tests that exercise it
 * carried on skipping, reported "passed", and the ADR-0015 exit criterion —
 * the event log survives a restart — went unverified while looking verified.
 *
 * The same loader the server uses, so there is one answer to "where does
 * DATABASE_URL come from" rather than two. A variable already in the real
 * environment still wins, so CI is unaffected.
 */
import { loadDotEnvLocal } from '../src/config.js';

loadDotEnvLocal();
