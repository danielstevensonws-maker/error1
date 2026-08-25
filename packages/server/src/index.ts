/**
 * @questra/server — the sync server. SyncCore holds the wire logic (transport-
 * agnostic, testable over an in-memory socket pair); the ws/Fastify adapter in
 * main.ts is the thin transport (ADR-0011). Reuses the contracts visibility
 * filter and the engine fold/pipeline; never imports AI directly (ADR-0005).
 */
export * from './transport.js';
export * from './sync-core.js';
export * from './store/event-store.js';
export * from './store/postgres-event-store.js';
