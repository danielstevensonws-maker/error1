/**
 * SyncCore — the transport-agnostic wire logic (Brief 05 §2). Holds each play
 * session's append-only event log, derives Viewers from tokens, and drives the
 * protocol: join/snapshot/replay/reconnect, per-viewer visibility fan-out,
 * idempotent intents, presence, and prompt timeouts.
 *
 * NON-NEGOTIABLE #3: all fan-out filtering goes through the contracts
 * `eventVisibleTo` — there is NO second visibility implementation here. Snapshots
 * come from the engine's `fold` (§2.8), never a hand-maintained state.
 *
 * The server never imports AI directly. Intent legality (and thus the reject
 * reason == client greying string, §2.4/§4.4) is decided by an injected legality
 * function that is the SAME one the client uses for greying.
 */
import {
  eventVisibleTo,
  filterStream,
  ClientMsgSchema,
  type ClientMsg,
  type ServerMsg,
  type PlayEvent,
  type Viewer,
  type ViewerRole,
  type EffectId,
} from '@questra/contracts';
import { fold, initialState, type Combatant, type ProjectionState } from '@questra/engine';
import type { Connection } from './transport.js';
import { InMemoryEventStore, type EventStore } from './store/event-store.js';

/** A signed session token resolves to who the connection is. */
export interface ResolvedToken {
  accountId: string;
  role: ViewerRole;
  /** the campaign / play-session the token grants access to. */
  playSessionId: string;
}

/**
 * Decide an intent's legality and, if legal, produce the resulting event
 * cascade. Injected so the server stays engine-agnostic and the reject reason is
 * the same string the client shows as greying text (§4.4).
 */
export type IntentResolver = (
  envelope: { idempotencyKey: string; intent: unknown },
  state: ProjectionState,
  /**
   * WHO SENT IT. The resolver needs this to refuse a DM control from a player:
   * "start the fight" and "next turn" change shared state, and being able to
   * name an intent is not permission to send one. Authorisation is decided
   * here, server-side, next to the state it protects — never by hiding a button
   * on a client that can simply send the message anyway.
   */
  actor: Viewer,
  /**
   * WHICH TABLE. The projection carries combatants, turns and rounds and
   * nothing else — so an intent whose answer depends on per-session data the
   * projection does not hold has no way to find it. Placing an arriving
   * creature is the first: it needs the MAP, to know which squares are already
   * spoken for, and the map is stored per campaign rather than folded from the
   * log.
   *
   * An id rather than the room itself, deliberately. This module stays engine-
   * agnostic and knows nothing about geometry; it hands over the one fact it
   * already owns and lets whoever wired the resolver decide what to look up.
   */
  context: { playSessionId: string },
) => { ok: true; events: PlayEvent[] } | { ok: false; reason: string };

export interface SyncCoreOptions {
  /**
   * Sync or async, so a bare dev server (no accounts) can resolve a token
   * in-process while the real Brief 14 auth wiring (`makeResolveToken`, which
   * looks up a JWT + a Postgres membership row) can await it. `onHello` awaits
   * whichever it gets.
   */
  resolveToken: (token: string, playSessionId: string) => ResolvedToken | null | Promise<ResolvedToken | null>;
  resolveIntent: IntentResolver;
  /** initial combatants per session (pre-combat setup); the log folds on top. */
  initialCombatants?: (playSessionId: string) => Combatant[];
  /** prompt timeout in ms (default 60_000) → auto reaction_declined. */
  promptTimeoutMs?: number;
  /** intent rate: burst / sustained per second. */
  rate?: { burst: number; perSecond: number };
  /**
   * The durable event store (ADR-0015). Defaults to in-memory (dev/tests). A
   * Postgres store makes the log survive restarts: on session load the log is
   * hydrated from here, and appends write through, so fold(reloaded) ===
   * fold(pre-restart).
   */
  store?: EventStore;
}

interface SessionState {
  /** In-memory mirror of the durable log (a cache of the event store). */
  log: PlayEvent[];
  base: ProjectionState;
  /** idempotencyKey → firstSeq (§2.3). */
  idempotency: Map<string, number>;
  /** connId → attached viewer. */
  viewers: Map<string, { conn: Connection; viewer: Viewer; role: ViewerRole; accountId: string }>;
  /** serializes durable appends so writes land in seq order. */
  writeChain: Promise<void>;
}

interface PendingPrompt {
  promptId: string;
  playSessionId: string;
  timer: ReturnType<typeof setTimeout>;
}

/** How much of the journal a fresh join is caught up on. Enough to read the
    room; not so much that a long session floods a reconnect. */
const RECENT_EVENTS = 100;

