/**
 * useSync — the browser end of the sync protocol (Brief 05).
 *
 * WHY THIS EXISTS. `packages/server` has had a complete, golden-tested
 * `SyncCore` for some time — hello/welcome/replay, per-viewer fan-out through
 * the visibility filter, idempotent intents, presence, prompt timeouts — and
 * the web app had no WebSocket client at all. Not a partial one: zero. So two
 * people on two devices saw nothing of each other, and every play surface was
 * rendered from fixtures. This is the wire between a proven protocol and React.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not fold events into game state.
 * The engine owns that fold (`welcome.snapshot` is the engine's ProjectionState
 * and is opaque to contracts), and duplicating it here would create a second
 * source of truth that drifts. This hook owns the CONNECTION: staying joined,
 * knowing who else is here, buffering what arrived, and reconnecting without
 * losing sequence. Whoever renders a play surface folds the events.
 *
 * SEQUENCE GAPS ARE NORMAL AND MUST NOT BE TREATED AS ERRORS. The server
 * filters per viewer before fan-out, so a player legitimately receives
 * 41,42,43,44,46 — event 45 was a whisper for somebody else and was NOT
 * RECEIVED rather than received-and-hidden. `lastSeq` therefore tracks the
 * highest seq this viewer has seen, which is exactly what reconnect wants.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import {
  ClientIntentEnvelopeSchema,
  ServerMsgSchema,
  type ClientMsg,
  type EffectId,
  type PlayEvent,
  type ServerMsg,
  type ViewerRole,
} from '@questra/contracts';

/* The contract exports the schema but no inferred type for it, so derive one
   here rather than editing contracts for a single consumer. If a second caller
   appears, promote this to an export there instead. */
type ClientIntentEnvelope = z.infer<typeof ClientIntentEnvelopeSchema>;

