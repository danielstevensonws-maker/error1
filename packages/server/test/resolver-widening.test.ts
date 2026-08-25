/**
 * The resolver answers more than attacks.
 *
 * WHY THIS EXISTS. The slice resolver handled `kind: 'attack'` and rejected
 * everything else, which meant the DM's composer typed into a void and pressing
 * "Begin the session" moved only the DM's own browser (owner, 2026-08-20). Both
 * are the same missing piece: things people do at a table have to become events
 * on the shared log, or they did not really happen.
 *
 * These assert the SHAPE that reaches other players — not the wording of any
 * particular line, which is a screen's business.
 */
import { describe, it, expect } from 'vitest';
import type { Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

describe('what the table can do', () => {
  it('turns free text into narration everyone can see', () => {
    const resolve = makeSliceResolver();
    const state = { combatants: {}, round: 1, nextSeq: 7 } as never;

    const out = resolve(
      { idempotencyKey: 'k-12345678', intent: { kind: 'free_text', creatureId: 'c1', text: 'The door gives.' } },
      state,
      PLAYER,
      { playSessionId: 'ps_test' },
    );

    expect(out.ok, 'free text is the escape hatch — it must never be refused').toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { t: string; text: string };
    expect(body.t).toBe('narration');
    expect(body.text).toBe('The door gives.');
    /* Public, or the point is lost: the whole reason to route saying things
       through the log is that everybody receives it. */
    expect(out.events[0]!.visibility).toBe('public');
    /* Continues the log rather than restarting it. */
    expect(out.events[0]!.seq).toBe(7);
  });

  it('turns a move into a token everyone watches move', () => {
    const out = makeSliceResolver()(
      {
        idempotencyKey: 'k-22345678',
        intent: { kind: 'move', tokenId: 't1', path: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 2 }] },
      },
      { combatants: {}, round: 1, nextSeq: 0 } as never,
      PLAYER, { playSessionId: 'ps_test' });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const body = out.events[0]!.body as { t: string; to: { x: number; y: number }; costFt: number };
    expect(body.t).toBe('token_moved');
    expect(body.to).toEqual({ x: 4, y: 2 });
    /* Chebyshev at five feet a square (ADR-0012): three steps east, one north —
       the diagonal is not charged extra. */
    expect(body.costFt).toBe(15);
  });

  it('still refuses something it genuinely cannot do, in words a player can read', () => {
    const out = makeSliceResolver()(
      { idempotencyKey: 'k-32345678', intent: { kind: 'use_feature', creatureId: 'c1', featureId: 'f1' } },
      { combatants: {}, round: 1, nextSeq: 0 } as never,
      PLAYER, { playSessionId: 'ps_test' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).not.toMatch(/undefined|Error|null/);
  });
});