export class SyncCore {
  private sessions = new Map<string, SessionState>();
  private connToSession = new Map<string, string>();
  private prompts = new Map<string, PendingPrompt>();
  private opts: Required<Pick<SyncCoreOptions, 'promptTimeoutMs' | 'rate'>> & SyncCoreOptions;
  private store: EventStore;
  /** sessions whose in-memory mirror has been hydrated from the store. */
  private hydrated = new Map<string, Promise<void>>();

  constructor(options: SyncCoreOptions) {
    this.opts = { promptTimeoutMs: 60_000, rate: { burst: 5, perSecond: 2 }, ...options };
    this.store = options.store ?? new InMemoryEventStore();
  }

  // ---- transport handlers -----------------------------------------------

  onConnect(_conn: Connection): void {
    // nothing until `hello`
  }

  onMessage(conn: Connection, raw: ClientMsg): void {
    const parsed = ClientMsgSchema.safeParse(raw);
    if (!parsed.success) return this.err(conn, 'bad_message');
    const msg = parsed.data;
    switch (msg.m) {
      case 'hello': return this.onHello(conn, msg);
      case 'intent': return this.onIntent(conn, msg.envelope);
      case 'ping': return conn.send({ m: 'pong' });
      case 'effect': return this.onEffect(conn, msg.effect);
      case 'ruling_response':
      case 'prompt_response': return this.onPromptResponse(conn, msg.promptId);
    }
  }

  onDisconnect(conn: Connection): void {
    const sid = this.connToSession.get(conn.connId);
    if (!sid) return;
    const s = this.sessions.get(sid);
    s?.viewers.delete(conn.connId);
    this.connToSession.delete(conn.connId);
    if (s) this.broadcastPresence(s);
  }

  // ---- protocol ----------------------------------------------------------

  private session(playSessionId: string): SessionState {
    let s = this.sessions.get(playSessionId);
    if (!s) {
      const combatants = this.opts.initialCombatants?.(playSessionId) ?? [];
      s = { log: [], base: initialState(combatants), idempotency: new Map(), viewers: new Map(), writeChain: Promise.resolve() };
      this.sessions.set(playSessionId, s);
      return s;
    }

    /**
     * RESEAT ANYBODY WHO ARRIVED AFTER THE SESSION OPENED.
     *
     * The base was built once, when the first person said hello — so a player
     * who made their character afterwards never reached the table at all. The
     * DM opened the lobby, the session came into being empty, and every
     * character created from that moment on was invisible to it: "There is
     * nobody here to fight" with a full party standing in the room (found by
     * running it, 2026-08-23).
     *
     * Only ADDING is safe. The log has folded on top of this base since the
     * session opened, so replacing a combatant already in it would silently
     * undo every wound and condition the fight has applied. A newcomer has no
     * history to lose, which is exactly why they are the only case handled
     * here — anything else is a mid-session character change, and that is an
     * event, not a reseat.
     */
    const seated = this.opts.initialCombatants?.(playSessionId) ?? [];
    for (const c of seated) {
      if (!s.base.combatants[c.id]) s.base.combatants[c.id] = c;
    }
    return s;
  }

  /**
   * Hydrate a session's in-memory mirror from the durable store (ADR-0015).
   * Call once before a session goes live after a (re)start — the live server
   * awaits this on the first `hello` for a session; the durability test calls it
   * explicitly. Idempotent per session. A fresh in-memory store loads nothing,
   * so dev/tests are unaffected.
   */
  async hydrate(playSessionId: string): Promise<void> {
    let done = this.hydrated.get(playSessionId);
    if (done) return done;
    done = (async () => {
      const s = this.session(playSessionId);
      const [log, idem] = await Promise.all([this.store.load(playSessionId), this.store.loadIdempotency(playSessionId)]);
      // only adopt the durable log if this session hasn't already produced events in-memory
      if (s.log.length === 0 && log.length > 0) s.log = log;
      for (const [k, v] of idem) if (!s.idempotency.has(k)) s.idempotency.set(k, v);
    })();
    this.hydrated.set(playSessionId, done);
    return done;
  }

  /**
   * A truly synchronous resolveToken (the bare dev server, and every existing
   * golden test) must finish `hello` in the same tick `onMessage` was called —
   * `await`ing even a non-Promise value still costs a microtask, which is enough
   * to reorder a test that calls `hello()` then inspects `received` immediately
   * after. So this only goes through the Promise branch when the caller's
   * `resolveToken` actually returned one (the real Brief 14 auth, which awaits a
   * JWT verify + a Postgres membership lookup).
   */
  private onHello(conn: Connection, msg: Extract<ClientMsg, { m: 'hello' }>): void {
    const maybe = this.opts.resolveToken(msg.token, msg.playSessionId);
    if (maybe instanceof Promise) {
      maybe.then((resolved) => this.finishHello(conn, msg, resolved)).catch(() => this.err(conn, 'bad_message'));
    } else {
      this.finishHello(conn, msg, maybe);
    }
  }