/** Shared so nothing else re-derives where the server lives. */
export const API_BASE = (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? 'http://localhost:8787';

/** http(s) → ws(s) on the same host: the WebSocket server shares Fastify's port. */
function socketUrl(): string {
  return API_BASE.replace(/^http/, 'ws');
}

export type SyncStatus = 'connecting' | 'live' | 'reconnecting' | 'failed';

export interface PresentViewer {
  accountId: string;
  role: ViewerRole;
}

export interface SyncState {
  status: SyncStatus;
  /** Who is connected right now. Ids only — resolve names from the roster. */
  present: PresentViewer[];
  /** Whose turn it is, when the session is in a round. */
  activeCreatureId?: string | undefined;
  /** The engine projection as of `snapshotSeq`, opaque here. */
  snapshot: unknown;
  /** Events received after the snapshot, in arrival order. */
  events: PlayEvent[];
  /** Set when the server refused the connection — auth, not_member, and so on. */
  error: string | null;
  /** Dismiss the last refusal. The screen showing it needs a way to stop. */
  clearError: () => void;
  /** Send a player intent. No-ops while not live. */
  sendIntent: (envelope: ClientIntentEnvelope, onAck?: () => void) => void;
  sendEffect: (effect: EffectId) => void;
  onEffect: (fn: (e: EffectId) => void) => void;
}

export interface UseSyncOptions {
  playSessionId: string;
  /** The access token. Null defers connecting — a session still refreshing is
   *  not an error, it is simply not ready. */
  token: string | null;
  /** Set false to stay disconnected (a screen that is not the play surface). */
  enabled?: boolean;
}

/** Backoff for reconnects: quick at first, then backing off, capped. */
const BACKOFF_MS = [500, 1000, 2000, 5000, 10000];

export function useSync({ playSessionId, token, enabled = true }: UseSyncOptions): SyncState {
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [present, setPresent] = useState<PresentViewer[]>([]);
  const [activeCreatureId, setActiveCreatureId] = useState<string | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const [events, setEvents] = useState<PlayEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => { setError(null); }, []);

  const socketRef = useRef<WebSocket | null>(null);
  /* The highest seq THIS VIEWER has seen. Survives reconnects deliberately —
     it is what lets the server replay only the gap rather than resend the world. */
  const lastSeqRef = useRef<number>(0);
  const attemptRef = useRef<number>(0);
  const closedByUsRef = useRef<boolean>(false);
  const timerRef = useRef<number | undefined>(undefined);
  /* Callers waiting to hear the server has their intent, by idempotency key. */
  const ackWaitersRef = useRef<Map<string, () => void>>(new Map());
  /* The current effect listener. A ref rather than state so arriving effects
     never re-run the socket effect and tear the connection down. */
  const effectRef = useRef<((e: EffectId) => void) | undefined>(undefined);

  const handle = useCallback((msg: ServerMsg): void => {
    switch (msg.m) {
      case 'welcome':
        lastSeqRef.current = msg.snapshotSeq;
        setSnapshot(msg.snapshot);
        setStatus('live');
        setError(null);
        attemptRef.current = 0;
        break;
      case 'event':
        /* Track the high-water mark rather than asserting contiguity: gaps are
           the visibility filter doing its job, not dropped messages. */
        if (msg.event.seq > lastSeqRef.current) lastSeqRef.current = msg.event.seq;
        setEvents((prev) => [...prev, msg.event]);
        break;
      case 'presence':
        setPresent(msg.connected);
        setActiveCreatureId(msg.activeCreatureId);
        break;
      case 'error':
        /* auth and not_member are terminal: retrying with the same token will
           fail identically, so stop rather than hammer the server. */
        setError(msg.detail ?? msg.code);
        if (msg.code === 'auth' || msg.code === 'not_member') {
          closedByUsRef.current = true;
          setStatus('failed');
          socketRef.current?.close();
        }
        break;
      case 'intent_rejected':
        setError(msg.reason);
        break;
      case 'effect':
        /* Ephemeral by design (Brief 10 §4): handed to the listener and kept
           nowhere. Reduce-motion suppression happens where it renders, because
           it is a property of the person watching, not of the effect. */
        effectRef.current?.(msg.effect);
        break;
      case 'intent_ack': {
        /* Whoever is waiting on this one gets to move on. */
        const waiter = ackWaitersRef.current.get(msg.idempotencyKey);
        if (waiter) { ackWaitersRef.current.delete(msg.idempotencyKey); waiter(); }
        break;
      }
      case 'pong':
        break;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !token || !playSessionId) return;

    closedByUsRef.current = false;
    let disposed = false;

    const connect = (): void => {
      if (disposed) return;
      const ws = new WebSocket(socketUrl());
      socketRef.current = ws;

      ws.onopen = () => {
        const hello: ClientMsg = lastSeqRef.current > 0
          ? { m: 'hello', playSessionId, token, lastSeq: lastSeqRef.current }
          : { m: 'hello', playSessionId, token };
        ws.send(JSON.stringify(hello));
      };

      ws.onmessage = (ev: MessageEvent<string>) => {
        /* Validated against the contract rather than trusted. A malformed frame
           is a bug worth seeing, not something to crash the play screen over. */
        const parsed = ServerMsgSchema.safeParse(JSON.parse(ev.data as unknown as string));
        if (!parsed.success) {
          console.error('sync: unrecognised server message', parsed.error);
          return;
        }
        handle(parsed.data);
      };

      ws.onclose = () => {
        if (disposed || closedByUsRef.current) return;
        setStatus('reconnecting');
        const delay = BACKOFF_MS[Math.min(attemptRef.current, BACKOFF_MS.length - 1)]!;
        attemptRef.current += 1;
        timerRef.current = window.setTimeout(connect, delay);
      };

      /* onerror fires before onclose; the close handler owns the retry so this
         only records the fact. */
      ws.onerror = () => setStatus((s) => (s === 'live' ? 'reconnecting' : s));
    };

    connect();

    return () => {
      disposed = true;
      closedByUsRef.current = true;
      window.clearTimeout(timerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [playSessionId, token, enabled, handle]);

  /**
   * Send an intent, and optionally learn when the server has it.
   *
   * The callback exists because some actions are a HANDOFF: the DM starting a
   * session sends, then leaves this screen, and leaving closes the socket. Doing
   * both in one tick meant the close beat the send and the intent evaporated.
   * Waiting for the ack makes the handoff safe, and the timeout means a dead
   * socket delays somebody rather than trapping them.
   */
  const sendIntent = useCallback((envelope: ClientIntentEnvelope, onAck?: () => void): void => {
    const ws = socketRef.current;
    if (onAck) {
      const timer = window.setTimeout(() => { ackWaitersRef.current.delete(envelope.idempotencyKey); onAck(); }, 3000);
      ackWaitersRef.current.set(envelope.idempotencyKey, () => { window.clearTimeout(timer); onAck(); });
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const msg: ClientMsg = { m: 'intent', envelope };
    ws.send(JSON.stringify(msg));
  }, []);

  /** Send a screen effect. The server refuses these from anyone but the DM. */
  const sendEffect = useCallback((effect: EffectId): void => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ m: 'effect', effect } satisfies ClientMsg));
  }, []);

  /** Register what happens when an effect arrives. */
  const onEffect = useCallback((fn: (e: EffectId) => void): void => {
    effectRef.current = fn;
  }, []);

  return { status, present, activeCreatureId, snapshot, events, error, clearError, sendIntent, sendEffect, onEffect };
}