  private finishHello(conn: Connection, msg: Extract<ClientMsg, { m: 'hello' }>, resolved: ResolvedToken | null): void {
    if (!resolved) return this.err(conn, 'auth');
    if (resolved.playSessionId !== msg.playSessionId) return this.err(conn, 'not_member');

    const s = this.session(msg.playSessionId);
    const viewer: Viewer = { role: resolved.role, accountId: resolved.accountId };
    s.viewers.set(conn.connId, { conn, viewer, role: resolved.role, accountId: resolved.accountId });
    this.connToSession.set(conn.connId, msg.playSessionId);

    const currentSeq = s.log.length > 0 ? s.log[s.log.length - 1]!.seq : 0;

    if (msg.lastSeq === undefined) {
      // fresh join → viewer-filtered snapshot + snapshotSeq (§2.1)
      const visible = filterStream(s.log, viewer);
      const snapshot = fold(s.base, visible); // fold(log) — the one projection function (§2.8)
      conn.send({ m: 'welcome', viewer: { role: resolved.role }, snapshotSeq: currentSeq, snapshot });
      /**
       * The story so far, replayed.
       *
       * A fresh join gets a folded snapshot, and folding keeps NUMBERS: hit
       * points, positions, conditions. Narration is not a number — it never
       * survives the fold, so a player walking from the lobby into the table
       * arrived to an empty journal every time and the session's opening line
       * was simply gone (owner, 2026-08-23).
       *
       * Replaying the visible tail fixes that without weakening anything:
       * every event still passes eventVisibleTo, so a latecomer sees exactly
       * what they would have seen had they been connected — and no whisper
       * meant for somebody else.
       */
      for (const e of filterStream(s.log, viewer).slice(-RECENT_EVENTS)) {
        conn.send({ m: 'event', event: e });
      }
    } else {
      // reconnect → welcome with snapshot up to lastSeq, then replay filtered (lastSeq, now]
      const upTo = s.log.filter((e) => e.seq <= msg.lastSeq!);
      const snapshot = fold(s.base, filterStream(upTo, viewer));
      conn.send({ m: 'welcome', viewer: { role: resolved.role }, snapshotSeq: msg.lastSeq, snapshot });
      for (const e of s.log) {
        if (e.seq > msg.lastSeq! && eventVisibleTo(e, viewer)) conn.send({ m: 'event', event: e });
      }
    }
    this.broadcastPresence(s);
  }

  private onIntent(conn: Connection, envelope: { idempotencyKey: string; intent: unknown }): void {
    const sid = this.connToSession.get(conn.connId);
    if (!sid) return this.err(conn, 'not_member');
    const s = this.sessions.get(sid)!;

    // idempotency (§2.3): duplicate key ⇒ re-ack, no re-emit.
    const existing = s.idempotency.get(envelope.idempotencyKey);
    if (existing !== undefined) {
      conn.send({ m: 'intent_ack', idempotencyKey: envelope.idempotencyKey, accepted: true, firstSeq: existing });
      return;
    }

    // validate → legality → cascade or reject (§2.4). Reject reason == greying string.
    const state = fold(s.base, s.log);
    /* The viewer was established at hello and is the server's own record of
       who this connection is — not anything the client asserted in the frame. */
    const viewer = s.viewers.get(conn.connId)!.viewer;
    const result = this.opts.resolveIntent(envelope, state, viewer, { playSessionId: sid });
    if (!result.ok) {
      conn.send({ m: 'intent_rejected', idempotencyKey: envelope.idempotencyKey, reason: result.reason });
      return;
    }
    if (result.events.length === 0) {
      conn.send({ m: 'intent_rejected', idempotencyKey: envelope.idempotencyKey, reason: 'No effect.' });
      return;
    }

    const firstSeq = result.events[0]!.seq;
    s.idempotency.set(envelope.idempotencyKey, firstSeq);
    for (const e of result.events) {
      s.log.push(e);
      this.fanOut(s, e);
      if (e.body.t === 'reaction_prompted') this.armPrompt(sid, e.body.promptId);
    }
    // durable write-through (ADR-0015), serialized per session so rows land in
    // seq order; the in-memory mirror + fan-out already happened, so the socket
    // path is not blocked on the DB.
    this.persist(s, sid, result.events, envelope.idempotencyKey, firstSeq);
    conn.send({ m: 'intent_ack', idempotencyKey: envelope.idempotencyKey, accepted: true, firstSeq });
  }

  /**
   * Relay a screen effect to everybody at the table (Brief 10 §4).
   *
   * NOTHING IS STORED. It does not touch the log, does not get a seq, and is
   * never replayed — a viewer who was not connected simply missed the thunder,
   * which is exactly right for weather. Storing it would put "shake" in the
   * play record between two lines of narration.
   *
   * Only whoever runs the game may send one, for the same reason only they may
   * start a fight: it changes what everybody is looking at.
   */
  private onEffect(conn: Connection, effect: EffectId): void {
    const sid = this.connToSession.get(conn.connId);
    if (!sid) return this.err(conn, 'not_member');
    const s = this.sessions.get(sid)!;
    const me = s.viewers.get(conn.connId);
    if (!me || me.role !== 'dm') return this.err(conn, 'not_member');

    for (const { conn: c } of s.viewers.values()) c.send({ m: 'effect', effect });
  }

  private onPromptResponse(conn: Connection, promptId: string): void {
    const p = this.prompts.get(promptId);
    if (p) { clearTimeout(p.timer); this.prompts.delete(promptId); }
    // (the resulting reaction_taken/declined event is produced by the intent
    // resolver in a full build; here we just cancel the timeout so it doesn't fire.)
  }

  // ---- fan-out & presence -----------------------------------------------

  /** Emit one event to every viewer it is visible to — the ONLY fan-out path. */
  private fanOut(s: SessionState, event: PlayEvent): void {
    for (const { conn, viewer } of s.viewers.values()) {
      if (eventVisibleTo(event, viewer)) conn.send({ m: 'event', event });
    }
  }

  private broadcastPresence(s: SessionState): void {
    const connected = [...s.viewers.values()].map((v) => ({ accountId: v.accountId, role: v.role }));
    const state = fold(s.base, s.log);
    const msg: ServerMsg = state.activeCreatureId !== undefined
      ? { m: 'presence', connected, activeCreatureId: state.activeCreatureId }
      : { m: 'presence', connected };
    for (const { conn } of s.viewers.values()) conn.send(msg);
  }

  // ---- prompt timeouts (§2.7) -------------------------------------------

  private armPrompt(playSessionId: string, promptId: string): void {
    const timer = setTimeout(() => {
      this.prompts.delete(promptId);
      this.emitAutoDecline(playSessionId, promptId);
    }, this.opts.promptTimeoutMs);
    // don't keep the process alive for a pending prompt in tests
    (timer as { unref?: () => void }).unref?.();
    this.prompts.set(promptId, { promptId, playSessionId, timer });
  }

  private emitAutoDecline(playSessionId: string, promptId: string): void {
    const s = this.sessions.get(playSessionId);
    if (!s) return;
    const seq = (s.log.length > 0 ? s.log[s.log.length - 1]!.seq : 0) + 1;
    const event: PlayEvent = {
      seq,
      id: `evt-autodecline-${promptId}`,
      at: new Date().toISOString(),
      actor: { kind: 'engine' },
      visibility: 'public',
      body: { t: 'reaction_declined', promptId },
    };
    s.log.push(event);
    this.fanOut(s, event);
    this.persist(s, playSessionId, [event]);
  }

  private err(conn: Connection, code: 'auth' | 'not_member' | 'bad_message' | 'rate_limited'): void {
    conn.send({ m: 'error', code });
  }

  // ---- durability (ADR-0015) --------------------------------------------

  /** Write events (and optionally an idempotency record) through to the store,
   *  serialized per session on its writeChain so rows land in seq order. */
  private persist(s: SessionState, playSessionId: string, events: readonly PlayEvent[], idempotencyKey?: string, firstSeq?: number): void {
    s.writeChain = s.writeChain
      .then(() => this.store.append(playSessionId, events))
      .then(() => (idempotencyKey !== undefined && firstSeq !== undefined ? this.store.recordIdempotency(playSessionId, idempotencyKey, firstSeq) : undefined))
      .then(() => undefined)
      .catch((err) => { console.error(`[SyncCore] durable write failed for ${playSessionId}:`, err); });
  }

  /** Await all pending durable writes for a session (tests / graceful shutdown). */
  async flush(playSessionId: string): Promise<void> {
    await this.sessions.get(playSessionId)?.writeChain;
  }

  // ---- test / introspection helpers -------------------------------------

  /** The full (unfiltered) log for a session — tests compare captures against filterStream(log). */
  logFor(playSessionId: string): readonly PlayEvent[] {
    return this.sessions.get(playSessionId)?.log ?? [];
  }
}
